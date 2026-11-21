export const MAX_TTS_TEXT_LENGTH = 700;

export type TtsTone = 'story' | 'praise' | 'encourage';

/**
 * Warm, grounded female prebuilt Gemini TTS voice paired with strict native
 * Northern Vietnamese (Hanoi) elementary teacher style directives.
 */
export const TEACHER_VOICE_NAME = 'Kore';

export const NORTHERN_FEMALE_TTS_STYLE =
  'Bắt buộc đọc 100% bằng tiếng Việt bản ngữ chuẩn giọng nữ miền Bắc Việt Nam (giọng Hà Nội chuẩn), phát âm tròn vành rõ chữ đúng sáu thanh điệu tiếng Việt, tuyệt đối không pha giọng tiếng Anh hay ngữ điệu nước ngoài. Phong cách cô giáo tiểu học miền Bắc nhẹ nhàng, dịu dàng, ấm áp và giàu truyền cảm; kể chuyện lịch sử với tốc độ vừa phải, ngắt nghỉ mềm mại tự nhiên, không đọc đều đều máy móc.';

export const TONE_STYLE_PROMPTS: Record<TtsTone, string> = {
  story: NORTHERN_FEMALE_TTS_STYLE,
  praise:
    'Bắt buộc nói 100% bằng tiếng Việt bản ngữ chuẩn giọng nữ miền Bắc Việt Nam (giọng Hà Nội chuẩn), tuyệt đối không pha giọng tiếng Anh. Giọng cô giáo tiểu học miền Bắc nhẹ nhàng, ngọt ngào, tươi tắn và truyền cảm; mỉm cười dịu êm trong giọng nói để khen ngợi học sinh lớp 5 làm đúng bài, gần gũi trìu mến, không gắt và không đều đều.',
  encourage:
    'Bắt buộc nói 100% bằng tiếng Việt bản ngữ chuẩn giọng nữ miền Bắc Việt Nam (giọng Hà Nội chuẩn), tuyệt đối không pha giọng tiếng Anh. Giọng cô giáo tiểu học miền Bắc thật nhẹ nhàng, dịu êm, ân cần và vỗ về truyền cảm; khích lệ học sinh lớp 5 bình tĩnh thử lại khi chọn chưa đúng, ngữ điệu lên xuống mềm mại gần gũi.',
};

export const TEACHER_PRAISE_LINES = [
  'Giỏi quá! Em chọn đúng rồi đấy, cô khen em nhé!',
  'Tuyệt vời lắm! Chính xác rồi, nhà sử học nhí thật thông minh!',
  'Hoan hô! Đúng rồi em ơi, em học bài rất chắc đấy!',
];

export const STATION_COMPLETE_PRAISE =
  'Hoan hô! Em thật xuất sắc, đã hoàn thành trọn vẹn trạm học này rồi đấy!';

export const TEACHER_ENCOURAGE_LINES = [
  'Ồ, chưa đúng rồi em ơi! Không sao đâu, em thử lại nhé!',
  'Chưa chính xác rồi! Em bình tĩnh xem lại gợi ý rồi thử lại cùng cô nhé!',
  'Suýt đúng rồi đấy! Em suy nghĩ thêm một chút rồi chọn lại nhé!',
];

export const ALL_PREWARM_FEEDBACK_CLIPS: ReadonlyArray<{ text: string; tone: TtsTone }> = [
  ...TEACHER_PRAISE_LINES.map((text) => ({ text, tone: 'praise' as const })),
  { text: STATION_COMPLETE_PRAISE, tone: 'praise' as const },
  ...TEACHER_ENCOURAGE_LINES.map((text) => ({ text, tone: 'encourage' as const })),
];

export interface TtsValidationResult {
  valid: boolean;
  text: string;
  tone: TtsTone;
  error?: string;
}

export function normalizeTtsTone(raw: unknown): TtsTone {
  if (raw === 'praise' || raw === 'encourage' || raw === 'story') {
    return raw;
  }
  return 'story';
}

export function getTeacherVoiceStyle(tone: TtsTone): string {
  return TONE_STYLE_PROMPTS[tone];
}

export function pickFeedbackPhrase(isCorrect: boolean, attemptIndex: number): string {
  const list = isCorrect ? TEACHER_PRAISE_LINES : TEACHER_ENCOURAGE_LINES;
  const safeIdx = Math.abs(Math.floor(attemptIndex)) % list.length;
  return list[safeIdx];
}

/**
 * Converts abbreviations, military hill codes, times, and dates into 100% pure
 * spoken Vietnamese so TTS engines never slip into English pronunciation.
 */
