'use client';

import { Badge } from '@/components/ui/badge';
import { latePaymentScoreLabel } from '@/lib/late-payment-score';
import { LeaseStatus } from '@inventory-urdu/shared';

type LatePaymentScoreBadgeProps = {
  score: number;
  overdueCount?: number;
  status?: LeaseStatus;
};

export function LatePaymentScoreBadge({
  score,
  overdueCount = 0,
  status,
}: LatePaymentScoreBadgeProps) {
  if (status === LeaseStatus.CLOSED) {
    return (
      <Badge variant="muted" title="کھاتہ بند">
        بند
      </Badge>
    );
  }

  const { label, variant } = latePaymentScoreLabel(score);

  return (
    <Badge variant={variant} title={overdueCount > 0 ? `${overdueCount} تاخیر شدہ قسطیں` : 'وقت پر ادائیگی'}>
      <span dir="ltr">{score}</span>
      <span className="mx-1 opacity-60">·</span>
      {label}
    </Badge>
  );
}
