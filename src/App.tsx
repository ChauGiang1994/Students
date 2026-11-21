import { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { SCHOOL_NAME, type HeroId, type SequenceCardId, type WaveId, type ZoneId } from './data/campaignData';
import {
  computeOverallProgress,
  createInitialHeroMatches,
  createInitialStation1,
  createInitialStation2Slots,
  isStation1Complete,
  isStation2Complete,
  isStation3Complete,
  type HeroMatches,
  type Station1Assignments,
  type Station2Slots,
} from './logic/lessonEngine';
import {
  playClickSound,
  playTeacherAnswerFeedback,
  playVictoryFanfare,
  prefetchTeacherFeedbackClips,
  stopNarration,
} from './utils/soundEffects';
import {
  FeedbackEffectOverlay,
  type AnswerEffectState,
} from './components/FeedbackEffectOverlay';
import { HomeHub, type ViewId } from './components/HomeHub';
import { Station1Map } from './components/Station1Map';
import { Station2Waves } from './components/Station2Waves';
import { Station3Artillery } from './components/Station3Artillery';
import { TextbookModal } from './components/TextbookModal';
import { VictoryCertificateModal } from './components/VictoryCertificateModal';

function getInitialViewFromQuery(): ViewId {
  if (typeof window === 'undefined') return 'home';
  const params = new URLSearchParams(window.location.search);
  const st = params.get('station');
  if (st === '1') return 'station1';
  if (st === '2') return 'station2';
  if (st === '3') return 'station3';
  if (params.get('autostart') === '1') return 'station1';
  return 'home';
}

export default function App() {
  const [view, setView] = useState<ViewId>(getInitialViewFromQuery);
  const [muted, setMuted] = useState(false);
  const [textbookOpen, setTextbookOpen] = useState(false);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [answerEffect, setAnswerEffect] = useState<AnswerEffectState | null>(null);
  const effectTimerRef = useRef<number | null>(null);
  const effectSeqRef = useRef(0);

  // Station 1 state
  const [station1Assignments, setStation1Assignments] =
    useState<Station1Assignments>(createInitialStation1);

  // Station 2 state
  const [exploredWaves, setExploredWaves] = useState<WaveId[]>([]);
  const [station2Slots, setStation2Slots] = useState<Station2Slots>(createInitialStation2Slots);

  // Station 3 state
  const [heroMatches, setHeroMatches] = useState<HeroMatches>(createInitialHeroMatches);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);

  const station1Done = useMemo(
    () => isStation1Complete(station1Assignments),
    [station1Assignments],
  );
  const station2Done = useMemo(() => isStation2Complete(station2Slots), [station2Slots]);
  const station3Done = useMemo(
    () => isStation3Complete(heroMatches, selectedMessages),
    [heroMatches, selectedMessages],
  );

  const progress = useMemo(
    () => computeOverallProgress({ station1Done, station2Done, station3Done }),
    [station1Done, station2Done, station3Done],
  );

  // Celebrate automatically the first time all 3 challenges are completed
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (progress.allCompleted && !celebratedRef.current) {
      celebratedRef.current = true;
      playVictoryFanfare(muted);
      const t = window.setTimeout(() => setCertificateOpen(true), 420);
      return () => window.clearTimeout(t);
    }
    if (!progress.allCompleted) {
      celebratedRef.current = false;
    }
  }, [progress.allCompleted, muted]);

  const triggerAnswerFeedback = (isCorrect: boolean, customPraise?: string) => {
    const spokenPhrase = playTeacherAnswerFeedback(isCorrect, muted, customPraise);
    effectSeqRef.current += 1;
    setAnswerEffect({
      id: effectSeqRef.current,
      correct: isCorrect,
      headline: isCorrect ? 'ĐÚNG RỒI! CÔ KHEN EM!' : 'CHƯA ĐÚNG — EM THỬ LẠI NHÉ!',
      detail: spokenPhrase,
    });
    if (effectTimerRef.current !== null) {
      window.clearTimeout(effectTimerRef.current);
    }
    effectTimerRef.current = window.setTimeout(() => {
      setAnswerEffect(null);
      effectTimerRef.current = null;
    }, 2100);
  };

  useEffect(() => {
    if (!muted) {
      prefetchTeacherFeedbackClips();
    }
  }, [muted]);

  useEffect(() => {
    return () => {
      if (effectTimerRef.current !== null) {
        window.clearTimeout(effectTimerRef.current);
      }
    };
  }, []);

  const navigateTo = (next: ViewId) => {
    stopNarration();
    playClickSound(muted);
    setAnswerEffect(null);
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAssignZone = (zoneId: ZoneId) => {
    setStation1Assignments((prev) => ({ ...prev, [zoneId]: zoneId }));
  };

  const handleExploreWave = (waveId: WaveId) => {
    setExploredWaves((prev) => (prev.includes(waveId) ? prev : [...prev, waveId]));
  };

  const handlePlaceSequenceCard = (slotIndex: 0 | 1 | 2, cardId: SequenceCardId) => {
    setStation2Slots((prev) => {
      const next: Station2Slots = [...prev];
      next[slotIndex] = cardId;
      return next;
    });
  };

  const handleMatchHero = (heroId: HeroId) => {
    setHeroMatches((prev) => ({ ...prev, [heroId]: heroId }));
  };

  const handleAddMessage = (msgId: string) => {
    setSelectedMessages((prev) => (prev.includes(msgId) ? prev : [...prev, msgId]));
  };

  const handleResetAll = () => {
    setStation1Assignments(createInitialStation1());
    setExploredWaves([]);
    setStation2Slots(createInitialStation2Slots());
    setHeroMatches(createInitialHeroMatches());
    setSelectedMessages([]);
    setView('home');
  };

  const navItems: Array<{ id: ViewId; label: string; done?: boolean }> = [
    { id: 'home', label: 'Trang chính' },
    { id: 'station1', label: 'Sa bàn lịch sử', done: station1Done },
    { id: 'station2', label: 'Ba đợt tiến công', done: station2Done },
    { id: 'station3', label: 'Kéo pháo 3D', done: station3Done },
  ];

  return (
    <div
      className="min-h-screen bg-[#F4F8F2] text-slate-900"
      data-current-view={view}
      data-completed-stations={progress.completedStations}
    >
      {/* Top Bar: Clean 3-Zone Contract */}
      <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-white/95 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:gap-8 md:px-6">
          {/* Zone 1: Brand Wordmark + School Name */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="flex flex-col items-start text-left whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="font-display text-lg leading-tight font-extrabold tracking-tight text-red-700 md:text-2xl">
              Điện Biên Phủ 1954
            </span>
            <span className="text-[11px] font-bold tracking-wide text-emerald-800 md:text-xs">
              {SCHOOL_NAME}
            </span>
          </button>

          {/* Zone 2: Concise Single-line Navigation Links */}
          <nav
            aria-label="Điều hướng các trạm học tập"
            className="hidden items-center gap-6 md:flex"
          >
            {navItems.map((item) => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`border-b-2 py-1 text-base font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'border-red-600 text-red-700'
                      : 'border-transparent text-slate-700 hover:border-emerald-400 hover:text-emerald-900'
                  }`}
                >
                  {item.label}
                  {item.done ? ' ✓' : ''}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action (Sound Toggle) */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setMuted((m) => {
                  const next = !m;
                  if (next) stopNarration();
                  return next;
                });
              }}
              aria-pressed={!muted}
              aria-label={muted ? 'Bật âm thanh hướng dẫn' : 'Tắt âm thanh hướng dẫn'}
              className={`inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl px-4 py-2 text-sm font-extrabold transition-colors cursor-pointer ${
                muted
                  ? 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              {muted ? (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{muted ? 'Âm thanh: Tắt' : 'Âm thanh: Bật'}</span>
            </button>
          </div>
        </div>

        {/* Compact mobile navigation row only on small viewports */}
        <nav
          aria-label="Điều hướng nhanh trên điện thoại"
          className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden"
        >
          {navItems.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {item.label}
                {item.done ? ' ✓' : ''}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {view === 'home' && (
          <HomeHub
            progress={progress}
            station1Done={station1Done}
            station2Done={station2Done}
            station3Done={station3Done}
            muted={muted}
            onNavigate={navigateTo}
            onOpenTextbook={() => {
              playClickSound(muted);
              setTextbookOpen(true);
            }}
            onOpenCertificate={() => {
              playVictoryFanfare(muted);
              setCertificateOpen(true);
            }}
          />
        )}

        {view === 'station1' && (
          <Station1Map
            assignments={station1Assignments}
            muted={muted}
            onAssignZone={handleAssignZone}
            onAnswerFeedback={triggerAnswerFeedback}
            onResetStation={() => setStation1Assignments(createInitialStation1())}
            onBackHome={() => navigateTo('home')}
            onGoNext={() => navigateTo('station2')}
          />
        )}

        {view === 'station2' && (
          <Station2Waves
            exploredWaves={exploredWaves}
            slots={station2Slots}
            muted={muted}
            onExploreWave={handleExploreWave}
            onPlaceSequenceCard={handlePlaceSequenceCard}
            onAnswerFeedback={triggerAnswerFeedback}
            onResetStation={() => {
              setExploredWaves([]);
              setStation2Slots(createInitialStation2Slots());
            }}
            onBackHome={() => navigateTo('home')}
            onGoNext={() => navigateTo('station3')}
          />
        )}

        {view === 'station3' && (
          <Station3Artillery
            heroMatches={heroMatches}
            selectedMessages={selectedMessages}
            muted={muted}
            allStationsDone={progress.allCompleted}
            onMatchHero={handleMatchHero}
            onAddMessage={handleAddMessage}
            onAnswerFeedback={triggerAnswerFeedback}
            onResetStation={() => {
              setHeroMatches(createInitialHeroMatches());
              setSelectedMessages([]);
            }}
            onBackHome={() => navigateTo('home')}
            onOpenCertificate={() => {
              playVictoryFanfare(muted);
              setCertificateOpen(true);
            }}
          />
        )}
      </main>

      <FeedbackEffectOverlay effect={answerEffect} />

      {/* Quiet Educational Footer */}
      <footer className="mt-10 border-t border-emerald-900/10 bg-white/80 py-5 text-center text-sm font-medium text-slate-600">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 md:px-6">
          <span>
            <strong className="font-extrabold text-emerald-900">{SCHOOL_NAME}</strong> · Học liệu số Lịch sử &amp; Địa lí lớp 5 · Bài 15: Chiến dịch Điện Biên Phủ năm 1954
          </span>
          <span className="font-bold text-emerald-800">
            Tiến độ:{' '}
            <span className="font-mono tabular-nums">
              {progress.completedStations}/3
            </span>{' '}
            thử thách
          </span>
        </div>
      </footer>

      <TextbookModal open={textbookOpen} onClose={() => setTextbookOpen(false)} />
      <VictoryCertificateModal
        open={certificateOpen}
        onClose={() => setCertificateOpen(false)}
        onResetAll={handleResetAll}
      />
    </div>
  );
}
