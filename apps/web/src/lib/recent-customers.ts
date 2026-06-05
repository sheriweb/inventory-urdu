export type RecentCustomer = {
  id: string;
  name: string;
  mobile?: string | null;
  usedAt: number;
};

const STORAGE_KEY = 'inventory-recent-customers';
const MAX_RECENT = 8;

export function getRecentCustomers(): RecentCustomer[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentCustomer[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function rememberCustomer(customer: { id: string; name: string; mobile?: string | null }) {
  if (typeof window === 'undefined') return;
  const next: RecentCustomer[] = [
    { id: customer.id, name: customer.name, mobile: customer.mobile, usedAt: Date.now() },
    ...getRecentCustomers().filter((c) => c.id !== customer.id),
  ].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
