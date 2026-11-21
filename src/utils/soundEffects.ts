/**
 * Instant 0ms Web Audio API feedback effects + Zero-lag Gentle Northern Vietnamese Female Teacher TTS.
 * Features:
 * - Automatic AudioContext unlock + background AudioBuffer pre-decoding on first pointer/keyboard gesture
 * - Synchronous 0ms chime + instant Web Audio voice trigger for right/wrong answers
 * - Progressive 24kHz PCM streaming (/api/tts/stream) for uncached narrations (first audio in ~300ms)
 * - Automatic cooldown & gentle Vietnamese female Web Speech backup when Gemini TTS quota is temporarily busy (429)
 */
import {
  ALL_PREWARM_FEEDBACK_CLIPS,
  normalizeVietnameseForSpeech,
  pcm16ToFloat32,
  pickFeedbackPhrase,
  pickPreferredVietnameseFemaleVoice,
  TEACHER_ENCOURAGE_LINES,
  TEACHER_PRAISE_LINES,
  type TtsTone,
} from './ttsValidation';

let audioCtx: AudioContext | null = null;
let unlockBound = false;
let geminiRateLimitedUntil = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Unlocks Web Audio immediately on first user interaction and decodes any already-prefetched
 * teacher feedback clips into ready-to-fire AudioBuffers for <3ms playback.
 */
function ensureAudioUnlockListener(): void {
  if (unlockBound || typeof window === 'undefined') return;
  unlockBound = true;
  const unlock = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const decodeAll = () => {
      audioCache.forEach((clip) => {
        if (!clip.audioBuffer && clip.rawArrayBuffer && !clip.decoding) {
          clip.decoding = true;
          ctx
            .decodeAudioData(clip.rawArrayBuffer.slice(0))
            .then((buf) => {
              clip.audioBuffer = buf;
            })
            .catch(() => {})
            .finally(() => {
              clip.decoding = false;
            });
        }
      });
    };
    if (ctx.state === 'running') {
      decodeAll();
    } else {
      ctx.resume().then(decodeAll).catch(() => {});
    }
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
    window.removeEventListener('touchstart', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  window.addEventListener('keydown', unlock, { capture: true, passive: true });
  window.addEventListener('touchstart', unlock, { capture: true, passive: true });
}

export function playClickSound(muted: boolean): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(580, now);
  osc.frequency.exponentialRampToValueAtTime(860, now + 0.028);
  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.036);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

/** Instant crisp soft bell sparkle for correct answers (0ms response, blends smoothly with gentle voice) */
export function playCorrectSound(muted: boolean): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + idx * 0.026;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.11, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.16);
  });
}

/** Instant gentle muted two-tone marimba nudge for wrong answers (0ms response) */
export function playWrongSound(muted: boolean): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const freqs = [310, 235];
  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + idx * 0.052;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.89, start + 0.075);
    gain.gain.setValueAtTime(0.1, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.095);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.105);
  });
}

export function playVictoryFanfare(muted: boolean): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const melody: Array<[number, number, number]> = [
    [523.25, 0.0, 0.11],
    [659.25, 0.09, 0.11],
    [783.99, 0.18, 0.11],
    [1046.5, 0.28, 0.24],
    [783.99, 0.44, 0.11],
    [1046.5, 0.54, 0.36],
  ];
  melody.forEach(([freq, offset, dur]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + offset;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.13, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  });
}

export function playPullingBeat(muted: boolean, beatIndex: number): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const isAccent = beatIndex % 2 === 0;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(isAccent ? 125 : 95, now);
  osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
  gain.gain.setValueAtTime(isAccent ? 0.14 : 0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.17);

  if (beatIndex % 4 === 0) {
    const chantOsc = ctx.createOscillator();
    const chantGain = ctx.createGain();
    chantOsc.type = 'triangle';
    chantOsc.frequency.setValueAtTime(293.66, now + 0.03);
    chantOsc.frequency.linearRampToValueAtTime(349.23, now + 0.22);
    chantGain.gain.setValueAtTime(0.001, now + 0.03);
    chantGain.gain.linearRampToValueAtTime(0.06, now + 0.08);
    chantGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    chantOsc.connect(chantGain);
    chantGain.connect(ctx.destination);
    chantOsc.start(now + 0.03);
    chantOsc.stop(now + 0.36);
  }
}

