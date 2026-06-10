'use client';

import * as React from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    setOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);

    function onOffline() {
      setOffline(true);
    }
    function onOnline() {
      setOffline(false);
    }

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="no-print fixed bottom-4 left-4 right-4 z-[99998] mx-auto flex max-w-lg items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg sm:left-auto sm:right-4"
    >
      <WifiOff className="h-5 w-5 shrink-0 text-amber-700" />
      <p>
        <span className="font-semibold">انٹرنیٹ منقطع ہے۔</span> ڈرافٹ خود محفوظ ہوگا — محفوظ پر کلک کریں تو قطار میں رہے گا، انٹرنیٹ آتے ہی بھیجا جائے گا۔
      </p>
    </div>
  );
}
