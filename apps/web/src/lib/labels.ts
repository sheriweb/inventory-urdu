import {
  ClaimType,
  InstallmentStatus,
  LeaseStatus,
  StaffType,
} from '@inventory-urdu/shared';

/** Pure Urdu script — avoids LTR Latin mixing in RTL tables */
export const STAFF_TYPE_LABELS: Record<StaffType, string> = {
  [StaffType.SALESMAN]: 'سیلز مین',
  [StaffType.RECOVERY_MAN]: 'ریکوری مین',
  [StaffType.SHAREHOLDER]: 'حصے دار',
  [StaffType.OUTDOOR_MAN]: 'آؤٹ ڈور مین',
};

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  [ClaimType.SHOP]: 'دکان',
  [ClaimType.CUSTOMER]: 'گاہک',
};

export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  [LeaseStatus.ACTIVE]: 'فعال',
  [LeaseStatus.CLOSED]: 'بند',
  [LeaseStatus.DEFAULTED]: 'نادہندگی',
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  [InstallmentStatus.PENDING]: 'زیر التوا',
  [InstallmentStatus.PARTIAL]: 'جزوی',
  [InstallmentStatus.PAID]: 'ادا',
  [InstallmentStatus.OVERDUE]: 'تاخیر',
};

export const PAYMENT_TYPE_LABELS: Record<'INSTALLMENT' | 'ADVANCE' | 'DISCOUNT', string> = {
  INSTALLMENT: 'قسط',
  ADVANCE: 'ایڈوانس',
  DISCOUNT: 'رعایت',
};

export const STOCK_STATUS_LABELS = {
  OK: 'ٹھیک',
  LOW: 'کم',
  OUT: 'خالی',
} as const;