export type NarrationStatus = 'idle' | 'loading' | 'speaking' | 'error';

export interface NarrationState {
  status: NarrationStatus;
  activeText: string | null;
  errorMessage: string | null;
}

interface CachedClip {
  objectUrl?: string;
  rawArrayBuffer?: ArrayBuffer;
  audioBuffer?: AudioBuffer;
  decoding?: boolean;
}

const audioCache = new Map<string, CachedClip>();
const inFlightFetches = new Map<string, Promise<CachedClip | null>>();
let activeAudio: HTMLAudioElement | null = null;
let activeBufferSources: AudioBufferSourceNode[] = [];
let activeAbortController: AbortController | null = null;
let narrationSeq = 0;
let prefetchedFeedback = false;
let praiseCounter = 0;
let encourageCounter = 0;

let currentState: NarrationState = {
  status: 'idle',
  activeText: null,
  errorMessage: null,
};

const listeners = new Set<(state: NarrationState) => void>();

function emitState(next: NarrationState): void {
  currentState = next;
  listeners.forEach((fn) => fn(next));
}

export function getNarrationState(): NarrationState {
  return currentState;
}

export function subscribeNarrationState(listener: (state: NarrationState) => void): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

export function stopNarration(): void {
  narrationSeq += 1;
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  if (activeBufferSources.length > 0) {
    for (const src of activeBufferSources) {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {
        // Ignore already stopped source
      }
    }
    activeBufferSources = [];
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
  emitState({ status: 'idle', activeText: null, errorMessage: null });
}

/**
 * Strictly Vietnamese-only female browser speech backup (Microsoft Hoài My / Google Tiếng Việt / Linh)
 * used ONLY when the server TTS is temporarily rate-limited (429) AND the device actually has
 * a native vi-VN voice installed. NEVER falls back to an English or foreign voice.
 */
function speakWithGentleBrowserVoice(
  text: string,
  tone: TtsTone,
  seq: number,
  notice?: string | null,
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  try {
    const voices = window.speechSynthesis.getVoices();
    const preferred = pickPreferredVietnameseFemaleVoice(voices);
    // CRITICAL: Never allow an English/default OS voice to read Vietnamese text!
    if (!preferred) {
      return false;
    }

    const pureVietnameseText = normalizeVietnameseForSpeech(text);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(pureVietnameseText);
    utterance.voice = preferred;
    utterance.lang = 'vi-VN';
    // Gentle, lyrical cadence suited to a Northern Vietnamese elementary female teacher
    utterance.rate = tone === 'story' ? 0.92 : tone === 'encourage' ? 0.94 : 0.97;
    utterance.pitch = tone === 'praise' ? 1.06 : 1.04;
    utterance.volume = 1.0;

    utterance.onend = () => {
      if (seq === narrationSeq) {
        emitState({ status: 'idle', activeText: null, errorMessage: null });
      }
    };
    utterance.onerror = () => {
      if (seq === narrationSeq) {
        emitState({ status: 'idle', activeText: null, errorMessage: null });
      }
    };

    emitState({
      status: 'speaking',
      activeText: text,
      errorMessage: notice ?? null,
    });
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

async function decodeClipFromWav(arrayBuffer: ArrayBuffer): Promise<CachedClip> {
  const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
  const objectUrl = URL.createObjectURL(blob);
  const clip: CachedClip = { objectUrl, rawArrayBuffer: arrayBuffer };

  const ctx = audioCtx;
  if (ctx && ctx.state === 'running') {
    try {
      clip.audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    } catch {
      // Lazy decode later or fallback to HTMLAudioElement
    }
  }
  return clip;
}

async function fetchAndCacheUnaryClip(
  text: string,
  tone: TtsTone,
  signal?: AbortSignal,
): Promise<{ clip: CachedClip | null; error?: string; rateLimited?: boolean }> {
  const key = `${tone}::${text}`;
  const existing = audioCache.get(key);
  if (existing) return { clip: existing };

  if (Date.now() < geminiRateLimitedUntil) {
    return { clip: null, rateLimited: true };
  }

  const inflight = inFlightFetches.get(key);
  if (inflight && !signal) {
    const clip = await inflight;
    return { clip };
  }

  let errorMsg: string | undefined;
  let rateLimited = false;
  const promise = (async (): Promise<CachedClip | null> => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, tone }),
        signal,
      });

      if (!res.ok) {
        if (res.status === 429) {
          rateLimited = true;
          geminiRateLimitedUntil = Date.now() + 45_000;
        }
        errorMsg = 'Không thể tạo giọng thuyết minh lúc này.';
        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error) errorMsg = data.error;
        } catch {
          // Keep default
        }
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      const clip = await decodeClipFromWav(arrayBuffer);
      audioCache.set(key, clip);
      return clip;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return null;
      }
      errorMsg = 'Không kết nối được tới máy chủ thuyết minh giọng nữ miền Bắc.';
      return null;
    }
  })();

  if (!signal) {
    inFlightFetches.set(key, promise);
    promise.finally(() => {
      if (inFlightFetches.get(key) === promise) {
        inFlightFetches.delete(key);
      }
    });
  }

  const clip = await promise;
  return { clip, error: errorMsg, rateLimited };
}

