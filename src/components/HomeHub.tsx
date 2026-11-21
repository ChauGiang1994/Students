import { Award, BookOpen, CheckCircle2, Compass, Flag, Mountain, ArrowRight } from 'lucide-react';
import { SCHOOL_NAME } from '../data/campaignData';
import { SoldierGuide } from './SoldierGuide';
import type { OverallProgress } from '../logic/lessonEngine';

export type ViewId = 'home' | 'station1' | 'station2' | 'station3';

interface HomeHubProps {
  progress: OverallProgress;
  station1Done: boolean;
  station2Done: boolean;
  station3Done: boolean;
  muted: boolean;
  onNavigate: (view: ViewId) => void;
  onOpenTextbook: () => void;
  onOpenCertificate: () => void;
}

export function HomeHub({
  progress,
  station1Done,
  station2Done,
  station3Done,
  muted,
  onNavigate,
  onOpenTextbook,
  onOpenCertificate,
}: HomeHubProps) {
  const guideMessage = progress.allCompleted
    ? 'Chúc mừng Nhà sử học nhí xuất sắc! Em đã hoàn thành cả 3 thử thách khám phá chiến dịch Điện Biên Phủ năm 1954. Hãy nhận Huy hiệu chiến thắng nhé!'
    : progress.completedStations === 0
      ? 'Chào Nhà sử học nhí! Chú là bộ đội Điện Biên. Hãy cùng chú bước vào 3 trạm khám phá để tìm hiểu bản đồ, ba đợt tiến công và huyền thoại kéo pháo năm 1954 nhé!'
      : `Tuyệt vời lắm! Em đã vượt qua ${progress.completedStations}/3 thử thách rồi. Hãy tiếp tục khám phá các trạm còn lại để hoàn thành hành trình lịch sử nhé!`;

  const stations = [
    {
      id: 'station1' as const,
      number: 'Trạm 1',
      title: 'Sa bàn chiến dịch',
      subtitle: 'Quan sát sa bàn địa hình lịch sử Điện Biên Phủ (chế độ 2D & 3D) và kéo thả ghép đúng tên 3 phân khu.',
      done: station1Done,
      icon: Compass,
      accentBg: 'bg-emerald-600',
      cardBg: 'bg-emerald-50/90 hover:bg-emerald-50',
      borderColor: 'border-emerald-300 hover:border-emerald-500',
      buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    {
      id: 'station2' as const,
      number: 'Trạm 2',
      title: 'Ba đợt tiến công',
      subtitle: 'Tái hiện diễn biến 3 đợt tiến công trên sa bàn lịch sử trực quan và sắp xếp dòng thời gian.',
      done: station2Done,
      icon: Flag,
      accentBg: 'bg-orange-600',
      cardBg: 'bg-orange-50/90 hover:bg-orange-50',
      borderColor: 'border-orange-300 hover:border-orange-500',
      buttonClass: 'bg-orange-600 hover:bg-orange-700 text-white',
    },
    {
      id: 'station3' as const,
      number: 'Trạm 3',
      title: 'Huyền thoại kéo pháo',
      subtitle: 'Bước vào rừng núi Điện Biên 3D xem bộ đội kéo pháo, ghép anh hùng và chọn thông điệp.',
      done: station3Done,
      icon: Mountain,
      accentBg: 'bg-sky-600',
      cardBg: 'bg-sky-50/90 hover:bg-sky-50',
      borderColor: 'border-sky-300 hover:border-sky-500',
      buttonClass: 'bg-sky-600 hover:bg-sky-700 text-white',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner with Dien Bien Mountain Forest Landscape */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-emerald-800/20 bg-gradient-to-b from-[#0C4A6E] via-[#0F766E] to-[#166534] text-white shadow-lg">
        {/* Scenic Dien Bien Mountains SVG Backdrop */}
        <svg
          viewBox="0 0 1200 380"
          preserveAspectRatio="xMidYMax slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Sunrise glow */}
          <defs>
            <radialGradient id="sunGlow" cx="76%" cy="28%" r="42%">
              <stop offset="0%" stopColor="#FDE047" stopOpacity="0.85" />
              <stop offset="45%" stopColor="#FB923C" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0F766E" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1200" height="380" fill="url(#sunGlow)" />
          <circle cx="910" cy="108" r="56" fill="#FEF08A" opacity="0.92" />
          {/* Distant Northwest mountain ridges */}
          <path
            d="M0 280 L130 165 L270 235 L430 138 L610 230 L780 120 L950 215 L1085 150 L1200 220 L1200 380 L0 380 Z"
            fill="#115E59"
            opacity="0.7"
          />
          {/* Mid-ground jungle hills */}
          <path
            d="M0 320 L180 215 L360 285 L540 205 L730 275 L920 190 L1100 265 L1200 235 L1200 380 L0 380 Z"
            fill="#15803D"
            opacity="0.85"
          />
          {/* Foreground lush forest floor */}
          <path
            d="M0 340 Q320 295 620 332 T1200 315 L1200 380 L0 380 Z"
            fill="#14532D"
          />
          {/* Red-star victory flag silhouette on hill crest */}
          <line x1="920" y1="190" x2="920" y2="112" stroke="#FDE047" strokeWidth="4" />
          <path d="M922 114 L988 128 L922 152 Z" fill="#DC2626" />
          <polygon
            points="946,125 948.5,131 955,131 949.8,134.8 951.8,141 946,137.2 940.2,141 942.2,134.8 937,131 943.5,131"
            fill="#FACC15"
          />
        </svg>

        {/* Measured scrim for crisp WCAG AA readability */}
        <div className="relative z-10 bg-gradient-to-r from-slate-950/70 via-slate-950/45 to-slate-950/20 px-6 py-6 md:px-8 md:py-7">
          <p className="text-sm font-extrabold tracking-wide text-amber-200 md:text-base">
            {SCHOOL_NAME} · Lịch sử và Địa lí lớp 5 · Bài 15 · Hoạt động Khám phá
          </p>
          <h1 className="mt-2 max-w-3xl font-display text-3xl leading-tight font-extrabold text-white md:text-5xl">
            Hành trình khám phá Điện Biên Phủ 1954
          </h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed font-medium text-emerald-50 md:text-xl">
            Em là nhà sử học nhí, cùng bước vào không gian sa bàn lịch sử trực quan để khám phá và tái hiện chiến dịch Điện Biên Phủ năm 1954!
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate(station1Done ? (station2Done ? 'station3' : 'station2') : 'station1')}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-amber-400 px-6 py-3.5 text-lg font-extrabold text-slate-950 shadow-md transition-transform hover:scale-[1.02] hover:bg-amber-300 cursor-pointer"
            >
              <span>
                {progress.completedStations === 0
                  ? 'Bắt đầu khám phá ngay'
                  : progress.allCompleted
                    ? 'Khám phá lại từ Trạm 1'
                    : 'Tiếp tục hành trình'}
              </span>
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onOpenTextbook}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl border-2 border-white/60 bg-slate-900/55 px-5 py-3.5 text-base font-bold text-white transition-colors hover:bg-slate-900/80 cursor-pointer"
            >
              <BookOpen className="h-5 w-5 text-amber-300" aria-hidden="true" />
              <span>Xem tư liệu SGK Bài 15</span>
            </button>

            {progress.allCompleted && (
              <button
                type="button"
                onClick={onOpenCertificate}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-red-600 px-5 py-3.5 text-base font-extrabold text-white shadow-md transition-colors hover:bg-red-700 cursor-pointer"
              >
                <Award className="h-5 w-5 text-amber-300" aria-hidden="true" />
                <span>Xem Chứng nhận Nhà sử học nhí</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Progress Bar + Chú bộ đội Guide */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SoldierGuide
            message={guideMessage}
            mood={progress.allCompleted ? 'cheering' : 'happy'}
            muted={muted}
          />
        </div>

        <div className="flex flex-col justify-center rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm lg:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-extrabold text-emerald-950">
              Tiến trình hành trình
            </h2>
            <span className="text-base font-extrabold text-emerald-700">
              <span className="font-mono text-lg tabular-nums">
                {progress.completedStations}/{progress.totalStations}
              </span>{' '}
              thử thách
            </span>
          </div>
          <div
            className="mt-3 h-4 w-full overflow-hidden rounded-full bg-emerald-100"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tiến độ hoàn thành 3 thử thách"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-500"
              style={{ width: `${Math.max(progress.percent, 4)}%` }}
            />
          </div>
          <p className="mt-3 text-base font-medium text-slate-700">
            {progress.allCompleted
              ? 'Hoàn thành xuất sắc 100%! Em đã mở khóa Huy hiệu Nhà sử học nhí.'
              : 'Hoàn thành cả 3 trạm để nhận Huy hiệu Nhà sử học nhí Điện Biên Phủ!'}
          </p>
        </div>
      </section>

      {/* Three Big Colorful Exploration Station Cards */}
      <section aria-labelledby="stations-heading">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 id="stations-heading" className="font-display text-2xl font-extrabold text-slate-900 md:text-3xl">
            Chọn trạm khám phá
          </h2>
          <p className="text-sm font-semibold text-slate-600 md:text-base">
            Thời lượng: 8–10 phút · 3 trạm tương tác 3D & kéo thả
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {stations.map((st) => {
            const Icon = st.icon;
            return (
              <article
                key={st.id}
                className={`flex flex-col justify-between rounded-3xl border-2 p-6 shadow-sm transition-all ${st.cardBg} ${st.borderColor}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm ${st.accentBg}`}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">
                      {st.done ? '✓ Đã hoàn thành' : st.number}
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-2xl font-extrabold text-slate-900">
                    {st.title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed font-medium text-slate-700">
                    {st.subtitle}
                  </p>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => onNavigate(st.id)}
                    className={`flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-5 py-3.5 text-lg font-extrabold shadow-sm transition-colors cursor-pointer ${st.buttonClass}`}
                  >
                    {st.done ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        <span>Xem lại {st.title}</span>
                      </>
                    ) : (
                      <>
                        <span>Khám phá {st.title}</span>
                        <ArrowRight className="h-5 w-5" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
