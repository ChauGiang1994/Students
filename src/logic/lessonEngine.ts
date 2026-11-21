import {
  ARTILLERY_STORY_CHAPTERS,
  ARTILLERY_STORY_DURATION,
  HERO_ITEMS,
  HISTORICAL_MESSAGES,
  MAP_ZONES,
  SEQUENCE_CARDS,
  type HeroId,
  type SequenceCardId,
  type StoryChapter,
  type WaveId,
  type ZoneId,
} from '../data/campaignData';

export type Station1Assignments = Record<ZoneId, ZoneId | null>;
export type Station2Slots = [SequenceCardId | null, SequenceCardId | null, SequenceCardId | null];
export type HeroMatches = Record<HeroId, HeroId | null>;

export interface DropResult {
  correct: boolean;
  message: string;
}

export function createInitialStation1(): Station1Assignments {
  return { north: null, center: null, south: null };
}

export function evaluateZoneDrop(targetZoneId: ZoneId, draggedZoneId: ZoneId): DropResult {
  const target = MAP_ZONES.find((z) => z.id === targetZoneId);
  if (!target) {
    return { correct: false, message: 'Không tìm thấy vị trí này trên bản đồ.' };
  }
  if (targetZoneId === draggedZoneId) {
    return {
      correct: true,
      message: `Xuất sắc! Em đã đặt đúng ${target.label} (${target.landmarks.slice(0, 2).join(', ')}).`,
    };
  }
  return {
    correct: false,
    message: `Chưa chính xác rồi! ${target.hint}`,
  };
}

export function isStation1Complete(assignments: Station1Assignments): boolean {
  return (
    assignments.north === 'north' &&
    assignments.center === 'center' &&
    assignments.south === 'south'
  );
}

export function createInitialStation2Slots(): Station2Slots {
  return [null, null, null];
}

export function evaluateSequenceDrop(slotIndex: 0 | 1 | 2, cardId: SequenceCardId): DropResult {
  const card = SEQUENCE_CARDS.find((c) => c.id === cardId);
  if (!card) {
    return { correct: false, message: 'Không tìm thấy thẻ sự kiện.' };
  }
  if (card.correctSlotIndex === slotIndex) {
    return {
      correct: true,
      message: `Chính xác! ${card.code} thuộc Đợt ${card.waveNumber} (${card.dateRange}).`,
    };
  }
  const slotWave = slotIndex + 1;
  if (slotWave === 1) {
    return {
      correct: false,
      message: 'Ô số 1 là Đợt 1 (13/3 – 17/3): mở màn đánh cứ điểm Him Lam và phân khu Bắc em nhé!',
    };
  }
  if (slotWave === 2) {
    return {
      correct: false,
      message: 'Ô số 2 là Đợt 2 (30/3 – 26/4): đánh các cứ điểm phía đông phân khu Trung tâm em nhé!',
    };
  }
  return {
    correct: false,
    message: 'Ô số 3 là Đợt 3 (1/5 – 7/5): tổng công kích vào Mường Thanh và bắt sống tướng Đờ Ca-xtơ-ri!',
  };
}

export function isStation2Complete(slots: Station2Slots): boolean {
  return slots[0] === 'B' && slots[1] === 'A' && slots[2] === 'C';
}

export function areAllWavesExplored(exploredWaves: WaveId[]): boolean {
  const unique = new Set(exploredWaves);
  return unique.has('wave1') && unique.has('wave2') && unique.has('wave3');
}

export function createInitialHeroMatches(): HeroMatches {
  return {
    to_vinh_dien: null,
    phan_dinh_giot: null,
    be_van_dan: null,
    ta_quoc_luat: null,
  };
}

export function evaluateHeroMatch(targetHeroId: HeroId, draggedHeroId: HeroId): DropResult {
  const targetHero = HERO_ITEMS.find((h) => h.id === targetHeroId);
  if (!targetHero) {
    return { correct: false, message: 'Không tìm thấy thông tin anh hùng.' };
  }
  if (targetHeroId === draggedHeroId) {
    return {
      correct: true,
      message: `Đúng rồi! ${targetHero.name}: ${targetHero.storyNote}`,
    };
  }
  return {
    correct: false,
    message: `Chưa khớp rồi em ơi! Hãy đọc kỹ việc làm tiêu biểu gắn với "${targetHero.shortTag}" nhé.`,
  };
}

