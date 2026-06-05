import { AxiosError } from 'axios';
import api from '@/lib/api';
import { fetchMe } from '@/lib/auth';
import type { ShopProfile } from '@inventory-urdu/shared';

export async function loadShopProfile(): Promise<{ shop: ShopProfile; source: 'profile' | 'me' }> {
  try {
    const { data } = await api.get('/shop/profile');
    return { shop: data.data as ShopProfile, source: 'profile' };
  } catch (err) {
    const status = err instanceof AxiosError ? err.response?.status : undefined;
    if (status !== 404 && status !== 500) throw err;

    const me = await fetchMe(true);
    if (me?.shop?.id) {
      return { shop: me.shop as ShopProfile, source: 'me' };
    }
    throw err;
  }
}
