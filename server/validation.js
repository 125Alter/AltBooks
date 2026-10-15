const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Минимум 8 символов, строчная и заглавная буква, цифра, спецсимвол. Верхняя граница — лимит bcrypt (72 байта).
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;
export const PASSWORD_HINT = 'Пароль — минимум 8 символов, с заглавной и строчной буквой, цифрой и спецсимволом';
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));

export const isEmail = (v) => EMAIL_RE.test(str(v));
export const isStrongPassword = (v) => typeof v === 'string' && PASSWORD_RE.test(v);

/** Возвращает текст ошибки или пустую строку. */
export function validateName(v) {
  const name = str(v);
  if (name.length < 2) return 'Имя — минимум 2 символа';
  if (name.length > 60) return 'Имя — не длиннее 60 символов';
  return '';
}

export function validateRegister(body = {}) {
  const errors = {};
  const nameError = validateName(body.name);
  if (nameError) errors.name = nameError;
  if (!isEmail(body.email)) errors.email = 'Введите корректный email';
  if (typeof body.password !== 'string' || !PASSWORD_RE.test(body.password)) errors.password = PASSWORD_HINT;
  // Администратором через регистрацию стать нельзя — только «покупатель» или «автор».
  if (body.role !== undefined && !['user', 'author'].includes(body.role)) errors.role = 'Выберите роль: покупатель или автор';
  return errors;
}

export function validateBook(body = {}) {
  const errors = {};
  const title = str(body.title);
  const author = str(body.author);
  const genre = str(body.genre);
  const description = str(body.description);
  const coverUrl = str(body.coverUrl);
  const year = num(body.year);
  const price = num(body.price);
  const stock = num(body.stock);
  const maxYear = new Date().getFullYear() + 1;

  if (!title || title.length > 150) errors.title = 'Название обязательно (до 150 символов)';
  if (!author || author.length > 100) errors.author = 'Автор обязателен (до 100 символов)';
  if (!genre || genre.length > 50) errors.genre = 'Укажите жанр';
  if (!Number.isInteger(year) || year < 1000 || year > maxYear) errors.year = `Год — целое число от 1000 до ${maxYear}`;
  if (!Number.isFinite(price) || price < 0 || price > 10_000_000) errors.price = 'Цена — число от 0';
  if (!Number.isInteger(stock) || stock < 0 || stock > 100_000) errors.stock = 'Остаток — целое число от 0';
  if (description.length > 2000) errors.description = 'Описание — не длиннее 2000 символов';
  if (coverUrl && !/^(https?:\/\/|\/covers\/)\S+$/i.test(coverUrl)) errors.coverUrl = 'Ссылка должна начинаться с http://, https:// или /covers/';

  return {
    errors,
    value: { title, author, genre, year, price: Math.round(price * 100) / 100, stock, description, coverUrl },
  };
}

export function validateAddress(a) {
  const src = a && typeof a === 'object' ? a : {};
  const errors = {};
  const city = str(src.city);
  const street = str(src.street);
  const apartment = str(src.apartment);
  const postalCode = str(src.postalCode);
  if (city.length < 2 || city.length > 80) errors.city = 'Укажите город';
  if (street.length < 3 || street.length > 150) errors.street = 'Укажите улицу и дом';
  if (apartment.length > 20) errors.apartment = 'Не длиннее 20 символов';
  if (!/^\d{6}$/.test(postalCode)) errors.postalCode = 'Индекс — 6 цифр';
  return { errors, value: { city, street, apartment, postalCode } };
}

export function validateReview(body = {}) {
  const errors = {};
  const rating = num(body.rating);
  const text = str(body.text);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = 'Поставьте оценку от 1 до 5';
  if (text.length < 3 || text.length > 1000) errors.text = 'Отзыв — от 3 до 1000 символов';
  return { errors, value: { rating, text } };
}
