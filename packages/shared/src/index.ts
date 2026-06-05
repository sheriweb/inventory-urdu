export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SHOP_OWNER = 'SHOP_OWNER',
  SHAREHOLDER = 'SHAREHOLDER',
  SALESMAN = 'SALESMAN',
  RECOVERY_MAN = 'RECOVERY_MAN',
  OPERATOR = 'OPERATOR',
}

export enum StaffType {
  SALESMAN = 'SALESMAN',
  RECOVERY_MAN = 'RECOVERY_MAN',
  SHAREHOLDER = 'SHAREHOLDER',
  OUTDOOR_MAN = 'OUTDOOR_MAN',
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  shopId?: string | null;
  shop?: ShopProfile | null;
}

export interface ShopProfile {
  id: string;
  name: string;
  logoUrl?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  description?: string | null;
  brandColor?: string | null;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
  reminderMessageTemplate?: string | null;
  autoRoznamchaOnCollection?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ShopSummary {
  id: string;
  name: string;
  logoUrl?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  description?: string | null;
  isActive: boolean;
  ownerId: string;
  createdAt: string;
}

export interface Area {
  id: string;
  shopId: string;
  name: string;
  city?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Staff {
  id: string;
  shopId: string;
  areaId?: string | null;
  name: string;
  mobile?: string | null;
  type: StaffType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  shopId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  shopId: string;
  companyId: string;
  itemCode: number;
  name: string;
  model?: string | null;
  purchaseRate: string;
  saleRate: string;
  stockQuantity?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  shopId: string;
  areaId?: string | null;
  name: string;
  fatherOrHusbandName?: string | null;
  caste?: string | null;
  profession?: string | null;
  mobile?: string | null;
  cnic?: string | null;
  cnicPhotoUrl?: string | null;
  cnicFrontPhotoUrl?: string | null;
  cnicBackPhotoUrl?: string | null;
  chequePhotoUrl?: string | null;
  city?: string | null;
  presentAddress?: string | null;
  permanentAddress?: string | null;
  bankName?: string | null;
  chequeNumber?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Guarantor {
  id: string;
  shopId: string;
  customerId: string;
  name: string;
  cnic?: string | null;
  phone?: string | null;
  cnicFrontPhotoUrl?: string | null;
  cnicBackPhotoUrl?: string | null;
  presentAddress?: string | null;
  permanentAddress?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum InstallmentFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  FIFTEEN_DAYS = 'FIFTEEN_DAYS',
  MONTHLY = 'MONTHLY',
}

export enum InstallmentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum LeaseStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  DEFAULTED = 'DEFAULTED',
}

export enum ClaimType {
  SHOP = 'SHOP',
  CUSTOMER = 'CUSTOMER',
}

export interface LeaseItem {
  id: string;
  leaseAccountId: string;
  itemId?: string | null;
  itemName: string;
  rate: string;
  quantity: number;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstallmentSchedule {
  id: string;
  leaseAccountId: string;
  installmentNumber: number;
  dueDate: string;
  dayName?: string | null;
  scheduledAmount: string;
  paidAmount: string;
  status: InstallmentStatus;
  isShort: boolean;
  carriedForwardAmount: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaseAccount {
  id: string;
  shopId: string;
  accountNumber: number;
  accountDate: string;
  customerId: string;
  salesmanId?: string | null;
  recoveryManId?: string | null;
  outdoorManId?: string | null;
  totalAmount: string;
  advanceAmount: string;
  remainingBalance: string;
  originalInstallmentAmount: string;
  currentInstallmentAmount: string;
  installmentCount: number;
  frequency: InstallmentFrequency;
  status: LeaseStatus;
  note?: string | null;
  leaseItems?: LeaseItem[];
  installments?: InstallmentSchedule[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaseItemDto {
  itemId?: string;
  itemName: string;
  rate: number;
  quantity: number;
}

export interface CreateLeaseAccountDto {
  accountDate: string;
  customerId: string;
  salesmanId?: string;
  recoveryManId?: string;
  outdoorManId?: string;
  advanceAmount: number;
  installmentAmount: number;
  frequency: InstallmentFrequency;
  note?: string;
  items: CreateLeaseItemDto[];
}
