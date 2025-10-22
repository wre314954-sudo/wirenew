import type { Order } from './order-storage';

export const fetchOrdersApi = async (userId: string | null) => {
  if (!userId) return [] as Order[];

  try {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('firebase_id_token') : null;
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(`/api/orders`, { headers });
    if (resp.ok) {
      const data = await resp.json();
      return data;
    }
  } catch (e) {
    console.error('API proxy: failed to fetch orders', e);
  }

  return [] as Order[];
};

export const fetchEnquiriesApi = async (userId: string | null) => {
  if (!userId) return [];

  try {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('firebase_id_token') : null;
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(`/api/enquiries`, { headers });
    if (resp.ok) {
      const data = await resp.json();
      return data;
    }
  } catch (e) {
    console.error('API proxy: failed to fetch enquiries', e);
  }

  return [];
};
