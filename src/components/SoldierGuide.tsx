import { useEffect, useState } from 'react';
import { Loader2, Square, Volume2 } from 'lucide-react';
import {
  getNarrationState,
  speakNarration,
  stopNarration,
  subscribeNarrationState,
  type NarrationState,
} from '../utils/soundEffects';

export type GuideMood = 'happy' | 'cheering' | 'thinking' | 'pointing';

interface SoldierGuideProps {
  message: string;
  mood?: GuideMood;
  muted: boolean;
  speakerLabel?: string;
  compact?: boolean;
}

export function SoldierGuide({
  message,
  mood = 'happy',
  muted,
  speakerLabel = 'Chú bộ đội hướng dẫn',
  compact = false,
}: SoldierGuideProps) {
  const [narration, setNarration] = useState<NarrationState>(getNarrationState);

  useEffect(() => {
    return subscribeNarrationState(setNarration);
  }, []);

  const normalizedMessage = message.replace(/\s+/g, ' ').trim();
  const isThisLoading =
    narration.status === 'loading' && narration.activeText === normalizedMessage;
  const isThisSpeaking =
    narration.status === 'speaking' && narration.activeText === normalizedMessage;

  const handleToggleSpeech = () => {
    if (isThisLoading || isThisSpeaking) {
      stopNarration();
    } else {
      void speakNarration(message, false);
    }
  };

  return (
    <div
      className={`flex items-start gap-4 rounded-2xl border-2 border-amber-300 bg-[#FFFDF5] shadow-sm ${
        compact ? 'p-3.5' : 'p-4 md:p-5'
      }`}
    >
      {/* Friendly Grade-5 Chú Bộ Đội SVG Portrait */}
      <div
        className={`relative shrink-0 overflow-hidden rounded-2xl border-2 border-emerald-700/20 bg-gradient-to-b from-sky-100 to-emerald-100 ${
          compact ? 'h-16 w-16' : 'h-20 w-20 md:h-24 md:w-24'
        }`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 120 120" className="h-full w-full">
          {/* Background mountains */}
          <path d="M0 95 L32 62 L62 88 L92 56 L120 92 L120 120 L0 120 Z" fill="#86C28E" opacity="0.45" />
          {/* Uniform Shoulders */}
          <path
            d="M22 120 C24 94, 40 86, 60 86 C80 86, 96 94, 98 120 Z"
            fill="#4A6B3E"
          />
          {/* Uniform Collar & Red-Gold Collar Tabs */}
          <path d="M46 86 L60 98 L74 86 Z" fill="#3B5731" />
          <rect x="44" y="90" width="9" height="5" rx="1.5" fill="#DC2626" transform="rotate(14 44 90)" />
          <rect x="67" y="90" width="9" height="5" rx="1.5" fill="#DC2626" transform="rotate(-14 67 90)" />
          {/* Neck */}
          <rect x="52" y="75" width="16" height="14" rx="6" fill="#F8CBA6" />
          {/* Head */}
          <circle cx="60" cy="58" r="22" fill="#FCD5B5" />
          {/* Ears */}
          <circle cx="38" cy="60" r="4.5" fill="#F8CBA6" />
          <circle cx="82" cy="60" r="4.5" fill="#F8CBA6" />
          {/* Rosy cheeks */}
          <ellipse cx="47" cy="64" rx="4" ry="2.4" fill="#F59E9E" opacity="0.55" />
          <ellipse cx="73" cy="64" rx="4" ry="2.4" fill="#F59E9E" opacity="0.55" />
          {/* Eyes */}
          {mood === 'cheering' ? (
            <>
              <path d="M48 56 Q52 51 56 56" stroke="#1F2937" strokeWidth="2.8" fill="none" strokeLinecap="round" />
              <path d="M64 56 Q68 51 72 56" stroke="#1F2937" strokeWidth="2.8" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="52" cy="56" r="3" fill="#1F2937" />
              <circle cx="68" cy="56" r="3" fill="#1F2937" />
              <circle cx="53" cy="55" r="1" fill="#FFFFFF" />
              <circle cx="69" cy="55" r="1" fill="#FFFFFF" />
            </>
          )}
          {/* Eyebrows */}
          <path d="M47 50 Q52 48 56 50" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M64 50 Q68 48 73 50" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Mouth */}
          {mood === 'thinking' ? (
            <path d="M54 68 Q60 66 66 68" stroke="#991B1B" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          ) : (
            <path d="M51 66 Q60 75 69 66" stroke="#991B1B" strokeWidth="2.6" fill={mood === 'cheering' ? '#EF4444' : 'none'} strokeLinecap="round" />
          )}
          {/* Classic Vietnamese Pith Helmet (Mũ cối) with camouflage leaf & golden star */}
          <path d="M32 45 C34 22, 86 22, 88 45 Z" fill="#4D7040" />
          <ellipse cx="60" cy="45" rx="33" ry="6.5" fill="#3D5A32" />
          <path d="M36 42 Q60 36 84 42" stroke="#6E945B" strokeWidth="2.2" fill="none" />
          {/* Red & Gold Emblem on helmet */}
          <circle cx="60" cy="34" r="6.5" fill="#DC2626" />
          <polygon
            points="60,29 61.5,32.7 65.5,32.7 62.3,35 63.5,38.8 60,36.5 56.5,38.8 57.7,35 54.5,32.7 58.5,32.7"
            fill="#FACC15"
          />
          {/* Camouflage leaf tucked on helmet */}
          <path d="M78 33 Q92 22 93 36 Q84 39 78 33 Z" fill="#16A34A" />
          {/* Raised hand when cheering or pointing */}
          {mood === 'cheering' && (
            <g>
              <circle cx="98" cy="76" r="7" fill="#FCD5B5" />
              <path d="M90 100 L96 80" stroke="#4A6B3E" strokeWidth="9" strokeLinecap="round" />
            </g>
          )}
        </svg>
      </div>

      {/* Speech Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="font-display text-base font-bold text-emerald-900 md:text-lg">
              {speakerLabel}
            </p>
            <span className="text-xs font-semibold text-slate-500">
              · Cô giáo thuyết minh (tiếng Việt chuẩn giọng nữ miền Bắc nhẹ nhàng, truyền cảm)
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleSpeech}
            aria-label={
              isThisSpeaking
                ? 'Dừng giọng thuyết minh nữ miền Bắc'
                : 'Nghe thuyết minh giọng nữ miền Bắc'
            }
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-1.5 text-sm font-bold transition-colors cursor-pointer ${
              isThisSpeaking
                ? 'border-red-300 bg-red-100 text-red-900 hover:bg-red-200'
                : 'border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200'
            }`}
          >
            {isThisLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Đang tạo giọng...</span>
              </>
            ) : isThisSpeaking ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span>Dừng đọc</span>
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>Nghe đọc</span>
              </>
            )}
          </button>
        </div>
        <p className="mt-1.5 text-base leading-relaxed font-medium text-slate-800 md:text-lg">
          {message}
        </p>
        {narration.errorMessage && (
          <p
            className={`mt-1.5 text-xs font-semibold ${
              narration.status === 'speaking' ? 'text-amber-800' : 'text-red-700'
            }`}
            role="status"
          >
            {narration.errorMessage}
          </p>
        )}
        {muted && !narration.errorMessage && (
          <p className="mt-1 text-xs font-medium text-slate-500">
            Âm thanh tự động đang tắt — em vẫn có thể nhấn "Nghe đọc" để nghe giọng nữ miền Bắc bất cứ lúc nào.
          </p>
        )}
      </div>
    </div>
  );
}
