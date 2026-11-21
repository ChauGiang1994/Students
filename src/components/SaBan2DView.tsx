import { X } from 'lucide-react';
import {
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

interface SaBan2DViewProps {
  mode: 'station1' | 'station2';
  assignments?: Station1Assignments;
  selectedZoneCard?: ZoneId | null;
  onDropZone?: (targetZoneId: ZoneId, draggedZoneId: ZoneId) => void;
  flashZone?: { id: ZoneId; correct: boolean; seq: number } | null;
  dragOverZone: ZoneId | null;
  onSetDragOverZone: (zoneId: ZoneId | null) => void;
  activeWave: WaveId | null;
  showDetailedPins: boolean;
  selectedLandmark: RealisticLandmarkPin | null;
  onSelectLandmark: (landmark: RealisticLandmarkPin | null) => void;
}

/** Exact terrain coordinates (viewBox 1000 x 750) matching the photorealistic Dien Bien Phu sa bàn */
const TERRAIN_POINTS: Record<string, { x: number; y: number }> = {
  ban_keo: { x: 355, y: 152 },
  doc_lap: { x: 492, y: 132 },
  him_lam: { x: 632, y: 162 },
  airstrip: { x: 382, y: 315 },
  bridge: { x: 490, y: 360 },
  bunker: { x: 356, y: 396 },
  doi_d1_e1: { x: 615, y: 294 },
  doi_c1: { x: 642, y: 378 },
  doi_a1: { x: 638, y: 472 },
  hong_cum: { x: 532, y: 635 },
};

/** 8 fortified enemy strongholds inside the Dien Bien Phu valley that carry dynamic flags */
const STRONGHOLD_FLAG_POSITIONS: Array<{ id: string; x: number; y: number }> = [
  { id: 'ban_keo', x: 348, y: 152 },
  { id: 'doc_lap', x: 492, y: 134 },
  { id: 'him_lam', x: 636, y: 164 },
  { id: 'doi_d1_e1', x: 618, y: 294 },
  { id: 'doi_c1', x: 644, y: 378 },
  { id: 'doi_a1', x: 638, y: 472 },
  { id: 'bunker', x: 344, y: 396 },
  { id: 'hong_cum', x: 534, y: 634 },
];

/** Surrounding Viet Minh mountain artillery & siege positions (always Vietnamese flag) */
const VIETNAMESE_OUTER_POSTS: Array<{ id: string; x: number; y: number; label: string }> = [
  { id: 'vn_post_ne', x: 862, y: 108, label: 'Trận địa pháo Việt Nam' },
  { id: 'vn_post_nw', x: 176, y: 112, label: 'Trận địa Việt Nam' },
  { id: 'vn_post_east', x: 868, y: 384, label: 'Trận địa Việt Nam' },
  { id: 'vn_post_west', x: 150, y: 446, label: 'Trận địa Việt Nam' },
];

/** Crisp inline HTML mini flag badge for pins and legends */
export function MiniFlagBadge({ owner }: { owner: FlagOwner }) {
  if (owner === 'vietnam') {
    return (
      <svg
        viewBox="0 0 24 16"
        className="h-3.5 w-5 shrink-0 rounded-[2px] border border-amber-200/80 shadow-xs"
        aria-label="Cờ Việt Nam"
      >
        <rect width="24" height="16" fill="#DA251D" />
        <polygon
          points="12,3 13.4,7.2 17.8,7.2 14.2,9.8 15.6,14 12,11.4 8.4,14 9.8,9.8 6.2,7.2 10.6,7.2"
          fill="#FFCD00"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 16"
      className="h-3.5 w-5 shrink-0 rounded-[2px] border border-slate-400/90 shadow-xs"
      aria-label="Cờ nước Pháp"
    >
      <rect x="0" y="0" width="8" height="16" fill="#002395" />
      <rect x="8" y="0" width="8" height="16" fill="#FFFFFF" />
      <rect x="16" y="0" width="8" height="16" fill="#ED2939" />
    </svg>
  );
}

/** Crisp SVG flagpole planted directly on the 2D sa bàn terrain */
function SaBanSvgFlag({
  x,
  y,
  owner,
  scale = 1,
}: {
  x: number;
  y: number;
  owner: FlagOwner;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} filter="url(#tactical-glow)">
      {/* Ground anchor ring */}
      <circle cx="0" cy="0" r="3.4" fill={owner === 'vietnam' ? '#FACC15' : '#E2E8F0'} stroke="#1E293B" strokeWidth="1" />
      {/* Flagpole */}
      <line
        x1="0"
        y1="0"
        x2="0"
        y2="-31"
        stroke={owner === 'vietnam' ? '#FDE047' : '#F1F5F9'}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="0" cy="-32" r="2.2" fill={owner === 'vietnam' ? '#FACC15' : '#CBD5E1'} />

      {owner === 'vietnam' ? (
        <g>
          <rect
            x="1.5"
            y="-31"
            width="26"
            height="17"
            rx="1.2"
            fill="#DA251D"
            stroke="#FEF08A"
            strokeWidth="0.9"
          />
          <polygon
            points="14.5,-27.4 15.8,-23.4 20,-23.4 16.6,-21 17.9,-17 14.5,-19.4 11.1,-17 12.4,-21 9,-23.4 13.2,-23.4"
            fill="#FFCD00"
          />
        </g>
      ) : (
        <g>
          <rect x="1.5" y="-31" width="8.7" height="17" fill="#002395" />
          <rect x="10.2" y="-31" width="8.6" height="17" fill="#FFFFFF" />
          <rect x="18.8" y="-31" width="8.7" height="17" fill="#ED2939" />
          <rect
            x="1.5"
            y="-31"
            width="26"
            height="17"
            rx="1.2"
            fill="none"
            stroke="#1E293B"
            strokeWidth="0.9"
          />
        </g>
      )}
    </g>
  );
}

export function SaBan2DView({
  mode,
  assignments,
  selectedZoneCard,
  onDropZone,
  flashZone,
  dragOverZone,
  onSetDragOverZone,
  activeWave,
  showDetailedPins,
  selectedLandmark,
  onSelectLandmark,
}: SaBan2DViewProps) {
  const handleZoneDropEvent = (targetId: ZoneId, rawData: string) => {
    onSetDragOverZone(null);
    if (!onDropZone) return;
    if (rawData === 'north' || rawData === 'center' || rawData === 'south') {
      onDropZone(targetId, rawData);
    }
  };

  const isSectorHighlighted = (zoneId: ZoneId) => {
    if (mode === 'station1') {
      return assignments?.[zoneId] === zoneId;
    }
    return (
      (activeWave === 'wave1' && zoneId === 'north') ||
      (activeWave === 'wave2' && zoneId === 'center') ||
      (activeWave === 'wave3' && (zoneId === 'center' || zoneId === 'south'))
    );
  };

  return (
    <div
      className="relative flex w-full items-center justify-center bg-gradient-to-b from-[#2a1f16] via-[#201710] to-[#17100b] px-2 py-2.5 sm:px-4 sm:py-3.5"
      data-testid="saban-2d-stage"
    >
      {/* Aspect-locked 4:3 Museum Sa Bàn Frame so 100% of pins & tactical arrows align 1:1 on every screen */}
      <div className="relative mx-auto aspect-[4/3] w-full max-w-[760px] overflow-hidden rounded-xl border-2 border-amber-200/35 bg-[#1b140e] shadow-2xl">
        <img
          src={SA_BAN_MAP_IMAGE}
          alt="Sa bàn địa hình lịch sử Chiến dịch Điện Biên Phủ năm 1954 gồm Phân khu Bắc, Phân khu Trung tâm và Phân khu Nam"
          referrerPolicy="no-referrer"
          draggable={false}
          className="h-full w-full object-fill select-none"
        />

        {/* Subtle warm vignette around wooden edge to enhance museum spotlight contrast */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow: 'inset 0 0 38px rgba(15, 10, 6, 0.45)',
          }}
        />

        {/* Interactive Historical Cartographic & Tactical SVG Layer */}
        <svg
          viewBox="0 0 1000 750"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="arrow-wave1"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#F97316" stroke="#FFFBEB" strokeWidth="0.9" />
            </marker>
            <marker
              id="arrow-wave2"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#38BDF8" stroke="#F0F9FF" strokeWidth="0.9" />
            </marker>
            <marker
              id="arrow-wave3"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#EF4444" stroke="#FEF08A" strokeWidth="0.9" />
            </marker>
            <filter id="tactical-glow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.65" />
            </filter>
          </defs>

          {/* Subtle Museum North Compass Rose (Top-Left inside frame) */}
          <g transform="translate(82, 76)" opacity="0.9">
            <circle cx="0" cy="0" r="24" fill="rgba(20, 14, 10, 0.62)" stroke="#FDE68A" strokeWidth="1.5" />
            <polygon points="0,-16 5,-2 0,-5 -5,-2" fill="#EF4444" />
            <polygon points="0,16 5,2 0,5 -5,2" fill="#FDE68A" />
            <text
              x="0"
              y="-28"
              textAnchor="middle"
              fill="#FEF3C7"
              fontSize="13"
              fontWeight="800"
              letterSpacing="0.06em"
            >
              BẮC
            </text>
          </g>

          {/* 3 Historical Sector Perimeter Ovals matching SGK Hình 1 */}
          {/* Phân khu Bắc */}
          <ellipse
            cx="496"
            cy="155"
            rx="212"
            ry="76"
            fill={isSectorHighlighted('north') ? 'rgba(234, 88, 12, 0.16)' : 'rgba(234, 88, 12, 0.06)'}
            stroke={isSectorHighlighted('north') ? '#FDBA74' : 'rgba(251, 146, 60, 0.72)'}
            strokeWidth={isSectorHighlighted('north') ? '4' : '2.4'}
            strokeDasharray="12 8"
          />

          {/* Phân khu Trung tâm */}
          <ellipse
            cx="496"
            cy="392"
            rx="252"
            ry="136"
            fill={isSectorHighlighted('center') ? 'rgba(14, 165, 233, 0.14)' : 'rgba(14, 165, 233, 0.05)'}
            stroke={isSectorHighlighted('center') ? '#7DD3FC' : 'rgba(56, 189, 248, 0.72)'}
            strokeWidth={isSectorHighlighted('center') ? '4' : '2.4'}
            strokeDasharray="12 8"
          />

          {/* Phân khu Nam */}
          <ellipse
            cx="530"
            cy="632"
            rx="150"
            ry="62"
            fill={isSectorHighlighted('south') ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.06)'}
            stroke={isSectorHighlighted('south') ? '#6EE7B7' : 'rgba(52, 211, 153, 0.75)'}
            strokeWidth={isSectorHighlighted('south') ? '4' : '2.4'}
            strokeDasharray="12 8"
          />

          {/* Glowing LED Beacon Points on all 10 historical strongholds */}
          {mode === 'station2' &&
            REALISTIC_MAP_LANDMARKS.map((lm) => {
              const pt = TERRAIN_POINTS[lm.id];
              if (!pt) return null;
              const isWaveTarget = activeWave !== null && lm.waveFocus === activeWave;
              const owner = getStrongholdFlagOwner(lm.id, activeWave);
              const dotColor = owner === 'vietnam' ? '#EF4444' : '#2563EB';
              return (
                <g key={lm.id}>
                  {isWaveTarget && (
                    <circle cx={pt.x} cy={pt.y} r="14" fill="none" stroke="#FEF08A" strokeWidth="2.5" opacity="0.85">
                      <animate attributeName="r" values="9;20;9" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.9;0.15;0.9" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isWaveTarget ? '6.2' : '4.5'}
                    fill={dotColor}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                </g>
              );
            })}

          {/* Surrounding Vietnamese Mountain Artillery & Siege Flags (always Vietnamese Red Star Flag) */}
          {VIETNAMESE_OUTER_POSTS.map((post) => (
            <SaBanSvgFlag key={post.id} x={post.x} y={post.y} owner="vietnam" scale={1.08} />
          ))}

          {/* Dynamic Historical Stronghold Flags (French Tricolor when enemy-held -> Vietnamese Red Star Flag when liberated) */}
          {STRONGHOLD_FLAG_POSITIONS.map((pos) => {
            const effectiveWave = mode === 'station2' ? activeWave : null;
            // In Station 2 Wave 3, Hầm Đờ Ca-xtơ-ri gets the large animated Victory Flag below
            if (mode === 'station2' && activeWave === 'wave3' && pos.id === 'bunker') {
              return null;
            }
            const owner = getStrongholdFlagOwner(pos.id, effectiveWave);
            return <SaBanSvgFlag key={`flag-${pos.id}`} x={pos.x} y={pos.y} owner={owner} scale={0.96} />;
          })}

          {/* WAVE 1 TACTICAL ARROWS: Assault on Him Lam, Độc Lập, Bản Kéo */}
          {mode === 'station2' && activeWave === 'wave1' && (
            <g filter="url(#tactical-glow)">
              {/* NE Artillery & Infantry Assault into Him Lam */}
              <path
                d="M 855 82 Q 748 112 650 156"
                fill="none"
                stroke="#F97316"
                strokeWidth="7"
                strokeLinecap="round"
                markerEnd="url(#arrow-wave1)"
              />
              <path
                d="M 855 82 Q 748 112 650 156"
                fill="none"
                stroke="#FEF08A"
                strokeWidth="2.6"
                strokeDasharray="10 14"
                strokeLinecap="round"
              >
                <animate attributeName="stroke-dashoffset" from="48" to="0" dur="1.1s" repeatCount="indefinite" />
              </path>

              {/* North Assault into Độc Lập */}
              <path
                d="M 488 32 Q 492 78 492 118"
                fill="none"
                stroke="#F97316"
                strokeWidth="7"
                strokeLinecap="round"
                markerEnd="url(#arrow-wave1)"
              />
              <path
                d="M 488 32 Q 492 78 492 118"
                fill="none"
                stroke="#FEF08A"
                strokeWidth="2.6"
                strokeDasharray="10 14"
                strokeLinecap="round"
              >
                <animate attributeName="stroke-dashoffset" from="48" to="0" dur="1.1s" repeatCount="indefinite" />
              </path>

              {/* NW Encirclement into Bản Kéo */}
              <path
                d="M 185 88 Q 268 118 340 146"
                fill="none"
                stroke="#F97316"
                strokeWidth="7"
                strokeLinecap="round"
                markerEnd="url(#arrow-wave1)"
              />
              <path
                d="M 185 88 Q 268 118 340 146"
                fill="none"
                stroke="#FEF08A"
                strokeWidth="2.6"
                strokeDasharray="10 14"
                strokeLinecap="round"
              >
                <animate attributeName="stroke-dashoffset" from="48" to="0" dur="1.1s" repeatCount="indefinite" />
              </path>
            </g>
          )}

          {/* WAVE 2 TACTICAL ARROWS: Eastern Hill Chain (D1-E1, C1, A1) & Trench Cutting Airstrip */}
          {mode === 'station2' && activeWave === 'wave2' && (
            <g filter="url(#tactical-glow)">
              {/* East -> D1/E1 */}
              <path
                d="M 858 242 Q 748 265 636 290"
                fill="none"
                stroke="#0EA5E9"
                strokeWidth="7"
                strokeLinecap="round"
                markerEnd="url(#arrow-wave2)"
              />
              <path
                d="M 858 242 Q 748 265 636 290"
                fill="none"
                stroke="#E0F2FE"
                strokeWidth="2.6"
                strokeDasharray="10 14"
                strokeLinecap="round"
              >
                <animate attributeName="stroke-dashoffset" from="48" to="0" dur="1.15s" repeatCount="indefinite" />
              </path>

              {/* East -> C1 */}
              <path
                d="M 875 372 Q 765 376 662 378"
                fill="none"
                stroke="#0EA5E9"
                strokeWidth="7"
                strokeLinecap="round"
                markerEnd="url(#arrow-wave2)"
              />
              <path
                d="M 875 372 Q 765 376 662 378"
                fill="none"
                stroke="#E0F2FE"
                strokeWidth="2.6"
                strokeDasharray="10 14"
                strokeLinecap="round"
              >
                <animate attributeName="stroke-dashoffset" from="48" to="0" dur="1.15s" repeatCount="indefinite" />
              </path>

              {/* East -> A1 */}
              <path
                d="M 858 518 Q 755 496 658 476"
                fill="none"
                stroke="#0EA5E9"
                strokeWidth="7"
                strokeLinecap="round"
                markerEnd="url(#arrow-wave2)"
              />
              <path
                d="M 858 518 Q 755 496 658 476"
                fill="none"
                stroke="#E0F2FE"
                strokeWidth="2.6"
                strokeDasharray="10 14"
                strokeLinecap="round"
              >
                <animate attributeName="stroke-dashoffset" from="48" to="0" dur="1.15s" repeatCount="indefinite" />
              </path>

              {/* Western Encirclement Trench Cutting Muong Thanh Airstrip */}
              <path
                d="M 135 288 Q 252 302 365 315"
                fill="none"
                stroke="#0EA5E9"
                strokeWidth="6.5"
                strokeLinecap="round"
                markerEnd="url(#arrow-wave2)"
              />
              <path
                d="M 135 288 Q 252 302 365 315"
                fill="none"
                stroke="#E0F2FE"
                strokeWidth="2.4"
                strokeDasharray="10 14"
                strokeLinecap="round"
              >
                <animate attributeName="stroke-dashoffset" from="48" to="0" dur="1.15s" repeatCount="indefinite" />
              </path>
            </g>
          )}

          {/* WAVE 3 TACTICAL ARROWS: Hill A1 Blast -> General Assault on De Castries HQ + Hong Cum + Victory Flag */}
          {mode === 'station2' && activeWave === 'wave3' && (
            <g filter="url(#tactical-glow)">
              {/* Dramatic Hill A1 Mine Explosion Ring (Night of 6/5/1954) */}
              <circle cx="638" cy="472" r="22" fill="rgba(239, 68, 68, 0.28)" stroke="#FACC15" strokeWidth="3.5">
                <animate attributeName="r" values="14;32;14" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.95;0.25;0.95" dur="1.5s" repeatCount="indefinite" />
              </circle>

              {/* General Offensive from Hill A1 across Muong Thanh Bridge into De Castries Bunker */}
              <path
                d="M 626 462 Q 535 385 376 396"
                fill="none"
                stroke="#EF4444"
                strokeWidth="7.5"
                strokeLinecap="round"
                markerEnd="url(#arrow-wave3)"
              />
              <path
                d="M 626 462 Q 535 385 376 396"
                fill="none"
                stroke="#FEF08A"
                strokeWidth="2.8"
                strokeDasharray="10 14"
                strokeLinecap="round"
              >
                <animate attributeName="stroke-dashoffset" from="48" to="0" dur="1.0s" repeatCount="indefinite" />
              </path>

              {/* Western Assault straight into De Castries Bunker */}
              <path
                d="M 145 435 Q 245 415 338 400"
                fill="none"
                stroke="#EF4444"
                strokeWidth="7.5"
                strokeLinecap="round"
                markerEnd="url(#arrow-wave3)"
              />
              <path
                d="M 145 435 Q 245 415 338 400"
                fill="none"
                stroke="#FEF08A"
                strokeWidth="2.8"
                strokeDasharray="10 14"
                strokeLinecap="round"
              >
                <animate attributeName="stroke-dashoffset" from="48" to="0" dur="1.0s" repeatCount="indefinite" />
              </path>

              {/* Southern Offensive capturing Hồng Cúm */}
              <path
                d="M 790 672 Q 668 656 552 638"
                fill="none"
                stroke="#EF4444"
                strokeWidth="7"
                strokeLinecap="round"
                markerEnd="url(#arrow-wave3)"
              />
              <path
                d="M 790 672 Q 668 656 552 638"
                fill="none"
                stroke="#FEF08A"
                strokeWidth="2.6"
                strokeDasharray="10 14"
                strokeLinecap="round"
              >
                <animate attributeName="stroke-dashoffset" from="48" to="0" dur="1.0s" repeatCount="indefinite" />
              </path>

              {/* Vietnamese Victory Flag waving over Hầm Đờ Ca-xtơ-ri (17h30 · 7/5/1954) */}
              <g transform="translate(332, 386)">
                <line x1="0" y1="0" x2="0" y2="-56" stroke="#FDE047" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="0" cy="-58" r="4" fill="#FACC15" />
                <path d="M 2 -55 Q 22 -61 44 -53 L 44 -27 Q 22 -35 2 -29 Z" fill="#DC2626" stroke="#FEF08A" strokeWidth="1.2">
                  <animate
                    attributeName="d"
                    values="M 2 -55 Q 22 -61 44 -53 L 44 -27 Q 22 -35 2 -29 Z; M 2 -55 Q 22 -49 44 -56 L 44 -30 Q 22 -23 2 -29 Z; M 2 -55 Q 22 -61 44 -53 L 44 -27 Q 22 -35 2 -29 Z"
                    dur="1.4s"
                    repeatCount="indefinite"
                  />
                </path>
                <polygon
                  points="22,-49 24.3,-43.5 30,-43.5 25.4,-40 27.2,-34.5 22,-38 16.8,-34.5 18.6,-40 14,-43.5 19.7,-43.5"
                  fill="#FACC15"
                />
              </g>
            </g>
          )}
        </svg>

        {/* Station 1: Interactive Drop Zones anchored directly over the 3 historical sectors */}
        {mode === 'station1' &&
          MAP_ZONES.map((zone) => {
            const placedZoneId = assignments?.[zone.id] ?? null;
            const isCorrectlyPlaced = placedZoneId === zone.id;
            const isHovered = dragOverZone === zone.id;
            const isFlashTarget = flashZone?.id === zone.id;
            const isWrongFlash = isFlashTarget && !flashZone.correct;
            const isCorrectFlash = isFlashTarget && flashZone.correct;

            return (
              <div
                key={zone.id}
                style={{
                  left: `${zone.mapPos2D[0]}%`,
                  top: `${zone.mapPos2D[1]}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isCorrectlyPlaced) onSetDragOverZone(zone.id);
                }}
                onDragLeave={() => onSetDragOverZone(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedId = e.dataTransfer.getData('text/plain');
                  handleZoneDropEvent(zone.id, draggedId);
                }}
                className="absolute z-10"
              >
                <button
                  key={isFlashTarget ? `${zone.id}-${flashZone.seq}` : zone.id}
                  type="button"
                  data-testid={`map-dropzone-${zone.id}`}
                  onClick={() => {
                    if (!isCorrectlyPlaced && selectedZoneCard && onDropZone) {
                      onDropZone(zone.id, selectedZoneCard);
                    }
                  }}
                  aria-label={
                    isCorrectlyPlaced
                      ? `Đã ghép đúng ${zone.label}`
                      : `Vùng đích ${zone.shortTitle} (${zone.landmarks[0]})`
                  }
                  className={`min-w-[146px] rounded-2xl border-2 px-3 py-1.5 text-center shadow-lg transition-all duration-100 active:scale-[0.97] cursor-pointer sm:min-w-[172px] sm:px-4 sm:py-2 ${
                    isCorrectlyPlaced
                      ? `border-emerald-500 bg-emerald-600/95 text-white ${isCorrectFlash ? 'animate-flash-correct' : ''}`
                      : isWrongFlash
                        ? 'animate-flash-wrong border-rose-600 bg-rose-100 text-rose-950'
                        : isHovered || selectedZoneCard
                          ? 'scale-105 border-dashed border-amber-400 bg-amber-50/95 text-amber-950'
                          : 'border-dashed border-amber-200 bg-slate-950/78 text-white hover:bg-amber-50 hover:text-slate-950'
                  }`}
                >
                  {isCorrectlyPlaced ? (
                    <div>
                      <div className="font-display text-xs font-extrabold tracking-wide sm:text-sm md:text-base">
                        ✓ {zone.label}
                      </div>
                      <div className="text-[11px] font-medium text-emerald-100 sm:text-xs">
                        {zone.landmarks[0]}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-display text-xs font-extrabold sm:text-sm md:text-base">
                        {selectedZoneCard ? 'Thả thẻ vào đây!' : 'Ô thả tên khu vực'}
                      </div>
                      <div
                        className={`text-[11px] font-semibold sm:text-xs ${
                          isHovered || selectedZoneCard ? 'text-amber-800' : 'text-amber-200'
                        }`}
                      >
                        {zone.landmarks[0]}
                      </div>
                    </div>
                  )}
                </button>
              </div>
            );
          })}

        {/* Station 2: 10 Clickable Stronghold Pins aligned directly over the photorealistic sa bàn */}
        {mode === 'station2' &&
          showDetailedPins &&
          REALISTIC_MAP_LANDMARKS.map((lm) => {
            const isFocused = activeWave !== null && lm.waveFocus === activeWave;
            const isSelected = selectedLandmark?.id === lm.id;
            const flagOwner = getStrongholdFlagOwner(lm.id, activeWave);

            return (
              <div
                key={lm.id}
                style={{
                  left: `${lm.mapPos2D[0]}%`,
                  top: `${lm.mapPos2D[1]}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute z-10"
              >
                <button
                  type="button"
                  data-testid={`landmark-pin-${lm.id}`}
                  data-flag-owner={flagOwner}
                  onClick={() => onSelectLandmark(isSelected ? null : lm)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap shadow-md transition-all duration-100 hover:scale-105 cursor-pointer sm:px-2.5 sm:py-1 sm:text-xs ${
                    isSelected
                      ? 'scale-105 border-amber-300 bg-amber-400 text-slate-950 shadow-lg'
                      : isFocused
                        ? 'border-amber-200 bg-red-600/95 text-white'
                        : 'border-amber-100/80 bg-slate-950/84 text-amber-50 hover:border-amber-300 hover:bg-slate-900'
                  }`}
                >
                  <MiniFlagBadge owner={flagOwner} />
                  <span>{lm.label}</span>
                </button>
              </div>
            );
          })}

        {/* Station 2: Clean Sector Labels when detailed pins are toggled off */}
        {mode === 'station2' &&
          !showDetailedPins &&
          MAP_ZONES.map((zone) => {
            const highlighted = isSectorHighlighted(zone.id);
            return (
              <div
                key={zone.id}
                style={{
                  left: `${zone.mapPos2D[0]}%`,
                  top: `${zone.mapPos2D[1]}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="pointer-events-none absolute z-10"
              >
                <div
                  className={`rounded-xl border-2 px-3 py-1.5 text-center shadow-md transition-transform ${
                    highlighted
                      ? 'scale-105 border-amber-200 bg-red-600/95 text-white'
                      : 'border-amber-100/75 bg-slate-950/82 text-amber-50'
                  }`}
                >
                  <div className="font-display text-xs font-extrabold whitespace-nowrap sm:text-sm">
                    {zone.label}
                  </div>
                  <div className="text-[11px] font-semibold text-amber-200">
                    {zone.landmarks[0]}
                  </div>
                </div>
              </div>
            );
          })}

        {/* Station 2: Compact Landmark Detail Card anchored in open bottom-left corner (zero overlap with Hồng Cúm or Đồi A1) */}
        {mode === 'station2' && selectedLandmark && (
          <div
            data-testid="landmark-detail-card"
            className="animate-pop-in absolute bottom-2.5 left-2.5 z-20 max-w-[290px] rounded-2xl border-2 border-amber-400 bg-white/98 p-3.5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-display text-base font-extrabold text-red-700">
                {selectedLandmark.label}
              </p>
              <button
                type="button"
                onClick={() => onSelectLandmark(null)}
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
    </div>
  );
}
