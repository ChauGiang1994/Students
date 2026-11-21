import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RotateCcw, Compass, Eye, EyeOff, X, Map as MapIcon, Box } from 'lucide-react';
import {
  CAMPAIGN_WAVES,
  MAP_ZONES,
  REALISTIC_MAP_LANDMARKS,
  SA_BAN_MAP_IMAGE,
  type RealisticLandmarkPin,
  type WaveId,
  type ZoneId,
} from '../data/campaignData';
import {
  getStrongholdFlagOwner,
  type FlagOwner,
  type Station1Assignments,
} from '../logic/lessonEngine';
import {
  createFrenchFlagTexture,
  createTerrainCanvasTexture,
  createVictoryFlagTexture,
  detectSoftwareGl,
  scheduleAfterDraw,
} from '../utils/threeHelpers';
import { MiniFlagBadge, SaBan2DView } from './SaBan2DView';

export interface ProjectedZoneMarker {
  id: ZoneId;
  x: number;
  y: number;
  visible: boolean;
}

interface ProjectedLandmarkMarker {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

interface ThreeMapSceneProps {
  mode: 'station1' | 'station2';
  /** Station 1 zone placement state */
  assignments?: Station1Assignments;
  /** Currently selected/dragged zone card for click-to-place accessibility */
  selectedZoneCard?: ZoneId | null;
  onDropZone?: (targetZoneId: ZoneId, draggedZoneId: ZoneId) => void;
  /** Instant right/wrong flash feedback on a specific map dropzone */
  flashZone?: { id: ZoneId; correct: boolean; seq: number } | null;
  /** Station 2 active wave focus */
  activeWave?: WaveId | null;
  journeyStarted?: boolean;
}

/**
 * Historically inspired Dien Bien Phu bowl-shaped valley elevation:
 * Elongated N-S Muong Thanh basin (~18km x 6-8km scale) framed by steep Northwest ridges,
 * Northern gateway hills (Him Lam, Doc Lap, Ban Keo), Eastern defensive chain (E1/D1, C1, A1),
 * and Southern Hong Cum sector.
 */
function valleyHeightAt(x: number, z: number): number {
  const distNorm = Math.sqrt((x / 7.8) ** 2 + (z / 9.8) ** 2);
  const basin = distNorm < 0.72 ? 0.14 : Math.pow(distNorm - 0.72, 1.58) * 4.9;
  const ridgeWave =
    Math.sin(x * 0.45 + z * 0.25) * 0.58 +
    Math.cos(x * 0.3 - z * 0.42) * 0.48 +
    Math.sin(x * 0.85) * Math.cos(z * 0.75) * 0.26;
  const ridgeScale = THREE.MathUtils.clamp((distNorm - 0.55) * 1.4, 0, 1);

  // Northern sector gateway hills: Him Lam (NE), Doc Lap (N), Ban Keo (NW)
  const hillHimLam = 1.18 * Math.exp(-((x - 2.1) ** 2 + (z + 4.6) ** 2) / 2.1);
  const hillDocLap = 1.22 * Math.exp(-((x + 0.85) ** 2 + (z + 5.8) ** 2) / 1.9);
  const hillBanKeo = 0.88 * Math.exp(-((x + 3.15) ** 2 + (z + 3.7) ** 2) / 1.7);

  // Eastern defensive hill chain (East bank of Nam Rom river): D1/E1, C1, and key Hill A1
  const hillD1E1 = 1.05 * Math.exp(-((x - 2.45) ** 2 + (z + 1.75) ** 2) / 1.35);
  const hillC1 = 1.12 * Math.exp(-((x - 2.75) ** 2 + (z + 0.25) ** 2) / 1.3);
  const hillA1 = 1.34 * Math.exp(-((x - 2.85) ** 2 + (z - 1.45) ** 2) / 1.65);

  // Southern sector: Hong Cum (Isabelle)
  const hillHongCum = 0.52 * Math.exp(-((x - 0.55) ** 2 + (z - 5.45) ** 2) / 2.3);

  return Math.max(
    0.05,
    basin +
      ridgeWave * ridgeScale +
      hillHimLam +
      hillDocLap +
      hillBanKeo +
      hillD1E1 +
      hillC1 +
      hillA1 +
      hillHongCum,
  );
}

/** Build a composite multi-part fortified hill stronghold with textured historical flag (France -> Vietnam) */
function createFortifiedStronghold(
  initialFlagTex: THREE.Texture,
  scale = 1,
): { group: THREE.Group; flagMesh: THREE.Mesh; flagMat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  const earthMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.92, metalness: 0.04 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x55604c, roughness: 0.65, metalness: 0.2 });
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.6 });

  // Outer barbed-wire / earthen parapet ring
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.06, 6, 22), wireMat);
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position.y = 0.06;
  group.add(outerRing);

  // Inner sandbag trench ring
  const trench = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.11, 8, 20), earthMat);
  trench.rotation.x = Math.PI / 2;
  trench.position.y = 0.09;
  group.add(trench);

  // Bunker base & dome
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.24, 12), earthMat);
  body.position.y = 0.12;
  group.add(body);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
    roofMat,
  );
  dome.position.y = 0.22;
  group.add(dome);

  // Secondary pillbox beside main dome
  const pillbox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.24), roofMat);
  pillbox.position.set(0.38, 0.11, 0.26);
  group.add(pillbox);

  // Flag mast & waving historical flag
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.032, 1.12, 8),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.72 }),
  );
  pole.position.set(0, 0.72, 0);
  group.add(pole);

  const flagGeo = new THREE.PlaneGeometry(0.68, 0.44, 5, 2);
  const flagMat = new THREE.MeshStandardMaterial({
    map: initialFlagTex,
    color: 0xffffff,
    roughness: 0.55,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const flagMesh = new THREE.Mesh(flagGeo, flagMat);
  flagMesh.position.set(0.35, 1.06, 0);
  group.add(flagMesh);

  group.scale.setScalar(scale);
  return { group, flagMesh, flagMat };
}

/** Build authentic Muong Thanh Bailey Iron Truss Bridge over Nam Rom river */
function createMuongThanhBridge(): THREE.Group {
  const group = new THREE.Group();
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x78583a, roughness: 0.88, metalness: 0.05 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.45, metalness: 0.65 });

  // Timber deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.07, 0.48), deckMat);
  deck.position.y = 0.14;
  group.add(deck);

  // Left & right Bailey steel truss beams + overhead arches
  [-0.22, 0.22].forEach((zOff) => {
    const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.05, 0.05), steelMat);
    bottomRail.position.set(0, 0.18, zOff);
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.05, 0.05), steelMat);
    topRail.position.set(0, 0.46, zOff);
    group.add(bottomRail, topRail);

    [-0.64, -0.32, 0, 0.32, 0.64].forEach((xPost) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.3, 0.045), steelMat);
      post.position.set(xPost, 0.32, zOff);
      group.add(post);
    });
  });

  // Overhead cross ties
  [-0.45, 0, 0.45].forEach((xTie) => {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.48), steelMat);
    tie.position.set(xTie, 0.46, 0);
    group.add(tie);
  });

  // Stone abutments
  [-0.78, 0.78].forEach((xEnd) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.56), deckMat);
    pier.position.set(xEnd, 0.08, 0);
    group.add(pier);
  });

  return group;
}

