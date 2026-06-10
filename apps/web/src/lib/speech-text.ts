import { romanToUrdu } from '@/lib/roman-to-urdu';

export type SpeechInputMode = 'text' | 'number' | 'phone' | 'roman-urdu';

const DIGIT_WORDS: Record<string, string> = {
  zero: '0',
  oh: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  aik: '1',
  ak: '1',
  ek: '1',
  do: '2',
  teen: '3',
  char: '4',
  chaar: '4',
  paanch: '5',
  panch: '5',
  chhe: '6',
  che: '6',
  saat: '7',
  sat: '7',
  aath: '8',
  ath: '8',
  nau: '9',
  no: '9',
};

function wordsToDigits(transcript: string): string {
  const tokens = transcript
    .toLowerCase()
    .replace(/[،,.\-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let out = '';
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      out += token;
      continue;
    }
    const mapped = DIGIT_WORDS[token];
    if (mapped !== undefined) {
      out += mapped;
    }
  }
  return out;
}

export function speechToNumberString(transcript: string): string {
  const trimmed = transcript.trim();
  const direct = trimmed.replace(/[^\d.]/g, '');
  if (direct.length >= 2) return direct;

  const fromWords = wordsToDigits(trimmed);
  if (fromWords.length > 0) return fromWords;

  return direct;
}

export function speechToPhoneString(transcript: string): string {
  const digits = speechToNumberString(transcript).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('92') && digits.length >= 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('3') && digits.length === 10) return `0${digits}`;
  return digits;
}

export function processSpeechTranscript(transcript: string, mode: SpeechInputMode): string {
  const raw = transcript.trim();
  if (!raw) return '';

  switch (mode) {
    case 'number':
      return speechToNumberString(raw);
    case 'phone':
      return speechToPhoneString(raw);
    case 'roman-urdu': {
      const converted = romanToUrdu(raw);
      return converted.trim() || raw;
    }
    case 'text':
    default:
      return raw;
  }
}
