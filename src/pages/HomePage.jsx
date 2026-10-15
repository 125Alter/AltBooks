import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BookCard from '../components/BookCard.jsx';
import { ErrorBox, Loader } from '../components/Status.jsx';
import { booksApi } from '../services/api.js';

const SPINES = [
  { h: 150, c: '#1d4a3c' }, { h: 190, c: '#b8862b' }, { h: 165, c: '#5b2a3c' },
  { h: 205, c: '#26364f' }, { h: 140, c: '#7a8f6a' }, { h: 180, c: '#8a3b2a' }, { h: 158, c: '#3d3d3d' },
];

export default function HomePage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    booksApi
      .list(controller.signal)
      .then((list) => setBooks(list.slice(0, 4))) // сервер отдаёт новинки первыми
      .catch((err) => err.name !== 'AbortError' && setError(err.message))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [reloadKey]);

  return (
    <>
      <section className="hero">
        <div className="hero__text">
          <h1>Книги, которые стоит перечитывать</h1>
          <p>Небольшой магазин с живым каталогом: ищите по названию, жанру и цене, а после регистрации покупайте книги или публикуйте свои как автор.</p>
          <div className="hero__actions">
            <Link to="/books" className="btn btn--primary">Открыть каталог</Link>
            <Link to="/explore" className="btn btn--ghost">Искать в Open Library</Link>
          </div>
        </div>
        <div className="shelf" aria-hidden="true">
          {SPINES.map((s, i) => <span key={i} className="spine" style={{ height: s.h, background: s.c }} />)}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Новые поступления</h2>
          <Link to="/books">Весь каталог</Link>
        </div>
        {loading && <Loader />}
        {error && <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />}
        {!loading && !error && (
          <div className="grid">{books.map((b) => <BookCard key={b.id} book={b} />)}</div>
        )}
      </section>
    </>
  );
}
