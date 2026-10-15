import { formatRating } from '../utils/format.js';

/** Звёзды только для показа: закрашенная часть накладывается на серую и обрезается по ширине. */
export default function StarRating({ value, count }) {
  return (
    <span className="rating-line">
      <span className="stars" role="img" aria-label={`Оценка ${formatRating(value)} из 5`}>
        <span className="stars__bg" aria-hidden="true">★★★★★</span>
        <span className="stars__fg" aria-hidden="true" style={{ width: `${(value / 5) * 100}%` }}>★★★★★</span>
      </span>
      <span className="muted">{formatRating(value)}{count !== undefined && ` (${count})`}</span>
    </span>
  );
}
