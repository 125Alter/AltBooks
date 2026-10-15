import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb, save, newId } from './db.js';
import { PASSWORD_HINT, isEmail, isStrongPassword, validateAddress, validateBook, validateName, validateRegister, validateReview } from './validation.js';

const PORT = process.env.PORT || 3001;
const COOKIE = 'sid';
const WEEK = 7 * 24 * 60 * 60 * 1000;

const db = initDb();
const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

const publicUser = ({ id, name, email, role }) => ({ id, name, email, role });
// Для самого пользователя: добавляем сведения о блокировке (по ним клиент показывает страницу блокировки).
const sessionUser = (u) => ({ ...publicUser(u), blocked: u.blocked ?? null, warning: u.warning ?? null });

// ---------- сессии ----------
function startSession(res, user) {
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions = db.sessions.filter((s) => s.expires > Date.now());
  db.sessions.push({ token, userId: user.id, expires: Date.now() + WEEK });
  save();
  // HttpOnly: JavaScript в браузере не может прочитать cookie (защита от XSS).
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', maxAge: WEEK });
}

app.use((req, _res, next) => {
  const token = req.cookies[COOKIE];
  const session = token && db.sessions.find((s) => s.token === token && s.expires > Date.now());
  const found = session ? db.users.find((u) => u.id === session.userId) ?? null : null;
  // account — любой вошедший, в том числе заблокированный (ему доступны только профиль и страница блокировки).
  // user — вошедший и НЕ заблокированный: для всех остальных функций заблокированный считается неавторизованным.
  req.account = found;
  req.user = found && !found.blocked ? found : null;
  next();
});

// Гостю — 401; заблокированному — 403 с флагом blocked (по нему клиент перекидывает на страницу блокировки).
const denyAnonymous = (req, res) =>
  req.account?.blocked
    ? res.status(403).json({ message: 'Аккаунт заблокирован. Эта функция вам недоступна.', blocked: true })
    : res.status(401).json({ message: 'Требуется вход в аккаунт' });

const requireAccount = (req, res, next) =>
  req.account ? next() : res.status(401).json({ message: 'Требуется вход в аккаунт' });

const requireAuth = (req, res, next) => (req.user ? next() : denyAnonymous(req, res));

const requireAdmin = (req, res, next) => {
  if (!req.user) return denyAnonymous(req, res);
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Доступ только для администратора' });
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return denyAnonymous(req, res);
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Для вашей роли это действие недоступно' });
  next();
};

