import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBox, Loader } from '../components/Status.jsx';
import AdminTabs from '../components/AdminTabs.jsx';
import { adminApi, booksApi } from '../services/api.js';
import { formatPrice } from '../utils/format.js';

export default function AdminPage() {
  const [data, setData] = useState({ books: [], stats: null, loading: true, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setData((d) => ({ ...d, loading: true, error: '' }));
    Promise.all([booksApi.list(controller.signal), adminApi.stats(controller.signal)])
      .then(([books, stats]) => setData({ books, stats, loading: false, error: '' }))
      .catch((err) => {
        if (err.name !== 'AbortError') setData({ books: [], stats: null, loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [reloadKey]);

  const handleDelete = async (book) => {
    if (!window.confirm(`Удалить «${book.title}» (автор записи: ${book.ownerName})?`)) return;
    setActionError('');
    try {
      await booksApi.remove(book.id);
      setData((d) => ({ ...d, books: d.books.filter((b) => b.id !== book.id), stats: { ...d.stats, books: d.stats.books - 1 } }));
    } catch (err) {
      setActionError(err.message);
    }
  };

  const { books, stats, loading, error } = data;
  return (
    <>
      <h1>Администрирование</h1>
      <AdminTabs />
      {loading && <Loader />}
      {error && <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />}
      {actionError && <p className="field-error" role="alert">{actionError}</p>}
      {!loading && !error && (
        <>
          <p className="muted">Пользователей: {stats.users}. Книг в каталоге: {stats.books}. Заказов: {stats.orders}. Отзывов: {stats.reviews}.</p>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Книга</th><th>Владелец</th><th>Цена</th><th><span className="sr-only">Действия</span></th></tr></thead>
              <tbody>
                {books.map((b) => (
                  <tr key={b.id}>
                    <td><Link to={`/books/${b.id}`}>{b.title}</Link><br /><span className="muted">{b.author}</span></td>
                    <td>{b.ownerName}</td>
                    <td>{formatPrice(b.price)}</td>
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
      )}
    </>
  );
}
