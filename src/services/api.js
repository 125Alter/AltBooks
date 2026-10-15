// Обёртка над fetch для собственного backend (Express, cookie-сессия).

// Когда сервер отвечает «аккаунт заблокирован» на действие, AuthContext обновляет данные пользователя —
// и пользователя тут же перекидывает на страницу блокировки.
let blockedHandler = null;
export const setBlockedHandler = (fn) => {
  blockedHandler = fn;
};
async function request(url, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method,
      signal,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error('Нет соединения с сервером. Проверьте, что backend запущен.');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* пустое или не-JSON тело */
  }

  if (!res.ok) {
    if (data?.blocked && blockedHandler) blockedHandler();
    const error = new Error(data?.message || `Ошибка сервера (${res.status})`);
    error.status = res.status;
    error.fields = data?.errors || {};
    throw error;
  }
  return data;
}

export const authApi = {
  me: (signal) => request('/api/auth/me', { signal }),
  register: (body) => request('/api/auth/register', { method: 'POST', body }),
  login: (body) => request('/api/auth/login', { method: 'POST', body }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  updateProfile: (body) => request('/api/auth/profile', { method: 'PATCH', body }),
  changePassword: (body) => request('/api/auth/password', { method: 'PATCH', body }),
  changeEmail: (body) => request('/api/auth/email', { method: 'PATCH', body }),
  deleteAccount: (body) => request('/api/auth/account', { method: 'DELETE', body }),
};

export const booksApi = {
  list: (signal) => request('/api/books', { signal }),
  mine: (signal) => request('/api/books/mine', { signal }),
  get: (id, signal) => request(`/api/books/${id}`, { signal }),
  create: (body) => request('/api/books', { method: 'POST', body }),
  update: (id, body) => request(`/api/books/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/api/books/${id}`, { method: 'DELETE' }),
};

export const reviewsApi = {
  forBook: (bookId, signal) => request(`/api/books/${bookId}/reviews`, { signal }),
  create: (bookId, body) => request(`/api/books/${bookId}/reviews`, { method: 'POST', body }),
  remove: (id) => request(`/api/reviews/${id}`, { method: 'DELETE' }),
  all: (signal) => request('/api/reviews', { signal }),
};

export const moderationApi = {
  users: (signal) => request('/api/moderation/users', { signal }),
  block: (id, reason) => request(`/api/moderation/users/${id}/block`, { method: 'POST', body: { reason } }),
  warn: (id, reason) => request(`/api/moderation/users/${id}/warn`, { method: 'POST', body: { reason } }),
  unwarn: (id) => request(`/api/moderation/users/${id}/unwarn`, { method: 'POST' }),
  unblock: (id) => request(`/api/moderation/users/${id}/unblock`, { method: 'POST' }),
  remove: (id) => request(`/api/moderation/users/${id}`, { method: 'DELETE' }),
};

export const ordersApi = {
  mine: (signal) => request('/api/orders/mine', { signal }),
  create: (body) => request('/api/orders', { method: 'POST', body }),
};

export const adminApi = {
  stats: (signal) => request('/api/admin/stats', { signal }),
  users: (signal) => request('/api/admin/users', { signal }),
  setRole: (id, role) => request(`/api/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),
};
