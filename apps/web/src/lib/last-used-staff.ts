const STORAGE_KEY = 'inventory-last-staff-v1';

export type LastUsedStaff = {
  salesmanId: string;
  recoveryManId: string;
  outdoorManId: string;
};

export function loadLastUsedStaff(): LastUsedStaff | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastUsedStaff;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      salesmanId: parsed.salesmanId ?? '',
      recoveryManId: parsed.recoveryManId ?? '',
      outdoorManId: parsed.outdoorManId ?? '',
    };
  } catch {
    return null;
  }
}

export function saveLastUsedStaff(staff: Partial<LastUsedStaff>): void {
  if (typeof localStorage === 'undefined') return;
  const prev = loadLastUsedStaff() ?? {
    salesmanId: '',
    recoveryManId: '',
    outdoorManId: '',
  };
  const next: LastUsedStaff = {
    salesmanId: staff.salesmanId ?? prev.salesmanId,
    recoveryManId: staff.recoveryManId ?? prev.recoveryManId,
    outdoorManId: staff.outdoorManId ?? prev.outdoorManId,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked */
  }
}
