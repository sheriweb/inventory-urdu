import axios from 'axios';
import api from '@/lib/api';
import { customerPayload } from '@/lib/customer-form';
import { sanitizeAdditionalMobiles } from '@/lib/customer-mobiles';
import type { CustomerFormState } from '@/components/forms/customer-form-fields';
import {
  guarantorHasContent,
  guarantorPayload,
  type GuarantorFormState,
} from '@/components/forms/guarantor-form-state';
import {
  clearOfflineDraft,
  isBrowserOnline,
  type CustomerCreateOfflineDraft,
  type LeaseNewOfflineDraft,
} from '@/lib/offline-draft-queue';
import { saveSaleDraft, type SaleDraft } from '@/lib/sale-draft';
import type { CreateLeaseAccountDto } from '@inventory-urdu/shared';
import { generateId } from '@/lib/generate-id';
import { notify } from '@/lib/notify';

export type OfflineSyncJobKind = 'customer-create' | 'lease-new';

export type CustomerCreateSyncPayload = {
  form: CustomerFormState;
  guarantor?: GuarantorFormState;
  saleDraft?: SaleDraft;
};

export type LeaseCustomerPatch = {
  customerId: string;
  fatherOrHusbandName?: string;
  cnic?: string;
  mobile?: string;
  additionalMobiles?: string[];
  photoUrl?: string;
  cnicFrontPhotoUrl?: string;
  cnicBackPhotoUrl?: string;
  caste?: string;
  profession?: string;
  city?: string;
  areaId?: string;
  presentAddress?: string;
  bankName?: string;
  chequeNumber?: string;
};

export type LeaseGuarantorPatch = {
  customerId: string;
  guarantorId: string;
  name: string;
  fatherOrHusbandName?: string;
  caste?: string;
  cnic?: string;
  phone?: string;
  additionalMobiles?: string[];
  cnicFrontPhotoUrl?: string;
  cnicBackPhotoUrl?: string;
  photoUrl?: string;
  presentAddress?: string;
};

export type LeaseNewSyncPayload = {
  customerPatch?: LeaseCustomerPatch;
  guarantorPatch?: LeaseGuarantorPatch;
  lease: CreateLeaseAccountDto;
};

export type OfflineSyncJob = {
  id: string;
  kind: OfflineSyncJobKind;
  label: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
  payload: CustomerCreateSyncPayload | LeaseNewSyncPayload;
};

const STORAGE_KEY = 'inventory-offline-sync-queue-v1';
const MAX_ATTEMPTS = 5;

let flushLock = false;

export function isNetworkError(err: unknown): boolean {
  if (!isBrowserOnline()) return true;
  if (axios.isAxiosError(err)) return !err.response;
  if (err instanceof TypeError) return true;
  return false;
}

export function shouldQueueOffline(err?: unknown): boolean {
  if (!isBrowserOnline()) return true;
  if (err) return isNetworkError(err);
  return false;
}

function loadQueue(): OfflineSyncJob[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineSyncJob[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: OfflineSyncJob[]) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* quota */
  }
}

export function getOfflineSyncQueue(): OfflineSyncJob[] {
  return loadQueue();
}

export function getOfflineSyncQueueCount(): number {
  return loadQueue().length;
}

export function enqueueOfflineSyncJob(
  kind: OfflineSyncJobKind,
  label: string,
  payload: CustomerCreateSyncPayload | LeaseNewSyncPayload,
): OfflineSyncJob {
  const job: OfflineSyncJob = {
    id: generateId(),
    kind,
    label,
    createdAt: new Date().toISOString(),
    attempts: 0,
    payload,
  };
  const queue = loadQueue();
  queue.push(job);
  saveQueue(queue);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-sync-queue-changed'));
  }
  return job;
}

function removeJob(id: string) {
  saveQueue(loadQueue().filter((j) => j.id !== id));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-sync-queue-changed'));
  }
}

