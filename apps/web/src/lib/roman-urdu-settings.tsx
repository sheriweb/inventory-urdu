'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchMe } from '@/lib/auth';
import { loadShopProfile } from '@/lib/shop-profile';

const SHOP_SETTINGS_EVENT = 'shop-settings-updated';

type RomanUrduContextValue = {
  enabled: boolean;
  refresh: () => Promise<void>;
};

const RomanUrduContext = createContext<RomanUrduContextValue>({
  enabled: false,
  refresh: async () => {},
});

export function notifyShopSettingsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SHOP_SETTINGS_EVENT));
  }
}

export function RomanUrduProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { shop } = await loadShopProfile();
      setEnabled(Boolean(shop.romanUrduEnabled));
      return;
    } catch {
      /* fall through */
    }
    const me = await fetchMe(true);
    setEnabled(Boolean(me?.shop?.romanUrduEnabled));
  }, []);

  useEffect(() => {
    void refresh();
    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener(SHOP_SETTINGS_EVENT, onUpdate);
    return () => window.removeEventListener(SHOP_SETTINGS_EVENT, onUpdate);
  }, [refresh]);

  return (
    <RomanUrduContext.Provider value={{ enabled, refresh }}>{children}</RomanUrduContext.Provider>
  );
}

export function useRomanUrduEnabled(): boolean {
  return useContext(RomanUrduContext).enabled;
}
