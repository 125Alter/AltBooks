import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorBox, Loader } from '../components/Status.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { booksApi } from '../services/api.js';
import { formatPrice } from '../utils/format.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState({ books: [], loading: true, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setData((d) => ({ ...d, loading: true, error: '' }));
    booksApi
      .mine(controller.signal)
      .then((books) => setData({ books, loading: false, error: '' }))
      .catch((err) => {
        if (err.name !== 'AbortError') setData({ books: [], loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [reloadKey]);

  const { books, loading, error } = data;
  const totalValue = useMemo(() => books.reduce((sum, b) => sum + b.price * b.stock, 0), [books]);

  const handleDelete = async (book) => {
    if (!window.confirm(`Удалить «${book.title}»? Это действие нельзя отменить.`)) return;
    setActionError('');
    try {
      await booksApi.remove(book.id);
      setData((d) => ({ ...d, books: d.books.filter((b) => b.id !== book.id) }));
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <>
      <div className="section-head">
        <h1>Мои книги</h1>
        <Link to="/books/new" className="btn btn--primary">Добавить книгу</Link>
      </div>
      <p className="muted">Здравствуйте, {user.name}. Здесь только книги, которые добавили вы.</p>

      {loading && <Loader />}
      {error && <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />}
      {actionError && <p className="field-error" role="alert">{actionError}</p>}

      {!loading && !error && (books.length === 0 ? (
        <EmptyState title="У вас пока нет книг" actionTo="/books/new" actionLabel="Добавить книгу">
          Добавьте первую — она сразу появится в общем каталоге.
        </EmptyState>
      ) : (
        <>
          <p className="muted">Книг: {books.length}. Стоимость остатков: {formatPrice(totalValue)}.</p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Книга</th><th>Жанр</th><th>Цена</th><th>Остаток</th><th><span className="sr-only">Действия</span></th></tr>
              </thead>
              <tbody>
                {books.map((b) => (
                  <tr key={b.id}>
                    <td><Link to={`/books/${b.id}`}><strong>{b.title}</strong></Link><br /><span className="muted">{b.author}, {b.year}</span></td>
                    <td>{b.genre}</td>
                    <td>{formatPrice(b.price)}</td>
                    <td>{b.stock}</td>
                    <td className="table__actions">
                      <Link to={`/books/${b.id}/edit`} className="btn btn--ghost btn--sm">Изменить</Link>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => handleDelete(b)}>Удалить</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ))}
    </>
  );
}
