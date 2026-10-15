import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);

// В корзине храним только { bookId, quantity }; актуальные цены и остатки берутся с сервера на странице корзины.
const storageKey = (userId) => `bookshop-cart:${userId}`;

function read(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]');
    return Array.isArray(raw)
      ? raw.filter((i) => typeof i?.bookId === 'string' && Number.isInteger(i.quantity) && i.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

function write(userId, items) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(items));
  } catch {
    /* хранилище недоступно — корзина просто не переживёт перезагрузку */
  }
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  // owner нужен, чтобы при смене пользователя корзина одного не записалась в корзину другого.
  const [state, setState] = useState({ owner: null, items: [] });

  useEffect(() => {
    setState({ owner: userId, items: userId ? read(userId) : [] });
  }, [userId]);

  useEffect(() => {
    if (userId && state.owner === userId) write(userId, state.items);
  }, [state, userId]);

  const items = state.owner === userId ? state.items : [];
  const mine = (s) => (s.owner === userId ? s.items : []);

  /** Добавляет книгу, не превышая остаток. Возвращает, сколько штук реально добавлено. */
  const add = useCallback(
    (book, qty = 1) => {
      const current = items.find((i) => i.bookId === book.id)?.quantity ?? 0;
      const next = Math.min(current + qty, book.stock);
      const added = next - current;
      if (added > 0) {
        setState((s) => {
          const list = mine(s).filter((i) => i.bookId !== book.id);
          return { owner: userId, items: [...list, { bookId: book.id, quantity: next }] };
        });
      }
      return added;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, userId],
  );

  const setQuantity = useCallback(
    (bookId, quantity) => {
      if (!Number.isInteger(quantity) || quantity < 1) return;
      setState((s) => ({ owner: userId, items: mine(s).map((i) => (i.bookId === bookId ? { ...i, quantity } : i)) }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId],
  );

  const remove = useCallback(
    (bookId) => setState((s) => ({ owner: userId, items: mine(s).filter((i) => i.bookId !== bookId) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId],
  );

  const clear = useCallback(() => setState({ owner: userId, items: [] }), [userId]);

  const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const value = useMemo(
    () => ({ items, count, add, setQuantity, remove, clear }),
    [items, count, add, setQuantity, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart нужно вызывать внутри <CartProvider>');
  return ctx;
}