function updateJob(job: OfflineSyncJob) {
  const queue = loadQueue().map((j) => (j.id === job.id ? job : j));
  saveQueue(queue);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-sync-queue-changed'));
  }
}

export function discardOfflineSyncJob(id: string) {
  removeJob(id);
}

export function discardAllOfflineSyncJobs() {
  saveQueue([]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-sync-queue-changed'));
  }
}

async function executeCustomerCreate(job: OfflineSyncJob & { kind: 'customer-create' }) {
  const payload = job.payload as CustomerCreateSyncPayload;
  const { data } = await api.post('/customers', customerPayload(payload.form));
  const customer = data.data as { id?: string; name?: string };
  if (customer.id && payload.guarantor && guarantorHasContent(payload.guarantor)) {
    try {
      await api.post(`/customers/${customer.id}/guarantors`, guarantorPayload(payload.guarantor));
    } catch {
      /* guarantor optional */
    }
  }
  clearOfflineDraft('customer-create');

  if (payload.saleDraft && customer.id) {
    saveSaleDraft(payload.saleDraft);
    notify.created('گاہک (آف لائن قطار)', `${customer.name ?? ''} — نئی فروخت کھولیں`);
  } else {
    notify.created('گاہک (آف لائن قطار)', customer.name ?? 'محفوظ');
  }
}

async function executeLeaseNew(job: OfflineSyncJob & { kind: 'lease-new' }) {
  const payload = job.payload as LeaseNewSyncPayload;
  if (payload.customerPatch) {
    const p = payload.customerPatch;
    try {
      await api.patch(`/customers/${p.customerId}`, {
        fatherOrHusbandName: p.fatherOrHusbandName,
        cnic: p.cnic,
        mobile: p.mobile,
        additionalMobiles: p.additionalMobiles,
        photoUrl: p.photoUrl,
        cnicFrontPhotoUrl: p.cnicFrontPhotoUrl,
        cnicBackPhotoUrl: p.cnicBackPhotoUrl,
        caste: p.caste,
        profession: p.profession,
        city: p.city,
        areaId: p.areaId,
        presentAddress: p.presentAddress,
        bankName: p.bankName,
        chequeNumber: p.chequeNumber,
      });
    } catch {
      /* optional */
    }
  }
  if (payload.guarantorPatch) {
    const g = payload.guarantorPatch;
    try {
      await api.patch(`/customers/${g.customerId}/guarantors/${g.guarantorId}`, {
        name: g.name,
        fatherOrHusbandName: g.fatherOrHusbandName,
        caste: g.caste,
        cnic: g.cnic,
        phone: g.phone,
        additionalMobiles: g.additionalMobiles,
        cnicFrontPhotoUrl: g.cnicFrontPhotoUrl,
        cnicBackPhotoUrl: g.cnicBackPhotoUrl,
        photoUrl: g.photoUrl,
        presentAddress: g.presentAddress,
      });
    } catch {
      /* optional */
    }
  }
  const { data } = await api.post('/leases', payload.lease);
  const created = data.data as { accountNumber?: number };
  clearOfflineDraft('lease-new');
  notify.created('کھاتہ (آف لائن قطار)', `کھاتہ #${created.accountNumber ?? ''}`);
}

async function executeJob(job: OfflineSyncJob) {
  if (job.kind === 'customer-create') {
    await executeCustomerCreate(job as OfflineSyncJob & { kind: 'customer-create' });
    return;
  }
  if (job.kind === 'lease-new') {
    await executeLeaseNew(job as OfflineSyncJob & { kind: 'lease-new' });
    return;
  }
}

export type FlushOfflineSyncResult = {
  processed: number;
  failed: number;
  remaining: number;
};

