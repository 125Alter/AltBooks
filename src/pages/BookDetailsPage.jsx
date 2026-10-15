import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import BookCover from '../components/BookCover.jsx';
import Field from '../components/Field.jsx';
import Reviews from '../components/Reviews.jsx';
import StarRating from '../components/StarRating.jsx';
import { EmptyState, ErrorBox, Loader } from '../components/Status.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { booksApi } from '../services/api.js';
import { formatPrice } from '../utils/format.js';
import { canDeleteBook, canEditBook } from '../utils/roles.js';

export default function BookDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({ book: null, loading: true, error: '', status: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    const controller = new AbortController();
    setState({ book: null, loading: true, error: '', status: 0 });
    booksApi
      .get(id, controller.signal)
      .then((book) => setState({ book, loading: false, error: '', status: 200 }))
      .catch((err) => {
        if (err.name !== 'AbortError') setState({ book: null, loading: false, error: err.message, status: err.status ?? 0 });
      });
    return () => controller.abort();
  }, [id, reloadKey]);

  const { book, loading, error, status } = state;
  if (loading) return <Loader text="Загружаем книгу…" />;
  if (status === 404) {
    return <EmptyState title="Такой книги нет" actionTo="/books" actionLabel="Вернуться в каталог">Возможно, её удалили или ссылка неверна.</EmptyState>;
  }
  if (error) return <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />;

  const canEdit = canEditBook(user, book);
  const canDelete = canDeleteBook(user, book);
  const inStock = book.stock > 0;

  const handleDelete = async () => {
    if (!window.confirm(`Удалить «${book.title}» вместе с отзывами? Это действие нельзя отменить.`)) return;
    try {
      await booksApi.remove(book.id);
      navigate(user.role === 'admin' ? '/admin' : user.role === 'moderator' ? '/moderation' : '/dashboard');
    } catch (err) {
      setActionError(err.message);
    }
  };

  // «В корзину» остаётся на странице, «Купить сразу» ведёт в корзину к оформлению.
  const handleAdd = (goToCart) => {
    setActionError('');
    setNotice('');
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > book.stock) {
      setActionError(`Количество — целое число от 1 до ${book.stock}`);
      return;
    }
    const added = add(book, qty);
    if (goToCart) {
      navigate('/cart');
      return;
    }
    setNotice(added > 0 ? `Добавлено в корзину: ${added} шт.` : 'В корзине уже максимальное количество этой книги.');
    setQuantity('1');
  };

  return (
    <>
    <article className="details">
      <div className="details__cover"><BookCover src={book.coverUrl} title={book.title} /></div>
      <div>
        <Link to="/books" className="muted">← Каталог</Link>
        <h1>{book.title}</h1>
        <p className="details__author">{book.author}</p>
        {book.ratingCount > 0 && <StarRating value={book.ratingAvg} count={book.ratingCount} />}
        <dl className="facts">
          <div><dt>Жанр</dt><dd>{book.genre}</dd></div>
          <div><dt>Год издания</dt><dd>{book.year}</dd></div>
          <div><dt>Остаток</dt><dd>{inStock ? `${book.stock} шт.` : 'Нет в наличии'}</dd></div>
          <div><dt>Добавил(а)</dt><dd>{book.ownerName}</dd></div>
        </dl>
        <p className="price price--big">{formatPrice(book.price)}</p>
        {book.description && <p className="details__desc">{book.description}</p>}

        {/* корзина доступна любому вошедшему; гостя отправляем на вход и потом вернём сюда */}
        {inStock && (user ? (
          <form className="buy" onSubmit={(e) => { e.preventDefault(); handleAdd(false); }}>
            <Field label="Количество" name="quantity" type="number" min="1" max={book.stock} step="1"
              value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            <button type="submit" className="btn btn--ghost">В корзину</button>
            <button type="button" className="btn btn--primary" onClick={() => handleAdd(true)}>Купить сразу</button>
          </form>
        ) : (
          <p><Link to="/login" state={{ from: location }} className="btn btn--primary">Войдите, чтобы купить</Link></p>
        ))}
        {notice && <p className="notice notice--ok" role="status">{notice} <Link to="/cart">Перейти в корзину</Link></p>}
        {actionError && <p className="field-error" role="alert">{actionError}</p>}

        {(canEdit || canDelete) && (
          <div className="form__actions">
            {canEdit && <Link to={`/books/${book.id}/edit`} className="btn btn--ghost">Редактировать</Link>}
            {canDelete && <button type="button" className="btn btn--danger" onClick={handleDelete}>Удалить</button>}
          </div>
        )}
      </div>
    </article>
    <Reviews book={book} />
    </>
  );
}
