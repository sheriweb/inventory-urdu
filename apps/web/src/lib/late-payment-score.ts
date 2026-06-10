import { LeaseStatus } from '@inventory-urdu/shared';

export function latePaymentScoreLabel(score: number): {
  label: string;
  variant: 'success' | 'warning' | 'default' | 'muted';
} {
  if (score >= 80) return { label: 'بہتر', variant: 'success' };
  if (score >= 50) return { label: 'درمیانہ', variant: 'warning' };
  if (score > 0) return { label: 'تاخیر', variant: 'default' };
  return { label: 'خطرناک', variant: 'muted' };
}

export function formatLatePaymentScore(
  score: number,
  overdueCount: number,
  status: LeaseStatus,
): string {
  if (status === LeaseStatus.CLOSED) return '100';
  if (overdueCount > 0) return `${score} (${overdueCount} تاخیر)`;
  return String(score);
}
