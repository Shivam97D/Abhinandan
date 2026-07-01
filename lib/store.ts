'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

type CartStore = {
  cart: Record<string, number>;
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  getItems: (menuItems: { id: string; name: string; price: number }[]) => CartItem[];
  getTotal: (menuItems: { id: string; name: string; price: number }[]) => number;
  getCount: () => number;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cart: {},
      addItem: (id) =>
        set((s) => ({ cart: { ...s.cart, [id]: (s.cart[id] || 0) + 1 } })),
      removeItem: (id) =>
        set((s) => {
          const next = { ...s.cart };
          const v = (next[id] || 0) - 1;
          if (v <= 0) delete next[id];
          else next[id] = v;
          return { cart: next };
        }),
      clearCart: () => set({ cart: {} }),
      getItems: (menuItems) =>
        Object.entries(get().cart).map(([id, qty]) => ({
          ...menuItems.find((m) => m.id === id)!,
          qty,
        })),
      getTotal: (menuItems) =>
        Object.entries(get().cart).reduce((sum, [id, qty]) => {
          const item = menuItems.find((m) => m.id === id);
          return sum + (item ? item.price * qty : 0);
        }, 0),
      getCount: () => Object.values(get().cart).reduce((a, b) => a + b, 0),
    }),
    { name: 'abh-cart' }
  )
);

type OrderItem = { id: string; name: string; price: number; qty: number };

type OrderStore = {
  tokenNumber: number;
  tokenId: string;
  orderId: string;
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  status: string;
  setOrder: (o: Partial<Omit<OrderStore, 'setOrder' | 'clearOrder'>>) => void;
  clearOrder: () => void;
};

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      tokenNumber: 0,
      tokenId: '',
      orderId: '',
      items: [],
      total: 0,
      paymentMethod: 'upi',
      status: '',
      setOrder: (o) => set((s) => ({ ...s, ...o })),
      clearOrder: () => set({ tokenNumber: 0, tokenId: '', orderId: '', items: [], total: 0, paymentMethod: 'upi', status: '' }),
    }),
    { name: 'abh-order' }
  )
);
