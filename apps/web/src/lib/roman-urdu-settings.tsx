'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchMe } from '@/lib/auth';
import { loadShopProfile } from '@/lib/shop-profile';

const SHOP_SETTINGS_EVENT = 'shop-settings-updated';
const ROMAN_URDU_STORAGE_KEY = 'inventory-urdu:roman-urdu-enabled';

type RomanUrduContextValue = {
  enabled: boolean;
  refresh: () => Promise<void>;
  setEnabledLocal: (value: boolean) => void;
};

const RomanUrduContext = createContext<RomanUrduContextValue>({
  enabled: false,
  refresh: async () => {},
  setEnabledLocal: () => {},
});

function readLocalRomanUrdu(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(ROMAN_URDU_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeLocalRomanUrdu(value: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ROMAN_URDU_STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function notifyShopSettingsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SHOP_SETTINGS_EVENT));
  }
}

export function persistRomanUrduPreference(value: boolean) {
  writeLocalRomanUrdu(value);
  notifyShopSettingsUpdated();
}

export function RomanUrduProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { shop } = await loadShopProfile();
      if (typeof shop.romanUrduEnabled === 'boolean') {
        setEnabled(shop.romanUrduEnabled);
        writeLocalRomanUrdu(shop.romanUrduEnabled);
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      const me = await fetchMe(true);
      if (typeof me?.shop?.romanUrduEnabled === 'boolean') {
        setEnabled(me.shop.romanUrduEnabled);
        writeLocalRomanUrdu(me.shop.romanUrduEnabled);
        return;
      }
    } catch {
      /* fall through */
    }
    setEnabled(readLocalRomanUrdu());
  }, []);

  const setEnabledLocal = useCallback((value: boolean) => {
    writeLocalRomanUrdu(value);
    setEnabled(value);
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
    <RomanUrduContext.Provider value={{ enabled, refresh, setEnabledLocal }}>
      {children}
    </RomanUrduContext.Provider>
  );
}

export function useRomanUrduEnabled(): boolean {
  return useContext(RomanUrduContext).enabled;
}
