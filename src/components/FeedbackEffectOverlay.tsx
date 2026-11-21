import { CheckCircle2, Sparkles, XCircle } from 'lucide-react';

export interface AnswerEffectState {
  id: number;
  correct: boolean;
  headline: string;
  detail: string;
}

interface FeedbackEffectOverlayProps {
  effect: AnswerEffectState | null;
}

/**
 * Prominent visual right/wrong effect banner with sparkle burst (correct)
 * or warm gentle retry cue (incorrect). Pointer-events-none so it never blocks clicking.
 */
export function FeedbackEffectOverlay({ effect }: FeedbackEffectOverlayProps) {
  if (!effect) return null;

  return (
    <div
      key={effect.id}
      role="status"
      aria-live="polite"
      data-testid={effect.correct ? 'feedback-effect-correct' : 'feedback-effect-wrong'}
      className="pointer-events-none fixed bottom-6 left-1/2 z-40 w-[min(560px,92vw)] -translate-x-1/2"
    >
      <div
        className={`flex items-center gap-3.5 rounded-3xl border-2 px-5 py-4 shadow-2xl ${
          effect.correct
            ? 'animate-pop-in border-emerald-400 bg-emerald-600 text-white ring-4 ring-emerald-200/80'
            : 'animate-shake-soft border-amber-400 bg-rose-600 text-white ring-4 ring-rose-200/80'
        }`}
      >
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          {effect.correct && (
            <span
              aria-hidden="true"
              className="animate-burst-ring absolute inset-0 rounded-2xl border-2 border-amber-300"
            />
          )}
          <div
            className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ${
              effect.correct ? 'bg-amber-300 text-emerald-950' : 'bg-amber-200 text-rose-900'
            }`}
          >
            {effect.correct ? (
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            ) : (
              <XCircle className="h-7 w-7" aria-hidden="true" />
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-display text-xl font-extrabold tracking-wide">
            {effect.correct && <Sparkles className="h-5 w-5 text-amber-300" aria-hidden="true" />}
            <span>{effect.headline}</span>
          </div>
          <p className="mt-0.5 text-base font-semibold text-white/95">{effect.detail}</p>
        </div>
      </div>
    </div>
  );
}
