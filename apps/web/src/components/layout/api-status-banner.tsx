'use client';

import { useEffect, useState } from 'react';
import { AlertBanner } from '@/components/ui/alert-banner';

export function ApiStatusBanner() {
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const res = await fetch('/api/v1/health', { cache: 'no-store' });
        if (!active) return;
        setApiDown(!res.ok);
      } catch {
        if (active) setApiDown(true);
      }
    }

    void check();
    const id = window.setInterval(() => {
      void check();
    }, 30000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  if (!apiDown) return null;

  return (
    <AlertBanner variant="info" className="no-print rounded-none border-x-0 border-t-0">
      سرور سے رابطہ نہیں ہو رہا — دکان کی معلومات اور ڈیٹا لوڈ نہیں ہو سکتا۔ چند منٹ بعد صفحہ دوبارہ کھولیں یا سپورٹ سے رابطہ کریں۔
    </AlertBanner>
  );
}