/** Build miniature C-47 Dakota transport aircraft for Muong Thanh Airstrip */
function createDakotaPlane(smokeDamage = false): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: smokeDamage ? 0x6b7280 : 0xcbd5e1,
    roughness: 0.42,
    metalness: 0.55,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.4 });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.55, 8), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.y = 0.09;
  group.add(fuselage);

  const wings = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.025, 0.14), bodyMat);
  wings.position.set(0, 0.09, -0.04);
  group.add(wings);

  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.07), bodyMat);
  tailWing.position.set(0, 0.11, 0.23);
  group.add(tailWing);

  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.14, 0.1), bodyMat);
  tailFin.position.set(0, 0.16, 0.23);
  group.add(tailFin);

  // Twin engine nacelles
  [-0.17, 0.17].forEach((xEng) => {
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.13, 6), darkMat);
    eng.rotation.x = Math.PI / 2;
    eng.position.set(xEng, 0.09, -0.09);
    group.add(eng);
  });

  return group;
}

/** Build camouflaged Viet Minh mountain artillery emplacement with Vietnamese Red Star Flag */
function createMountainArtilleryPost(vnFlagTex: THREE.Texture): { group: THREE.Group; muzzleGlow: THREE.Mesh } {
  const group = new THREE.Group();
  const earthMat = new THREE.MeshStandardMaterial({ color: 0x6f5b3e, roughness: 0.92 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x3f4f3c, roughness: 0.5, metalness: 0.45 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6a37, roughness: 0.9 });

  const berm = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 6, 14), earthMat);
  berm.rotation.x = Math.PI / 2;
  berm.position.y = 0.06;
  group.add(berm);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.56, 8), barrelMat);
  barrel.rotation.x = Math.PI * 0.4;
  barrel.position.set(0, 0.18, 0.14);
  group.add(barrel);

  const camoRoof = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.16, 6), leafMat);
  camoRoof.position.set(0, 0.28, -0.05);
  group.add(camoRoof);

  // Vietnamese Red Flag with Golden Star marking our mountain artillery position
  const vnPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.028, 1.05, 8),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.7 }),
  );
  vnPole.position.set(-0.34, 0.56, -0.1);
  group.add(vnPole);

  const vnFlag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.66, 0.44),
    new THREE.MeshStandardMaterial({
      map: vnFlagTex,
      color: 0xffffff,
      roughness: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  vnFlag.position.set(0.0, 0.88, -0.1);
  group.add(vnFlag);

  const muzzleGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf97316,
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: 0.9,
    }),
  );
  muzzleGlow.position.set(0, 0.26, 0.42);
  muzzleGlow.visible = false;
  group.add(muzzleGlow);

  return { group, muzzleGlow };
}

