import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import Field from '../components/Field.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const from = location.state?.from; // сюда ProtectedRoute положил исходный адрес
  const [form, setForm] = useState({ email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Как только user появился (после входа или если уже был вошедшим) — возвращаем на исходную страницу.
  if (user) {
    if (user.blocked) return <Navigate to="/blocked" replace />;
    return <Navigate to={from ? { pathname: from.pathname, search: from.search } : '/'} state={from?.state} replace />;
  }

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setFormError('Введите email и пароль');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await login(form.email.trim(), form.password);
    } catch (err) {
      setFormError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <h1>Вход</h1>
      {from && <p className="notice">Чтобы открыть эту страницу, войдите в аккаунт.</p>}
      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} required />
        <Field label="Пароль" name="password" type="password" autoComplete="current-password" value={form.password} onChange={handleChange} required />
        {formError && <p className="field-error" role="alert">{formError}</p>}
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Входим…' : 'Войти'}
        </button>
      </form>
      <p className="muted">Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
    </div>
  );
}
