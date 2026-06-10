'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  processSpeechTranscript,
  type SpeechInputMode,
} from '@/lib/speech-text';

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type UseSpeechInputOptions = {
  mode?: SpeechInputMode;
  lang?: string;
  onResult: (value: string) => void;
  onError?: (message: string) => void;
};

export function useSpeechInput({
  mode = 'text',
  lang = 'en-US',
  onResult,
  onError,
}: UseSpeechInputOptions) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    setSupported(getSpeechRecognition() != null);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      onError?.('اس براؤزر میں آواز سپورٹ نہیں — Chrome استعمال کریں');
      return;
    }

    stop();

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      const value = processSpeechTranscript(transcript, mode);
      if (value) onResult(value);
    };

    recognition.onerror = () => {
      setListening(false);
      onError?.('آواز سننے میں مسئلہ — دوبارہ کوشش کریں');
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch {
      setListening(false);
      onError?.('مائیکروفون کی اجازت دیں');
    }
  }, [lang, mode, onError, onResult, stop]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
      return;
    }
    start();
  }, [listening, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { start, stop, toggle, listening, supported };
}