export function normalizeVietnameseForSpeech(raw: string): string {
  let out = raw.replace(/\s+/g, ' ').trim();

  // Remove any domain/URL strings if present
  out = out.replace(/\(?\s*baochinhphu\.vn\s*\)?/gi, '');

  // Abbreviations & technical terms -> pure Vietnamese words
  out = out.replace(/\b3D\b/gi, 'ba chiều');
  out = out.replace(/\bSGK\b/gi, 'sách giáo khoa');
  out = out.replace(/\bWebGL\b/gi, 'đồ họa ba chiều');
  out = out.replace(/Đacôta/gi, 'Đa-cô-ta');

  // Stronghold codes -> native Vietnamese spoken pronunciation (avoids English "A-one / C-one / D-one")
  out = out.replace(/\bD1\s*[–-]\s*E1\b/g, 'Dê Một và E Một');
  out = out.replace(/\bA1\b/g, 'A Một');
  out = out.replace(/\bC1\b/g, 'Xê Một');
  out = out.replace(/\bD1\b/g, 'Dê Một');
  out = out.replace(/\bE1\b/g, 'E Một');
  out = out.replace(/\b505A\b/g, 'năm trăm linh năm A');
  out = out.replace(/\b311A\b/g, 'ba trăm mười một A');

  // Time formats: 17h05 -> 17 giờ 5 phút, 17h00 -> 17 giờ, 24h -> 24 giờ
  out = out.replace(/\b(\d{1,2})h00\b/gi, '$1 giờ');
  out = out.replace(/\b(\d{1,2})h0(\d)\b/gi, '$1 giờ $2 phút');
  out = out.replace(/\b(\d{1,2})h(\d{2})\b/gi, '$1 giờ $2 phút');
  out = out.replace(/\b(\d{1,2})h\b/gi, '$1 giờ');

  // Date formats: 7/5/1954 -> ngày 7 tháng 5 năm 1954; 13/3 -> 13 tháng 3
  out = out.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, '$1 tháng $2 năm $3');
  out = out.replace(/\b(\d{1,2})\/(\d{1,2})\b/g, '$1 tháng $2');

  // Smooth Vietnamese speech pauses instead of typographic symbols
  out = out.replace(/\s*[·—–]\s*/g, ', ');
  out = out.replace(/\s+/g, ' ').trim();

  return out;
}

/**
 * Validates and normalizes text and tone sent to the /api/tts endpoints.
 */
export function validateTtsInput(rawText: unknown, rawTone?: unknown): TtsValidationResult {
  const tone = normalizeTtsTone(rawTone);
  if (typeof rawText !== 'string') {
    return {
      valid: false,
      text: '',
      tone,
      error: 'Nội dung thuyết minh phải là văn bản hợp lệ.',
    };
  }
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) {
    return {
      valid: false,
      text: '',
      tone,
      error: 'Nội dung thuyết minh không được để trống.',
    };
  }
  if (normalized.length > MAX_TTS_TEXT_LENGTH) {
    return {
      valid: false,
      text: '',
      tone,
      error: `Nội dung thuyết minh tối đa ${MAX_TTS_TEXT_LENGTH} ký tự.`,
    };
  }
  return { valid: true, text: normalized, tone };
}

/**
 * Converts headerless 16-bit little-endian signed PCM bytes into normalized [-1, 1] Float32 samples
 * for zero-lag progressive Web Audio playback.
 */
export function pcm16ToFloat32(pcmBytes: Uint8Array): Float32Array {
  const sampleCount = Math.floor(pcmBytes.byteLength / 2);
  const float32 = new Float32Array(sampleCount);
  const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, sampleCount * 2);
  for (let i = 0; i < sampleCount; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

/**
 * Wraps raw 16-bit little-endian mono PCM bytes in a standard 44-byte RIFF/WAVE header
 * so streamed TTS clips can be cached as standard WAV files.
 */
export function wrapPcm16AsWav(pcmBytes: Uint8Array, sampleRate = 24000): Uint8Array {
  const dataLength = pcmBytes.byteLength;
  const wav = new Uint8Array(44 + dataLength);
  const view = new DataView(wav.buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      wav[offset + i] = str.charCodeAt(i);
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // AudioFormat = PCM
  view.setUint16(22, 1, true); // NumChannels = 1 (mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate = sampleRate * 1 * 16/8
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeStr(36, 'data');
  view.setUint32(40, dataLength, true);
  wav.set(pcmBytes, 44);
  return wav;
}

export interface SimpleVoiceDescriptor {
  name: string;
  lang: string;
}

/**
 * Strictly ranks ONLY genuine Vietnamese (vi / vi-VN) voices, preferring Northern Vietnamese
 * female voices (Hoài My, Linh, Mai, Lan, Google Tiếng Việt) and NEVER returning an English voice.
 */
export function pickPreferredVietnameseFemaleVoice<T extends SimpleVoiceDescriptor>(
  voices: T[],
): T | null {
  const viVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('vi') &&
      !/(english|en-us|en-gb|en_us|en_gb)/i.test(v.name),
  );
  if (viVoices.length === 0) return null;

  const preferredKeywords = ['hoaimy', 'hoài my', 'linh', 'mai', 'lan', 'ha noi', 'hà nội', 'female', 'nữ'];
  for (const kw of preferredKeywords) {
    const match = viVoices.find((v) => v.name.toLowerCase().includes(kw));
    if (match) return match;
  }

  const nonMale = viVoices.find((v) => !/(nam|minh|male)/i.test(v.name));
  return nonMale ?? viVoices[0];
}
