import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import {
  ARTILLERY_STORY_CHAPTERS,
  ARTILLERY_STORY_DURATION,
} from '../data/campaignData';
import { getStoryChapterAtTime } from '../logic/lessonEngine';
import { playPullingBeat, speakNarration, stopNarration } from '../utils/soundEffects';
import {
  createContactShadowTexture,
  createTerrainCanvasTexture,
  createVictoryFlagTexture,
  detectSoftwareGl,
  scheduleAfterDraw,
} from '../utils/threeHelpers';

interface ThreeArtillerySceneProps {
  muted: boolean;
}

/** Mountain jungle slope height function for the artillery pulling road */
function slopeHeightAt(x: number, z: number): number {
  // Road runs along X from -10 (lower forest) up to +10 (mountain crest)
  const incline = (x + 10) * 0.24;
  // Road centerline curves gently in Z
  const roadZ = Math.sin(x * 0.22) * 1.6;
  const distFromRoad = Math.abs(z - roadZ);

  // Flat cut road bed; steep mountain wall on negative Z side, dramatic ravine drop on positive Z side
  let sideRelief = 0;
  if (distFromRoad > 1.75) {
    const excess = distFromRoad - 1.75;
    if (z < roadZ) {
      sideRelief = Math.pow(excess, 1.35) * 0.65 + Math.sin(x * 0.6 + z * 0.5) * 0.4;
    } else {
      sideRelief = -Math.min(4.8, Math.pow(excess, 1.25) * 0.58);
    }
  }
  return incline + sideRelief;
}

function roadCenterZ(x: number): number {
  return Math.sin(x * 0.22) * 1.6;
}

/** Build composite 10-part 105mm artillery cannon (grounded at wheel bottoms) */
function createArtilleryCannon(shadowTex: THREE.CanvasTexture): {
  group: THREE.Group;
  leftWheel: THREE.Group;
  rightWheel: THREE.Group;
} {
  const group = new THREE.Group();
  const oliveMetal = new THREE.MeshStandardMaterial({ color: 0x45583a, roughness: 0.42, metalness: 0.52 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x2d352c, roughness: 0.28, metalness: 0.72 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1f2421, roughness: 0.9, metalness: 0.05 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a5430, roughness: 0.85, metalness: 0.04 });

  // Soft contact shadow disc
  const shadowPlane = new THREE.Mesh(
    new THREE.CircleGeometry(1.7, 20),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.03;
  group.add(shadowPlane);

  // Heavy axle
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.65, 10), darkSteel);
  axle.rotation.x = Math.PI / 2;
  axle.position.y = 0.56;
  group.add(axle);

  // Spoked wheels factory
  const buildWheel = () => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.1, 10, 22), rubberMat);
    wg.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 12), oliveMetal);
    hub.rotation.x = Math.PI / 2;
    wg.add(hub);
    for (let s = 0; s < 6; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.92, 0.045), woodMat);
      spoke.rotation.z = (Math.PI / 6) * s;
      wg.add(spoke);
    }
    return wg;
  };

  const leftWheel = buildWheel();
  leftWheel.position.set(0, 0.56, -0.82);
  const rightWheel = buildWheel();
  rightWheel.position.set(0, 0.56, 0.82);
  group.add(leftWheel, rightWheel);

  // Carriage cradle & breech
  const cradle = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.34, 0.52), oliveMetal);
  cradle.position.set(-0.05, 0.84, 0);
  group.add(cradle);

  // Angled gun shield
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.92, 1.28), oliveMetal);
  shield.position.set(0.32, 0.95, 0);
  shield.rotation.z = -0.22;
  group.add(shield);

  // Tapered cannon barrel (pointing forward along +X)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.125, 2.25, 14), darkSteel);
  barrel.rotation.z = -Math.PI / 2 + 0.18;
  barrel.position.set(1.1, 1.18, 0);
  group.add(barrel);

  // Muzzle brake accent
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.105, 0.24, 12), darkSteel);
  muzzle.rotation.z = -Math.PI / 2 + 0.18;
  muzzle.position.set(2.22, 1.38, 0);
  group.add(muzzle);

  // Twin trail legs extending backward (-X)
  const trailL = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 0.12), oliveMetal);
  trailL.position.set(-1.02, 0.42, -0.35);
  trailL.rotation.z = 0.26;
  trailL.rotation.y = 0.18;

  const trailR = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 0.12), oliveMetal);
  trailR.position.set(-1.02, 0.42, 0.35);
  trailR.rotation.z = 0.26;
  trailR.rotation.y = -0.18;
  group.add(trailL, trailR);

  return { group, leftWheel, rightWheel };
}

