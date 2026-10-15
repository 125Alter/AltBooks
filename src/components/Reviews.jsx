import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Field from './Field.jsx';
import StarRating from './StarRating.jsx';
import { ErrorBox, Loader } from './Status.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { reviewsApi } from '../services/api.js';
import { canDeleteReview } from '../utils/roles.js';

function ReviewForm({ onSubmit }) {
  const [form, setForm] = useState({ rating: 0, text: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = {};
    if (form.rating < 1) found.rating = 'Поставьте оценку от 1 до 5';
    if (form.text.trim().length < 3) found.text = 'Отзыв — от 3 до 1000 символов';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      await onSubmit({ rating: form.rating, text: form.text.trim() });
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <form className="form review-form" onSubmit={handleSubmit} noValidate>
      <fieldset className="fieldset rating-input">
        <legend>Ваша оценка</legend>
        <div className="rating-input__row">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className={n <= form.rating ? 'is-on' : ''}>
              <input type="radio" name="rating" value={n} checked={form.rating === n}
                onChange={() => setForm((f) => ({ ...f, rating: n }))} />
              <span aria-hidden="true">★</span>
              <span className="sr-only">{n} из 5</span>
            </label>
          ))}
        </div>
        {errors.rating && <p className="field-error">{errors.rating}</p>}
      </fieldset>
      <Field as="textarea" label="Отзыв" name="text" rows={4} maxLength={1000} value={form.text}
        onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} error={errors.text} />
      {formError && <p className="field-error" role="alert">{formError}</p>}
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Публикуем…' : 'Опубликовать отзыв'}
        </button>
      </div>
    </form>
  );
}

export default function Reviews({ book }) {
  const { user } = useAuth();
  const location = useLocation();
  const [data, setData] = useState({ reviews: [], loading: true, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setData((d) => ({ ...d, loading: true, error: '' }));
    reviewsApi
      .forBook(book.id, controller.signal)
      .then((reviews) => setData({ reviews, loading: false, error: '' }))
      .catch((err) => {
        if (err.name !== 'AbortError') setData({ reviews: [], loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [book.id, reloadKey]);

  const { reviews, loading, error } = data;
  const average = useMemo(
    () => (reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0),
    [reviews],
  );
  const hasMine = Boolean(user && reviews.some((r) => r.userId === user.id));
  const isOwner = Boolean(user && book.ownerId === user.id);

  const handleCreate = async (values) => {
    const review = await reviewsApi.create(book.id, values);
    setData((d) => ({ ...d, reviews: [review, ...d.reviews] }));
  };

  const handleDelete = async (review) => {
    const own = review.userId === user.id;
    const question = own ? 'Удалить ваш отзыв?' : `Удалить отзыв пользователя «${review.userName}»? Это действие нельзя отменить.`;
    if (!window.confirm(question)) return;
    setActionError('');
    try {
      await reviewsApi.remove(review.id);
      setData((d) => ({ ...d, reviews: d.reviews.filter((r) => r.id !== review.id) }));
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <section className="reviews" aria-labelledby="reviews-title">
      <div className="section-head">
        <h2 id="reviews-title">Отзывы{!loading && !error && ` (${reviews.length})`}</h2>
        {reviews.length > 0 && <StarRating value={average} />}
      </div>

      {user ? (
        isOwner ? (
          <p className="muted">Вы автор этой книги, поэтому оставить отзыв нельзя.</p>
        ) : hasMine ? (
          <p className="muted">Вы уже оставили отзыв на эту книгу. Чтобы написать новый, удалите прежний.</p>
        ) : (
          <ReviewForm onSubmit={handleCreate} />
        )
      ) : (
        <p><Link to="/login" state={{ from: location }}>Войдите</Link>, чтобы оставить отзыв.</p>
      )}

      {actionError && <p className="field-error" role="alert">{actionError}</p>}
      {loading && <Loader text="Загружаем отзывы…" />}
      {error && <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />}
      {!loading && !error && reviews.length === 0 && <p className="muted">Отзывов пока нет — станьте первым.</p>}

      {!loading && !error && (
        <ul className="review-list">
          {reviews.map((r) => (
            <li key={r.id} className="review">
              <div className="review__head">
                <strong>{r.userName}</strong>
                <StarRating value={r.rating} />
                <time className="muted" dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleDateString('ru-RU')}</time>
                {canDeleteReview(user, r) && (
                  <button type="button" className="btn btn--danger btn--sm review__delete" onClick={() => handleDelete(r)}>Удалить</button>
                )}
              </div>
              <p className="review__text">{r.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
