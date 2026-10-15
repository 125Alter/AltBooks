import { Link, useLocation } from 'react-router-dom';
import BookCover from './BookCover.jsx';
import StarRating from './StarRating.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../utils/format.js';

/** Вся карточка кликабельна (см. .book-card__title a::after в CSS), кнопка корзины лежит поверх неё. */
export default function BookCard({ book }) {
  const { user } = useAuth();
  const { items, add } = useCart();
  const location = useLocation();
  const inStock = book.stock > 0;
  const inCart = items.find((i) => i.bookId === book.id)?.quantity ?? 0;
  const atLimit = inCart >= book.stock;

  return (
    <article className="book-card">
      <div className="book-card__cover" aria-hidden="true">
        <BookCover src={book.coverUrl} title={book.title} />
      </div>
      <div className="book-card__body">
        <span className="chip">{book.genre}</span>
        <h3 className="book-card__title">
          <Link to={`/books/${book.id}`}>{book.title}</Link>
        </h3>
        <p className="muted">{book.author}, {book.year}</p>
        {book.ratingCount > 0 && <StarRating value={book.ratingAvg} count={book.ratingCount} />}
        <div className="book-card__footer">
          <strong className="price">{formatPrice(book.price)}</strong>
          <span className={inStock ? 'badge badge--ok' : 'badge badge--off'}>
            {inStock ? `В наличии: ${book.stock}` : 'Нет в наличии'}
          </span>
        </div>
        {inStock && (
          <div className="book-card__actions">
            {user ? (
              <button type="button" className="btn btn--primary btn--sm" disabled={atLimit} onClick={() => add(book, 1)}>
                {!inCart ? 'В корзину' : atLimit ? `В корзине: ${inCart} (максимум)` : `Ещё одну (в корзине: ${inCart})`}
              </button>
            ) : (
              <Link to="/login" state={{ from: location }} className="btn btn--primary btn--sm">В корзину</Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