// ---------- авторизация ----------
app.post('/api/auth/register', (req, res) => {
  const errors = validateRegister(req.body);
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  if (!errors.email && db.users.some((u) => u.email === email)) errors.email = 'Этот email уже зарегистрирован';
  if (Object.keys(errors).length) return res.status(errors.email?.includes('уже') ? 409 : 400).json({ message: 'Проверьте поля формы', errors });

  const user = {
    id: newId(),
    name: req.body.name.trim(),
    email,
    passwordHash: bcrypt.hashSync(req.body.password, 10), // пароль в открытом виде не хранится
    role: req.body.role === 'author' ? 'author' : 'user',
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  startSession(res, user);
  res.status(201).json({ user: sessionUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const user = db.users.find((u) => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Неверный email или пароль' });
  }
  startSession(res, user); // заблокированный тоже входит — и сразу видит страницу блокировки с причиной
  res.json({ user: sessionUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies[COOKIE];
  db.sessions = db.sessions.filter((s) => s.token !== token);
  save();
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

// Восстановление сессии после перезагрузки страницы. Гость — не ошибка: user = null.
app.get('/api/auth/me', (req, res) => res.json({ user: req.account ? sessionUser(req.account) : null }));

// ---------- профиль: доступен и заблокированным (блокировка может быть из-за имени или почты) ----------
function removeUserAndData(userId) {
  const removedBooks = new Set(db.books.filter((b) => b.ownerId === userId).map((b) => b.id));
  db.books = db.books.filter((b) => !removedBooks.has(b.id));
  db.reviews = db.reviews.filter((r) => r.userId !== userId && !removedBooks.has(r.bookId));
  db.orders = db.orders.filter((o) => o.userId !== userId);
  db.sessions = db.sessions.filter((s) => s.userId !== userId);
  db.users = db.users.filter((u) => u.id !== userId);
  save();
  return removedBooks.size;
}

const wrongPassword = (res) =>
  res.status(403).json({ message: 'Неверный пароль', errors: { password: 'Неверный пароль' } });

// Смена имени пароля не требует.
app.patch('/api/auth/profile', requireAccount, (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const nameError = validateName(name);
  if (nameError) return res.status(400).json({ message: 'Проверьте поля формы', errors: { name: nameError } });

  const user = req.account;
  user.name = name;
  // В книгах и отзывах имя сохранено копией — обновляем, чтобы старое имя нигде не осталось.
  for (const b of db.books) if (b.ownerId === user.id) b.ownerName = name;
  for (const r of db.reviews) if (r.userId === user.id) r.userName = name;
  save();
  res.json({ user: sessionUser(user) });
});

// Смена почты требует текущий пароль.
app.patch('/api/auth/email', requireAccount, (req, res) => {
  const user = req.account;
  if (!bcrypt.compareSync(String(req.body?.password ?? ''), user.passwordHash)) return wrongPassword(res);

  const email = String(req.body?.email ?? '').trim().toLowerCase();
  let error = '';
  let status = 400;
  if (!isEmail(email)) error = 'Введите корректный email';
  else if (email === user.email) error = 'Новая почта совпадает с текущей';
  else if (db.users.some((u) => u.email === email && u.id !== user.id)) {
    error = 'Эта почта уже используется';
    status = 409;
  }
  if (error) return res.status(status).json({ message: error, errors: { email: error } });

  user.email = email;
  save();
  res.json({ user: sessionUser(user) });
});

// Смена пароля: по текущему паролю; остальные устройства разлогиниваются, текущее остаётся.
app.patch('/api/auth/password', requireAccount, (req, res) => {
  const user = req.account;
  const current = String(req.body?.currentPassword ?? '');
  if (!bcrypt.compareSync(current, user.passwordHash)) {
    return res.status(403).json({ message: 'Неверный текущий пароль', errors: { currentPassword: 'Неверный пароль' } });
  }
  const next = req.body?.newPassword;
  let error = '';
  if (!isStrongPassword(next)) error = PASSWORD_HINT;
  else if (next === current) error = 'Новый пароль совпадает с текущим';
  if (error) return res.status(400).json({ message: error, errors: { newPassword: error } });

  user.passwordHash = bcrypt.hashSync(next, 10);
  const token = req.cookies[COOKIE];
  db.sessions = db.sessions.filter((s) => s.userId !== user.id || s.token === token);
  save();
  res.json({ ok: true });
});

// Самоудаление: тоже по паролю. Последнего администратора удалить нельзя.
app.delete('/api/auth/account', requireAccount, (req, res) => {
  const user = req.account;
  if (!bcrypt.compareSync(String(req.body?.password ?? ''), user.passwordHash)) return wrongPassword(res);
  if (user.role === 'admin' && !db.users.some((u) => u.role === 'admin' && u.id !== user.id)) {
    return res.status(403).json({ message: 'Вы единственный администратор. Сначала назначьте другого.' });
  }
  removeUserAndData(user.id);
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

// ---------- книги ----------
// Править: админ — любые книги, автор — только свои. Удалять: то же + модератор (любые, но менять их он не может).
const canEdit = (user, book) => user.role === 'admin' || (user.role === 'author' && book.ownerId === user.id);
const canDelete = (user, book) => canEdit(user, book) || user.role === 'moderator';
const newestFirst = (a, b) => b.createdAt.localeCompare(a.createdAt);

// Средняя оценка считается на лету и в сохранённую книгу не попадает.
function withRating(book) {
  const list = db.reviews.filter((r) => r.bookId === book.id);
  const ratingCount = list.length;
  const ratingAvg = ratingCount ? Math.round((list.reduce((s, r) => s + r.rating, 0) / ratingCount) * 10) / 10 : 0;
  return { ...book, ratingAvg, ratingCount };
}

app.get('/api/books', (_req, res) => res.json([...db.books].sort(newestFirst).map(withRating)));

// Важно: /mine объявлен раньше /:id, иначе "mine" воспринимался бы как id.
app.get('/api/books/mine', requireRole('author', 'admin'), (req, res) =>
  res.json(db.books.filter((b) => b.ownerId === req.user.id).sort(newestFirst).map(withRating)),
);

app.get('/api/books/:id', (req, res) => {
  const book = db.books.find((b) => b.id === req.params.id);
  if (!book) return res.status(404).json({ message: 'Книга не найдена' });
  res.json(withRating(book));
});

app.post('/api/books', requireRole('author', 'admin'), (req, res) => {
  const { errors, value } = validateBook(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Проверьте поля формы', errors });
  const now = new Date().toISOString();
  const book = { id: newId(), ...value, ownerId: req.user.id, ownerName: req.user.name, createdAt: now, updatedAt: now };
  db.books.push(book);
  save();
  res.status(201).json(withRating(book));
});

app.put('/api/books/:id', requireAuth, (req, res) => {
  const book = db.books.find((b) => b.id === req.params.id);
  if (!book) return res.status(404).json({ message: 'Книга не найдена' });
  if (!canEdit(req.user, book)) return res.status(403).json({ message: 'У вас нет прав изменять эту книгу' });
  const { errors, value } = validateBook(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Проверьте поля формы', errors });
  Object.assign(book, value, { updatedAt: new Date().toISOString() }); // ownerId из тела запроса игнорируется
  save();
  res.json(withRating(book));
});

app.delete('/api/books/:id', requireAuth, (req, res) => {
  const book = db.books.find((b) => b.id === req.params.id);
  if (!book) return res.status(404).json({ message: 'Книга не найдена' });
  if (!canDelete(req.user, book)) return res.status(403).json({ message: 'У вас нет прав удалять эту книгу' });
  db.books = db.books.filter((b) => b.id !== book.id);
  db.reviews = db.reviews.filter((r) => r.bookId !== book.id); // отзывы удалённой книги не нужны
  save();
  res.json({ ok: true });
});

// ---------- отзывы ----------
app.get('/api/books/:id/reviews', (req, res) => {
  if (!db.books.some((b) => b.id === req.params.id)) return res.status(404).json({ message: 'Книга не найдена' });
  res.json(db.reviews.filter((r) => r.bookId === req.params.id).sort(newestFirst));
});

app.post('/api/books/:id/reviews', requireAuth, (req, res) => {
  const book = db.books.find((b) => b.id === req.params.id);
  if (!book) return res.status(404).json({ message: 'Книга не найдена' });
  if (book.ownerId === req.user.id) {
    return res.status(403).json({ message: 'Нельзя оставлять отзыв на собственную книгу' });
  }
  if (db.reviews.some((r) => r.bookId === book.id && r.userId === req.user.id)) {
    return res.status(409).json({ message: 'Вы уже оставили отзыв на эту книгу. Удалите его, чтобы написать новый.' });
  }
  const { errors, value } = validateReview(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Проверьте поля формы', errors });

  const review = {
    id: newId(), bookId: book.id, userId: req.user.id, userName: req.user.name,
    ...value, createdAt: new Date().toISOString(),
  };
  db.reviews.push(review);
  save();
  res.status(201).json(review);
});

// Свой отзыв удаляет любой, чужой — только модератор или администратор.
app.delete('/api/reviews/:id', requireAuth, (req, res) => {
  const review = db.reviews.find((r) => r.id === req.params.id);
  if (!review) return res.status(404).json({ message: 'Отзыв не найден' });
  const allowed = review.userId === req.user.id || ['moderator', 'admin'].includes(req.user.role);
  if (!allowed) return res.status(403).json({ message: 'Нельзя удалять чужие отзывы' });
  db.reviews = db.reviews.filter((r) => r.id !== review.id);
  save();
  res.json({ ok: true });
});

// Все отзывы разом — для страницы модерации.
app.get('/api/reviews', requireRole('moderator', 'admin'), (_req, res) => {
  const titles = new Map(db.books.map((b) => [b.id, b.title]));
  res.json(
    [...db.reviews].sort(newestFirst).map((r) => ({ ...r, bookTitle: titles.get(r.bookId) ?? '(книга удалена)' })),
  );
});

// ---------- заказы ----------
// Данные банковской карты на сервер НЕ передаются и не хранятся: оплата в учебном проекте имитируется на клиенте.
app.post('/api/orders', requireAuth, (req, res) => {
  const { items, address } = req.body ?? {};
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return res.status(400).json({ message: 'Корзина пуста' });
  }

  // Складываем количество по книгам (на случай повторов) и проверяем формат.
  const wanted = new Map();
  for (const it of items) {
    const quantity = Number(it?.quantity);
    if (typeof it?.bookId !== 'string' || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return res.status(400).json({ message: 'Некорректные позиции заказа' });
    }
    wanted.set(it.bookId, (wanted.get(it.bookId) ?? 0) + quantity);
  }

  const { errors, value: shipTo } = validateAddress(address);
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Проверьте адрес доставки', errors });

  // Сначала проверяем ВСЕ позиции и только потом списываем остатки — заказ либо проходит целиком, либо нет.
  const lines = [];
  for (const [bookId, quantity] of wanted) {
    const book = db.books.find((b) => b.id === bookId);
    if (!book) return res.status(409).json({ message: 'Одной из книг больше нет в каталоге. Обновите корзину.' });
    if (book.stock < quantity) {
      return res.status(409).json({ message: `«${book.title}»: на складе только ${book.stock} шт.` });
    }
    lines.push({ book, quantity });
  }

  const now = new Date().toISOString();
  for (const { book, quantity } of lines) {
    book.stock -= quantity;
    book.updatedAt = now;
  }
  const order = {
    id: newId(),
    userId: req.user.id,
    items: lines.map(({ book, quantity }) => ({
      bookId: book.id, title: book.title, author: book.author, unitPrice: book.price, quantity,
    })),
    total: Math.round(lines.reduce((sum, { book, quantity }) => sum + book.price * quantity, 0) * 100) / 100,
    address: shipTo,
    status: 'Оформлен',
    createdAt: now,
  };
  db.orders.push(order);
  save();
  res.status(201).json(order);
});

app.get('/api/orders/mine', requireAuth, (req, res) =>
  res.json(db.orders.filter((o) => o.userId === req.user.id).sort(newestFirst)),
);

// ---------- модерация аккаунтов ----------
// Админ: любые аккаунты, кроме своего. Модератор: только покупатели и авторы (не админы и не другие модераторы).
function moderationError(actor, target) {
  if (actor.id === target.id) return 'Нельзя применить это действие к своему аккаунту';
  if (actor.role === 'admin') return null;
  if (actor.role === 'moderator' && (target.role === 'user' || target.role === 'author')) return null;
  return 'Недостаточно прав для действий с этим аккаунтом';
}

const moderationView = (u) => ({
  ...publicUser(u),
  createdAt: u.createdAt,
  blocked: u.blocked ?? null,
  warning: u.warning ?? null,
  booksCount: db.books.filter((b) => b.ownerId === u.id).length,
  reviewsCount: db.reviews.filter((r) => r.userId === u.id).length,
  ordersCount: db.orders.filter((o) => o.userId === u.id).length,
});

// Находит аккаунт и проверяет права; при отказе сама отвечает клиенту и возвращает null.
function targetForModeration(req, res) {
  const target = db.users.find((u) => u.id === req.params.id);
  if (!target) {
    res.status(404).json({ message: 'Пользователь не найден' });
    return null;
  }
  const denied = moderationError(req.user, target);
  if (denied) {
    res.status(403).json({ message: denied });
    return null;
  }
  return target;
}

app.get('/api/moderation/users', requireRole('moderator', 'admin'), (_req, res) =>
  res.json(db.users.map(moderationView).sort((a, b) => a.createdAt.localeCompare(b.createdAt))),
);

app.post('/api/moderation/users/:id/block', requireRole('moderator', 'admin'), (req, res) => {
  const target = targetForModeration(req, res);
  if (!target) return;
  const reason = String(req.body?.reason ?? '').trim();
  if (reason.length < 3 || reason.length > 300) {
    return res.status(400).json({ message: 'Укажите причину блокировки (3–300 символов)', errors: { reason: 'От 3 до 300 символов' } });
  }
  if (target.blocked) return res.status(409).json({ message: 'Аккаунт уже заблокирован' });

  target.blocked = { reason, at: new Date().toISOString(), byName: req.user.name };
  delete target.warning; // блокировка заменяет предупреждение
  save();
  res.json(moderationView(target));
});

// Предупреждение — мягкая мера: аккаунт работает как обычно, но пользователь видит причину и может исправить проблему.
app.post('/api/moderation/users/:id/warn', requireRole('moderator', 'admin'), (req, res) => {
  const target = targetForModeration(req, res);
  if (!target) return;
  const reason = String(req.body?.reason ?? '').trim();
  if (reason.length < 3 || reason.length > 300) {
    return res.status(400).json({ message: 'Укажите текст предупреждения (3–300 символов)', errors: { reason: 'От 3 до 300 символов' } });
  }
  if (target.blocked) return res.status(409).json({ message: 'Аккаунт уже заблокирован' });
  if (target.warning) return res.status(409).json({ message: 'Предупреждение уже выдано. Сначала снимите его.' });

  target.warning = { reason, at: new Date().toISOString(), byName: req.user.name };
  save();
  res.json(moderationView(target));
});

app.post('/api/moderation/users/:id/unwarn', requireRole('moderator', 'admin'), (req, res) => {
  const target = targetForModeration(req, res);
  if (!target) return;
  if (!target.warning) return res.status(409).json({ message: 'У пользователя нет предупреждения' });
  delete target.warning;
  save();
  res.json(moderationView(target));
});

app.post('/api/moderation/users/:id/unblock', requireRole('moderator', 'admin'), (req, res) => {
  const target = targetForModeration(req, res);
  if (!target) return;
  if (!target.blocked) return res.status(409).json({ message: 'Аккаунт не заблокирован' });
  delete target.blocked;
  save();
  res.json(moderationView(target));
});

// Полное удаление: вместе с аккаунтом уходят его книги (и отзывы на них), его отзывы, заказы и сессии.
app.delete('/api/moderation/users/:id', requireRole('moderator', 'admin'), (req, res) => {
  const target = targetForModeration(req, res);
  if (!target) return;
  const removedBooks = removeUserAndData(target.id);
  res.json({ ok: true, removedBooks });
});

// ---------- админ: пользователи и роли ----------
const ROLES = ['user', 'author', 'moderator', 'admin'];

app.get('/api/admin/users', requireAdmin, (_req, res) => {
  const users = db.users.map((u) => ({
    ...publicUser(u),
    createdAt: u.createdAt,
    blocked: Boolean(u.blocked),
    booksCount: db.books.filter((b) => b.ownerId === u.id).length,
    ordersCount: db.orders.filter((o) => o.userId === u.id).length,
  }));
  res.json(users.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
});

app.patch('/api/admin/users/:id/role', requireAdmin, (req, res) => {
  const target = db.users.find((u) => u.id === req.params.id);
  if (!target) return res.status(404).json({ message: 'Пользователь не найден' });

  const role = req.body?.role;
  if (!ROLES.includes(role)) return res.status(400).json({ message: 'Допустимые роли: покупатель, автор, модератор, администратор' });

  // Свою роль менять нельзя: так в системе всегда остаётся хотя бы один администратор.
  if (target.id === req.user.id) return res.status(403).json({ message: 'Свою роль изменить нельзя' });

  target.role = role;
  save(); // сессии хранят только userId, поэтому новая роль действует на сервере сразу же
  res.json({ ...publicUser(target), createdAt: target.createdAt });
});

// ---------- админ ----------
app.get('/api/admin/stats', requireAdmin, (_req, res) =>
  res.json({ users: db.users.length, books: db.books.length, orders: db.orders.length, reviews: db.reviews.length }),
);

// ---------- прод-режим: отдаём собранный фронтенд ----------
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
app.use('/api', (_req, res) => res.status(404).json({ message: 'Маршрут API не найден' }));
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()));
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.type === 'entity.parse.failed' ? 400 : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ message: status === 400 ? 'Некорректный JSON в запросе' : 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => console.log(`API запущен: http://localhost:${PORT}`));