export function isHeroTaskComplete(matches: HeroMatches): boolean {
  return HERO_ITEMS.every((h) => matches[h.id] === h.id);
}

export function evaluateMessageDrop(messageId: string): DropResult {
  const msg = HISTORICAL_MESSAGES.find((m) => m.id === messageId);
  if (!msg) {
    return { correct: false, message: 'Không tìm thấy thông điệp.' };
  }
  return {
    correct: msg.isHistorical,
    message: msg.feedback,
  };
}

export function isMessageTaskComplete(selectedMessageIds: string[]): boolean {
  const requiredIds = HISTORICAL_MESSAGES.filter((m) => m.isHistorical).map((m) => m.id);
  const selected = new Set(selectedMessageIds);
  return requiredIds.every((id) => selected.has(id));
}

export function isStation3Complete(matches: HeroMatches, selectedMessageIds: string[]): boolean {
  return isHeroTaskComplete(matches) && isMessageTaskComplete(selectedMessageIds);
}

export interface OverallProgress {
  completedStations: number;
  totalStations: number;
  percent: number;
  allCompleted: boolean;
}

export function computeOverallProgress(flags: {
  station1Done: boolean;
  station2Done: boolean;
  station3Done: boolean;
}): OverallProgress {
  const completedStations =
    (flags.station1Done ? 1 : 0) +
    (flags.station2Done ? 1 : 0) +
    (flags.station3Done ? 1 : 0);
  const totalStations = 3;
  const percent = Math.round((completedStations / totalStations) * 100);
  return {
    completedStations,
    totalStations,
    percent,
    allCompleted: completedStations === totalStations,
  };
}

export function getStoryChapterAtTime(elapsedSec: number): StoryChapter {
  const clamped = Math.max(0, Math.min(elapsedSec, ARTILLERY_STORY_DURATION - 0.01));
  const found = ARTILLERY_STORY_CHAPTERS.find(
    (ch) => clamped >= ch.startSec && clamped < ch.endSec,
  );
  return found ?? ARTILLERY_STORY_CHAPTERS[ARTILLERY_STORY_CHAPTERS.length - 1];
}

export type FlagOwner = 'france' | 'vietnam';

const WAVE1_CAPTURED_STRONGHOLDS = new Set(['him_lam', 'doc_lap', 'ban_keo']);
const WAVE2_CAPTURED_STRONGHOLDS = new Set([
  'him_lam',
  'doc_lap',
  'ban_keo',
  'doi_d1_e1',
  'doi_c1',
]);

/**
 * Historically accurate flag control for Dien Bien Phu strongholds (13/3 – 7/5/1954):
 * - Outer Viet Minh mountain artillery & siege posts (`vn_post_*`) always fly the Vietnamese flag.
 * - Pre-campaign (null): all fortified strongholds inside the Dien Bien Phu basin are held by France.
 * - Wave 1 (13/3–17/3): Northern sector (Him Lam, Doc Lap, Ban Keo) liberated by Vietnam; Center & South still France.
 * - Wave 2 (30/3–26/4): Eastern hills D1–E1 and C1 captured by Vietnam; Hill A1, De Castries HQ & Hong Cum remain France.
 * - Wave 3 (1/5–7/5): Hill A1 (night 6/5), De Castries HQ (17:30 7/5) & Hong Cum (night 7/5) liberated — total victory!
 */
export function getStrongholdFlagOwner(
  strongholdId: string,
  activeWave: WaveId | null,
): FlagOwner {
  if (strongholdId.startsWith('vn_')) {
    return 'vietnam';
  }
  if (activeWave === 'wave3') {
    return 'vietnam';
  }
  if (activeWave === 'wave2') {
    return WAVE2_CAPTURED_STRONGHOLDS.has(strongholdId) ? 'vietnam' : 'france';
  }
  if (activeWave === 'wave1') {
    return WAVE1_CAPTURED_STRONGHOLDS.has(strongholdId) ? 'vietnam' : 'france';
  }
  return 'france';
}

