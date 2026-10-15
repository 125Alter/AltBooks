import { useEffect, useMemo, useState } from 'react';
import BookCard from '../components/BookCard.jsx';
import BookFilters from '../components/BookFilters.jsx';
import { EmptyState, ErrorBox, Loader } from '../components/Status.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { booksApi } from '../services/api.js';
import { canPublish } from '../utils/roles.js';
import { DEFAULT_FILTERS, filterBooks } from '../utils/filterBooks.js';

export default function CatalogPage() {
  const { user } = useAuth();
  const [data, setData] = useState({ books: [], loading: true, error: '' });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setData((d) => ({ ...d, loading: true, error: '' }));
    booksApi
      .list(controller.signal)
      .then((books) => setData({ books, loading: false, error: '' }))
      .catch((err) => {
        if (err.name !== 'AbortError') setData({ books: [], loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [reloadKey]);

  const { books, loading, error } = data;

  // Всё ниже — производные значения: они вычисляются из books и filters, а не хранятся в state.
  const genres = useMemo(() => [...new Set(books.map((b) => b.genre))].sort((a, b) => a.localeCompare(b, 'ru')), [books]);
  const priceRange = useMemo(
    () => (books.length ? { min: Math.min(...books.map((b) => b.price)), max: Math.max(...books.map((b) => b.price)) } : null),
    [books],
  );
  const priceError =
    filters.minPrice !== '' && filters.maxPrice !== '' && Number(filters.minPrice) > Number(filters.maxPrice)
      ? 'Минимальная цена больше максимальной'
      : '';
  const visible = useMemo(() => filterBooks(books, filters), [books, filters]);

  const handleChange = (patch) => setFilters((prev) => ({ ...prev, ...patch }));
  const handleReset = () => setFilters(DEFAULT_FILTERS);

  return (
    <>
      <h1>Каталог</h1>
      <BookFilters filters={filters} onChange={handleChange} onReset={handleReset}
        genres={genres} priceRange={priceRange} priceError={priceError} />

      {loading && <Loader text="Загружаем каталог…" />}
      {error && <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      {!loading && !error && (
        <>
          <p className="muted" aria-live="polite">Найдено: {visible.length} из {books.length}</p>
          {books.length === 0 ? (
            <EmptyState title="В каталоге пока нет книг" {...(canPublish(user) ? { actionTo: '/books/new', actionLabel: 'Добавить первую книгу' } : {})} />
          ) : visible.length === 0 ? (
            <div className="status">
              <h3>Ничего не найдено</h3>
              <p className="muted">Попробуйте изменить запрос или расширить диапазон цен.</p>
              <button type="button" className="btn btn--primary" onClick={handleReset}>Сбросить фильтры</button>
            </div>
          ) : (
            <div className="grid">{visible.map((b) => <BookCard key={b.id} book={b} />)}</div>
          )}
        </>
      )}
    </>
  );
}
