import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StarRating from '../components/StarRating.jsx';
import { ErrorBox, Loader } from '../components/Status.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { booksApi, moderationApi, reviewsApi } from '../services/api.js';
import { formatPrice } from '../utils/format.js';
import { ROLE_LABELS, canModerateUser } from '../utils/roles.js';

const PLACEHOLDERS = {
  reviews: 'Автор отзыва, книга или текст',
  books: 'Название, автор или владелец',
  users: 'Имя или email',
};

export default function ModerationPage() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState('reviews');
  const [data, setData] = useState({ reviews: [], books: [], users: [], loading: true, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(''); // '' | 'warned' | 'blocked'
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [panel, setPanel] = useState(null); // { id, type: 'block' | 'warn', reason, error, busy } — открытая форма под строкой

  useEffect(() => {
    const controller = new AbortController();
    setData((d) => ({ ...d, loading: true, error: '' }));
    Promise.all([reviewsApi.all(controller.signal), booksApi.list(controller.signal), moderationApi.users(controller.signal)])
      .then(([reviews, books, users]) => setData({ reviews, books, users, loading: false, error: '' }))
      .catch((err) => {
        if (err.name !== 'AbortError') setData({ reviews: [], books: [], users: [], loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [reloadKey]);

  const { reviews, books, users, loading, error } = data;

  const query = q.trim().toLowerCase();
  const match = (fields) => !query || fields.some((s) => s.toLowerCase().includes(query));
  const visibleReviews = useMemo(() => reviews.filter((r) => match([r.userName, r.bookTitle, r.text])), [reviews, query]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleBooks = useMemo(() => books.filter((b) => match([b.title, b.author, b.ownerName])), [books, query]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleUsers = useMemo(
    () => users.filter((u) => match([u.name, u.email]) && (!status || (status === 'blocked' ? u.blocked : u.warning))),
    [users, query, status], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const run = async (fn) => {
    setActionError('');
    setNotice('');
    try {
      await fn();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const deleteReview = (r) => {
    if (!window.confirm(`Удалить отзыв пользователя «${r.userName}» на «${r.bookTitle}»?`)) return;
    run(async () => {
      await reviewsApi.remove(r.id);
      setData((d) => ({ ...d, reviews: d.reviews.filter((x) => x.id !== r.id) }));
    });
  };

  const deleteBook = (b) => {
    if (!window.confirm(`Удалить книгу «${b.title}» вместе со всеми отзывами? Это действие нельзя отменить.`)) return;
    run(async () => {
      await booksApi.remove(b.id);
      setData((d) => ({ ...d, books: d.books.filter((x) => x.id !== b.id), reviews: d.reviews.filter((x) => x.bookId !== b.id) }));
    });
  };

  const submitPanel = async (e) => {
    e.preventDefault();
    const reason = panel.reason.trim();
    if (reason.length < 3) {
      setPanel((p) => ({ ...p, error: 'Укажите текст (минимум 3 символа)' }));
      return;
    }
    setPanel((p) => ({ ...p, busy: true, error: '' }));
    setActionError('');
    setNotice('');
    try {
      const send = panel.type === 'block' ? moderationApi.block : moderationApi.warn;
      const updated = await send(panel.id, reason);
      setData((d) => ({ ...d, users: d.users.map((u) => (u.id === updated.id ? updated : u)) }));
      setPanel(null);
      setNotice(panel.type === 'block' ? `Аккаунт «${updated.name}» заблокирован.` : `Пользователю «${updated.name}» выдано предупреждение.`);
    } catch (err) {
      setPanel((p) => ({ ...p, busy: false, error: err.message }));
    }
  };

  const unwarn = (u) => {
    if (!window.confirm(`Снять предупреждение с «${u.name}»?`)) return;
    run(async () => {
      const updated = await moderationApi.unwarn(u.id);
      setData((d) => ({ ...d, users: d.users.map((x) => (x.id === updated.id ? updated : x)) }));
      setNotice(`Предупреждение с «${updated.name}» снято.`);
    });
  };

  const unblock = (u) => {
    if (!window.confirm(`Разблокировать «${u.name}»?`)) return;
    run(async () => {
      const updated = await moderationApi.unblock(u.id);
      setData((d) => ({ ...d, users: d.users.map((x) => (x.id === updated.id ? updated : x)) }));
      setNotice(`Аккаунт «${updated.name}» разблокирован.`);
    });
  };

  const deleteUser = (u) => {
    const msg =
      `Удалить аккаунт «${u.name}» навсегда?\n\nВместе с ним удалятся: книги — ${u.booksCount} (и отзывы на них), ` +
      `его отзывы — ${u.reviewsCount}, заказы — ${u.ordersCount}. Это действие нельзя отменить.`;
    if (!window.confirm(msg)) return;
    run(async () => {
      await moderationApi.remove(u.id);
      setPanel((p) => (p?.id === u.id ? null : p));
      setData((d) => {
        const gone = new Set(d.books.filter((b) => b.ownerId === u.id).map((b) => b.id));
        return {
          ...d,
          users: d.users.filter((x) => x.id !== u.id),
          books: d.books.filter((b) => !gone.has(b.id)),
          reviews: d.reviews.filter((r) => r.userId !== u.id && !gone.has(r.bookId)),
        };
      });
      setNotice(`Аккаунт «${u.name}» удалён.`);
    });
  };

  const changeTab = (next) => {
    setTab(next);
    setQ('');
    setActionError('');
    setNotice('');
  };

  return (
    <>
      <h1>Модерация</h1>
      <div className="tabs" role="tablist" aria-label="Разделы модерации">
        <button type="button" role="tab" aria-selected={tab === 'reviews'} onClick={() => changeTab('reviews')}>Отзывы ({reviews.length})</button>
        <button type="button" role="tab" aria-selected={tab === 'books'} onClick={() => changeTab('books')}>Книги ({books.length})</button>
        <button type="button" role="tab" aria-selected={tab === 'users'} onClick={() => changeTab('users')}>Пользователи ({users.length})</button>
      </div>

      {loading && <Loader />}
      {error && <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      {!loading && !error && (
        <>
          <div className={tab === 'users' ? 'toolbar' : undefined}>
            <div className="field" style={tab === 'users' ? undefined : { maxWidth: 420, marginBottom: 14 }}>
              <label htmlFor="m-q">Поиск</label>
              <input id="m-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={PLACEHOLDERS[tab]} />
            </div>
            {tab === 'users' && (
              <div className="field">
                <label htmlFor="m-status">Статус</label>
                <select id="m-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Все</option>
                  <option value="warned">С предупреждением</option>
                  <option value="blocked">Заблокированные</option>
                </select>
              </div>
            )}
          </div>
          {actionError && <p className="field-error" role="alert">{actionError}</p>}
          {notice && <p className="notice notice--ok" role="status">{notice}</p>}

          {tab === 'reviews' && (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Отзыв</th><th>Книга</th><th>Дата</th><th><span className="sr-only">Действия</span></th></tr></thead>
                <tbody>
                  {visibleReviews.length === 0 && <tr><td colSpan={4} className="muted">Отзывов не найдено</td></tr>}
                  {visibleReviews.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.userName}</strong> <StarRating value={r.rating} />
                        <p className="review-snippet">{r.text}</p>
                      </td>
                      <td><Link to={`/books/${r.bookId}`}>{r.bookTitle}</Link></td>
                      <td>{new Date(r.createdAt).toLocaleDateString('ru-RU')}</td>
                      <td className="table__actions"><button type="button" className="btn btn--danger btn--sm" onClick={() => deleteReview(r)}>Удалить</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'books' && (
            <>
              <p className="muted">Модератор может удалять книги, но не изменять их.</p>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Книга</th><th>Владелец</th><th>Цена</th><th>Отзывов</th><th><span className="sr-only">Действия</span></th></tr></thead>
                  <tbody>
                    {visibleBooks.length === 0 && <tr><td colSpan={5} className="muted">Книг не найдено</td></tr>}
                    {visibleBooks.map((b) => (
                      <tr key={b.id}>
                        <td><Link to={`/books/${b.id}`}>{b.title}</Link><br /><span className="muted">{b.author}</span></td>
                        <td>{b.ownerName}</td>
                        <td>{formatPrice(b.price)}</td>
                        <td>{b.ratingCount}</td>
                        <td className="table__actions"><button type="button" className="btn btn--danger btn--sm" onClick={() => deleteBook(b)}>Удалить</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'users' && (
            <>
              <p className="muted">
                Предупреждение — мягкая мера: пользователь видит его на всех страницах и может исправить проблему. Заблокированного перекидывает на страницу с причиной блокировки: покупки, отзывы и свои книги ему недоступны, но имя, почту и удаление аккаунта он может использовать. Модератор управляет покупателями и авторами, администратор — всеми, кроме себя.
              </p>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Пользователь</th><th>Роль</th><th>Статус</th><th>Книг / отзывов</th><th><span className="sr-only">Действия</span></th></tr></thead>
                  <tbody>
                    {visibleUsers.length === 0 && <tr><td colSpan={5} className="muted">Никого не найдено</td></tr>}
                    {visibleUsers.map((u) => {
                      const allowed = canModerateUser(me, u);
                      const isMe = u.id === me.id;
                      return (
                        <Fragment key={u.id}>
                          <tr>
                            <td>
                              <strong>{u.name}</strong>{isMe && <span className="badge badge--you">это вы</span>}
                              <br /><span className="muted">{u.email}</span>
                            </td>
                            <td>{ROLE_LABELS[u.role]}</td>
                            <td>
                              {u.blocked ? (
                                <>
                                  <span className="badge badge--off">заблокирован</span>
                                  <p className="user-reason">Причина: {u.blocked.reason}</p>
                                  <p className="muted">{u.blocked.byName}, {new Date(u.blocked.at).toLocaleDateString('ru-RU')}</p>
                                </>
                              ) : u.warning ? (
                                <>
                                  <span className="badge badge--warn">предупреждён</span>
                                  <p className="user-reason user-reason--warn">{u.warning.reason}</p>
                                  <p className="muted">{u.warning.byName}, {new Date(u.warning.at).toLocaleDateString('ru-RU')}</p>
                                </>
                              ) : (
                                <span className="badge badge--ok">активен</span>
                              )}
                            </td>
                            <td>{u.booksCount} / {u.reviewsCount}</td>
                            <td className="table__actions">
                              {allowed ? (
                                <span className="actions">
                                  {u.blocked ? (
                                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => unblock(u)}>Разблокировать</button>
                                  ) : (
                                    <>
                                      {u.warning ? (
                                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => unwarn(u)}>Снять предупреждение</button>
                                      ) : (
                                        <button type="button" className="btn btn--caution btn--sm" disabled={panel?.id === u.id}
                                          onClick={() => setPanel({ id: u.id, type: 'warn', reason: '', error: '', busy: false })}>Предупредить</button>
                                      )}
                                      <button type="button" className="btn btn--ghost btn--sm" disabled={panel?.id === u.id}
                                        onClick={() => setPanel({ id: u.id, type: 'block', reason: '', error: '', busy: false })}>Заблокировать</button>
                                    </>
                                  )}
                                  <button type="button" className="btn btn--danger btn--sm" onClick={() => deleteUser(u)}>Удалить</button>
                                </span>
                              ) : (
                                <span className="muted">{isMe ? 'ваш аккаунт' : 'недостаточно прав'}</span>
                              )}
                            </td>
                          </tr>
                          {panel?.id === u.id && (
                            <tr className="row-form">
                              <td colSpan={5}>
                                <form className="inline-form" onSubmit={submitPanel} noValidate>
                                  <div className="field">
                                    <label htmlFor="panel-reason">
                                      {panel.type === 'block'
                                        ? `Причина блокировки «${u.name}» (её увидит пользователь)`
                                        : `Текст предупреждения для «${u.name}» (что исправить; увидит пользователь)`}
                                    </label>
                                    <textarea id="panel-reason" rows={3} maxLength={300} autoFocus value={panel.reason}
                                      aria-invalid={Boolean(panel.error)}
                                      onChange={(e) => setPanel((p) => ({ ...p, reason: e.target.value, error: '' }))} />
                                  </div>
                                  {panel.error && <p className="field-error" role="alert">{panel.error}</p>}
                                  <div className="form__actions">
                                    <button type="submit" className={`btn btn--sm ${panel.type === 'block' ? 'btn--danger' : 'btn--caution'}`} disabled={panel.busy}>
                                      {panel.busy ? 'Отправляем…' : panel.type === 'block' ? 'Заблокировать' : 'Выдать предупреждение'}
                                    </button>
                                    <button type="button" className="btn btn--ghost btn--sm" disabled={panel.busy} onClick={() => setPanel(null)}>Отмена</button>
                                  </div>
                                </form>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
