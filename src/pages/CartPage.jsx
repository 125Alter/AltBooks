import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BookCover from '../components/BookCover.jsx';
import CheckoutForm from '../components/CheckoutForm.jsx';
import { EmptyState, ErrorBox, Loader } from '../components/Status.jsx';
import { useCart } from '../context/CartContext.jsx';
import { booksApi, ordersApi } from '../services/api.js';
import { formatPrice } from '../utils/format.js';

export default function CartPage() {
  const { items, setQuantity, remove, clear } = useCart();
  const [data, setData] = useState({ books: [], loading: true, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [placed, setPlaced] = useState(null);
  const checkoutRef = useRef(null);

  // Актуальные цены и остатки берём с сервера. Индикатор загрузки показываем только в первый раз,
  // чтобы повторное обновление не сбрасывало заполненную форму заказа.
  useEffect(() => {
    const controller = new AbortController();
    booksApi
      .list(controller.signal)
      .then((books) => setData({ books, loading: false, error: '' }))
      .catch((err) => {
        if (err.name !== 'AbortError') setData((d) => ({ ...d, loading: false, error: err.message }));
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    if (showCheckout) checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showCheckout]);

  const lines = useMemo(() => {
    const byId = new Map(data.books.map((b) => [b.id, b]));
    return items.map((item) => {
      const book = byId.get(item.bookId);
      let problem = '';
      if (!book) problem = 'Этой книги больше нет в каталоге — удалите её из корзины.';
      else if (book.stock === 0) problem = 'Нет в наличии — удалите из корзины.';
      else if (book.stock < item.quantity) problem = `На складе только ${book.stock} шт. — уменьшите количество.`;
      return { ...item, book, problem, subtotal: book ? book.price * item.quantity : 0 };
    });
  }, [items, data.books]);

  const total = lines.reduce((sum, l) => sum + l.subtotal, 0);
  const hasProblems = lines.some((l) => l.problem);

  const placeOrder = async (address) => {
    try {
      const order = await ordersApi.create({ items: items.map(({ bookId, quantity }) => ({ bookId, quantity })), address });
      clear();
      setPlaced(order);
    } catch (err) {
      if (err.status === 409) setReloadKey((k) => k + 1); // остатки изменились — подтягиваем свежие
      throw err;
    }
  };

  if (placed) {
    return (
      <div className="success" role="status">
        <h1>Заказ оформлен</h1>
        <p>Номер заказа: <strong>#{placed.id.slice(0, 8)}</strong>. Сумма: <strong>{formatPrice(placed.total)}</strong>.</p>
        <p className="muted">Доставим по адресу: {placed.address.postalCode}, {placed.address.city}, {placed.address.street}{placed.address.apartment ? `, кв. ${placed.address.apartment}` : ''}.</p>
        <div className="form__actions">
          <Link to="/orders" className="btn btn--primary">Мои заказы</Link>
          <Link to="/books" className="btn btn--ghost">Продолжить покупки</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1>Корзина</h1>
      {items.length === 0 ? (
        <EmptyState title="В корзине пусто" actionTo="/books" actionLabel="Перейти в каталог">
          Добавьте книги из каталога кнопкой «В корзину».
        </EmptyState>
      ) : data.loading ? (
        <Loader text="Проверяем цены и наличие…" />
      ) : (
        <>
          {data.error && <ErrorBox message={data.error} onRetry={() => setReloadKey((k) => k + 1)} />}
          {lines.map((l) => (
            <div key={l.bookId} className="cart-line">
              <div className="cart-line__cover">{l.book && <BookCover src={l.book.coverUrl} title={l.book.title} />}</div>
              <div>
                {l.book ? <Link to={`/books/${l.bookId}`}><strong>{l.book.title}</strong></Link> : <strong>Книга недоступна</strong>}
                {l.book && <p className="muted">{l.book.author}, {formatPrice(l.book.price)} за шт.</p>}
              </div>
              <div className="stepper" role="group" aria-label={`Количество${l.book ? `: ${l.book.title}` : ''}`}>
                <button type="button" aria-label="Уменьшить" disabled={l.quantity <= 1} onClick={() => setQuantity(l.bookId, l.quantity - 1)}>−</button>
                <output aria-live="polite">{l.quantity}</output>
                <button type="button" aria-label="Увеличить" disabled={!l.book || l.quantity >= l.book.stock} onClick={() => setQuantity(l.bookId, l.quantity + 1)}>+</button>
              </div>
              <strong className="price">{l.book ? formatPrice(l.subtotal) : '—'}</strong>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(l.bookId)}>Удалить</button>
              {l.problem && <p className="field-error cart-line__problem" role="alert">{l.problem}</p>}
            </div>
          ))}

          <div className="summary">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { if (window.confirm('Очистить корзину?')) { clear(); setShowCheckout(false); } }}>Очистить корзину</button>
            <div>
              <span className="muted">Итого: </span><strong className="price price--big">{formatPrice(total)}</strong>
            </div>
          </div>

          {!showCheckout && (
            <div className="form__actions">
              <button type="button" className="btn btn--primary" disabled={hasProblems} onClick={() => setShowCheckout(true)}>Заказать</button>
              {hasProblems && <span className="field-error">Исправьте позиции, отмеченные красным.</span>}
            </div>
          )}

          {showCheckout && (
            <div ref={checkoutRef}>
              {hasProblems
                ? <p className="field-error" role="alert">Позиции в корзине изменились — исправьте их, чтобы продолжить.</p>
                : <CheckoutForm total={total} onSubmit={placeOrder} onCancel={() => setShowCheckout(false)} />}
            </div>
          )}
        </>
      )}
    </>
  );
}
