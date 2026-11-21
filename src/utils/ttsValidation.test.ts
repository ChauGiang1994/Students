import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_PREWARM_FEEDBACK_CLIPS,
  getTeacherVoiceStyle,
  MAX_TTS_TEXT_LENGTH,
  NORTHERN_FEMALE_TTS_STYLE,
  normalizeTtsTone,
  normalizeVietnameseForSpeech,
  pcm16ToFloat32,
  pickFeedbackPhrase,
  pickPreferredVietnameseFemaleVoice,
  STATION_COMPLETE_PRAISE,
  TEACHER_ENCOURAGE_LINES,
  TEACHER_PRAISE_LINES,
  TEACHER_VOICE_NAME,
  validateTtsInput,
  wrapPcm16AsWav,
} from './ttsValidation';

test('validateTtsInput trims whitespace, normalizes tone, and accepts valid Vietnamese narration text', () => {
  const res = validateTtsInput('  Chiến dịch Điện Biên Phủ   năm 1954!  ', 'praise');
  assert.equal(res.valid, true);
  assert.equal(res.text, 'Chiến dịch Điện Biên Phủ năm 1954!');
  assert.equal(res.tone, 'praise');

  const fallbackTone = validateTtsInput('Xin chào', 'unknown');
  assert.equal(fallbackTone.tone, 'story');
});

test('validateTtsInput rejects non-string, empty, and overly long inputs', () => {
  assert.equal(validateTtsInput(null).valid, false);
  assert.equal(validateTtsInput('   ').valid, false);
  assert.equal(validateTtsInput('a'.repeat(MAX_TTS_TEXT_LENGTH + 1)).valid, false);
  assert.equal(validateTtsInput('a'.repeat(MAX_TTS_TEXT_LENGTH)).valid, true);
});

test('expressive teacher voice styles enforce 100% pure Northern Vietnamese female delivery without English accent', () => {
  assert.equal(TEACHER_VOICE_NAME, 'Kore');
  assert.match(NORTHERN_FEMALE_TTS_STYLE, /100%.*tiếng Việt/i);
  assert.match(NORTHERN_FEMALE_TTS_STYLE, /miền Bắc/i);
  assert.match(NORTHERN_FEMALE_TTS_STYLE, /Hà Nội/i);
  assert.match(NORTHERN_FEMALE_TTS_STYLE, /nhẹ nhàng/i);
  assert.match(NORTHERN_FEMALE_TTS_STYLE, /truyền cảm/i);
  assert.match(NORTHERN_FEMALE_TTS_STYLE, /không pha giọng tiếng Anh/i);
  assert.match(getTeacherVoiceStyle('praise'), /không pha giọng tiếng Anh/i);
  assert.match(getTeacherVoiceStyle('praise'), /khen ngợi/i);
  assert.match(getTeacherVoiceStyle('encourage'), /không pha giọng tiếng Anh/i);
  assert.match(getTeacherVoiceStyle('encourage'), /thử lại/i);
  assert.equal(normalizeTtsTone('encourage'), 'encourage');
});

test('normalizeVietnameseForSpeech converts abbreviations, hill codes, times, and dates into pure spoken Vietnamese', () => {
  assert.equal(
    normalizeVietnameseForSpeech('Quan sát mô hình 3D theo SGK về Đồi D1 – E1, Đồi C1 và Đồi A1.'),
    'Quan sát mô hình ba chiều theo sách giáo khoa về Đồi Dê Một và E Một, Đồi Xê Một và Đồi A Một.',
  );
  assert.equal(
    normalizeVietnameseForSpeech('17h05 ngày 13/3/1954 và 17h30 ngày 7/5/1954'),
    '17 giờ 5 phút ngày 13 tháng 3 năm 1954 và 17 giờ 30 phút ngày 7 tháng 5 năm 1954',
  );
  assert.equal(
    normalizeVietnameseForSpeech('Cứ điểm 505A và 311A · Đacôta (baochinhphu.vn)'),
    'Cứ điểm năm trăm linh năm A và ba trăm mười một A, Đa-cô-ta',
  );
});

