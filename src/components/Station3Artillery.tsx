import { useState } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  GripVertical,
  Heart,
  RotateCcw,
} from 'lucide-react';
import {
  HERO_ITEMS,
  HISTORICAL_MESSAGES,
  type HeroId,
} from '../data/campaignData';
import {
  evaluateHeroMatch,
  evaluateMessageDrop,
  isHeroTaskComplete,
  isMessageTaskComplete,
  isStation3Complete,
  type HeroMatches,
} from '../logic/lessonEngine';
import { playClickSound } from '../utils/soundEffects';
import { SoldierGuide, type GuideMood } from './SoldierGuide';
import { ThreeArtilleryScene } from './ThreeArtilleryScene';

interface Station3ArtilleryProps {
  heroMatches: HeroMatches;
  selectedMessages: string[];
  muted: boolean;
  allStationsDone: boolean;
  onMatchHero: (heroId: HeroId) => void;
  onAddMessage: (msgId: string) => void;
  onAnswerFeedback: (isCorrect: boolean, customPraise?: string) => void;
  onResetStation: () => void;
  onBackHome: () => void;
  onOpenCertificate: () => void;
}

export function Station3Artillery({
  heroMatches,
  selectedMessages,
  muted,
  allStationsDone,
  onMatchHero,
  onAddMessage,
  onAnswerFeedback,
  onResetStation,
  onBackHome,
  onOpenCertificate,
}: Station3ArtilleryProps) {
  const [selectedHero, setSelectedHero] = useState<HeroId | null>(null);
  const [selectedMsgCard, setSelectedMsgCard] = useState<string | null>(null);
  const [dragOverHero, setDragOverHero] = useState<HeroId | null>(null);
  const [dragOverFrame, setDragOverFrame] = useState(false);
  const [flashHero, setFlashHero] = useState<{ id: HeroId; correct: boolean; seq: number } | null>(null);
  const [flashFrame, setFlashFrame] = useState<{ correct: boolean; seq: number } | null>(null);

  const [feedback, setFeedback] = useState<{ text: string; mood: GuideMood; shake: boolean }>({
    text: 'Em hãy xem đoạn hoạt cảnh 3D bộ đội kéo pháo vượt núi rừng Điện Biên, sau đó hoàn thành 2 nhiệm vụ kéo thả: Ghép tên anh hùng và Chọn thông điệp lịch sử nhé!',
    mood: 'happy',
    shake: false,
  });

  const heroesDone = isHeroTaskComplete(heroMatches);
  const messagesDone = isMessageTaskComplete(selectedMessages);
  const station3Done = isStation3Complete(heroMatches, selectedMessages);
  const matchedHeroCount = Object.values(heroMatches).filter(Boolean).length;
  const requiredMsgCount = HISTORICAL_MESSAGES.filter((m) => m.isHistorical).length;

  const triggerHeroFlash = (id: HeroId, correct: boolean) => {
    setFlashHero((prev) => ({ id, correct, seq: (prev?.seq ?? 0) + 1 }));
    window.setTimeout(() => {
      setFlashHero((prev) => (prev?.id === id ? null : prev));
    }, 280);
  };

  const triggerFrameFlash = (correct: boolean) => {
    setFlashFrame((prev) => ({ correct, seq: (prev?.seq ?? 0) + 1 }));
    window.setTimeout(() => {
      setFlashFrame(null);
    }, 280);
  };

  const handleHeroDrop = (targetHeroId: HeroId, draggedHeroId: HeroId) => {
    setDragOverHero(null);
    if (heroMatches[targetHeroId] === targetHeroId) return;
    const res = evaluateHeroMatch(targetHeroId, draggedHeroId);
    if (res.correct) {
      onMatchHero(targetHeroId);
      setSelectedHero(null);
      triggerHeroFlash(targetHeroId, true);
      onAnswerFeedback(true);
      setFeedback({ text: res.message, mood: 'cheering', shake: false });
    } else {
      triggerHeroFlash(targetHeroId, false);
      onAnswerFeedback(false);
      setFeedback({ text: res.message, mood: 'thinking', shake: true });
      window.setTimeout(() => setFeedback((p) => ({ ...p, shake: false })), 240);
    }
  };

  const handleMessageDrop = (msgId: string) => {
    setDragOverFrame(false);
    if (selectedMessages.includes(msgId)) return;
    const res = evaluateMessageDrop(msgId);
    if (res.correct) {
      onAddMessage(msgId);
      setSelectedMsgCard(null);
      triggerFrameFlash(true);
      onAnswerFeedback(true);
      setFeedback({ text: res.message, mood: 'cheering', shake: false });
    } else {
      triggerFrameFlash(false);
      onAnswerFeedback(false);
      setFeedback({ text: res.message, mood: 'thinking', shake: true });
      window.setTimeout(() => setFeedback((p) => ({ ...p, shake: false })), 240);
    }
  };

  // Fixed shuffled order of deeds so students genuinely match hero -> deed
  const deedOrder: HeroId[] = ['phan_dinh_giot', 'ta_quoc_luat', 'to_vinh_dien', 'be_van_dan'];

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-sky-700">Trạm 3 / 3 · Không gian 3D & Giáo dục truyền thống</p>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 md:text-3xl">
            Theo dấu chân người lính – Huyền thoại kéo pháo
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
              setSelectedHero(null);
              setSelectedMsgCard(null);
              onResetStation();
              setFeedback({
                text: 'Đã làm mới 2 nhiệm vụ ở Trạm 3! Em hãy thử sức lại nhé.',
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

      {/* 3D Animated Forest Artillery Pulling Space */}
      <ThreeArtilleryScene muted={muted} />

      {/* Task 1: Hero to Historical Deed Matching */}
      <section
        aria-labelledby="task1-heroes-heading"
        className="rounded-3xl border-2 border-amber-200 bg-white p-5 shadow-sm md:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-amber-700">Nhiệm vụ 1 · Kéo thả ghép đôi</p>
            <h2 id="task1-heroes-heading" className="font-display text-2xl font-extrabold text-slate-900">
              Hãy ghép tên nhân vật với việc làm tiêu biểu!
            </h2>
          </div>
          <span className="text-base font-extrabold text-amber-700">
            <span className="font-mono text-lg tabular-nums">{matchedHeroCount}/4</span> anh hùng
          </span>
        </div>

        {/* Draggable Hero Name Cards */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HERO_ITEMS.map((hero) => {
            const matched = heroMatches[hero.id] === hero.id;
            const selected = selectedHero === hero.id;
            return (
              <button
                key={hero.id}
                type="button"
                draggable={!matched}
                disabled={matched}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', hero.id);
                  setSelectedHero(hero.id);
                }}
                onClick={() => {
                  if (matched) return;
                  playClickSound(muted);
                  setSelectedHero((prev) => (prev === hero.id ? null : hero.id));
                }}
                aria-pressed={selected}
                data-testid={`hero-card-${hero.id}`}
                className={`flex items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3.5 text-left transition-all duration-100 active:scale-[0.98] ${
                  matched
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 opacity-70 cursor-default'
                    : selected
                      ? 'scale-[1.02] border-amber-500 bg-amber-100 text-slate-950 shadow-md cursor-grab'
                      : `${hero.colorClass} shadow-sm hover:scale-[1.01] cursor-grab active:cursor-grabbing`
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {matched ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <GripVertical className="h-5 w-5 shrink-0 opacity-65" aria-hidden="true" />
                  )}
                  <span className="font-display text-lg font-extrabold">{hero.name}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Target Deed Drop Cards */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {deedOrder.map((heroId) => {
            const hero = HERO_ITEMS.find((h) => h.id === heroId)!;
            const isMatched = heroMatches[heroId] === heroId;
            const isOver = dragOverHero === heroId;

            return (
              <div
                key={heroId}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isMatched) setDragOverHero(heroId);
                }}
                onDragLeave={() => setDragOverHero(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragged = e.dataTransfer.getData('text/plain') as HeroId;
                  if (HERO_ITEMS.some((h) => h.id === dragged)) {
                    handleHeroDrop(heroId, dragged);
                  }
                }}
              >
                <button
                  type="button"
                  data-testid={`hero-drop-${heroId}`}
                  onClick={() => {
                    if (!isMatched && selectedHero) {
                      handleHeroDrop(heroId, selectedHero);
                    }
                  }}
                  aria-label={`Việc làm tiêu biểu: ${hero.deed}`}
                  className={`flex h-full w-full flex-col justify-between rounded-2xl border-2 p-4 text-left transition-all duration-100 active:scale-[0.98] cursor-pointer ${
                    isMatched
                      ? `border-emerald-500 bg-emerald-50 text-emerald-950 ${flashHero?.id === heroId && flashHero.correct ? 'animate-flash-correct' : ''}`
                      : flashHero?.id === heroId && !flashHero.correct
                        ? 'animate-flash-wrong border-rose-600 bg-rose-100 text-rose-950'
                        : isOver || selectedHero
                          ? 'border-dashed border-amber-500 bg-amber-50 text-slate-900'
                          : 'border-dashed border-slate-300 bg-slate-50 text-slate-800 hover:bg-amber-50/50'
                  }`}
                >
                  <p className="text-base leading-relaxed font-semibold text-slate-900">
                    “{hero.deed}”
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200/80 pt-3">
                    <span className="text-sm font-bold text-slate-600">{hero.shortTag}</span>
                    {isMatched ? (
                      <span className="font-display text-base font-extrabold text-emerald-700">
                        ✓ {hero.name}
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-amber-800">
                        {selectedHero ? 'Bấm để ghép vào đây!' : 'Kéo tên anh hùng vào đây'}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {heroesDone && (
          <p className="mt-4 font-display text-lg font-extrabold text-emerald-700">
            ✓ Xuất sắc! Em đã ghép đúng cả 4 tấm gương anh hùng tiêu biểu trong chiến dịch Điện Biên Phủ!
          </p>
        )}
      </section>

      {/* Task 2: Choose Historical Messages into Commemorative Frame */}
      <section
        aria-labelledby="task2-messages-heading"
        className="rounded-3xl border-2 border-rose-200 bg-white p-5 shadow-sm md:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-rose-700">Nhiệm vụ 2 · Bài học lịch sử cho em</p>
            <h2 id="task2-messages-heading" className="font-display text-2xl font-extrabold text-slate-900">
              Kéo thả các thông điệp lịch sử đúng vào Khung Ghi Nhớ!
            </h2>
          </div>
          <span className="text-base font-extrabold text-rose-700">
            <span className="font-mono text-lg tabular-nums">{selectedMessages.length}/{requiredMsgCount}</span> thông điệp
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Source Message Cards */}
          <div className="space-y-3 lg:col-span-6">
            <p className="text-sm font-bold text-slate-600">
              Chọn hoặc kéo thả những thông điệp thể hiện tinh thần Điện Biên Phủ:
            </p>
            {HISTORICAL_MESSAGES.map((msg) => {
              const placed = selectedMessages.includes(msg.id);
              const selected = selectedMsgCard === msg.id;
              return (
                <button
                  key={msg.id}
                  type="button"
                  draggable={!placed}
                  disabled={placed}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', msg.id);
                    setSelectedMsgCard(msg.id);
                  }}
                  onClick={() => {
                    if (placed) return;
                    playClickSound(muted);
                    setSelectedMsgCard((prev) => (prev === msg.id ? null : msg.id));
                  }}
                  aria-pressed={selected}
                  data-testid={`message-card-${msg.id}`}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-100 active:scale-[0.98] ${
                    placed
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 opacity-70 cursor-default'
                      : selected
                        ? 'scale-[1.01] border-rose-500 bg-rose-100 text-rose-950 shadow-md cursor-grab'
                        : 'border-rose-200 bg-rose-50/60 text-slate-900 hover:border-rose-400 cursor-grab active:cursor-grabbing'
                  }`}
                >
                  {placed ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <GripVertical className="h-5 w-5 shrink-0 text-rose-400" aria-hidden="true" />
                  )}
                  <span className="text-base font-bold">{msg.text}</span>
                </button>
              );
            })}
          </div>

          {/* Commemorative Historical Message Drop Frame */}
          <div
            className="lg:col-span-6"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverFrame(true);
            }}
            onDragLeave={() => setDragOverFrame(false)}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain');
              if (id) handleMessageDrop(id);
            }}
          >
            <div
              className={`flex h-full min-h-[260px] flex-col justify-between rounded-3xl border-2 p-5 transition-all duration-100 ${
                flashFrame && !flashFrame.correct
                  ? 'animate-flash-wrong border-rose-600 bg-rose-100'
                  : messagesDone
                    ? `border-amber-500 bg-gradient-to-b from-amber-50 to-rose-50 shadow-md ${flashFrame?.correct ? 'animate-flash-correct' : ''}`
                    : dragOverFrame || selectedMsgCard
                      ? `border-dashed border-rose-500 bg-rose-50 ${flashFrame?.correct ? 'animate-flash-correct' : ''}`
                      : `border-dashed border-amber-400 bg-amber-50/50 ${flashFrame?.correct ? 'animate-flash-correct' : ''}`
              }`}
            >
              <div>
                <div className="flex items-center gap-2 text-red-700">
                  <Heart className="h-6 w-6 fill-red-600 text-red-600" aria-hidden="true" />
                  <h3 className="font-display text-xl font-extrabold">
                    Khung Thông Điệp Lịch Sử 1954
                  </h3>
                </div>

                {selectedMessages.length === 0 ? (
                  <p className="mt-5 text-base font-semibold text-slate-600">
                    Kéo thả 3 thông điệp đúng từ bên trái vào khung này (hoặc chọn thẻ rồi bấm nút đặt vào khung bên dưới).
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2.5">
                    {selectedMessages.map((id) => {
                      const item = HISTORICAL_MESSAGES.find((m) => m.id === id);
                      if (!item) return null;
                      return (
                        <li
                          key={id}
                          className="animate-pop-in flex items-start gap-2.5 rounded-xl border border-amber-300 bg-white px-4 py-3 text-base font-bold text-slate-900 shadow-sm"
                        >
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                          <span>{item.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {!messagesDone && (
                <button
                  type="button"
                  data-testid="message-drop-frame"
                  onClick={() => {
                    if (selectedMsgCard) {
                      handleMessageDrop(selectedMsgCard);
                    }
                  }}
                  disabled={!selectedMsgCard}
                  className={`mt-4 w-full rounded-xl px-4 py-3 text-base font-extrabold transition-colors ${
                    selectedMsgCard
                      ? 'bg-rose-600 text-white hover:bg-rose-700 cursor-pointer'
                      : 'border border-amber-300 bg-white/80 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {selectedMsgCard
                    ? 'Đặt thông điệp đã chọn vào khung'
                    : 'Hãy chọn hoặc kéo 1 thẻ thông điệp vào đây'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Completion Celebration CTA */}
        {station3Done && (
          <div className="animate-pop-in mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-5">
            <div>
              <p className="font-display text-xl font-extrabold text-emerald-950">
                Hoàn thành Trạm 3 xuất sắc!
              </p>
              <p className="mt-1 text-base font-medium text-emerald-800">
                {allStationsDone
                  ? 'Em đã chinh phục trọn vẹn cả 3 trạm lịch sử Điện Biên Phủ 1954!'
                  : 'Em đã hoàn thành Trạm 3. Hãy quay lại Trang chính để chinh phục nốt các trạm còn lại nhé!'}
              </p>
            </div>
            {allStationsDone ? (
              <button
                type="button"
                onClick={onOpenCertificate}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-red-600 px-6 py-3.5 text-lg font-extrabold text-white shadow-md transition-colors hover:bg-red-700 cursor-pointer"
              >
                <Award className="h-5 w-5 text-amber-300" aria-hidden="true" />
                <span>Nhận Chứng nhận Nhà sử học nhí</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onBackHome}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-emerald-600 px-5 py-3 text-base font-extrabold text-white shadow-sm transition-colors hover:bg-emerald-700 cursor-pointer"
              >
                <span>Về Trang chính tiếp tục</span>
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
