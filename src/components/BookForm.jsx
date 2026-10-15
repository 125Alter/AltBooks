import { useState } from 'react';
import Field from './Field.jsx';
import { GENRES, CURRENCY } from '../utils/format.js';

const EMPTY = { title: '', author: '', genre: '', year: '', price: '', stock: '', coverUrl: '', description: '' };

// Все поля формы храним строками (контролируемые компоненты), числа приводим при отправке.
const toFormState = (book = {}) =>
  Object.fromEntries(Object.keys(EMPTY).map((k) => [k, book[k] === undefined || book[k] === null ? '' : String(book[k])]));

function validate(f) {
  const e = {};
  const maxYear = new Date().getFullYear() + 1;
  if (!f.title.trim()) e.title = 'Введите название';
  if (!f.author.trim()) e.author = 'Введите автора';
  if (!f.genre) e.genre = 'Выберите жанр';
  const year = Number(f.year);
  if (f.year === '' || !Number.isInteger(year) || year < 1000 || year > maxYear) e.year = `Год — целое число от 1000 до ${maxYear}`;
  const price = Number(f.price);
  if (f.price === '' || !(price >= 0)) e.price = 'Цена — число от 0';
  const stock = Number(f.stock);
  if (f.stock === '' || !Number.isInteger(stock) || stock < 0) e.stock = 'Остаток — целое число от 0';
  if (f.coverUrl.trim() && !/^(https?:\/\/|\/covers\/)\S+$/i.test(f.coverUrl.trim())) e.coverUrl = 'Ссылка должна начинаться с http://, https:// или /covers/';
  return e;
}

export default function BookForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => toFormState(initial));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      await onSubmit({
        title: form.title.trim(),
        author: form.author.trim(),
        genre: form.genre,
        year: Number(form.year),
        price: Number(form.price),
        stock: Number(form.stock),
        coverUrl: form.coverUrl.trim(),
        description: form.description.trim(),
      });
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message);
      setSubmitting(false);
    }
  };

  const genres = !form.genre || GENRES.includes(form.genre) ? GENRES : [form.genre, ...GENRES];

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <Field label="Название" name="title" value={form.title} onChange={handleChange} error={errors.title} required maxLength={150} />
      <Field label="Автор" name="author" value={form.author} onChange={handleChange} error={errors.author} required maxLength={100} />

      <div className="form__grid">
        <Field as="select" label="Жанр" name="genre" value={form.genre} onChange={handleChange} error={errors.genre} required>
          <option value="">Выберите…</option>
          {genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </Field>
        <Field label="Год издания" name="year" type="number" value={form.year} onChange={handleChange} error={errors.year} required />
        <Field label={`Цена, ${CURRENCY}`} name="price" type="number" min="0" step="any" value={form.price} onChange={handleChange} error={errors.price} required />
        <Field label="Остаток, шт." name="stock" type="number" min="0" step="1" value={form.stock} onChange={handleChange} error={errors.stock} required />
      </div>

      <Field label="Ссылка на обложку (необязательно)" name="coverUrl" placeholder="https://… или /covers/имя.jpg" value={form.coverUrl} onChange={handleChange} error={errors.coverUrl} />
      <Field as="textarea" label="Описание" name="description" rows={5} maxLength={2000} value={form.description} onChange={handleChange} error={errors.description} />

      {formError && <p className="field-error" role="alert">{formError}</p>}

      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Сохраняем…' : submitLabel}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Отмена</button>
      </div>
    </form>
  );
}
