import { useEffect, useMemo, useState } from 'react';
import AdminTabs from '../components/AdminTabs.jsx';
import { ErrorBox, Loader } from '../components/Status.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { adminApi } from '../services/api.js';
import { ROLES, ROLE_LABELS } from '../utils/roles.js';

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [data, setData] = useState({ users: [], loading: true, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState({ q: '', role: '' });
  const [pendingId, setPendingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setData((d) => ({ ...d, loading: true, error: '' }));
    adminApi
      .users(controller.signal)
      .then((users) => setData({ users, loading: false, error: '' }))
      .catch((err) => {
        if (err.name !== 'AbortError') setData({ users: [], loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [reloadKey]);

  const { users, loading, error } = data;

  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return users.filter(
      (u) =>
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
        (!filters.role || u.role === filters.role),
    );
  }, [users, filters]);

  const handleRoleChange = async (target, role) => {
    if (role === target.role) return;
    const warning =
      role === 'admin'
        ? `Сделать «${target.name}» администратором? Он получит полный доступ к книгам и ролям пользователей.`
        : `Изменить роль «${target.name}»: ${ROLE_LABELS[target.role]} → ${ROLE_LABELS[role]}?`;
    if (!window.confirm(warning)) return;

    setActionError('');
    setNotice('');
    setPendingId(target.id);
    try {
      const updated = await adminApi.setRole(target.id, role);
      setData((d) => ({ ...d, users: d.users.map((u) => (u.id === target.id ? { ...u, role: updated.role } : u)) }));
      setNotice(`Роль «${target.name}» изменена: ${ROLE_LABELS[updated.role]}. В интерфейсе пользователя она обновится после перезагрузки страницы.`);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <>
      <h1>Администрирование</h1>
      <AdminTabs />
      <p className="muted">Блокировка и удаление аккаунтов — на странице «Модерация».</p>

      {loading && <Loader />}
      {error && <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      {!loading && !error && (
        <>
          <div className="toolbar">
            <div className="field">
              <label htmlFor="u-q">Поиск</label>
              <input id="u-q" type="search" placeholder="Имя или email" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="u-role">Роль</label>
              <select id="u-role" value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}>
                <option value="">Все роли</option>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </div>

          <p className="muted" aria-live="polite">Показано: {visible.length} из {users.length}</p>
          {actionError && <p className="field-error" role="alert">{actionError}</p>}
          {notice && <p className="notice notice--ok" role="status">{notice}</p>}

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Пользователь</th><th>Роль</th><th>Книг</th><th>Заказов</th><th>Регистрация</th></tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={5} className="muted">Никого не найдено</td></tr>
                )}
                {visible.map((u) => {
                  const isMe = u.id === me.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name}</strong>{isMe && <span className="badge badge--you">это вы</span>}{u.blocked && <span className="badge badge--off badge--gap">заблокирован</span>}
                        <br /><span className="muted">{u.email}</span>
                      </td>
                      <td>
                        <select
                          className="role-select"
                          aria-label={`Роль пользователя ${u.name}`}
                          value={u.role}
                          disabled={isMe || pendingId === u.id}
                          title={isMe ? 'Свою роль изменить нельзя' : undefined}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      </td>
                      <td>{u.booksCount}</td>
                      <td>{u.ordersCount}</td>
                      <td>{new Date(u.createdAt).toLocaleDateString('ru-RU')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