test('pickFeedbackPhrase cycles cleanly through praise and encourage phrases', () => {
  assert.equal(pickFeedbackPhrase(true, 0), TEACHER_PRAISE_LINES[0]);
  assert.equal(pickFeedbackPhrase(true, 3), TEACHER_PRAISE_LINES[0]);
  assert.equal(pickFeedbackPhrase(false, 0), TEACHER_ENCOURAGE_LINES[0]);
  assert.match(pickFeedbackPhrase(false, 0), /chưa đúng.*thử lại/i);
});

test('ALL_PREWARM_FEEDBACK_CLIPS covers all praise, encourage, and station completion lines', () => {
  assert.equal(
    ALL_PREWARM_FEEDBACK_CLIPS.length,
    TEACHER_PRAISE_LINES.length + TEACHER_ENCOURAGE_LINES.length + 1,
  );
  assert.ok(
    ALL_PREWARM_FEEDBACK_CLIPS.some(
      (c) => c.text === STATION_COMPLETE_PRAISE && c.tone === 'praise',
    ),
  );
  for (const clip of ALL_PREWARM_FEEDBACK_CLIPS) {
    assert.equal(validateTtsInput(clip.text, clip.tone).valid, true);
  }
});

test('pcm16ToFloat32 converts signed 16-bit LE PCM samples accurately to [-1, 1]', () => {
  const buf = new ArrayBuffer(6);
  const view = new DataView(buf);
  view.setInt16(0, 0, true);
  view.setInt16(2, 16384, true);
  view.setInt16(4, -32768, true);
  const out = pcm16ToFloat32(new Uint8Array(buf));
  assert.equal(out.length, 3);
  assert.equal(out[0], 0);
  assert.equal(out[1], 0.5);
  assert.equal(out[2], -1);
});

test('wrapPcm16AsWav produces a valid 44-byte RIFF/WAVE header wrapping 24kHz mono PCM', () => {
  const pcm = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
  const wav = wrapPcm16AsWav(pcm, 24000);
  assert.equal(wav.byteLength, 48);
  assert.equal(String.fromCharCode(wav[0], wav[1], wav[2], wav[3]), 'RIFF');
  assert.equal(String.fromCharCode(wav[8], wav[9], wav[10], wav[11]), 'WAVE');
  const dv = new DataView(wav.buffer);
  assert.equal(dv.getUint32(4, true), 40);
  assert.equal(dv.getUint32(24, true), 24000);
  assert.equal(dv.getUint16(34, true), 16);
  assert.equal(dv.getUint32(40, true), 4);
  assert.deepEqual(Array.from(wav.subarray(44)), [1, 2, 3, 4]);
});

test('pickPreferredVietnameseFemaleVoice strictly selects Vietnamese female voices and never returns English voices', () => {
  const voices = [
    { name: 'English US Female', lang: 'en-US' },
    { name: 'Microsoft NamMinh Online (Natural)', lang: 'vi-VN' },
    { name: 'Microsoft HoaiMy Online (Natural)', lang: 'vi-VN' },
  ];
  const picked = pickPreferredVietnameseFemaleVoice(voices);
  assert.equal(picked?.name, 'Microsoft HoaiMy Online (Natural)');

  const fallback = pickPreferredVietnameseFemaleVoice([
    { name: 'English US', lang: 'en-US' },
    { name: 'Google Tiếng Việt', lang: 'vi-VN' },
  ]);
  assert.equal(fallback?.name, 'Google Tiếng Việt');
  assert.equal(
    pickPreferredVietnameseFemaleVoice([
      { name: 'Google US English', lang: 'en-US' },
      { name: 'Samantha', lang: 'en-US' },
    ]),
    null,
  );
});