/** Build composite authentic De Castries Command Bunker (flies French flag until Wave 3 Vietnamese Victory Flag!) */
function createDeCastriesBunker(initialFlagTex: THREE.Texture): {
  group: THREE.Group;
  victoryFlagMesh: THREE.Mesh;
  victoryFlagMat: THREE.MeshStandardMaterial;
  victoryFlagPole: THREE.Group;
} {
  const group = new THREE.Group();
  const sandbagMat = new THREE.MeshStandardMaterial({ color: 0xb99e74, roughness: 0.92, metalness: 0.02 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x5c6866, roughness: 0.42, metalness: 0.62 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85, metalness: 0.05 });

  // Outer protective sandbag berm
  const wall = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.26, 1.12), sandbagMat);
  wall.position.y = 0.13;
  group.add(wall);

  // Corrugated steel Quonset half-cylinder bunker roof
  const arch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 1.25, 18, 1, false, 0, Math.PI),
    steelMat,
  );
  arch.rotation.z = Math.PI / 2;
  arch.position.y = 0.24;
  group.add(arch);

  // Corrugated arch ribs for authentic corrugated steel look
  [-0.42, -0.14, 0.14, 0.42].forEach((xRib) => {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.02, 6, 16, Math.PI), steelMat);
    rib.rotation.y = Math.PI / 2;
    rib.position.set(xRib, 0.24, 0);
    group.add(rib);
  });

  // Sandbag roof reinforcement strip + timber side logs
  const roofCover = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.13, 0.56), sandbagMat);
  roofCover.position.y = 0.69;
  group.add(roofCover);

  [-0.56, 0.56].forEach((zLog) => {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 8), timberMat);
    log.rotation.z = Math.PI / 2;
    log.position.set(0, 0.28, zLog);
    group.add(log);
  });

  // Entrance timber jambs
  const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.12), timberMat);
  jambL.position.set(-0.78, 0.2, -0.22);
  const jambR = jambL.clone();
  jambR.position.set(-0.78, 0.2, 0.22);
  group.add(jambL, jambR);

  // Victory Flagpole assembly (rises tall during Wave 3!)
  const victoryFlagPole = new THREE.Group();
  victoryFlagPole.position.set(0, 0.74, 0);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.042, 1.9, 8),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.75 }),
  );
  mast.position.y = 0.95;
  victoryFlagPole.add(mast);

  const finial = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.85 }),
  );
  finial.position.y = 1.92;
  victoryFlagPole.add(finial);

  const flagGeo = new THREE.PlaneGeometry(1.12, 0.72, 8, 4);
  const victoryFlagMat = new THREE.MeshStandardMaterial({
    map: initialFlagTex,
    color: 0xffffff,
    roughness: 0.55,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const victoryFlagMesh = new THREE.Mesh(flagGeo, victoryFlagMat);
  victoryFlagMesh.position.set(0.58, 1.54, 0);
  victoryFlagPole.add(victoryFlagMesh);

  group.add(victoryFlagPole);
  return { group, victoryFlagMesh, victoryFlagMat, victoryFlagPole };
}

export function ThreeMapScene({
  mode,
  assignments,
  selectedZoneCard,
  onDropZone,
  flashZone = null,
  activeWave = null,
  journeyStarted = false,
}: ThreeMapSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [markers, setMarkers] = useState<ProjectedZoneMarker[]>([]);
  const [landmarkMarkers, setLandmarkMarkers] = useState<ProjectedLandmarkMarker[]>([]);
  const [showDetailedPins, setShowDetailedPins] = useState(true);
  const [selectedLandmark, setSelectedLandmark] = useState<RealisticLandmarkPin | null>(null);
  const [dragOverZone, setDragOverZone] = useState<ZoneId | null>(null);
  const [webglError, setWebglError] = useState(false);

  // Mutable refs so React prop changes drive 3D scene smoothly without recreating WebGLRenderer
  const activeWaveRef = useRef<WaveId | null>(activeWave);
  const modeRef = useRef(mode);
  const resetCamTriggerRef = useRef(0);
  const cameraTargetDesiredRef = useRef(new THREE.Vector3(0, 0.4, 0.2));
  const cameraPosDesiredRef = useRef(new THREE.Vector3(0.4, 12.2, 12.8));
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    modeRef.current = mode;
    activeWaveRef.current = activeWave;
    setSelectedLandmark(null);
    if (mode === 'station2' && activeWave) {
      const wave = CAMPAIGN_WAVES.find((w) => w.id === activeWave);
      if (wave) {
        cameraPosDesiredRef.current.set(...wave.cameraPos);
        cameraTargetDesiredRef.current.set(...wave.cameraTarget);
        isTransitioningRef.current = true;
      }
    } else {
      cameraPosDesiredRef.current.set(0.2, 12.5, 13.0);
      cameraTargetDesiredRef.current.set(0, 0.4, 0.2);
      isTransitioningRef.current = true;
    }
  }, [mode, activeWave]);

  useEffect(() => {
    if (viewMode !== '3d') return;
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || 760;
    const height = container.clientHeight || 480;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    const galleryBg = new THREE.Color(0xeae2d3);
    scene.background = galleryBg;
    scene.fog = new THREE.FogExp2(0xeae2d3, 0.015);

    // Mandatory studio environment reflection
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.2, 120);
    camera.position.copy(cameraPosDesiredRef.current);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(cameraTargetDesiredRef.current);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 6.5;
    controls.maxDistance = 23;
    controls.maxPolarAngle = Math.PI * 0.44;
    controls.minPolarAngle = 0.26;
    controls.addEventListener('start', () => {
      isTransitioningRef.current = false;
    });

    // Measured warm museum gallery lighting rig (keeps relief texture rich & never blown out)
    const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0x3f4a36, 0.55);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.25);
    sunLight.position.set(11, 18, 9);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(1024, 1024);
      sunLight.shadow.camera.near = 2;
      sunLight.shadow.camera.far = 45;
      sunLight.shadow.camera.left = -15;
      sunLight.shadow.camera.right = 15;
      sunLight.shadow.camera.top = 15;
      sunLight.shadow.camera.bottom = -15;
      sunLight.shadow.bias = -0.0005;
    }
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.3);
    fillLight.position.set(-12, 8, -10);
    scene.add(fillLight);

    // Procedural fallback + photorealistic museum sa bàn relief texture + Vietnamese & French flags
    const maxAniso = isSoftwareGl ? 1 : Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const terrainTex = createTerrainCanvasTexture(maxAniso);
    const vnFlagTex = createVictoryFlagTexture(maxAniso);
    const frenchFlagTex = createFrenchFlagTexture(maxAniso);
    let saBanTex: THREE.Texture | null = null;

    // 1. Sculpted Dien Bien Phu Valley Terrain Mesh draped with museum sa bàn relief texture
    const segs = isSoftwareGl ? 52 : 76;
    const terrainGeo = new THREE.PlaneGeometry(29, 31, segs, segs);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    const fallbackColors: number[] = [];
    const tmpCol = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = valleyHeightAt(vx, vz);
      posAttr.setY(i, vy);

      // Authentic museum relief fallback colors (active immediately on frame 0 before texture decodes)
      if (vy < 0.34) {
        tmpCol.setHex(0x8e9d68);
      } else if (vy < 1.15) {
        tmpCol.setHex(0x7c8653);
      } else if (vy < 2.2) {
        tmpCol.setHex(0x4b633c);
      } else {
        tmpCol.setHex(0x2f4729);
      }
      fallbackColors.push(tmpCol.r, tmpCol.g, tmpCol.b);
    }
    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(fallbackColors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTex,
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
      envMapIntensity: 0.14,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    const texLoader = new THREE.TextureLoader();
    texLoader.load(SA_BAN_MAP_IMAGE, (loadedTex) => {
      if (disposed) {
        loadedTex.dispose();
        return;
      }
      loadedTex.colorSpace = THREE.SRGBColorSpace;
      loadedTex.anisotropy = maxAniso;
      loadedTex.needsUpdate = true;
      saBanTex = loadedTex;
      terrainMat.map = loadedTex;
      terrainMat.vertexColors = false;
      terrainMat.color.setHex(0xebe6dc);
      terrainMat.needsUpdate = true;
      renderer.render(scene, camera);
    });

    // 1b. Dark Walnut Museum Diorama Table Frame surrounding the sculpted 3D relief
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x3b2618,
      roughness: 0.62,
      metalness: 0.08,
    });
    const brassTrimMat = new THREE.MeshStandardMaterial({
      color: 0xc9a24b,
      roughness: 0.35,
      metalness: 0.65,
    });
    const tableBaseGeo = new THREE.BoxGeometry(30.8, 1.4, 32.8);
    const tableBase = new THREE.Mesh(tableBaseGeo, woodMat);
    tableBase.position.y = -0.68;
    scene.add(tableBase);

    const railNSGeo = new THREE.BoxGeometry(30.8, 1.65, 0.9);
    const railEWGeo = new THREE.BoxGeometry(0.9, 1.65, 31.2);
    const railNorth = new THREE.Mesh(railNSGeo, woodMat);
    railNorth.position.set(0, 0.85, -15.95);
    const railSouth = new THREE.Mesh(railNSGeo, woodMat);
    railSouth.position.set(0, 0.85, 15.95);
    const railWest = new THREE.Mesh(railEWGeo, woodMat);
    railWest.position.set(-14.95, 0.85, 0);
    const railEast = new THREE.Mesh(railEWGeo, woodMat);
    railEast.position.set(14.95, 0.85, 0);
    scene.add(railNorth, railSouth, railWest, railEast);

    const plaqueGeo = new THREE.BoxGeometry(7.2, 0.55, 0.14);
    const plaque = new THREE.Mesh(plaqueGeo, brassTrimMat);
    plaque.position.set(0, 0.4, 16.45);
    scene.add(plaque);

    // 2. Winding Nam Rom River (authentic N-S course between western Muong Thanh HQ & eastern hills)
    const riverCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.6, 0.16, -9.8),
      new THREE.Vector3(-1.3, 0.16, -6.5),
      new THREE.Vector3(0.45, 0.16, -3.2),
      new THREE.Vector3(0.85, 0.16, -0.8),
      new THREE.Vector3(0.75, 0.16, 0.72), // Passes directly under Muong Thanh Bridge
      new THREE.Vector3(0.35, 0.16, 2.7),
      new THREE.Vector3(-0.35, 0.16, 5.2),
      new THREE.Vector3(-0.7, 0.16, 9.6),
    ]);
    const riverGeo = new THREE.TubeGeometry(riverCurve, 52, 0.24, 8, false);
    riverGeo.scale(1, 0.14, 1);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.16,
      metalness: 0.12,
    });
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.position.y = 0.07;
    scene.add(riverMesh);

    // 2b. Authentic Muong Thanh Iron Truss Bridge crossing the Nam Rom river
    const bridge = createMuongThanhBridge();
    bridge.position.set(0.78, valleyHeightAt(0.78, 0.25) + 0.02, 0.25);
    bridge.rotation.y = -0.14;
    scene.add(bridge);

    // 3. Detailed Muong Thanh Steel-Mat Airstrip + Control Hut + 2 Dakota Planes
    const airstripGroup = new THREE.Group();
    const runwayGeo = new THREE.BoxGeometry(0.78, 0.05, 3.6);
    const runwayMat = new THREE.MeshStandardMaterial({ color: 0x8a949e, roughness: 0.78, metalness: 0.18 });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    airstripGroup.add(runway);

    // Crisp white runway centerline dashes
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    for (let d = -1.35; d <= 1.35; d += 0.54) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.055, 0.26), dashMat);
      dash.position.set(0, 0.005, d);
      airstripGroup.add(dash);
    }

    // Airfield control hut beside runway
    const controlHut = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.26, 0.36),
      new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 }),
    );
    controlHut.position.set(0.62, 0.13, -0.4);
    airstripGroup.add(controlHut);

    // Two miniature C-47 Dakota aircraft (referencing the historic 8:00 AM 13/3 opening strike!)
    const dakota1 = createDakotaPlane(false);
    dakota1.position.set(-0.1, 0.04, -0.9);
    dakota1.rotation.y = 0.25;
    const dakota2 = createDakotaPlane(true);
    dakota2.position.set(0.12, 0.04, 0.7);
    dakota2.rotation.y = -0.35;
    airstripGroup.add(dakota1, dakota2);

    airstripGroup.position.set(-1.45, valleyHeightAt(-1.45, -0.8) + 0.04, -0.8);
    airstripGroup.rotation.y = 0.14;
    scene.add(airstripGroup);

    // 3b. Auxiliary Southern Airstrip at Hong Cum (Isabelle)
    const southStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.04, 1.7),
      new THREE.MeshStandardMaterial({ color: 0xa89f8d, roughness: 0.9 }),
    );
    southStrip.position.set(-0.95, valleyHeightAt(-0.95, 5.4) + 0.03, 5.4);
    southStrip.rotation.y = -0.15;
    scene.add(southStrip);

    // 4. Sector Perimeter Rings on the valley floor (North, Center, South)
    const zoneRingSpecs: Array<{ id: ZoneId; x: number; z: number; rx: number; rz: number; color: number }> = [
      { id: 'north', x: -0.4, z: -4.9, rx: 3.6, rz: 1.9, color: 0xea580c },
      { id: 'center', x: 0.45, z: 0.25, rx: 3.7, rz: 2.85, color: 0x0284c7 },
      { id: 'south', x: 0.3, z: 5.45, rx: 2.35, rz: 1.5, color: 0x059669 },
    ];
    const sectorRings: Record<ZoneId, THREE.Mesh> = {} as Record<ZoneId, THREE.Mesh>;
    zoneRingSpecs.forEach((spec) => {
      const ringGeo = new THREE.TorusGeometry(1, 0.055, 8, 36);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshStandardMaterial({
        color: spec.color,
        roughness: 0.4,
        metalness: 0.15,
        emissive: new THREE.Color(spec.color),
        emissiveIntensity: 0.16,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.scale.set(spec.rx, 1, spec.rz);
      ring.position.set(spec.x, valleyHeightAt(spec.x, spec.z) + 0.14, spec.z);
      scene.add(ring);
      sectorRings[spec.id] = ring;
    });

    // 5. Historically Placed Strongholds across all 3 sectors (French Tricolor -> Vietnamese Red Star Flag when liberated)
    const strongholdFlags: Array<{
      id: string;
      flagMat: THREE.MeshStandardMaterial;
      flagMesh: THREE.Mesh;
      lastOwner: FlagOwner | null;
    }> = [];

    const addStronghold = (id: string, x: number, z: number, scale: number) => {
      const built = createFortifiedStronghold(frenchFlagTex, scale);
      built.group.position.set(x, valleyHeightAt(x, z) - 0.05, z);
      scene.add(built.group);
      strongholdFlags.push({ id, flagMat: built.flagMat, flagMesh: built.flagMesh, lastOwner: null });
      return built.group;
    };

    // North: Him Lam (NE), Doc Lap (N), Ban Keo (NW)
    addStronghold('him_lam', 2.1, -4.6, 0.95);
    addStronghold('doc_lap', -0.85, -5.8, 0.92);
    addStronghold('ban_keo', -3.15, -3.7, 0.84);

    // East Chain (Center Sector): D1/E1, C1, and A1
    addStronghold('doi_d1_e1', 2.45, -1.75, 0.88);
    addStronghold('doi_c1', 2.75, -0.25, 0.9);
    addStronghold('doi_a1', 2.85, 1.45, 1.02);

    // Dramatic Hill A1 blast crater glow ring (highlights night of 6/5/1954 explosive charge in Wave 3)
    const a1BlastRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.09, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xef4444,
        emissiveIntensity: 0.9,
        roughness: 0.3,
      }),
    );
    a1BlastRing.rotation.x = Math.PI / 2;
    a1BlastRing.position.set(2.85, valleyHeightAt(2.85, 1.45) + 0.14, 1.45);
    a1BlastRing.visible = false;
    scene.add(a1BlastRing);

    // South: Hong Cum
    addStronghold('hong_cum', 0.55, 5.45, 0.94);

    // Center West Bank: De Castries Command Bunker (flies French flag until Wave 3 Vietnamese Victory Flag!)
    const bunker = createDeCastriesBunker(frenchFlagTex);
    bunker.group.position.set(-0.65, valleyHeightAt(-0.65, 0.92), 0.92);
    scene.add(bunker.group);
    let lastBunkerOwner: FlagOwner | null = null;

    // 5b. Authentic Viet Minh Zig-Zag Encircling Trench Network ("Chiến thuật đánh lấn / Giao thông hào")
    const trenchMat = new THREE.MeshStandardMaterial({
      color: 0x6b4f35,
      roughness: 0.95,
      metalness: 0.02,
      emissive: new THREE.Color(0xd97706),
      emissiveIntensity: 0.05,
    });
    const trenchPaths: THREE.Vector3[][] = [
      // Western plain trench cutting across Muong Thanh Airstrip toward De Castries HQ
      [
        new THREE.Vector3(-5.2, 0, -1.8),
        new THREE.Vector3(-4.1, 0, -1.2),
        new THREE.Vector3(-3.3, 0, -1.6),
        new THREE.Vector3(-2.4, 0, -0.9),
        new THREE.Vector3(-1.45, 0, -0.8),
        new THREE.Vector3(-0.9, 0, -0.1),
      ],
      // Western assault trench aiming straight at De Castries HQ
      [
        new THREE.Vector3(-4.8, 0, 1.6),
        new THREE.Vector3(-3.6, 0, 1.1),
        new THREE.Vector3(-2.7, 0, 1.4),
        new THREE.Vector3(-1.6, 0, 0.9),
        new THREE.Vector3(-0.95, 0, 0.72),
      ],
      // Eastern ridge trench encircling Hills D1 -> C1 -> A1
      [
        new THREE.Vector3(5.6, 0, -2.5),
        new THREE.Vector3(4.3, 0, -1.8),
        new THREE.Vector3(3.6, 0, -0.7),
        new THREE.Vector3(4.2, 0, 0.4),
        new THREE.Vector3(3.8, 0, 1.5),
        new THREE.Vector3(4.8, 0, 2.5),
      ],
    ];
    const trenchMeshes: THREE.Mesh[] = [];
    trenchPaths.forEach((pts) => {
      const elevated = pts.map((p) => new THREE.Vector3(p.x, valleyHeightAt(p.x, p.z) + 0.08, p.z));
      const curve = new THREE.CatmullRomCurve3(elevated);
      const tGeo = new THREE.TubeGeometry(curve, 28, 0.09, 6, false);
      const tMesh = new THREE.Mesh(tGeo, trenchMat);
      scene.add(tMesh);
      trenchMeshes.push(tMesh);
    });

    // 5c. Viet Minh 105mm Mountain Artillery Emplacements dug into surrounding mountain slopes (flying Vietnamese Flag!)
    const artillerySpecs: Array<{ x: number; z: number; aimX: number; aimZ: number }> = [
      { x: 5.4, z: -7.2, aimX: 2.1, aimZ: -4.6 },
      { x: -4.2, z: -8.2, aimX: -0.85, aimZ: -5.8 },
      { x: 6.4, z: -0.6, aimX: 2.75, aimZ: -0.25 },
      { x: 6.2, z: 2.8, aimX: 2.85, aimZ: 1.45 },
    ];
    const artilleryPosts = artillerySpecs.map((spec) => {
      const post = createMountainArtilleryPost(vnFlagTex);
      const y = valleyHeightAt(spec.x, spec.z);
      post.group.position.set(spec.x, y - 0.02, spec.z);
      post.group.lookAt(spec.aimX, valleyHeightAt(spec.aimX, spec.aimZ), spec.aimZ);
      scene.add(post.group);
      return post;
    });

    // 6. InstancedMesh Mountain Jungle Trees lining surrounding Northwest ridges
    const treeCount = 140;
    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.1, 0.5, 6);
    trunkGeo.translate(0, 0.25, 0);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: 0.2,
    });
    const canopyGeo = new THREE.ConeGeometry(0.42, 1.15, 7);
    canopyGeo.translate(0, 0.92, 0);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x2f6f39,
      roughness: 0.92,
      metalness: 0.0,
      envMapIntensity: 0.22,
    });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();

    let placed = 0;
    for (let i = 0; i < 260 && placed < treeCount; i++) {
      const angle = (i * 2.39996) % (Math.PI * 2);
      const radius = 6.9 + ((i * 37) % 100) / 14;
      const tx = Math.cos(angle) * radius * 0.92;
      const tz = Math.sin(angle) * radius * 1.08;
      if (Math.abs(tx) > 13.5 || Math.abs(tz) > 14.5) continue;
      const ty = valleyHeightAt(tx, tz);
      if (ty < 0.78) continue;
      const s = 0.78 + ((i * 17) % 35) / 100;
      dummy.position.set(tx, ty - 0.04, tz);
      dummy.rotation.y = (i * 1.3) % (Math.PI * 2);
      dummy.scale.set(s, s * (0.9 + (i % 3) * 0.12), s);
      dummy.updateMatrix();
      trunks.setMatrixAt(placed, dummy.matrix);
      canopies.setMatrixAt(placed, dummy.matrix);

      tint.setHSL(0.32 + ((i % 7) - 3) * 0.015, 0.35, 0.65 + (i % 4) * 0.08);
      canopies.setColorAt(placed, tint);
      placed++;
    }
    trunks.count = placed;
    canopies.count = placed;
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
    trunks.computeBoundingSphere();
    canopies.computeBoundingSphere();
    scene.add(trunks, canopies);

    // 7. Animated 3D Wave Attack Paths matching real 3-wave axes
    const createWaveGroup = (paths: THREE.Vector3[][], hexColor: number) => {
      const group = new THREE.Group();
      const pulses: Array<{ mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; offset: number }> = [];
      const tubeMat = new THREE.MeshStandardMaterial({
        color: hexColor,
        emissive: new THREE.Color(hexColor),
        emissiveIntensity: 0.45,
        roughness: 0.3,
        metalness: 0.2,
      });
      const pulseMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: new THREE.Color(0xfacc15),
        emissiveIntensity: 0.9,
        roughness: 0.2,
      });
      const pulseGeo = new THREE.SphereGeometry(0.22, 10, 10);

      paths.forEach((pts, pIdx) => {
        const elevated = pts.map(
          (p) => new THREE.Vector3(p.x, valleyHeightAt(p.x, p.z) + 0.42, p.z),
        );
        const curve = new THREE.CatmullRomCurve3(elevated);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.1, 8, false), tubeMat);
        group.add(tube);

        const endPt = curve.getPoint(1);
        const tangent = curve.getTangent(1).normalize();
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.65, 10), tubeMat);
        head.position.copy(endPt);
        head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        group.add(head);

        const pulse = new THREE.Mesh(pulseGeo, pulseMat);
        group.add(pulse);
        pulses.push({ mesh: pulse, curve, offset: pIdx * 0.33 });
      });
      group.visible = false;
      scene.add(group);
      return { group, pulses };
    };

    // Wave 1: Assault on Him Lam (NE), Doc Lap (N), and Ban Keo (NW)
    const wave1Vis = createWaveGroup(
      [
        [new THREE.Vector3(5.4, 0, -7.2), new THREE.Vector3(3.8, 0, -5.8), new THREE.Vector3(2.3, 0, -4.7)],
        [new THREE.Vector3(-4.2, 0, -8.2), new THREE.Vector3(-2.4, 0, -6.9), new THREE.Vector3(-1.0, 0, -5.9)],
        [new THREE.Vector3(-5.8, 0, -5.4), new THREE.Vector3(-4.4, 0, -4.5), new THREE.Vector3(-3.3, 0, -3.8)],
      ],
      0xea580c,
    );

    // Wave 2: Eastern hill assaults (D1/E1, C1, A1) + western trench cutting Muong Thanh Airstrip
    const wave2Vis = createWaveGroup(
      [
        [new THREE.Vector3(6.4, 0, -2.6), new THREE.Vector3(4.3, 0, -2.1), new THREE.Vector3(2.7, 0, -1.75)],
        [new THREE.Vector3(6.4, 0, -0.5), new THREE.Vector3(4.5, 0, -0.35), new THREE.Vector3(2.95, 0, -0.25)],
        [new THREE.Vector3(6.2, 0, 2.4), new THREE.Vector3(4.5, 0, 1.9), new THREE.Vector3(3.1, 0, 1.5)],
        [new THREE.Vector3(-5.2, 0, -1.6), new THREE.Vector3(-3.2, 0, -1.2), new THREE.Vector3(-1.6, 0, -0.85)],
      ],
      0x0284c7,
    );

    // Wave 3: General offensive across Hill A1 & Muong Thanh Bridge into De Castries HQ + Hong Cum South
    const wave3Vis = createWaveGroup(
      [
        [new THREE.Vector3(2.85, 0, 1.45), new THREE.Vector3(1.5, 0, 0.9), new THREE.Vector3(0.05, 0, 0.68)],
        [new THREE.Vector3(-4.8, 0, 1.4), new THREE.Vector3(-2.4, 0, 1.0), new THREE.Vector3(-0.75, 0, 0.72)],
        [new THREE.Vector3(4.6, 0, 6.8), new THREE.Vector3(2.4, 0, 6.0), new THREE.Vector3(0.85, 0, 5.5)],
      ],
      0xdc2626,
    );

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Reusable scratch vectors & performance.now() timing (avoids THREE.Clock deprecation warning)
    const _proj = new THREE.Vector3();
    const _pulsePt = new THREE.Vector3();
    let prevTimeMs = performance.now();
    const startTimeMs = prevTimeMs;
    let frameId = 0;
    let timerId = 0;
    let disposed = false;
    let lastOverlayPush = 0;
    let lastResetToken = resetCamTriggerRef.current;

    const projectOverlays = () => {
      const w = renderer.domElement.clientWidth || width;
      const h = renderer.domElement.clientHeight || height;

      const nextZones: ProjectedZoneMarker[] = MAP_ZONES.map((z) => {
        _proj.set(z.worldPos[0], valleyHeightAt(z.worldPos[0], z.worldPos[2]) + 1.05, z.worldPos[2]);
        _proj.project(camera);
        const visible = _proj.z > -1 && _proj.z < 1;
        const px = (_proj.x * 0.5 + 0.5) * w;
        const py = (-_proj.y * 0.5 + 0.5) * h;
        return {
          id: z.id,
          x: THREE.MathUtils.clamp(px, 96, Math.max(96, w - 96)),
          y: THREE.MathUtils.clamp(py, 82, Math.max(82, h - 58)),
          visible,
        };
      });
      setMarkers(nextZones);

      if (modeRef.current === 'station2') {
        const rawLandmarks: ProjectedLandmarkMarker[] = REALISTIC_MAP_LANDMARKS.map((lm) => {
          _proj.set(
            lm.worldPos[0],
            valleyHeightAt(lm.worldPos[0], lm.worldPos[2]) + 0.75,
            lm.worldPos[2],
          );
          _proj.project(camera);
          const inFrustum = _proj.z > -1 && _proj.z < 1;
          const px = (_proj.x * 0.5 + 0.5) * w;
          const py = (-_proj.y * 0.5 + 0.5) * h;
          return {
            id: lm.id,
            x: THREE.MathUtils.clamp(px, 76, Math.max(76, w - 76)),
            y: THREE.MathUtils.clamp(py, 76, Math.max(76, h - 52)),
            visible: inFrustum && px > 36 && px < w - 36 && py > 66 && py < h - 42,
          };
        });

        // Two-pass 2D separation so no two visible landmark pills ever overlap on screen
        for (let pass = 0; pass < 3; pass++) {
          for (let i = 0; i < rawLandmarks.length; i++) {
            const a = rawLandmarks[i];
            if (!a.visible) continue;
            for (let j = i + 1; j < rawLandmarks.length; j++) {
              const b = rawLandmarks[j];
              if (!b.visible) continue;
              const dx = Math.abs(a.x - b.x);
              const dy = b.y - a.y;
              if (dx < 128 && Math.abs(dy) < 34) {
                const push = (34 - Math.abs(dy)) * 0.55 + 1;
                if (dy >= 0) {
                  a.y = THREE.MathUtils.clamp(a.y - push, 76, Math.max(76, h - 52));
                  b.y = THREE.MathUtils.clamp(b.y + push, 76, Math.max(76, h - 52));
                } else {
                  a.y = THREE.MathUtils.clamp(a.y + push, 76, Math.max(76, h - 52));
                  b.y = THREE.MathUtils.clamp(b.y - push, 76, Math.max(76, h - 52));
                }
              }
            }
          }
        }
        setLandmarkMarkers(rawLandmarks);
      }
    };

    projectOverlays();

    const tick = () => {
      if (disposed) return;
      const nowMs = performance.now();
      const dt = Math.min((nowMs - prevTimeMs) / 1000, 0.08);
      prevTimeMs = nowMs;
      const elapsed = (nowMs - startTimeMs) / 1000;

      if (resetCamTriggerRef.current !== lastResetToken) {
        lastResetToken = resetCamTriggerRef.current;
        cameraPosDesiredRef.current.set(0.2, 12.5, 13.0);
        cameraTargetDesiredRef.current.set(0, 0.4, 0.2);
        isTransitioningRef.current = true;
      }

      if (isTransitioningRef.current) {
        const alpha = 1 - Math.exp(-4.8 * dt);
        camera.position.lerp(cameraPosDesiredRef.current, alpha);
        controls.target.lerp(cameraTargetDesiredRef.current, alpha);
        if (
          camera.position.distanceToSquared(cameraPosDesiredRef.current) < 0.02 &&
          controls.target.distanceToSquared(cameraTargetDesiredRef.current) < 0.02
        ) {
          isTransitioningRef.current = false;
        }
      }
      controls.update();

      const curWave = modeRef.current === 'station2' ? activeWaveRef.current : null;
      wave1Vis.group.visible = curWave === 'wave1';
      wave2Vis.group.visible = curWave === 'wave2';
      wave3Vis.group.visible = curWave === 'wave3';

      // Highlight Hill A1 explosive crater during Wave 3
      a1BlastRing.visible = curWave === 'wave3';
      if (a1BlastRing.visible) {
        const s = 1 + Math.sin(elapsed * 5.2) * 0.14;
        a1BlastRing.scale.set(s, s, 1);
      }

      // Highlight Viet Minh trench network glowing warmly during Wave 2 & Wave 3
      trenchMat.emissiveIntensity =
        curWave === 'wave2' || curWave === 'wave3' ? 0.38 + Math.sin(elapsed * 3.5) * 0.16 : 0.04;

      // Subtle artillery muzzle flashes on surrounding mountain slopes when an attack wave is active
      artilleryPosts.forEach((post, idx) => {
        if (!curWave) {
          post.muzzleGlow.visible = false;
          return;
        }
        const phase = (elapsed * 1.4 + idx * 0.37) % 1;
        post.muzzleGlow.visible = phase < 0.14;
      });

      const activeVis =
        curWave === 'wave1' ? wave1Vis : curWave === 'wave2' ? wave2Vis : curWave === 'wave3' ? wave3Vis : null;
      if (activeVis) {
        activeVis.pulses.forEach((p) => {
          const t = (elapsed * 0.58 + p.offset) % 1;
          p.curve.getPoint(t, _pulsePt);
          p.mesh.position.copy(_pulsePt);
        });
      }

      (['north', 'center', 'south'] as ZoneId[]).forEach((zId) => {
        const ring = sectorRings[zId];
        const mat = ring.material as THREE.MeshStandardMaterial;
        const highlighted =
          (curWave === 'wave1' && zId === 'north') ||
          (curWave === 'wave2' && zId === 'center') ||
          (curWave === 'wave3' && (zId === 'center' || zId === 'south'));
        mat.emissiveIntensity = highlighted ? 0.55 + Math.sin(elapsed * 4) * 0.2 : 0.15;
      });

      // Dynamically update stronghold flags (France -> Vietnam) matching historical wave progression
      strongholdFlags.forEach((entry, idx) => {
        const owner = getStrongholdFlagOwner(entry.id, curWave);
        if (entry.lastOwner !== owner) {
          entry.lastOwner = owner;
          entry.flagMat.map = owner === 'vietnam' ? vnFlagTex : frenchFlagTex;
          entry.flagMat.needsUpdate = true;
        }
        entry.flagMesh.rotation.y = Math.sin(elapsed * 3.4 + idx) * 0.14;
      });

      const bunkerOwner = getStrongholdFlagOwner('bunker', curWave);
      if (lastBunkerOwner !== bunkerOwner) {
        lastBunkerOwner = bunkerOwner;
        bunker.victoryFlagMat.map = bunkerOwner === 'vietnam' ? vnFlagTex : frenchFlagTex;
        bunker.victoryFlagMat.needsUpdate = true;
      }

      const targetFlagScale = curWave === 'wave3' ? 1.42 : 0.72;
      bunker.victoryFlagPole.scale.setScalar(
        THREE.MathUtils.damp(bunker.victoryFlagPole.scale.x, targetFlagScale, 5.5, dt),
      );
      const flagPos = bunker.victoryFlagMesh.geometry.attributes.position;
      for (let i = 0; i < flagPos.count; i++) {
        const fx = flagPos.getX(i);
        const waveZ = Math.sin(fx * 5.0 - elapsed * 5.2) * 0.065 * ((fx + 0.56) / 1.12);
        flagPos.setZ(i, waveZ);
      }
      flagPos.needsUpdate = true;

      renderer.render(scene, camera);

      if (elapsed - lastOverlayPush > 0.12) {
        lastOverlayPush = elapsed;
        projectOverlays();
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
      const nw = container.clientWidth || 760;
      const nh = container.clientHeight || 480;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      projectOverlays();
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
      saBanTex?.dispose();
      woodMat.dispose();
      brassTrimMat.dispose();
      tableBaseGeo.dispose();
      railNSGeo.dispose();
      railEWGeo.dispose();
      plaqueGeo.dispose();
      vnFlagTex.dispose();
      frenchFlagTex.dispose();
      riverGeo.dispose();
      riverMat.dispose();
      runwayGeo.dispose();
      runwayMat.dispose();
      trenchMeshes.forEach((m) => m.geometry.dispose());
      trenchMat.dispose();
      trunkGeo.dispose();
      trunkMat.dispose();
      canopyGeo.dispose();
      canopyMat.dispose();
      envRT.dispose();
      renderer.dispose();
    };
  }, [viewMode]);

  const handleResetCamera = () => {
    resetCamTriggerRef.current += 1;
  };

  const handleZoneDropEvent = (targetId: ZoneId, rawData: string) => {
    setDragOverZone(null);
    if (!onDropZone) return;
    if (rawData === 'north' || rawData === 'center' || rawData === 'south') {
      onDropZone(targetId, rawData);
    }
  };

  const activeWaveMeta = activeWave ? CAMPAIGN_WAVES.find((w) => w.id === activeWave) : null;
  const headerTitle =
    mode === 'station1'
      ? viewMode === '2d'
        ? 'Sa bàn Lịch sử Chiến dịch Điện Biên Phủ 1954'
        : 'Sa bàn 3D Lòng chảo Điện Biên Phủ 1954'
      : activeWaveMeta
        ? `${viewMode === '2d' ? 'Sa bàn lịch sử' : 'Sa bàn 3D'}: ${activeWaveMeta.title} (${activeWaveMeta.dateRange})`
        : journeyStarted
          ? 'Chọn một đợt tiến công bên dưới để quan sát trên sa bàn'
          : viewMode === '2d'
            ? 'Sa bàn Lịch sử Địa hình thực tế Điện Biên Phủ 1954'
            : 'Sa bàn 3D Địa hình thực tế Điện Biên Phủ 1954';

  return (
    <div
      className="w-full overflow-hidden rounded-3xl border-2 border-amber-900/25 bg-[#201710] shadow-lg"
      data-testid="three-map-viewport"
      data-map-view-mode={viewMode}
    >
      {/* Top Museum Sa Bàn Header Strip (never covers northern strongholds!) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-amber-200/15 bg-gradient-to-r from-[#2e2218] via-[#251b13] to-[#2e2218] px-3.5 py-2.5 sm:px-4">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
          <span className="font-display text-sm font-extrabold text-amber-50 md:text-base">
            {headerTitle}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 2D Historical Relief Sa Bàn vs Rotatable 3D Relief Toggle */}
          <div
            role="group"
            aria-label="Chọn chế độ hiển thị sa bàn"
            className="inline-flex items-center rounded-xl border border-amber-200/25 bg-black/35 p-0.5"
          >
            <button
              type="button"
              data-testid="toggle-saban-2d"
              onClick={() => {
                setViewMode('2d');
                setSelectedLandmark(null);
              }}
              aria-pressed={viewMode === '2d'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-extrabold transition-colors cursor-pointer sm:text-sm ${
                viewMode === '2d'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-amber-100/90 hover:text-white'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sa bàn 2D</span>
            </button>
            <button
              type="button"
              data-testid="toggle-saban-3d"
              onClick={() => {
                setViewMode('3d');
                setSelectedLandmark(null);
              }}
              aria-pressed={viewMode === '3d'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-extrabold transition-colors cursor-pointer sm:text-sm ${
                viewMode === '3d'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-amber-100/90 hover:text-white'
              }`}
            >
              <Box className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sa bàn 3D</span>
            </button>
          </div>

          {mode === 'station2' && (
            <button
              type="button"
              onClick={() => {
                setShowDetailedPins((v) => !v);
                setSelectedLandmark(null);
              }}
              aria-pressed={showDetailedPins}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm transition-colors cursor-pointer sm:text-sm ${
                showDetailedPins
                  ? 'border-emerald-400 bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'border-amber-200/30 bg-white/10 text-amber-50 hover:bg-white/20'
              }`}
            >
              {showDetailedPins ? (
                <Eye className="h-4 w-4" aria-hidden="true" />
              ) : (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Cứ điểm thực tế</span>
            </button>
          )}

          {viewMode === '3d' && (
            <button
              type="button"
              onClick={handleResetCamera}
              aria-label="Đặt lại góc nhìn sa bàn 3D"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/30 bg-white/10 px-3 py-1.5 text-xs font-bold text-amber-50 shadow-sm transition-colors hover:bg-white/20 cursor-pointer sm:text-sm"
            >
              <RotateCcw className="h-4 w-4 text-amber-300" aria-hidden="true" />
              <span>Toàn cảnh</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Map Stage: Default Realistic 2D Historical Relief Sa Bàn OR Rotatable 3D Relief Table */}
      {viewMode === '2d' ? (
        <SaBan2DView
          mode={mode}
          assignments={assignments}
          selectedZoneCard={selectedZoneCard}
          onDropZone={onDropZone}
          flashZone={flashZone}
          dragOverZone={dragOverZone}
          onSetDragOverZone={setDragOverZone}
          activeWave={activeWave}
          showDetailedPins={showDetailedPins}
          selectedLandmark={selectedLandmark}
          onSelectLandmark={setSelectedLandmark}
        />
      ) : (
        <div className="relative h-[430px] w-full overflow-hidden bg-[#eae2d3] md:h-[520px]">
          {/* Dedicated empty mount div for WebGL canvas */}
          <div ref={mountRef} className="h-full w-full" />

          {webglError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber-50 p-6 text-center">
              <p className="font-display text-2xl font-bold text-emerald-900">
                Sa bàn Chiến dịch Điện Biên Phủ 1954
              </p>
              <p className="mt-2 max-w-md text-base text-slate-700">
                Trình duyệt chưa hỗ trợ đồ họa ba chiều — em hãy chuyển sang chế độ Sa bàn 2D để khám phá đầy đủ nhé!
              </p>
            </div>
          )}

          {/* Station 1: Interactive Drop Zones anchored to 3D terrain positions */}
          {mode === 'station1' &&
            markers.map((marker) => {
              const zone = MAP_ZONES.find((z) => z.id === marker.id)!;
              const placedZoneId = assignments?.[marker.id] ?? null;
              const isCorrectlyPlaced = placedZoneId === marker.id;
              const isHovered = dragOverZone === marker.id;

              const isFlashTarget = flashZone?.id === marker.id;
              const isWrongFlash = isFlashTarget && !flashZone.correct;
              const isCorrectFlash = isFlashTarget && flashZone.correct;

              return (
                <div
                  key={marker.id}
                  style={{
                    left: `${marker.x}px`,
                    top: `${marker.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isCorrectlyPlaced) setDragOverZone(marker.id);
                  }}
                  onDragLeave={() => setDragOverZone(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData('text/plain');
                    handleZoneDropEvent(marker.id, draggedId);
                  }}
                  className="absolute z-10"
                >
                  <button
                    key={isFlashTarget ? `${marker.id}-${flashZone.seq}` : marker.id}
                    type="button"
                    data-testid={`map-dropzone-${marker.id}`}
                    onClick={() => {
                      if (!isCorrectlyPlaced && selectedZoneCard && onDropZone) {
                        onDropZone(marker.id, selectedZoneCard);
                      }
                    }}
                    aria-label={
                      isCorrectlyPlaced
                        ? `Đã ghép đúng ${zone.label}`
                        : `Vùng đích ${zone.shortTitle} (${zone.landmarks[0]})`
                    }
                    className={`min-w-[164px] rounded-2xl border-2 px-3.5 py-2 text-center shadow-md transition-all duration-100 active:scale-[0.97] cursor-pointer ${
                      isCorrectlyPlaced
                        ? `border-emerald-600 bg-emerald-600 text-white ${isCorrectFlash ? 'animate-flash-correct' : ''}`
                        : isWrongFlash
                          ? 'animate-flash-wrong border-rose-600 bg-rose-100 text-rose-950'
                          : isHovered || selectedZoneCard
                            ? 'scale-105 border-dashed border-amber-500 bg-amber-50 text-amber-950'
                            : 'border-dashed border-slate-700 bg-white/95 text-slate-900 hover:bg-amber-50'
                    }`}
                  >
                    {isCorrectlyPlaced ? (
                      <div>
                        <div className="font-display text-sm font-extrabold tracking-wide md:text-base">
                          ✓ {zone.label}
                        </div>
                        <div className="text-xs font-medium text-emerald-100">
                          {zone.landmarks[0]}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-display text-sm font-extrabold md:text-base">
                          {selectedZoneCard ? 'Thả thẻ vào đây!' : 'Ô thả tên khu vực'}
                        </div>
                        <div className="text-xs font-semibold text-slate-600">
                          {zone.landmarks[0]}
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              );
            })}

          {/* Station 2: Clickable Realistic Landmark Pins */}
          {mode === 'station2' &&
            showDetailedPins &&
            landmarkMarkers.map((lmProj) => {
              if (!lmProj.visible) return null;
              const lm = REALISTIC_MAP_LANDMARKS.find((item) => item.id === lmProj.id);
              if (!lm) return null;
              const isFocused = activeWave !== null && lm.waveFocus === activeWave;
              const isSelected = selectedLandmark?.id === lm.id;
              const flagOwner = getStrongholdFlagOwner(lm.id, activeWave);

              return (
                <div
                  key={lm.id}
                  style={{
                    left: `${lmProj.x}px`,
                    top: `${lmProj.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute z-10"
                >
                  <button
                    type="button"
                    data-testid={`landmark-pin-${lm.id}`}
                    data-flag-owner={flagOwner}
                    onClick={() => setSelectedLandmark(isSelected ? null : lm)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-2.5 py-1 text-xs font-extrabold whitespace-nowrap shadow-sm transition-all duration-100 hover:scale-105 cursor-pointer ${
                      isSelected
                        ? 'scale-105 border-amber-500 bg-amber-400 text-slate-950 shadow-md'
                        : isFocused
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-slate-300 bg-white/95 text-slate-800 hover:border-emerald-500'
                    }`}
                  >
                    <MiniFlagBadge owner={flagOwner} />
                    <span>{lm.label}</span>
                  </button>
                </div>
              );
            })}

          {/* Station 2: Fallback Sector Labels when Detailed Pins are toggled off */}
          {mode === 'station2' &&
            !showDetailedPins &&
            markers.map((marker) => {
              const zone = MAP_ZONES.find((z) => z.id === marker.id)!;
              const isHighlighted =
                (activeWave === 'wave1' && marker.id === 'north') ||
                (activeWave === 'wave2' && marker.id === 'center') ||
                (activeWave === 'wave3' && (marker.id === 'center' || marker.id === 'south'));

              return (
                <div
                  key={marker.id}
                  style={{
                    left: `${marker.x}px`,
                    top: `${marker.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="pointer-events-none absolute z-10"
                >
                  <div
                    className={`rounded-xl border-2 px-3 py-1.5 text-center shadow-sm transition-transform ${
                      isHighlighted
                        ? 'scale-105 border-red-600 bg-red-600 text-white'
                        : 'border-slate-300 bg-white/92 text-slate-800'
                    }`}
                  >
                    <div className="font-display text-xs font-extrabold whitespace-nowrap md:text-sm">
                      {zone.label}
                    </div>
                    <div className={`text-[11px] font-semibold ${isHighlighted ? 'text-amber-100' : 'text-slate-600'}`}>
                      {zone.landmarks[0]}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Station 2: Compact Landmark Detail Card when student clicks any 3D stronghold pin */}
          {mode === 'station2' && selectedLandmark && (
            <div
              data-testid="landmark-detail-card"
              className="animate-pop-in absolute right-3 bottom-3 z-20 max-w-xs rounded-2xl border-2 border-amber-400 bg-white/98 p-3.5 shadow-xl"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-base font-extrabold text-red-700">
                  {selectedLandmark.label}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedLandmark(null)}
                  aria-label="Đóng chú thích địa danh"
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-1 text-sm leading-snug font-medium text-slate-700">
                {selectedLandmark.note}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom Museum Legend Bar (shows historical flag & sector symbols cleanly) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/15 bg-[#1b130d] px-4 py-2 text-xs font-semibold text-amber-100/90">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 font-bold text-amber-50">
            <MiniFlagBadge owner="vietnam" />
            <span>Trận địa / Cứ điểm Việt Nam</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-amber-50">
            <MiniFlagBadge owner="france" />
            <span>Cứ điểm quân Pháp</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-400" aria-hidden="true" />
            Phân khu Bắc
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" aria-hidden="true" />
            Phân khu Trung tâm
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
            Phân khu Nam
          </span>
        </div>
        <span className="text-amber-200/80">
          {viewMode === '2d'
            ? mode === 'station2'
              ? 'Bấm vào từng cứ điểm trên sa bàn để xem chú thích lịch sử'
              : 'Chuyển sang Sa bàn 3D để xoay địa hình'
            : 'Kéo để xoay sa bàn 3D · Cuộn để phóng to thu nhỏ'}
        </span>
      </div>
    </div>
  );
}
