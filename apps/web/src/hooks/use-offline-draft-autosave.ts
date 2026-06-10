'use client';

import { useEffect, useRef } from 'react';
import { saveOfflineDraft, type OfflineDraftKind } from '@/lib/offline-draft-queue';

type UseOfflineDraftAutosaveOptions<T> = {
  kind: OfflineDraftKind;
  data: T;
  enabled: boolean;
  debounceMs?: number;
  hasContent: (data: T) => boolean;
};

export function useOfflineDraftAutosave<T>({
  kind,
  data,
  enabled,
  debounceMs = 900,
  hasContent,
}: UseOfflineDraftAutosaveOptions<T>) {
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setTimeout(() => {
      if (!hasContent(dataRef.current)) return;
      saveOfflineDraft(kind, dataRef.current);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [data, debounceMs, enabled, hasContent, kind]);
}
