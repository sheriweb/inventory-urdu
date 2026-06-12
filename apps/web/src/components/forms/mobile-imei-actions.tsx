'use client';

import { ExternalLink, MessageSquare, ScanLine, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PTA_DIRBS_URL,
  PTA_DVS_ANDROID,
  PTA_DVS_IOS,
  SELMO_PTA_APP_LABEL,
  normalizeImei,
  pta8484SmsHref,
  showImeiDialHref,
} from '@/lib/pta-imei';
import { notify } from '@/lib/notify';

type MobileImeiActionsProps = {
  imei: string;
  compact?: boolean;
};

export function MobileImeiActions({ imei, compact }: MobileImeiActionsProps) {
  const normalized = normalizeImei(imei);
  const sms8484 = pta8484SmsHref(imei);

  function open8484() {
    if (!sms8484) {
      notify.error('پہلے 15 ہندسوں کا IMEI درج کریں');
      return;
    }
    window.location.href = sms8484;
  }

  function openDirbs() {
    window.open(PTA_DIRBS_URL, '_blank', 'noopener,noreferrer');
  }

  function openPtaApp() {
    const isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    window.open(isIos ? PTA_DVS_IOS : PTA_DVS_ANDROID, '_blank', 'noopener,noreferrer');
  }

  const btnClass = compact ? 'h-7 gap-1 px-2 text-xs' : 'gap-1.5';

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      <Button type="button" variant="outline" size="sm" className={btnClass} onClick={() => window.location.href = showImeiDialHref()}>
        <ScanLine className="h-3 w-3" />
        *#06#
      </Button>
      <Button type="button" variant="outline" size="sm" className={btnClass} onClick={open8484} disabled={!normalized}>
        <MessageSquare className="h-3 w-3" />
        PTA 8484
      </Button>
      <Button type="button" variant="outline" size="sm" className={btnClass} onClick={openDirbs}>
        <ShieldCheck className="h-3 w-3" />
        DIRBS
      </Button>
      <Button type="button" variant="outline" size="sm" className={btnClass} onClick={openPtaApp} title={SELMO_PTA_APP_LABEL}>
        <ExternalLink className="h-3 w-3" />
        {SELMO_PTA_APP_LABEL}
      </Button>
    </div>
  );
}