/**
 * Gently pre-warms the 2 primary teacher feedback clips (1 praise + 1 encourage) sequentially
 * and binds instant Web Audio pre-decoding on the user's first gesture.
 * Stops immediately on 429 cooldown to avoid noisy retries.
 */
export function prefetchTeacherFeedbackClips(): void {
  if (typeof window === 'undefined') return;
  ensureAudioUnlockListener();
  if (prefetchedFeedback) return;
  prefetchedFeedback = true;

  // Prime browser voice list early so instant backup voice is ready if Gemini TTS is busy
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.getVoices();
    } catch {
      // Ignore
    }
  }

  const coreClips = [
    ALL_PREWARM_FEEDBACK_CLIPS[0], // Primary praise
    ALL_PREWARM_FEEDBACK_CLIPS[4], // Primary encourage
  ].filter(Boolean);

  void (async () => {
    await new Promise((r) => setTimeout(r, 450));
    for (const { text, tone } of coreClips) {
      if (Date.now() < geminiRateLimitedUntil) break;
      const key = `${tone}::${text}`;
      if (audioCache.has(key) || inFlightFetches.has(key)) continue;
      const { clip, rateLimited } = await fetchAndCacheUnaryClip(text, tone);
      if (rateLimited || !clip) break;
      await new Promise((r) => setTimeout(r, 900));
    }
  })();
}

function playCachedClip(clip: CachedClip, trimmed: string, seq: number): void {
  if (seq !== narrationSeq) return;

  const ctx = getAudioContext();

  // Ultra-fast path: pre-decoded Web Audio buffer starts in <3ms
  if (ctx && clip.audioBuffer) {
    const startNow = () => {
      if (seq !== narrationSeq || !clip.audioBuffer) return;
      const source = ctx.createBufferSource();
      source.buffer = clip.audioBuffer;
      source.connect(ctx.destination);
      activeBufferSources = [source];
      source.onended = () => {
        if (seq === narrationSeq) {
          activeBufferSources = [];
          emitState({ status: 'idle', activeText: null, errorMessage: null });
        }
      };
      emitState({ status: 'speaking', activeText: trimmed, errorMessage: null });
      source.start(0);
    };
    if (ctx.state === 'running') {
      startNow();
    } else {
      ctx.resume().then(startNow).catch(() => {});
    }
    return;
  }

  // Lazy decode raw WAV in background for subsequent <3ms replays
  if (ctx && clip.rawArrayBuffer && !clip.decoding) {
    clip.decoding = true;
    ctx
      .decodeAudioData(clip.rawArrayBuffer.slice(0))
      .then((buf) => {
        clip.audioBuffer = buf;
      })
      .catch(() => {})
      .finally(() => {
        clip.decoding = false;
      });
  }

  if (!clip.objectUrl) return;
  const audio = new Audio(clip.objectUrl);
  activeAudio = audio;

  audio.onended = () => {
    if (seq === narrationSeq) {
      activeAudio = null;
      emitState({ status: 'idle', activeText: null, errorMessage: null });
    }
  };
  audio.onerror = () => {
    if (seq === narrationSeq) {
      activeAudio = null;
      emitState({
        status: 'error',
        activeText: null,
        errorMessage: 'Không thể phát tệp âm thanh thuyết minh trên trình duyệt này.',
      });
    }
  };

  emitState({ status: 'speaking', activeText: trimmed, errorMessage: null });
  audio.play().catch(() => {
    if (seq === narrationSeq) {
      activeAudio = null;
      emitState({
        status: 'idle',
        activeText: null,
        errorMessage: 'Hãy bấm nút "Nghe đọc" để trình duyệt cho phép phát âm thanh nhé.',
      });
    }
  });
}

