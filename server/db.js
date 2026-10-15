import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const file = path.join(dir, 'db.json');

export const newId = () => crypto.randomUUID();

let db = { users: [], books: [], sessions: [], orders: [], reviews: [] };

/** Атомарная запись: сначала во временный файл, затем переименование. */
export function save() {
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, file);
}

export function initDb() {
  if (fs.existsSync(file)) db = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (db.users.length === 0) seed();
  migrateRoles();
  migrateCovers();
  return db;
}

// Обложки берём из Google Books по ISBN (archive.org / Open Library в ряде сетей недоступен).
const cover = (isbn) => `https://books.google.com/books/content?vid=ISBN${isbn}&printsec=frontcover&img=1&zoom=1`;
const SEED_ISBN = { 'Мастер и Маргарита': '9780141180144', 'Преступление и наказание': '9780140449136' };
const OL_ISBN_URL = /^https:\/\/covers\.openlibrary\.org\/b\/isbn\/(\d+)-M\.jpg(\?default=false)?$/;

/** Миграция ролей: появились заказы; пользователи, у которых уже есть книги, становятся авторами. */
function migrateRoles() {
  let changed = false;
  if (!db.orders) { db.orders = []; changed = true; }
  if (!db.reviews) { db.reviews = []; changed = true; }
  // Старый формат (одна книга в заказе) → новый (список позиций).
  for (const o of db.orders) {
    if (!o.items) {
      o.items = [{ bookId: o.bookId, title: o.title, author: o.author, unitPrice: o.unitPrice, quantity: o.quantity }];
      o.address = null;
      o.status = 'Оформлен';
      for (const k of ['bookId', 'title', 'author', 'unitPrice', 'quantity']) delete o[k];
      changed = true;
    }
  }
  const owners = new Set(db.books.map((b) => b.ownerId));
  for (const u of db.users) {
    if (u.role === 'user' && owners.has(u.id)) { u.role = 'author'; changed = true; }
  }
  if (changed) save();
}

/** Миграция для уже созданной базы: старые ссылки Open Library → Google Books, пустые обложки демо-книг → заполняем. */
function migrateCovers() {
  let changed = false;
  for (const b of db.books) {
    const m = OL_ISBN_URL.exec(b.coverUrl || '');
    if (m) { b.coverUrl = cover(m[1]); changed = true; }
    else if (!b.coverUrl && SEED_ISBN[b.title]) { b.coverUrl = cover(SEED_ISBN[b.title]); changed = true; }
  }
  if (changed) save();
}

function seed() {
  const email = process.env.ADMIN_EMAIL || 'admin@bookshop.local';
  const password = process.env.ADMIN_PASSWORD || 'Admin12345!';
  const admin = {
    id: newId(),
    name: 'Администратор',
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'admin',
    createdAt: new Date().toISOString(),
  };
  db.users.push(admin);

  const samples = [
    ['Мастер и Маргарита', 'Михаил Булгаков', 'Классика', 1967, 4200, 12, cover('9780141180144'), 'Роман о визите дьявола в Москву 1930-х и о рукописи, которая не горит.'],
    ['Преступление и наказание', 'Фёдор Достоевский', 'Классика', 1866, 3800, 9, cover('9780140449136'), 'История студента Раскольникова и цены, которую он платит за собственную теорию.'],
    ['1984', 'Джордж Оруэлл', 'Фантастика', 1949, 3500, 15, cover('9780451524935'), 'Антиутопия о тотальном контроле, переписанной истории и языке, который сужает мысль.'],
    ['Дюна', 'Фрэнк Герберт', 'Фантастика', 1965, 6900, 7, cover('9780441013593'), 'Пустынная планета Арракис, пряность и борьба великих домов за власть.'],
    ['Хоббит', 'Дж. Р. Р. Толкин', 'Фэнтези', 1937, 5200, 10, cover('9780547928227'), 'Путешествие Бильбо Бэггинса к Одинокой горе вместе с отрядом гномов.'],
    ['Чистый код', 'Роберт Мартин', 'Программирование', 2008, 11500, 5, cover('9780132350884'), 'Как писать код, который легко читать, тестировать и поддерживать.'],
    ['Sapiens. Краткая история человечества', 'Юваль Ной Харари', 'Научпоп', 2011, 7800, 8, cover('9780062316097'), 'Обзор истории Homo sapiens: от когнитивной революции до наших дней.'],
    ['Убийство в «Восточном экспрессе»', 'Агата Кристи', 'Детектив', 1934, 3900, 0, cover('9780062693662'), 'Эркюль Пуаро расследует убийство в поезде, застрявшем в снегах.'],
  ];
  const base = Date.now();
  samples.forEach(([title, author, genre, year, price, stock, coverUrl, description], i) => {
    db.books.push({
      id: newId(), title, author, genre, year, price, stock, coverUrl, description,
      ownerId: admin.id, ownerName: admin.name,
      createdAt: new Date(base - (samples.length - i) * 60000).toISOString(),
      updatedAt: new Date(base).toISOString(),
    });
  });
  save();
  console.log(`Создан администратор ${email} (пароль из ADMIN_PASSWORD или значение по умолчанию из README)`);
}
