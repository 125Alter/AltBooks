import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Field from '../components/Field.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../services/api.js';
import { maskEmail } from '../utils/format.js';
import { PASSWORD_HINT, PASSWORD_RE } from '../utils/password.js';
import { ROLE_LABELS } from '../utils/roles.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function NameCard({ user, onSaved }) {
  const [name, setName] = useState(user.name);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice('');
    const value = name.trim();
    if (value.length < 2) return setError('Имя — минимум 2 символа');
    if (value.length > 60) return setError('Имя — не длиннее 60 символов');
    if (value === user.name) return setError('Имя не изменилось');

    setBusy(true);
    setError('');
    try {
      const data = await authApi.updateProfile({ name: value });
      onSaved(data.user);
      setName(data.user.name);
      setNotice('Имя сохранено.');
    } catch (err) {
      setError(err.fields?.name || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" aria-labelledby="name-title">
      <h2 id="name-title">Имя</h2>
      <form className="stack" onSubmit={handleSubmit} noValidate>
        <Field label="Ваше имя" name="profileName" autoComplete="name" value={name} maxLength={60} error={error}
          onChange={(e) => { setName(e.target.value); setError(''); setNotice(''); }} />
        <div className="form__actions">
          <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить имя'}</button>
        </div>
        {notice && <p className="notice notice--ok" role="status">{notice}</p>}
      </form>
    </section>
  );
}

function EmailCard({ user, onSaved }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setForm({ email: '', password: '' });
    setErrors({});
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!EMAIL_RE.test(form.email.trim())) found.email = 'Введите корректный email';
    if (!form.password) found.password = 'Введите текущий пароль';
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setFormError('');
    try {
      const data = await authApi.changeEmail({ email: form.email.trim(), password: form.password });
      onSaved(data.user);
      close();
      setNotice('Почта изменена.');
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.fields && Object.keys(err.fields).length ? '' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" aria-labelledby="email-title">
      <h2 id="email-title">Почта</h2>
      {!open ? (
        <div className="kv">
          <div>
            <span className="kv__label">Текущая почта скрыта</span>
            <span className="kv__value">{maskEmail(user.email)}</span>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setOpen(true); setNotice(''); }}>Сменить почту</button>
        </div>
      ) : (
        <form className="stack" onSubmit={handleSubmit} noValidate>
          <div>
            <span className="kv__label">Текущая почта</span>
            <span className="kv__value">{user.email}</span>
          </div>
          <Field label="Новая почта" name="newEmail" type="email" autoComplete="email" value={form.email}
            onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setErrors((x) => ({ ...x, email: undefined })); }} error={errors.email} />
          <Field label="Текущий пароль" name="emailPassword" type="password" autoComplete="current-password" value={form.password}
            onChange={(e) => { setForm((f) => ({ ...f, password: e.target.value })); setErrors((x) => ({ ...x, password: undefined })); }} error={errors.password} />
          {formError && <p className="field-error" role="alert">{formError}</p>}
          <div className="form__actions">
            <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить почту'}</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={close} disabled={busy}>Отмена</button>
          </div>
        </form>
      )}
      {notice && <p className="notice notice--ok" role="status">{notice}</p>}
    </section>
  );
}

function PasswordCard() {
  const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setForm(EMPTY);
    setErrors({});
    setFormError('');
  };

  const change = (name) => (e) => {
    setForm((f) => ({ ...f, [name]: e.target.value }));
    setErrors((x) => ({ ...x, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.currentPassword) found.currentPassword = 'Введите текущий пароль';
    if (!PASSWORD_RE.test(form.newPassword)) found.newPassword = PASSWORD_HINT;
    else if (form.newPassword === form.currentPassword) found.newPassword = 'Новый пароль совпадает с текущим';
    if (form.confirm !== form.newPassword) found.confirm = 'Пароли не совпадают';
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setFormError('');
    try {
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      close();
      setNotice('Пароль изменён. На других устройствах потребуется войти заново.');
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.fields && Object.keys(err.fields).length ? '' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" aria-labelledby="password-title">
      <h2 id="password-title">Пароль</h2>
      {!open ? (
        <div className="kv">
          <span className="kv__value">••••••••</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setOpen(true); setNotice(''); }}>Сменить пароль</button>
        </div>
      ) : (
        <form className="stack" onSubmit={handleSubmit} noValidate>
          <Field label="Текущий пароль" name="currentPassword" type="password" autoComplete="current-password"
            value={form.currentPassword} onChange={change('currentPassword')} error={errors.currentPassword} />
          <Field label="Новый пароль" name="newPassword" type="password" autoComplete="new-password"
            value={form.newPassword} onChange={change('newPassword')} error={errors.newPassword} />
          {!errors.newPassword && <p className="muted field-hint">{PASSWORD_HINT}</p>}
          <Field label="Повторите новый пароль" name="confirmPassword" type="password" autoComplete="new-password"
            value={form.confirm} onChange={change('confirm')} error={errors.confirm} />
          {formError && <p className="field-error" role="alert">{formError}</p>}
          <div className="form__actions">
            <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить пароль'}</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={close} disabled={busy}>Отмена</button>
          </div>
        </form>
      )}
      {notice && <p className="notice notice--ok" role="status">{notice}</p>}
    </section>
  );
}

function DeleteCard({ onDeleted }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return setError('Введите пароль для подтверждения');
    if (!window.confirm('Удалить аккаунт навсегда? Это действие нельзя отменить.')) return;
    setBusy(true);
    setError('');
    try {
      await authApi.deleteAccount({ password });
      onDeleted();
    } catch (err) {
      setError(err.fields?.password || err.message);
      setBusy(false);
    }
  };

  return (
    <section className="card card--danger" aria-labelledby="delete-title">
      <h2 id="delete-title">Удаление аккаунта</h2>
      {!open ? (
        <div className="kv">
          <p className="muted" style={{ margin: 0, maxWidth: 380 }}>Аккаунт будет удалён вместе с вашими книгами, отзывами и заказами.</p>
          <button type="button" className="btn btn--danger btn--sm" onClick={() => setOpen(true)}>Удалить аккаунт</button>
        </div>
      ) : (
        <form className="stack" onSubmit={handleSubmit} noValidate>
          <p className="muted" style={{ margin: 0 }}>
            Вместе с аккаунтом навсегда удалятся ваши книги (и отзывы на них), ваши отзывы и история заказов.
          </p>
          <Field label="Пароль для подтверждения" name="deletePassword" type="password" autoComplete="current-password" value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }} error={error} />
          <div className="form__actions">
            <button type="submit" className="btn btn--danger btn--sm" disabled={busy}>{busy ? 'Удаляем…' : 'Удалить навсегда'}</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setOpen(false); setPassword(''); setError(''); }} disabled={busy}>Отмена</button>
          </div>
        </form>
      )}
    </section>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="profile">
      <h1>Профиль</h1>

      {user.blocked && (
        <div className="card card--blocked" role="status">
          <strong>Аккаунт заблокирован.</strong> Причина: {user.blocked.reason}
          <p className="muted"><Link to="/blocked">К странице блокировки</Link></p>
        </div>
      )}

      <section className="card" aria-label="Общие данные">
        <div className="kv">
          <div>
            <span className="kv__label">Роль</span>
            <span className="kv__value">{ROLE_LABELS[user.role]}</span>
          </div>
        </div>
      </section>

      <NameCard user={user} onSaved={updateUser} />
      <EmailCard user={user} onSaved={updateUser} />
      <PasswordCard />
      <DeleteCard onDeleted={() => { updateUser(null); navigate('/'); }} />
    </div>
  );
}