/** Build composite 8-part Vietnamese soldier pulling the rope */
function createPullingSoldier(shadowTex: THREE.CanvasTexture, isHero = false): {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  torsoGroup: THREE.Group;
} {
  const group = new THREE.Group();
  const uniformMat = new THREE.MeshStandardMaterial({
    color: isHero ? 0x5d8242 : 0x4b6b3a,
    roughness: 0.82,
    metalness: 0.04,
  });
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0x3b5930, roughness: 0.55, metalness: 0.1 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1be95, roughness: 0.65 });
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: new THREE.Color(0xca8a04),
    emissiveIntensity: 0.4,
    roughness: 0.25,
    metalness: 0.6,
  });

  // Contact shadow
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 14),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.45 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  // Legs (pivoted at hip)
  const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.56, 8);
  legGeo.translate(0, -0.28, 0);
  const leftLeg = new THREE.Mesh(legGeo, uniformMat);
  leftLeg.position.set(0, 0.56, -0.11);
  const rightLeg = new THREE.Mesh(legGeo, uniformMat);
  rightLeg.position.set(0, 0.56, 0.11);
  group.add(leftLeg, rightLeg);

  // Upper body leans forward when pulling
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.56, 0);
  torsoGroup.rotation.z = -0.34; // leaning forward in +X direction

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.52, 10), uniformMat);
  torso.position.y = 0.26;
  torsoGroup.add(torso);

  // Camouflage leaf pack on back
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.34, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x2f6f36, roughness: 0.9 }),
  );
  pack.position.set(-0.18, 0.3, 0);
  torsoGroup.add(pack);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), skinMat);
  head.position.set(0.03, 0.63, 0);
  torsoGroup.add(head);

  // Pith helmet + golden star
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    helmetMat,
  );
  helmet.position.set(0.03, 0.69, 0);
  torsoGroup.add(helmet);

  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.23, 0.035, 14), helmetMat);
  brim.position.set(0.03, 0.69, 0);
  torsoGroup.add(brim);

  const star = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.06), starMat);
  star.position.set(0.19, 0.74, 0);
  torsoGroup.add(star);

  // Arms reaching back to grip pull rope
  const armGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.46, 8);
  const armL = new THREE.Mesh(armGeo, uniformMat);
  armL.position.set(-0.14, 0.36, -0.19);
  armL.rotation.z = 0.9;
  const armR = new THREE.Mesh(armGeo, uniformMat);
  armR.position.set(-0.14, 0.36, 0.19);
  armR.rotation.z = 0.9;
  torsoGroup.add(armL, armR);

  group.add(torsoGroup);
  return { group, leftLeg, rightLeg, torsoGroup };
}

