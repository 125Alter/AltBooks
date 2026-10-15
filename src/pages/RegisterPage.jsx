import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Field from '../components/Field.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PASSWORD_HINT, PASSWORD_RE } from '../utils/password.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Имя — минимум 2 символа';
  else if (f.name.trim().length > 60) e.name = 'Имя — не длиннее 60 символов';
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Введите корректный email';
  if (!PASSWORD_RE.test(f.password)) e.password = PASSWORD_HINT;
  if (f.confirm !== f.password) e.confirm = 'Пароли не совпадают';
  return e;
}

export default function RegisterPage() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'user' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={user.blocked ? '/blocked' : '/'} replace />;

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role });
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <h1>Регистрация</h1>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field label="Имя" name="name" autoComplete="name" value={form.name} onChange={handleChange} error={errors.name} required />
        <Field label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} error={errors.email} required />
        <Field label="Пароль" name="password" type="password" autoComplete="new-password" value={form.password} onChange={handleChange} error={errors.password} required />
        {!errors.password && <p className="muted field-hint">{PASSWORD_HINT}</p>}
        <Field label="Повторите пароль" name="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={handleChange} error={errors.confirm} required />
        <fieldset className="fieldset">
          <legend>Кто вы?</legend>
          <label className="radio">
            <input type="radio" name="role" value="user" checked={form.role === 'user'} onChange={handleChange} />
            <span><strong>Покупатель</strong><br /><span className="muted">Покупает книги из каталога</span></span>
          </label>
          <label className="radio">
            <input type="radio" name="role" value="author" checked={form.role === 'author'} onChange={handleChange} />
            <span><strong>Автор</strong><br /><span className="muted">Публикует свои книги и управляет ими, покупать тоже может</span></span>
          </label>
          {errors.role && <p className="field-error">{errors.role}</p>}
        </fieldset>
        {formError && <p className="field-error" role="alert">{formError}</p>}
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
        </button>
      </form>
      <p className="muted">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
    </div>
  );
}
