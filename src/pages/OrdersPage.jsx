import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorBox, Loader } from '../components/Status.jsx';
import { ordersApi } from '../services/api.js';
import { formatPrice } from '../utils/format.js';

export default function OrdersPage() {
  const [data, setData] = useState({ orders: [], loading: true, error: '' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setData((d) => ({ ...d, loading: true, error: '' }));
    ordersApi
      .mine(controller.signal)
      .then((orders) => setData({ orders, loading: false, error: '' }))
      .catch((err) => {
        if (err.name !== 'AbortError') setData({ orders: [], loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [reloadKey]);

  const { orders, loading, error } = data;
  const total = useMemo(() => orders.reduce((sum, o) => sum + o.total, 0), [orders]);

  return (
    <>
      <h1>Мои заказы</h1>
      {loading && <Loader />}
      {error && <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />}
      {!loading && !error && (orders.length === 0 ? (
        <EmptyState title="Заказов пока нет" actionTo="/books" actionLabel="Перейти в каталог">
          Добавьте книги в корзину и оформите первый заказ.
        </EmptyState>
      ) : (
        <>
          <p className="muted">Заказов: {orders.length}. Потрачено: {formatPrice(total)}.</p>
          {orders.map((o) => (
            <article key={o.id} className="order">
              <div className="order__head">
                <strong>Заказ #{o.id.slice(0, 8)}</strong>
                <span className="muted">{new Date(o.createdAt).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                <span className="badge badge--ok">{o.status}</span>
              </div>
              <ul>
                {o.items.map((it) => (
                  <li key={it.bookId}>
                    <span><Link to={`/books/${it.bookId}`}>{it.title}</Link> <span className="muted">— {it.author}</span></span>
                    <span>{it.quantity} × {formatPrice(it.unitPrice)}</span>
                  </li>
                ))}
              </ul>
              <div className="order__head">
                <span className="muted">
                  {o.address ? `Доставка: ${o.address.postalCode}, ${o.address.city}, ${o.address.street}${o.address.apartment ? `, кв. ${o.address.apartment}` : ''}` : 'Адрес не указан'}
                </span>
                <strong>Итого: {formatPrice(o.total)}</strong>
              </div>
            </article>
          ))}
        </>
      ))}
    </>
  );
}
