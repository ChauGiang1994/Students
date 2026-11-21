import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, GripVertical, RotateCcw } from 'lucide-react';
import { MAP_ZONES, type ZoneId } from '../data/campaignData';
import {
  evaluateZoneDrop,
  isStation1Complete,
  type Station1Assignments,
} from '../logic/lessonEngine';
import { playClickSound } from '../utils/soundEffects';
import { STATION_COMPLETE_PRAISE } from '../utils/ttsValidation';
import { SoldierGuide, type GuideMood } from './SoldierGuide';
import { ThreeMapScene } from './ThreeMapScene';

interface Station1MapProps {
  assignments: Station1Assignments;
  muted: boolean;
  onAssignZone: (zoneId: ZoneId) => void;
  onAnswerFeedback: (isCorrect: boolean, customPraise?: string) => void;
  onResetStation: () => void;
  onBackHome: () => void;
  onGoNext: () => void;
}

export function Station1Map({
  assignments,
  muted,
  onAssignZone,
  onAnswerFeedback,
  onResetStation,
  onBackHome,
  onGoNext,
}: Station1MapProps) {
  const [selectedCard, setSelectedCard] = useState<ZoneId | null>(null);
  const [flashZone, setFlashZone] = useState<{ id: ZoneId; correct: boolean; seq: number } | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; mood: GuideMood; shake: boolean }>({
    text: 'Nhiệm vụ: Hãy kéo từng thẻ tên phân khu vào đúng vị trí trên sa bàn lịch sử Điện Biên Phủ! Em cũng có thể bấm chọn thẻ rồi bấm vào ô đích trên sa bàn.',
    mood: 'pointing',
    shake: false,
  });

  const completed = isStation1Complete(assignments);
  const placedCount = Object.values(assignments).filter(Boolean).length;

  const triggerZoneFlash = (zoneId: ZoneId, correct: boolean) => {
    setFlashZone((prev) => ({ id: zoneId, correct, seq: (prev?.seq ?? 0) + 1 }));
    window.setTimeout(() => {
      setFlashZone((prev) => (prev?.id === zoneId ? null : prev));
    }, 280);
  };

  const handleDropZone = (targetZoneId: ZoneId, draggedZoneId: ZoneId) => {
    if (assignments[targetZoneId] === targetZoneId) return;
    const result = evaluateZoneDrop(targetZoneId, draggedZoneId);
    if (result.correct) {
      onAssignZone(targetZoneId);
      setSelectedCard(null);
      triggerZoneFlash(targetZoneId, true);
      const nextCount = placedCount + 1;
      onAnswerFeedback(true, nextCount === 3 ? STATION_COMPLETE_PRAISE : undefined);
      setFeedback({
        text:
          nextCount === 3
            ? 'Hoan hô Nhà sử học nhí! Em đã xác định chính xác cả 3 phân khu Bắc, Trung tâm và Nam trên lược đồ chiến dịch Điện Biên Phủ!'
            : result.message,
        mood: 'cheering',
        shake: false,
      });
    } else {
      triggerZoneFlash(targetZoneId, false);
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

  const handleSelectCard = (zoneId: ZoneId) => {
    if (assignments[zoneId] === zoneId) return;
    playClickSound(muted);
    setSelectedCard((prev) => (prev === zoneId ? null : zoneId));
  };

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-emerald-700">Trạm 1 / 3 · Khám phá sa bàn lịch sử</p>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 md:text-3xl">
            Sa bàn Chiến dịch Điện Biên Phủ 1954
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
              onResetStation();
              setFeedback({
                text: 'Đã làm mới bản đồ! Hãy đưa 3 thẻ tên về đúng vị trí nhé.',
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

      {/* Main Two-Zone Interactive Sandbox */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left/Main Stage: 3D Dien Bien Valley Map with Drop Zones */}
        <div className="lg:col-span-8">
          <ThreeMapScene
            mode="station1"
            assignments={assignments}
            selectedZoneCard={selectedCard}
            flashZone={flashZone}
            onDropZone={handleDropZone}
          />
        </div>

        {/* Right Control Deck: Draggable Zone Cards + Discovery Notes */}
        <aside className="flex flex-col justify-between gap-5 rounded-3xl border-2 border-emerald-200 bg-white p-5 shadow-sm lg:col-span-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl font-extrabold text-slate-900">
                Câu hỏi kéo thả số 1
              </h2>
              <span className="font-mono text-base font-extrabold text-emerald-700 tabular-nums">
                {placedCount}/3
              </span>
            </div>
            <p className="mt-1.5 text-base font-semibold text-slate-700">
              Hãy đưa các thẻ tên về đúng vị trí!
            </p>

            {/* Draggable Zone Cards */}
            <div className="mt-4 space-y-3">
              {MAP_ZONES.map((zone) => {
                const isPlaced = assignments[zone.id] === zone.id;
                const isSelected = selectedCard === zone.id;

                return (
                  <button
                    key={zone.id}
                    type="button"
                    draggable={!isPlaced}
                    disabled={isPlaced}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', zone.id);
                      setSelectedCard(zone.id);
                    }}
                    onClick={() => handleSelectCard(zone.id)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-all duration-100 active:scale-[0.98] ${
                      isPlaced
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 opacity-75 cursor-default'
                        : isSelected
                          ? 'scale-[1.02] border-amber-500 bg-amber-100 text-amber-950 shadow-md cursor-grab'
                          : `${zone.accentBg} ${zone.accentBorder} ${zone.accentText} shadow-sm hover:scale-[1.01] cursor-grab active:cursor-grabbing`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isPlaced ? (
                        <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
                      ) : (
                        <GripVertical className="h-5 w-5 shrink-0 opacity-70" aria-hidden="true" />
                      )}
                      <div>
                        <div className="font-display text-lg font-extrabold tracking-wide">
                          {zone.label}
                        </div>
                        <div className="text-xs font-semibold opacity-85">
                          {isPlaced
                            ? 'Đã ghép đúng trên bản đồ'
                            : isSelected
                              ? 'Đang chọn — bấm vào ô đích trên bản đồ 3D!'
                              : 'Kéo thả hoặc bấm để chọn'}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Educational summary of placed zones */}
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-display text-base font-extrabold text-slate-900">
                Em có biết? (Địa hình thực tế 1954)
              </h3>
              <p className="mt-1 text-sm leading-relaxed font-medium text-slate-700">
                Điện Biên Phủ là một <strong>thung lũng lòng chảo</strong> nằm giữa núi rừng Tây Bắc, có dòng <strong>sông Nậm Rốm</strong> chảy qua cùng <strong>cầu & sân bay Mường Thanh</strong>, gồm 3 phân khu: Bắc (Him Lam, Độc Lập, Bản Kéo), Trung tâm (Hầm Đờ Ca-xtơ-ri & dãy đồi phía Đông A1, C1, D1, E1) và Nam (Hồng Cúm).
              </p>
            </div>
          </div>

          {completed && (
            <div className="animate-pop-in rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-4">
              <p className="font-display text-lg font-extrabold text-emerald-900">
                Hoàn thành Trạm 1!
              </p>
              <p className="mt-1 text-sm font-medium text-emerald-800">
                Em đã nắm rõ 3 phân khu chiến lược. Cùng sang Trạm 2 để xem 3 đợt tiến công nhé!
              </p>
              <button
                type="button"
                onClick={onGoNext}
                className="mt-3 flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-600 px-4 py-3 text-base font-extrabold text-white shadow-sm transition-colors hover:bg-emerald-700 cursor-pointer"
              >
                <span>Sang Trạm 2: Ba đợt tiến công</span>
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
