import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BookCover from '../components/BookCover.jsx';
import { EmptyState, ErrorBox, Loader } from '../components/Status.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { searchBooks } from '../services/openLibrary.js';
import { canPublish } from '../utils/roles.js';

const SUGGESTIONS = ['fantasy', 'javascript', 'dostoevsky', 'science fiction'];

export default function ExplorePage() {
  const { user } = useAuth();
  const [input, setInput] = useState('fantasy');
  const [query, setQuery] = useState('fantasy'); // отправленный запрос: именно он запускает fetch
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ items: [], total: 0, loading: true, error: '' });
  const [view, setView] = useState({ onlyCovers: false, sort: 'relevance' });

  useEffect(() => {
    const controller = new AbortController(); // отменяет устаревший запрос при новом поиске
    setState((s) => ({ ...s, loading: true, error: '' }));
    searchBooks(query, controller.signal)
      .then(({ items, total }) => setState({ items, total, loading: false, error: '' }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState({ items: [], total: 0, loading: false, error: 'Не удалось загрузить данные из Open Library. Проверьте подключение к интернету.' });
      });
    return () => controller.abort();
  }, [query, reloadKey]);

  const { items, total, loading, error } = state;

  const visible = useMemo(() => {
    const list = view.onlyCovers ? items.filter((i) => i.covers.length > 0) : [...items];
    if (view.sort === 'year-desc') list.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    if (view.sort === 'year-asc') list.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
    if (view.sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [items, view]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = input.trim();
    if (q) setQuery(q);
  };

  return (
    <>
      <h1>Поиск в Open Library</h1>
      <p className="muted">Данные приходят из открытого API openlibrary.org. Цен там нет — их указывает автор, когда добавляет книгу в каталог магазина.</p>

      <form className="filters" onSubmit={handleSubmit}>
        <div className="field filters__wide">
          <label htmlFor="ol-q">Что искать</label>
          <input id="ol-q" type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Название, автор или тема" />
        </div>
        <div className="field">
          <label htmlFor="ol-sort">Сортировка</label>
          <select id="ol-sort" value={view.sort} onChange={(e) => setView((v) => ({ ...v, sort: e.target.value }))}>
            <option value="relevance">По релевантности</option>
            <option value="year-desc">Сначала новые</option>
            <option value="year-asc">Сначала старые</option>
            <option value="title">По названию</option>
          </select>
        </div>
        <div className="filters__row">
          <label className="check">
            <input type="checkbox" checked={view.onlyCovers} onChange={(e) => setView((v) => ({ ...v, onlyCovers: e.target.checked }))} /> Только с обложкой
          </label>
          <button type="submit" className="btn btn--primary btn--sm">Найти</button>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip chip--btn" onClick={() => { setInput(s); setQuery(s); }}>{s}</button>
          ))}
        </div>
      </form>

      {loading && <Loader text="Запрашиваем Open Library…" />}
      {error && <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      {!loading && !error && (
        visible.length === 0 ? (
          <EmptyState title="Ничего не найдено">Измените запрос или снимите фильтр «Только с обложкой».</EmptyState>
        ) : (
          <>
            <p className="muted" aria-live="polite">Показано {visible.length} из {total.toLocaleString('ru-RU')} найденных</p>
            <div className="grid">
              {visible.map((b) => (
                <article key={b.id} className="book-card">
                  <div className="book-card__cover"><BookCover sources={b.covers} title={b.title} /></div>
                  <div className="book-card__body">
                    <h3 className="book-card__title">{b.title}</h3>
                    <p className="muted">{b.authors.join(', ') || 'Автор не указан'}{b.year ? `, ${b.year}` : ''}</p>
                    {b.subjects.length > 0 && <p className="muted">{b.subjects.join(' • ')}</p>}
                    {canPublish(user) && (
                      <Link
                      to="/books/new"
                      state={{ prefill: { title: b.title, author: b.authors[0] ?? '', year: b.year ?? '', coverUrl: b.covers[0] ?? '' } }}
                      className="btn btn--ghost btn--sm"
                    >
                      В мой каталог
                    </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )
      )}
    </>
  );
}