/**
 * Progressive streaming TTS playback for uncached clips:
 * Plays the first 24kHz PCM chunk via Web Audio within ~300ms while assembling the full AudioBuffer
 * in client memory for <3ms instant replay on subsequent clicks.
 */
async function streamAndPlayNarration(
  text: string,
  tone: TtsTone,
  seq: number,
  signal: AbortSignal,
): Promise<void> {
  const cacheKey = `${tone}::${text}`;
  const res = await fetch('/api/tts/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, tone }),
    signal,
  });

  if (seq !== narrationSeq) return;

  if (!res.ok) {
    let errorMsg = 'Không thể tạo giọng thuyết minh lúc này.';
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) errorMsg = data.error;
    } catch {
      // Keep default
    }

    if (res.status === 429) {
      geminiRateLimitedUntil = Date.now() + 45_000;
      const spokeBackup = speakWithGentleBrowserVoice(
        text,
        tone,
        seq,
        tone === 'story' ? errorMsg : null,
      );
      if (spokeBackup) return;
    }

    emitState({ status: 'error', activeText: null, errorMessage: errorMsg });
    return;
  }

  const audioFormat = res.headers.get('X-Audio-Format') || 'wav';

  // Server returned a cached WAV in <3ms
  if (audioFormat === 'wav' || !res.body) {
    const arrayBuffer = await res.arrayBuffer();
    if (seq !== narrationSeq) return;
    const clip = await decodeClipFromWav(arrayBuffer);
    audioCache.set(cacheKey, clip);
    playCachedClip(clip, text, seq);
    return;
  }

  // Progressive 24kHz 16-bit LE mono PCM streaming directly into AudioContext
  const ctx = getAudioContext();
  if (!ctx) {
    emitState({ status: 'idle', activeText: null, errorMessage: null });
    return;
  }
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }

  const reader = res.body.getReader();
  const sampleRate = 24000;
  let nextPlayTime = ctx.currentTime + 0.02;
  let startedSpeaking = false;
  let leftoverByte: number | null = null;
  const allFloatChunks: Float32Array[] = [];
  let totalSamples = 0;
  let lastScheduledSource: AudioBufferSourceNode | null = null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (seq !== narrationSeq) {
        await reader.cancel().catch(() => {});
        return;
      }
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      let bytes: Uint8Array;
      if (leftoverByte !== null) {
        bytes = new Uint8Array(value.byteLength + 1);
        bytes[0] = leftoverByte;
        bytes.set(value, 1);
        leftoverByte = null;
      } else {
        bytes = value;
      }

      if (bytes.byteLength % 2 === 1) {
        leftoverByte = bytes[bytes.byteLength - 1];
        bytes = bytes.subarray(0, bytes.byteLength - 1);
      }
      if (bytes.byteLength === 0) continue;

      const float32 = pcm16ToFloat32(bytes);
      allFloatChunks.push(float32);
      totalSamples += float32.length;

      const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const scheduleAt = Math.max(ctx.currentTime + 0.008, nextPlayTime);
      source.start(scheduleAt);
      nextPlayTime = scheduleAt + audioBuffer.duration;
      activeBufferSources.push(source);
      lastScheduledSource = source;

      if (!startedSpeaking) {
        startedSpeaking = true;
        emitState({ status: 'speaking', activeText: text, errorMessage: null });
      }
    }

    // Cache full decoded AudioBuffer for instant <3ms replay next time
    if (totalSamples > 0) {
      const fullBuffer = ctx.createBuffer(1, totalSamples, sampleRate);
      const out = fullBuffer.getChannelData(0);
      let offset = 0;
      for (const chunk of allFloatChunks) {
        out.set(chunk, offset);
        offset += chunk.length;
      }
      audioCache.set(cacheKey, { audioBuffer: fullBuffer });
    }

    if (lastScheduledSource) {
      const finalSource = lastScheduledSource;
      finalSource.onended = () => {
        if (seq === narrationSeq) {
          activeBufferSources = [];
          emitState({ status: 'idle', activeText: null, errorMessage: null });
        }
      };
    } else if (seq === narrationSeq) {
      emitState({ status: 'idle', activeText: null, errorMessage: null });
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return;
    }
    if (seq === narrationSeq) {
      emitState({
        status: 'error',
        activeText: null,
        errorMessage: 'Không kết nối được tới máy chủ thuyết minh giọng nữ miền Bắc.',
      });
    }
  }
}

