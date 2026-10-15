import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import BookForm from '../components/BookForm.jsx';
import { EmptyState, ErrorBox, Loader } from '../components/Status.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { booksApi } from '../services/api.js';

export default function BookEditPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ book: null, loading: true, error: '', status: 0 });
  const [reloadKey, setReloadKey] = useState(0);

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
  if (loading) return <Loader />;
  if (status === 404) return <EmptyState title="Такой книги нет" actionTo="/dashboard" actionLabel="К моим книгам" />;
  if (error) return <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />;
  // Это лишь удобство интерфейса: настоящую проверку прав делает сервер (PUT вернёт 403).
  if (book.ownerId !== user.id && user.role !== 'admin') return <Navigate to="/403" replace />;

  return (
    <div className="auth auth--wide">
      <h1>Редактирование</h1>
      <BookForm
        initial={book}
        submitLabel="Сохранить изменения"
        onSubmit={async (values) => {
          await booksApi.update(book.id, values);
          navigate(`/books/${book.id}`);
        }}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
