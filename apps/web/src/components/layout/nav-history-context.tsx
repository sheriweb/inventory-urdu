'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { NavMenuGroup } from '@/components/layout/top-nav-menu';
import {
  loadNavHistoryTabs,
  navTabKey,
  removeNavTab,
  saveNavHistoryTabs,
  shouldTrackNavPath,
  tabLabelFromPath,
  upsertNavTab,
  type NavHistoryTab,
} from '@/lib/nav-history';

type NavHistoryContextValue = {
  tabs: NavHistoryTab[];
  activeKey: string;
  setTabTitle: (title: string) => void;
  closeTab: (key: string) => void;
};

const NavHistoryContext = createContext<NavHistoryContextValue | null>(null);

type NavHistoryProviderProps = {
  children: ReactNode;
  navGroups: NavMenuGroup[];
};

export function NavHistoryProvider({ children, navGroups }: NavHistoryProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const activeKey = navTabKey(pathname, search);

  const [tabs, setTabs] = useState<NavHistoryTab[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTabs(loadNavHistoryTabs());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !shouldTrackNavPath(pathname)) return;

    const label = tabLabelFromPath(pathname, search, navGroups);
    setTabs((prev) => {
      const existing = prev.find((t) => t.key === activeKey);
      const next = upsertNavTab(prev, {
        key: activeKey,
        pathname,
        search,
        label: existing?.label && existing.label !== label ? existing.label : label,
        openedAt: Date.now(),
      });
      saveNavHistoryTabs(next);
      return next;
    });
  }, [hydrated, pathname, search, activeKey, navGroups]);

  const setTabTitle = useCallback(
    (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      setTabs((prev) => {
        const next = prev.map((t) => (t.key === activeKey ? { ...t, label: trimmed } : t));
        saveNavHistoryTabs(next);
        return next;
      });
    },
    [activeKey],
  );

  const closeTab = useCallback(
    (key: string) => {
      const next = removeNavTab(tabs, key);
      saveNavHistoryTabs(next);
      setTabs(next);

      if (key !== activeKey) return;

      const fallback = next[0];
      const href = fallback
        ? fallback.search
          ? `${fallback.pathname}?${fallback.search}`
          : fallback.pathname
        : '/dashboard';

      router.push(href);
    },
    [activeKey, router, tabs],
  );

  const value = useMemo(
    () => ({ tabs, activeKey, setTabTitle, closeTab }),
    [tabs, activeKey, setTabTitle, closeTab],
  );

  return <NavHistoryContext.Provider value={value}>{children}</NavHistoryContext.Provider>;
}

export function useNavHistory(): NavHistoryContextValue {
  const ctx = useContext(NavHistoryContext);
  if (!ctx) {
    throw new Error('useNavHistory must be used within NavHistoryProvider');
  }
  return ctx;
}