export function ThreeArtilleryScene({ muted }: ThreeArtillerySceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [webglError, setWebglError] = useState(false);

  const isPlayingRef = useRef(true);
  const elapsedRef = useRef(0);
  const mutedRef = useRef(muted);
  const lastBeatIndexRef = useRef(-1);
  const lastSpokenChapterRef = useRef<number | null>(null);

  useEffect(() => {
    mutedRef.current = muted;
    if (muted) stopNarration();
  }, [muted]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const currentChapter = getStoryChapterAtTime(elapsedSec);

  // Optional gentle voice narration when chapter changes and sound is unmuted
  useEffect(() => {
    if (!isPlaying || muted) return;
    if (lastSpokenChapterRef.current !== currentChapter.id) {
      lastSpokenChapterRef.current = currentChapter.id;
      speakNarration(currentChapter.narration, muted);
    }
  }, [currentChapter.id, currentChapter.narration, isPlaying, muted]);

  useEffect(() => {
    return () => stopNarration();
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || 780;
    const height = container.clientHeight || 420;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => e.preventDefault();
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    const dawnSky = new THREE.Color(0xfde68a);
    scene.background = dawnSky;
    scene.fog = new THREE.FogExp2(0xe2e8c8, 0.036);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.2, 100);
    camera.position.set(-2.5, 4.4, 8.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(-1.0, 2.2, 0.4);
    controls.enableDamping = !isSoftwareGl;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 4.5;
    controls.maxDistance = 16;
    controls.enablePan = false;
    controls.update();

    // Warm mountain dawn directional key + cool forest shade hemisphere
    const hemi = new THREE.HemisphereLight(0xbae6fd, 0x3f6212, 0.85);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffdca8, 2.1);
    sun.position.set(10, 14, 7);
    if (!isSoftwareGl) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.bias = -0.0005;
    }
    scene.add(sun);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const terrainTex = createTerrainCanvasTexture(maxAniso);
    const shadowTex = createContactShadowTexture();
    const flagTex = createVictoryFlagTexture(maxAniso);

    // 1. Mountain Jungle Slope Terrain with muddy forest trail
    const terrainGeo = new THREE.PlaneGeometry(34, 24, 68, 48);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);
    const col = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = slopeHeightAt(x, z);
      posAttr.setY(i, y);

      const dRoad = Math.abs(z - roadCenterZ(x));
      if (dRoad < 1.55) {
        col.setHex(0x9a6b43); // muddy red-brown mountain road
      } else if (dRoad < 2.2) {
        col.setHex(0x6d7c3f); // grassy roadside edge
      } else {
        col.setHex(0x3a6b35); // lush Dien Bien forest green
      }
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTex,
      vertexColors: true,
      color: 0xffffff,
      roughness: 0.94,
      metalness: 0.0,
      envMapIntensity: 0.25,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = !isSoftwareGl;
    scene.add(terrainMesh);

    // 2. InstancedMesh Forest Trees & Roadside Boulders
    const treeCount = 110;
    const trunkGeo = new THREE.CylinderGeometry(0.09, 0.14, 1.0, 6);
    trunkGeo.translate(0, 0.5, 0);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: 0.2,
    });
    const leafGeo = new THREE.ConeGeometry(0.72, 2.1, 7);
    leafGeo.translate(0, 1.75, 0);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x266334,
      roughness: 0.92,
      metalness: 0.0,
      envMapIntensity: 0.2,
    });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, treeCount);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();

    let placed = 0;
    for (let i = 0; i < 240 && placed < treeCount; i++) {
      const tx = -14 + ((i * 3.7) % 28);
      const tz = -10 + ((i * 5.3) % 20);
      if (Math.abs(tz - roadCenterZ(tx)) < 2.65) continue; // Keep road clear
      const ty = slopeHeightAt(tx, tz);
      const sc = 0.8 + ((i * 19) % 45) / 100;
      dummy.position.set(tx, ty - 0.06, tz);
      dummy.rotation.y = (i * 1.1) % (Math.PI * 2);
      dummy.scale.set(sc, sc * (0.9 + (i % 3) * 0.14), sc);
      dummy.updateMatrix();
      trunks.setMatrixAt(placed, dummy.matrix);
      leaves.setMatrixAt(placed, dummy.matrix);
      tint.setHSL(0.32 + ((i % 6) - 3) * 0.015, 0.35, 0.62 + (i % 4) * 0.08);
      leaves.setColorAt(placed, tint);
      placed++;
    }
    trunks.count = placed;
    leaves.count = placed;
    trunks.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    trunks.computeBoundingSphere();
    leaves.computeBoundingSphere();
    scene.add(trunks, leaves);

    // 3. Summit Victory Flag at the mountain crest
    const summitGroup = new THREE.Group();
    const sx = 8.4;
    const sz = roadCenterZ(sx) - 1.7;
    summitGroup.position.set(sx, slopeHeightAt(sx, sz), sz);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 2.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.7 }),
    );
    pole.position.y = 1.4;
    summitGroup.add(pole);
    const summitFlagGeo = new THREE.PlaneGeometry(1.5, 0.96, 8, 4);
    const summitFlag = new THREE.Mesh(
      summitFlagGeo,
      new THREE.MeshStandardMaterial({ map: flagTex, color: 0xffffff, roughness: 0.55, side: THREE.DoubleSide }),
    );
    summitFlag.position.set(0.75, 2.25, 0);
    summitGroup.add(summitFlag);
    scene.add(summitGroup);

    // 4. Moving Convoy Group: 105mm Cannon + 6 Soldiers + 2 Taut Hemp Ropes
    const convoyGroup = new THREE.Group();
    scene.add(convoyGroup);

    const cannon = createArtilleryCannon(shadowTex);
    convoyGroup.add(cannon.group);

    // 6 pulling soldiers in two neat lines ahead of the cannon
    const soldiers: Array<ReturnType<typeof createPullingSoldier> & { localX: number; localZ: number; phase: number }> = [];
    const soldierOffsets: Array<[number, number, boolean]> = [
      [1.8, -0.68, true], // Hero near cannon wheel (To Vinh Dien spotlight!)
      [1.8, 0.68, false],
      [3.1, -0.65, false],
      [3.1, 0.65, false],
      [4.4, -0.62, false],
      [4.4, 0.62, false],
    ];
    soldierOffsets.forEach(([lx, lz, isHero], idx) => {
      const s = createPullingSoldier(shadowTex, isHero);
      s.group.position.set(lx, 0, lz);
      convoyGroup.add(s.group);
      soldiers.push({ ...s, localX: lx, localZ: lz, phase: idx * 0.85 });
    });

    // Two taut hemp pull ropes connecting cannon carriage to soldier lines
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd6b782, roughness: 0.92 });
    const ropeGeo = new THREE.CylinderGeometry(0.032, 0.032, 4.4, 6);
    ropeGeo.rotateZ(Math.PI / 2);
    const ropeLeft = new THREE.Mesh(ropeGeo, ropeMat);
    ropeLeft.position.set(2.35, 0.78, -0.58);
    const ropeRight = new THREE.Mesh(ropeGeo, ropeMat);
    ropeRight.position.set(2.35, 0.78, 0.58);
    convoyGroup.add(ropeLeft, ropeRight);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    const _camTarget = new THREE.Vector3();
    const _camDesired = new THREE.Vector3();
    let frameId = 0;
    let timerId = 0;
    let disposed = false;
    let lastUiSync = 0;
    let userControlling = false;

    controls.addEventListener('start', () => {
      userControlling = true;
    });

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), isSoftwareGl ? 0.45 : 0.1);

      if (isPlayingRef.current) {
        elapsedRef.current += dt;
        if (elapsedRef.current >= ARTILLERY_STORY_DURATION) {
          elapsedRef.current = 0; // loop seamlessly
          lastBeatIndexRef.current = -1;
        }
      }

      const t = elapsedRef.current;
      const progress = t / ARTILLERY_STORY_DURATION; // 0..1

      // Position convoy along the mountain road (-7.2 to +5.6)
      const convoyX = -7.2 + progress * 12.8;
      const convoyZ = roadCenterZ(convoyX);
      const convoyY = slopeHeightAt(convoyX, convoyZ);

      // Compute slope pitch & road yaw
      const aheadX = convoyX + 0.5;
      const aheadZ = roadCenterZ(aheadX);
      const aheadY = slopeHeightAt(aheadX, aheadZ);
      const yaw = -Math.atan2(aheadZ - convoyZ, aheadX - convoyX);
      const pitch = Math.atan2(aheadY - convoyY, 0.5);

      convoyGroup.position.set(convoyX, convoyY, convoyZ);
      convoyGroup.rotation.set(0, yaw, pitch);

      // Spin cannon wheels & animate marching pulling soldiers
      const pullRate = isPlayingRef.current ? 4.8 : 0;
      if (pullRate > 0) {
        const wheelAngle = -t * 1.4;
        cannon.leftWheel.rotation.z = wheelAngle;
        cannon.rightWheel.rotation.z = wheelAngle;

        // Rhythmic footstep + heave cadence sound every 0.75s
        const beatIdx = Math.floor(t / 0.75);
        if (beatIdx !== lastBeatIndexRef.current) {
          lastBeatIndexRef.current = beatIdx;
          playPullingBeat(mutedRef.current, beatIdx);
        }
      }

      // Chapter 2 (12s-24s) dramatic spotlight: subtle extra heave lean & warm sunset sky
      const inChapter2 = t >= 12 && t < 24;
      const inChapter3 = t >= 24;
      if (inChapter3) {
        scene.background = new THREE.Color(0xfef08a);
        sun.intensity = 2.35;
      } else if (inChapter2) {
        scene.background = new THREE.Color(0xfdba74);
        sun.intensity = 1.85;
      } else {
        scene.background = new THREE.Color(0xdbeafe);
        sun.intensity = 2.05;
      }

      soldiers.forEach((s) => {
        const stride = isPlayingRef.current ? Math.sin(t * 5.2 + s.phase) : 0;
        s.leftLeg.rotation.z = stride * 0.48;
        s.rightLeg.rotation.z = -stride * 0.48;
        s.torsoGroup.rotation.z = -0.34 - Math.abs(stride) * 0.1;
      });

      // Wave summit victory flag
      const fPos = summitFlag.geometry.attributes.position;
      for (let i = 0; i < fPos.count; i++) {
        const fx = fPos.getX(i);
        fPos.setZ(i, Math.sin(fx * 4.2 - t * 4.6) * 0.08 * ((fx + 0.75) / 1.5));
      }
      fPos.needsUpdate = true;

      // Smoothly track convoy unless user manually orbits
      if (!userControlling) {
        _camTarget.set(convoyX + 1.8, convoyY + 0.9, convoyZ);
        _camDesired.set(convoyX + 0.2, convoyY + 3.8, convoyZ + 7.6);
        const alpha = 1 - Math.exp(-3.2 * dt);
        camera.position.lerp(_camDesired, alpha);
        controls.target.lerp(_camTarget, alpha);
      }
      controls.update();

      renderer.render(scene, camera);

      // Sync UI time scrubber at <= 5Hz
      if (Math.abs(t - lastUiSync) > 0.22 || !isPlayingRef.current) {
        lastUiSync = t;
        setElapsedSec(t);
      }

      if (isSoftwareGl) {
        scheduleAfterDraw(
          renderer,
          tick,
          (id) => {
            timerId = id;
          },
          110,
        );
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    const handleResize = () => {
      if (!container || disposed) return;
      const nw = container.clientWidth || 780;
      const nh = container.clientHeight || 420;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(timerId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      terrainGeo.dispose();
      terrainMat.dispose();
      terrainTex.dispose();
      shadowTex.dispose();
      flagTex.dispose();
      trunkGeo.dispose();
      trunkMat.dispose();
      leafGeo.dispose();
      leafMat.dispose();
      ropeGeo.dispose();
      ropeMat.dispose();
      summitFlagGeo.dispose();
      envRT.dispose();
      renderer.dispose();
    };
  }, []);

  const jumpToChapter = (startSec: number) => {
    elapsedRef.current = startSec;
    setElapsedSec(startSec);
    setIsPlaying(true);
    isPlayingRef.current = true;
    lastSpokenChapterRef.current = null;
  };

  const handleRestart = () => {
    jumpToChapter(0);
  };

  const progressPct = Math.min(100, Math.round((elapsedSec / ARTILLERY_STORY_DURATION) * 100));

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-emerald-800/20 bg-white shadow-md">
      {/* 3D Viewport */}
      <div
        className="relative h-[340px] w-full bg-gradient-to-b from-amber-100 to-emerald-100 md:h-[400px]"
        data-testid="three-artillery-viewport"
      >
        <div ref={mountRef} className="h-full w-full" />

        {webglError && (
          <div className="absolute inset-0 flex items-center justify-center bg-amber-50 p-6 text-center">
            <p className="font-display text-xl font-bold text-amber-950">
              Không gian rừng núi Điện Biên 1954 – Bộ đội ta anh dũng kéo pháo vượt đèo cao!
            </p>
          </div>
        )}

        {/* Top-Left Chant Caption Banner (solid crisp surface, zero backdrop-blur) */}
        <div className="pointer-events-none absolute top-3 left-3 z-10 max-w-[85%] rounded-2xl border-2 border-amber-400 bg-white/95 px-4 py-2 shadow-sm">
          <p className="font-display text-base font-extrabold text-red-700 md:text-lg">
            “{currentChapter.chant}”
          </p>
        </div>

        {/* Top-Right Time Readout */}
        <div className="pointer-events-none absolute top-3 right-3 z-10 rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 font-mono text-sm font-bold text-slate-800 tabular-nums shadow-sm">
          {String(Math.floor(elapsedSec)).padStart(2, '0')}s / {ARTILLERY_STORY_DURATION}s
        </div>
      </div>

      {/* Unified Bottom Story Dock (Below Viewport — Zero Viewport Occlusion) */}
      <div className="border-t border-slate-200 bg-[#FFFDF7] p-4 md:p-5">
        {/* Progress bar */}
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-600 transition-all duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-extrabold text-emerald-950 md:text-xl">
              {currentChapter.title}
            </h3>
            <p className="mt-1 text-base leading-relaxed font-medium text-slate-700">
              {currentChapter.narration}
            </p>
          </div>

          {/* Playback & narration controls */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void speakNarration(currentChapter.narration, false)}
              aria-label="Nghe thuyết minh chặng kéo pháo giọng nữ miền Bắc"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-amber-300 bg-amber-100 px-3.5 py-2.5 text-base font-bold text-amber-950 transition-colors hover:bg-amber-200 cursor-pointer"
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              <span>Thuyết minh</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? 'Tạm dừng hoạt cảnh kéo pháo' : 'Phát hoạt cảnh kéo pháo'}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-red-600 px-4 py-2.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-red-700 cursor-pointer"
            >
              {isPlaying ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
              <span>{isPlaying ? 'Tạm dừng' : 'Phát tiếp'}</span>
            </button>
            <button
              type="button"
              onClick={handleRestart}
              aria-label="Xem lại từ đầu"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-base font-bold text-slate-800 transition-colors hover:bg-slate-100 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Xem lại</span>
            </button>
          </div>
        </div>

        {/* Chapter jump buttons */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {ARTILLERY_STORY_CHAPTERS.map((ch) => {
            const active = ch.id === currentChapter.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => jumpToChapter(ch.startSec)}
                className={`rounded-xl border-2 px-3 py-2 text-left text-sm font-bold transition-colors cursor-pointer ${
                  active
                    ? 'border-amber-500 bg-amber-100 text-amber-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50'
                }`}
              >
                Chặng {ch.id} · {ch.startSec}s–{ch.endSec}s
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
