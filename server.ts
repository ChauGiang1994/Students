import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import {
  ALL_PREWARM_FEEDBACK_CLIPS,
  getTeacherVoiceStyle,
  normalizeVietnameseForSpeech,
  TEACHER_VOICE_NAME,
  validateTtsInput,
  wrapPcm16AsWav,
  type TtsTone,
} from './src/utils/ttsValidation.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Persistent disk cache + bounded in-memory LRU cache + in-flight deduplication
// Eliminates redundant Gemini calls across reloads/restarts and serves hits in <2ms.
const DISK_CACHE_DIR = path.join(os.tmpdir(), 'dbp-1954-tts-cache');
try {
  fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
} catch {
  // Memory cache still works if tmpdir is unwritable
}

const ttsCache = new Map<string, Buffer>();
const inFlightTts = new Map<string, Promise<Buffer>>();
const MAX_CACHE_ENTRIES = 80;
const CACHE_SCHEMA_VERSION = 'v4-thuan-viet-bac-kore';

function makeCacheKey(text: string, tone: TtsTone): string {
  return `${CACHE_SCHEMA_VERSION}::${TEACHER_VOICE_NAME}::${tone}::${getTeacherVoiceStyle(tone)}::${text}`;
}

function diskPathForKey(key: string): string {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return path.join(DISK_CACHE_DIR, `${hash}.wav`);
}

function getCachedAudio(key: string): Buffer | undefined {
  const mem = ttsCache.get(key);
  if (mem) {
    ttsCache.delete(key);
    ttsCache.set(key, mem);
    return mem;
  }
  try {
    const file = diskPathForKey(key);
    if (fs.existsSync(file)) {
      const buf = fs.readFileSync(file);
      if (buf.byteLength > 44) {
        setCachedAudio(key, buf, false);
        return buf;
      }
    }
  } catch {
    // Ignore disk read error
  }
  return undefined;
}

function setCachedAudio(key: string, audio: Buffer, writeDisk = true): void {
  if (ttsCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = ttsCache.keys().next().value;
    if (oldestKey !== undefined) {
      ttsCache.delete(oldestKey);
    }
  }
  ttsCache.set(key, audio);
  if (writeDisk) {
    try {
      fs.writeFileSync(diskPathForKey(key), audio);
    } catch {
      // Non-fatal
    }
  }
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractHttpStatus(err: unknown): number {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const num = Number((err as { status?: number }).status);
    if (Number.isFinite(num) && num >= 400 && num < 600) return num;
  }
  return 500;
}

function buildTtsRequestPayload(text: string, tone: TtsTone) {
  const stylePrompt = getTeacherVoiceStyle(tone);
  const pureVietnameseText = normalizeVietnameseForSpeech(text);
  return {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: pureVietnameseText,
            speechMetadata: {
              style: stylePrompt,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: TEACHER_VOICE_NAME },
        },
      },
    },
  };
}

const TTS_MODELS: readonly string[] = [
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
];

async function synthesizeTeacherSpeech(
  ai: GoogleGenAI,
  text: string,
  tone: TtsTone,
): Promise<string | undefined> {
  const payload = buildTtsRequestPayload(text, tone);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    for (let i = 0; i < TTS_MODELS.length; i++) {
      const model = TTS_MODELS[i];
      try {
        const response = await ai.models.generateContent({
          model,
          ...payload,
        });
        const base64Audio =
          response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          return base64Audio;
        }
      } catch (err: unknown) {
        lastError = err;
        const status = extractHttpStatus(err);
        const hasFallback = i < TTS_MODELS.length - 1;
        if (hasFallback && (status === 404 || status === 400 || status === 429)) {
          continue;
        }
        if (attempt === 0 && status === 429) {
          await new Promise((r) => setTimeout(r, 650));
          break;
        }
        throw err;
      }
    }
  }

  if (lastError) throw lastError;
  return undefined;
}

