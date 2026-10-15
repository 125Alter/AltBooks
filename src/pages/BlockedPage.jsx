import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader } from '../components/Status.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function BlockedPage() {
  const { user, loading, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');

  if (loading) return <Loader text="Проверяем аккаунт…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.blocked) return <Navigate to="/" replace />; // блокировку сняли — страница больше не нужна

  const handleCheck = async () => {
    setChecking(true);
    setMessage('');
    try {
      const fresh = await refresh();
      if (fresh?.blocked) setMessage('Аккаунт по-прежнему заблокирован.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const { reason, byName, at } = user.blocked;

  return (
    <div className="blocked-page">
      <div className="blocked-page__icon" aria-hidden="true">🚫</div>
      <h1>Ваш аккаунт заблокирован</h1>
      <p className="muted">Покупки, отзывы и управление книгами для вас недоступны.</p>

      <div className="plate plate--danger blocked-page__reason" role="status">
        <strong>Причина блокировки:</strong>
        <p>{reason}</p>
        <p className="muted">{byName}, {new Date(at).toLocaleDateString('ru-RU')}</p>
      </div>

      {message && <p className="field-error" role="alert">{message}</p>}
      <div className="form__actions" style={{ justifyContent: 'center' }}>
        <Link to="/profile" className="btn btn--primary">Открыть профиль</Link>
        <button type="button" className="btn btn--ghost" onClick={handleCheck} disabled={checking}>
          {checking ? 'Проверяем…' : 'Проверить статус'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={handleLogout}>Выйти</button>
      </div>
    </div>
  );
}