export async function flushOfflineSyncQueue(): Promise<FlushOfflineSyncResult> {
  if (!isBrowserOnline() || flushLock) {
    return { processed: 0, failed: 0, remaining: getOfflineSyncQueueCount() };
  }

  flushLock = true;
  let processed = 0;
  let failed = 0;

  try {
    const queue = [...loadQueue()];
    for (const job of queue) {
      if (!isBrowserOnline()) break;

      try {
        await executeJob(job);
        removeJob(job.id);
        processed += 1;
      } catch (err) {
        if (isNetworkError(err)) break;

        const next: OfflineSyncJob = {
          ...job,
          attempts: job.attempts + 1,
          lastError: axios.isAxiosError(err)
            ? String(
                (err.response?.data as { message?: string | string[] } | undefined)?.message ??
                  err.message,
              )
            : err instanceof Error
              ? err.message
              : 'unknown',
        };

        if (next.attempts >= MAX_ATTEMPTS) {
          removeJob(job.id);
          notify.fail(next.label, next.lastError);
          failed += 1;
        } else {
          updateJob(next);
          failed += 1;
          break;
        }
      }
    }
  } finally {
    flushLock = false;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-sync-queue-changed'));
    }
  }

  return {
    processed,
    failed,
    remaining: getOfflineSyncQueueCount(),
  };
}

/** Build lease sync payload from offline draft + computed lease DTO */
export function buildLeaseSyncPayloadFromDraft(
  draft: LeaseNewOfflineDraft,
  lease: CreateLeaseAccountDto,
): LeaseNewSyncPayload {
  const payload: LeaseNewSyncPayload = { lease };

  if (draft.customerId) {
    payload.customerPatch = {
      customerId: draft.customerId,
      fatherOrHusbandName: draft.customerFatherName.trim() || undefined,
      cnic: draft.customerCnic.trim() || undefined,
      mobile: draft.customerMobile.trim() || undefined,
      additionalMobiles: (() => {
        const extras = sanitizeAdditionalMobiles(draft.customerAdditionalMobiles ?? []);
        return extras.length > 0 ? extras : undefined;
      })(),
      photoUrl: draft.customerPhotoUrl?.trim() || undefined,
      cnicFrontPhotoUrl: draft.customerCnicFrontPhotoUrl?.trim() || undefined,
      cnicBackPhotoUrl: draft.customerCnicBackPhotoUrl?.trim() || undefined,
      caste: draft.customerCaste.trim() || undefined,
      profession: draft.customerProfession.trim() || undefined,
      city: draft.customerCity.trim() || undefined,
      areaId: draft.customerAreaId || undefined,
      presentAddress: draft.customerPresentAddress.trim() || undefined,
      bankName: draft.customerBankName.trim() || undefined,
      chequeNumber: draft.customerChequeNumber.trim() || undefined,
    };
  }

  if (draft.customerId && draft.guarantor.id && draft.guarantor.name.trim()) {
    const g = guarantorPayload(draft.guarantor);
    payload.guarantorPatch = {
      customerId: draft.customerId,
      guarantorId: draft.guarantor.id,
      name: g.name,
      fatherOrHusbandName: g.fatherOrHusbandName,
      caste: g.caste,
      cnic: g.cnic,
      phone: g.phone,
      additionalMobiles: g.additionalMobiles,
      cnicFrontPhotoUrl: g.cnicFrontPhotoUrl,
      cnicBackPhotoUrl: g.cnicBackPhotoUrl,
      photoUrl: g.photoUrl,
      presentAddress: g.presentAddress,
    };
  }

  return payload;
}

export function buildCustomerSyncPayload(draft: CustomerCreateOfflineDraft): CustomerCreateSyncPayload {
  const saleDraft: SaleDraft = {
    itemLines: draft.itemLines,
    salesmanId: draft.salesmanId,
    recoveryManId: draft.recoveryManId,
    outdoorManId: draft.outdoorManId,
    advanceAmount: draft.advanceAmount,
    installment: draft.installment,
  };

  return {
    form: draft.form,
    guarantor:
      draft.guarantor && guarantorHasContent(draft.guarantor) ? draft.guarantor : undefined,
    saleDraft: saleDraft.itemLines.some(
      (line) => line.itemName.trim() && Number(line.rate) > 0,
    )
      ? saleDraft
      : undefined,
  };
}