function formatTtsError(err: unknown): { status: number; message: string; code?: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const safeStatus = extractHttpStatus(err);
  console.error('[TTS error]', safeStatus, rawMessage.slice(0, 260));

  const isKeyError =
    safeStatus === 401 ||
    safeStatus === 403 ||
    /API_KEY_INVALID|API key not valid/i.test(rawMessage);

  const message =
    safeStatus === 429
      ? 'Hệ thống thuyết minh tiếng Việt đang tạm bận, em vui lòng thử lại sau giây lát nhé.'
      : isKeyError
        ? 'Khóa kết nối thuyết minh chưa hợp lệ. Thầy cô vui lòng kiểm tra lại trong phần Cài đặt bảo mật.'
        : 'Không thể tạo giọng thuyết minh lúc này. Em vui lòng thử lại sau nhé.';

  return {
    status: safeStatus,
    message,
    code: safeStatus === 429 ? 'RATE_LIMITED' : undefined,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      voice: `vi-VN-northern-female-gentle-${TEACHER_VOICE_NAME.toLowerCase()}`,
    });
  });

  const getOrSynthesizeAudio = async (
    ai: GoogleGenAI,
    text: string,
    tone: TtsTone,
  ): Promise<Buffer> => {
    const cacheKey = makeCacheKey(text, tone);
    const cached = getCachedAudio(cacheKey);
    if (cached) return cached;

    const existing = inFlightTts.get(cacheKey);
    if (existing) return existing;

    const job = (async () => {
      try {
        const base64Audio = await synthesizeTeacherSpeech(ai, text, tone);
        if (!base64Audio) {
          throw Object.assign(
            new Error('Không nhận được dữ liệu âm thanh từ dịch vụ thuyết minh.'),
            { status: 502 },
          );
        }
        const wavBuffer = Buffer.from(base64Audio, 'base64');
        setCachedAudio(cacheKey, wavBuffer);
        return wavBuffer;
      } finally {
        inFlightTts.delete(cacheKey);
      }
    })();

    inFlightTts.set(cacheKey, job);
    return job;
  };

  // Fast unary WAV endpoint (serves cached teacher feedback clips in <2ms)
  app.post('/api/tts', async (req, res) => {
    const validation = validateTtsInput(req.body?.text, req.body?.tone);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const cacheKey = makeCacheKey(validation.text, validation.tone);
    const cached = getCachedAudio(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('X-Audio-Format', 'wav');
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(cached);
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Chưa cấu hình khóa kết nối thuyết minh tiếng Việt trong phần Cài đặt bảo mật.',
      });
      return;
    }

    try {
      const wavBuffer = await getOrSynthesizeAudio(ai, validation.text, validation.tone);
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('X-Audio-Format', 'wav');
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(wavBuffer);
    } catch (err: unknown) {
      const { status, message, code } = formatTtsError(err);
      res.status(status).json({ error: message, code });
    }
  });

  // Low-latency progressive streaming PCM endpoint for uncached story/narration clips.
  // Returns cached WAV in <2ms if already synthesized; otherwise streams 24kHz 16-bit LE PCM chunks
  // as Gemini generates them and saves the assembled WAV to cache for instant replays.
  app.post('/api/tts/stream', async (req, res) => {
    const validation = validateTtsInput(req.body?.text, req.body?.tone);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const cacheKey = makeCacheKey(validation.text, validation.tone);
    const cached = getCachedAudio(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('X-Audio-Format', 'wav');
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(cached);
      return;
    }

    // If unary synthesis is already running for this exact clip, reuse it directly
    const existing = inFlightTts.get(cacheKey);
    if (existing) {
      try {
        const wavBuffer = await existing;
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('X-Audio-Format', 'wav');
        res.setHeader('X-Cache', 'DEDUP');
        res.send(wavBuffer);
      } catch (err: unknown) {
        const { status, message, code } = formatTtsError(err);
        res.status(status).json({ error: message, code });
      }
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Chưa cấu hình khóa kết nối thuyết minh tiếng Việt trong phần Cài đặt bảo mật.',
      });
      return;
    }

    const payload = buildTtsRequestPayload(validation.text, validation.tone);
    let startedStreaming = false;
    const pcmChunks: Buffer[] = [];

    for (let i = 0; i < TTS_MODELS.length; i++) {
      const model = TTS_MODELS[i];
      try {
        const stream = await ai.models.generateContentStream({
          model,
          ...payload,
        });

        for await (const chunk of stream) {
          const base64Pcm =
            chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (!base64Pcm) continue;

          if (!startedStreaming) {
            startedStreaming = true;
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('X-Audio-Format', 'pcm-24000-s16le');
            res.setHeader('X-Cache', 'STREAM');
            res.setHeader('Cache-Control', 'no-store');
            res.flushHeaders();
          }

          const buf = Buffer.from(base64Pcm, 'base64');
          pcmChunks.push(buf);
          if (!res.writableEnded && !res.destroyed) {
            res.write(buf);
          }
        }

        if (startedStreaming) {
          if (!res.writableEnded) {
            res.end();
          }
          if (pcmChunks.length > 0) {
            const fullPcm = Buffer.concat(pcmChunks);
            const wavBytes = wrapPcm16AsWav(fullPcm, 24000);
            setCachedAudio(cacheKey, Buffer.from(wavBytes));
          }
          return;
        }
      } catch (err: unknown) {
        if (startedStreaming) {
          if (!res.writableEnded) res.end();
          return;
        }
        const status = extractHttpStatus(err);
        const hasFallback = i < TTS_MODELS.length - 1;
        if (hasFallback && (status === 404 || status === 400 || status === 429)) {
          continue;
        }
        const { status: safeStatus, message, code } = formatTtsError(err);
        res.status(safeStatus).json({ error: message, code });
        return;
      }
    }

    if (!res.headersSent) {
      res.status(502).json({
        error: 'Không nhận được dữ liệu âm thanh từ dịch vụ thuyết minh.',
      });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dien Bien Phu 1954 server listening on http://localhost:${PORT}`);
    // Load any already-synthesized core feedback clips from persistent disk cache into RAM (<1ms)
    // without spending Gemini API quota on server restarts.
    const coreClips = [
      ALL_PREWARM_FEEDBACK_CLIPS[0],
      ALL_PREWARM_FEEDBACK_CLIPS[4],
      ALL_PREWARM_FEEDBACK_CLIPS[3],
    ].filter(Boolean);
    for (const clip of coreClips) {
      getCachedAudio(makeCacheKey(clip.text, clip.tone));
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
