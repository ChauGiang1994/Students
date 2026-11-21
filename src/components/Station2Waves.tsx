import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  Flag,
  GripVertical,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  CAMPAIGN_VICTORY_STATS,
  CAMPAIGN_WAVES,
  SEQUENCE_CARDS,
  type SequenceCardId,
  type WaveId,
} from '../data/campaignData';
import {
  areAllWavesExplored,
  evaluateSequenceDrop,
  isStation2Complete,
  type Station2Slots,
} from '../logic/lessonEngine';
import {
  playClickSound,
  speakNarration,
} from '../utils/soundEffects';
import { STATION_COMPLETE_PRAISE } from '../utils/ttsValidation';
import { SoldierGuide, type GuideMood } from './SoldierGuide';
import { ThreeMapScene } from './ThreeMapScene';

interface Station2WavesProps {
  exploredWaves: WaveId[];
  slots: Station2Slots;
  muted: boolean;
  onExploreWave: (waveId: WaveId) => void;
  onPlaceSequenceCard: (slotIndex: 0 | 1 | 2, cardId: SequenceCardId) => void;
  onAnswerFeedback: (isCorrect: boolean, customPraise?: string) => void;
  onResetStation: () => void;
  onBackHome: () => void;
  onGoNext: () => void;
}

export function Station2Waves({
  exploredWaves,
  slots,
  muted,
  onExploreWave,
  onPlaceSequenceCard,
  onAnswerFeedback,
  onResetStation,
  onBackHome,
  onGoNext,
}: Station2WavesProps) {
  const [journeyStarted, setJourneyStarted] = useState(exploredWaves.length > 0);
  const [activeWave, setActiveWave] = useState<WaveId | null>(
    exploredWaves.length > 0 ? exploredWaves[exploredWaves.length - 1] : null,
  );
  const [selectedCard, setSelectedCard] = useState<SequenceCardId | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [flashSlot, setFlashSlot] = useState<{ index: number; correct: boolean; seq: number } | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; mood: GuideMood; shake: boolean }>({
    text: 'Chào em đến với Trạm 2! Hãy nhấn nút "Bắt đầu hành trình" rồi lần lượt bấm vào 3 đợt tiến công để quan sát diễn biến trên sa bàn lịch sử nhé!',
    mood: 'pointing',
    shake: false,
  });

  const activeWaveData = CAMPAIGN_WAVES.find((w) => w.id === activeWave) ?? null;
  const allExplored = areAllWavesExplored(exploredWaves);
  const completed = isStation2Complete(slots);
  const placedCount = slots.filter(Boolean).length;

  const handleStartJourney = () => {
    playClickSound(muted);
    setJourneyStarted(true);
    handleSelectWave('wave1');
  };

  const handleSelectWave = (waveId: WaveId) => {
    playClickSound(muted);
    setJourneyStarted(true);
    setActiveWave(waveId);
    onExploreWave(waveId);
    const wave = CAMPAIGN_WAVES.find((w) => w.id === waveId);
    if (wave) {
      setFeedback({
        text: `${wave.title} (${wave.dateRange}): ${wave.narration}`,
        mood: wave.waveNumber === 3 ? 'cheering' : 'happy',
        shake: false,
      });
      void speakNarration(wave.narration, muted);
    }
  };

  const triggerSlotFlash = (index: number, correct: boolean) => {
    setFlashSlot((prev) => ({ index, correct, seq: (prev?.seq ?? 0) + 1 }));
    window.setTimeout(() => {
      setFlashSlot((prev) => (prev?.index === index ? null : prev));
    }, 280);
  };

  const handleDropToSlot = (slotIndex: 0 | 1 | 2, cardId: SequenceCardId) => {
    setDragOverSlot(null);
    if (slots[slotIndex] !== null) return;
    const result = evaluateSequenceDrop(slotIndex, cardId);
    if (result.correct) {
      onPlaceSequenceCard(slotIndex, cardId);
      setSelectedCard(null);
      triggerSlotFlash(slotIndex, true);
      const nextCount = placedCount + 1;
      onAnswerFeedback(true, nextCount === 3 ? STATION_COMPLETE_PRAISE : undefined);
      setFeedback({
        text:
          nextCount === 3
            ? 'Tuyệt vời! Em đã sắp xếp chính xác toàn bộ diễn biến 3 đợt tiến công! Hãy ngắm nhìn Dòng thời gian chiến thắng vừa hiện ra bên dưới nhé!'
            : result.message,
        mood: 'cheering',
        shake: false,
      });
    } else {
      triggerSlotFlash(slotIndex, false);
      onAnswerFeedback(false);
      setFeedback({
        text: result.message,
        mood: 'thinking',
        shake: true,
      });
      window.setTimeout(() => {
        setFeedback((prev) => ({ ...prev, shake: false }));
      }, 240);
    }
  };

  const isCardUsed = (id: SequenceCardId) => slots.includes(id);

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-orange-700">Trạm 2 / 3 · Trọng tâm diễn biến chiến dịch</p>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 md:text-3xl">
            Giải mã ba đợt tiến công (13/3 – 7/5/1954)
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-base font-bold text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Trang chính</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound(muted);
              setSelectedCard(null);
              setActiveWave(null);
              setJourneyStarted(false);
              onResetStation();
              setFeedback({
                text: 'Đã làm mới Trạm 2! Hãy nhấn "Bắt đầu hành trình" để khám phá lại 3 đợt tiến công nhé.',
                mood: 'happy',
                shake: false,
              });
            }}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-2 text-base font-bold text-amber-950 transition-colors hover:bg-amber-100 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Làm lại</span>
          </button>
        </div>
      </div>

      {/* Chú bộ đội Guide */}
      <div className={feedback.shake ? 'animate-shake-soft' : ''}>
        <SoldierGuide message={feedback.text} mood={feedback.mood} muted={muted} compact />
      </div>

      {/* PART 1: Interactive 3D Map + 3 Wave Exploration */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ThreeMapScene
            mode="station2"
            activeWave={activeWave}
            journeyStarted={journeyStarted}
          />
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-3xl border-2 border-orange-200 bg-white p-5 shadow-sm lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl font-extrabold text-slate-900">
                Ba chặng đường làm nên chiến thắng
              </h2>
              <span className="text-sm font-extrabold text-orange-700">
                Đã xem <span className="font-mono tabular-nums">{new Set(exploredWaves).size}/3</span>
              </span>
            </div>

            {!journeyStarted ? (
              <div className="mt-5 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 p-6 text-center">
                <Compass className="mx-auto h-10 w-10 text-orange-600" aria-hidden="true" />
                <p className="mt-3 text-lg font-bold text-slate-900">
                  Sẵn sàng theo dõi diễn biến chiến dịch trên sa bàn lịch sử?
                </p>
                <p className="mt-1 text-base text-slate-700">
                  Nhấn nút bên dưới để mở 3 biểu tượng tương ứng với 3 đợt tiến công lịch sử!
                </p>
                <button
                  type="button"
                  onClick={handleStartJourney}
                  className="mt-5 inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-orange-600 px-6 py-3.5 text-lg font-extrabold text-white shadow-md transition-transform hover:scale-[1.02] hover:bg-orange-700 cursor-pointer"
                >
                  <Play className="h-5 w-5" aria-hidden="true" />
                  <span>Bắt đầu hành trình</span>
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {CAMPAIGN_WAVES.map((wave) => {
                  const isActive = activeWave === wave.id;
                  const seen = exploredWaves.includes(wave.id);
                  return (
                    <button
                      key={wave.id}
                      type="button"
                      onClick={() => handleSelectWave(wave.id)}
                      aria-pressed={isActive}
                      className={`w-full rounded-2xl border-2 p-4 text-left transition-all cursor-pointer ${
                        isActive
                          ? `${wave.borderClass} bg-amber-50 shadow-md`
                          : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-extrabold text-white ${wave.bgClass}`}
                          >
                            {wave.waveNumber}
                          </span>
                          <div>
                            <div className={`font-display text-lg font-extrabold ${wave.textClass}`}>
                              {wave.title}: {wave.dateRange}
                            </div>
                          </div>
                        </div>
                        {seen && (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Đã khám phá" />
                        )}
                      </div>
                      <p className="mt-2 text-base font-semibold text-slate-800">
                        {wave.summary}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {activeWaveData && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5">
              <p className="text-xs font-extrabold uppercase tracking-wide text-amber-900">
                {activeWaveData.historicalDateNote}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                Điểm nổi bật 3D: {activeWaveData.focusLandmarks.join(' · ')}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* PART 1B: Illustrated Historical Dossier synced with Active Wave (SGK + Báo Điện tử Chính phủ) */}
      {activeWaveData && (
        <section
          aria-labelledby="wave-dossier-heading"
          data-testid="wave-illustrated-dossier"
          className="animate-pop-in grid grid-cols-1 gap-5 rounded-3xl border-2 border-amber-200 bg-white p-5 shadow-sm lg:grid-cols-12 md:p-6"
        >
          <figure className="lg:col-span-5">
            <div className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-amber-50 shadow-xs">
              <img
                src={activeWaveData.imageUrl}
                alt={activeWaveData.imageCaption}
                referrerPolicy="no-referrer"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <figcaption className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">
              {activeWaveData.imageCaption}
            </figcaption>
          </figure>

          <div className="flex flex-col justify-between gap-3 lg:col-span-7">
            <div>
              <p className={`text-sm font-extrabold ${activeWaveData.textClass}`}>
                Tư liệu lịch sử chuẩn xác · {activeWaveData.title} ({activeWaveData.dateRange})
              </p>
              <h3
                id="wave-dossier-heading"
                className="mt-1 font-display text-xl font-extrabold text-slate-900 md:text-2xl"
              >
                {activeWaveData.headline}
              </h3>

              <ul className="mt-3 space-y-2">
                {activeWaveData.keyFacts.map((fact, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-base leading-relaxed font-medium text-slate-800"
                  >
                    <span
                      className={`mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs font-extrabold text-white ${activeWaveData.bgClass}`}
                    >
                      {idx + 1}
                    </span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-extrabold text-emerald-900">
                Kết quả nổi bật: {activeWaveData.resultHighlight}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-emerald-800/85">
                Nguồn: Sách giáo khoa Lịch sử và Địa lí lớp 5 (Bài 15) và Báo Điện tử Chính phủ
              </p>
            </div>
          </div>
        </section>
      )}

      {/* PART 2: Drag-and-Drop Challenge #2 — Sequence Ordering */}
      <section
        aria-labelledby="seq-challenge-title"
        className="rounded-3xl border-2 border-sky-200 bg-white p-5 shadow-sm md:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-sky-700">
              Câu hỏi tương tác kéo thả số 2 · {allExplored ? 'Em đã xem đủ 3 đợt — sẵn sàng thử thách!' : 'Khám phá 3 đợt ở trên rồi sắp xếp nhé'}
            </p>
            <h2 id="seq-challenge-title" className="font-display text-2xl font-extrabold text-slate-900">
              Nhà sử học nhí hãy sắp xếp các sự kiện sau theo đúng trình tự thời gian!
            </h2>
          </div>
          <span className="text-base font-extrabold text-sky-700">
            <span className="font-mono text-lg tabular-nums">{placedCount}/3</span> ô đúng
          </span>
        </div>

        {/* Source Shuffled Cards A, B, C */}
        <div className="mt-5 grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {SEQUENCE_CARDS.map((card) => {
            const used = isCardUsed(card.id);
            const isSelected = selectedCard === card.id;
            return (
              <button
                key={card.id}
                type="button"
                draggable={!used}
                disabled={used}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', card.id);
                  setSelectedCard(card.id);
                }}
                onClick={() => {
                  if (used) return;
                  playClickSound(muted);
                  setSelectedCard((prev) => (prev === card.id ? null : card.id));
                }}
                aria-pressed={isSelected}
                data-testid={`sequence-card-${card.id}`}
                className={`flex flex-col justify-between rounded-2xl border-2 p-4 text-left transition-all duration-100 active:scale-[0.98] ${
                  used
                    ? 'border-emerald-200 bg-emerald-50/60 text-slate-500 opacity-65 cursor-default'
                    : isSelected
                      ? 'scale-[1.02] border-amber-500 bg-amber-100 text-slate-950 shadow-md cursor-grab'
                      : 'border-indigo-200 bg-indigo-50/70 text-slate-900 hover:border-indigo-400 hover:bg-indigo-50 cursor-grab active:cursor-grabbing'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg font-extrabold text-indigo-800">
                    {card.code}
                  </span>
                  {used ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <GripVertical className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                  )}
                </div>
                <p className="mt-2 text-base leading-snug font-semibold text-slate-800">
                  {card.text}
                </p>
              </button>
            );
          })}
        </div>

        {/* Target Slots 1 - 2 - 3 */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {([0, 1, 2] as const).map((slotIdx) => {
            const placedId = slots[slotIdx];
            const placedCard = SEQUENCE_CARDS.find((c) => c.id === placedId) ?? null;
            const waveInfo = CAMPAIGN_WAVES[slotIdx];
            const hovered = dragOverSlot === slotIdx;

            return (
              <div
                key={slotIdx}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!placedCard) setDragOverSlot(slotIdx);
                }}
                onDragLeave={() => setDragOverSlot(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('text/plain') as SequenceCardId;
                  if (id === 'A' || id === 'B' || id === 'C') {
                    handleDropToSlot(slotIdx, id);
                  }
                }}
              >
                <button
                  type="button"
                  data-testid={`sequence-slot-${slotIdx + 1}`}
                  onClick={() => {
                    if (!placedCard && selectedCard) {
                      handleDropToSlot(slotIdx, selectedCard);
                    }
                  }}
                  aria-label={
                    placedCard
                      ? `Ô thứ tự ${slotIdx + 1} đã ghép đúng ${placedCard.code}`
                      : `Ô thứ tự ${slotIdx + 1} (${waveInfo.title}: ${waveInfo.dateRange})`
                  }
                  className={`flex min-h-[154px] w-full flex-col justify-between rounded-2xl border-2 p-4 text-left transition-all duration-100 active:scale-[0.98] cursor-pointer ${
                    placedCard
                      ? `border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm ${flashSlot?.index === slotIdx && flashSlot.correct ? 'animate-flash-correct' : ''}`
                      : flashSlot?.index === slotIdx && !flashSlot.correct
                        ? 'animate-flash-wrong border-rose-600 bg-rose-100 text-rose-950'
                        : hovered || selectedCard
                          ? 'border-dashed border-amber-500 bg-amber-50 text-amber-950'
                          : 'border-dashed border-slate-400 bg-slate-50 text-slate-700 hover:bg-amber-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl font-display text-lg font-extrabold text-white ${waveInfo.bgClass}`}
                    >
                      {slotIdx + 1}
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-700">
                      {waveInfo.title} · {waveInfo.dateRange}
                    </span>
                  </div>

                  {placedCard ? (
                    <div className="mt-3">
                      <p className="font-display text-base font-extrabold text-emerald-800">
                        ✓ {placedCard.code} – {waveInfo.title}
                      </p>
                      <p className="mt-1 text-base font-medium text-slate-800">
                        {placedCard.text}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-center text-base font-bold text-slate-600">
                      {selectedCard
                        ? `Bấm để đặt Thẻ ${selectedCard} vào Ô số ${slotIdx + 1}`
                        : `Kéo thẻ sự kiện ${waveInfo.title} vào đây`}
                    </p>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Auto-revealed Victory Timeline upon completing all 3 slots */}
        {completed && (
          <div
            className="animate-pop-in mt-7 rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-amber-50 to-orange-50/70 p-6"
            data-testid="victory-timeline"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-7 w-7 text-amber-600" aria-hidden="true" />
                <h3 className="font-display text-2xl font-extrabold text-red-800">
                  Dòng thời gian Chiến thắng Điện Biên Phủ 1954
                </h3>
              </div>
              <button
                type="button"
                onClick={onGoNext}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-red-600 px-5 py-3 text-base font-extrabold text-white shadow-sm transition-colors hover:bg-red-700 cursor-pointer"
              >
                <Flag className="h-5 w-5" aria-hidden="true" />
                <span>Sang Trạm 3: Huyền thoại kéo pháo</span>
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
              {(['B', 'A', 'C'] as SequenceCardId[]).map((id, idx) => {
                const item = SEQUENCE_CARDS.find((c) => c.id === id)!;
                return (
                  <div
                    key={id}
                    className="overflow-hidden rounded-2xl border border-amber-300 bg-white shadow-sm"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.milestoneTitle}
                      referrerPolicy="no-referrer"
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="p-4">
                      <p className="font-mono text-sm font-extrabold text-red-700">
                        Mốc {idx + 1} · {item.dateRange}
                      </p>
                      <h4 className="mt-1 font-display text-lg font-extrabold text-slate-900">
                        {item.milestoneTitle}
                      </h4>
                      <p className="mt-1.5 text-sm leading-relaxed font-medium text-slate-700">
                        {item.text}
                      </p>
                      <p className="mt-2 border-t border-amber-100 pt-2 text-xs font-bold text-emerald-800">
                        {item.statNote}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Official Campaign Victory Statistics Strip */}
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {CAMPAIGN_VICTORY_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-amber-300/80 bg-white/95 p-3.5 text-center shadow-xs"
                >
                  <div className="font-display text-2xl font-extrabold text-red-700">
                    {stat.value}
                  </div>
                  <div className="mt-0.5 text-sm font-extrabold text-slate-900">
                    {stat.label}
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-slate-600">
                    {stat.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