/**
 * Plays gentle, expressive Northern Vietnamese female teacher voice via server-side Gemini TTS.
 * Cached clips play in <3ms via Web Audio; uncached clips stream progressively in ~300ms;
 * falls back immediately to gentle browser Vietnamese voice during brief 429 cooldowns.
 */
export async function speakNarration(
  text: string,
  muted: boolean,
  tone: TtsTone = 'story',
): Promise<void> {
  if (muted || typeof window === 'undefined') return;
  ensureAudioUnlockListener();
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return;

  stopNarration();
  const seq = narrationSeq;
  const cacheKey = `${tone}::${trimmed}`;

  const cached = audioCache.get(cacheKey);
  if (cached) {
    playCachedClip(cached, trimmed, seq);
    return;
  }

  // If server TTS is in a brief 429 cooldown, use ONLY a verified native Vietnamese voice (never English!)
  if (Date.now() < geminiRateLimitedUntil) {
    const spoke = speakWithGentleBrowserVoice(
      trimmed,
      tone,
      seq,
      tone === 'story'
        ? 'Đang phát giọng đọc tiếng Việt của trình duyệt trong lúc hệ thống thuyết minh nghỉ giây lát.'
        : null,
    );
    if (spoke) return;
    if (tone === 'story') {
      emitState({
        status: 'error',
        activeText: null,
        errorMessage: 'Hệ thống thuyết minh giọng nữ miền Bắc đang tạm bận, em bấm "Nghe đọc" lại sau giây lát nhé.',
      });
    }
    return;
  }

  const inflight = inFlightFetches.get(cacheKey);
  if (inflight) {
    emitState({ status: 'loading', activeText: trimmed, errorMessage: null });
    const clip = await inflight;
    if (seq !== narrationSeq) return;
    if (clip) {
      playCachedClip(clip, trimmed, seq);
      return;
    }
    if (Date.now() < geminiRateLimitedUntil) {
      const spoke = speakWithGentleBrowserVoice(trimmed, tone, seq, null);
      if (spoke) return;
    }
  }

  const controller = new AbortController();
  activeAbortController = controller;
  emitState({ status: 'loading', activeText: trimmed, errorMessage: null });

  try {
    await streamAndPlayNarration(trimmed, tone, seq, controller.signal);
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    if (seq === narrationSeq) {
      emitState({
        status: 'error',
        activeText: null,
        errorMessage: 'Không kết nối được tới máy chủ thuyết minh giọng nữ miền Bắc.',
      });
    }
  }
}

/**
 * Instant 0ms right/wrong audio feedback:
 * Fires the soft chime and gentle Northern Vietnamese female teacher voice synchronously
 * on the exact interaction frame with zero artificial timer delay.
 */
export function playTeacherAnswerFeedback(
  isCorrect: boolean,
  muted: boolean,
  customPraise?: string,
): string {
  ensureAudioUnlockListener();
  const tone: TtsTone = isCorrect ? 'praise' : 'encourage';
  const index = isCorrect ? praiseCounter++ : encourageCounter++;
  const displayPhrase = customPraise ?? pickFeedbackPhrase(isCorrect, index);

  // Always prefer an already pre-decoded / cached clip of the same polarity for <3ms instant playback
  let spokenPhrase = displayPhrase;
  if (!audioCache.has(`${tone}::${spokenPhrase}`)) {
    const pool = isCorrect ? TEACHER_PRAISE_LINES : TEACHER_ENCOURAGE_LINES;
    const readyPhrase = pool.find((line) => audioCache.has(`${tone}::${line}`));
    if (readyPhrase) {
      spokenPhrase = readyPhrase;
    }
  }

  // Synchronous 0ms chime + 0ms gentle teacher voice launch (zero artificial setTimeout!)
  if (isCorrect) {
    playCorrectSound(muted);
  } else {
    playWrongSound(muted);
  }

  if (!muted && typeof window !== 'undefined') {
    void speakNarration(spokenPhrase, false, tone);
  }
  return displayPhrase;
}
