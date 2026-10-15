import { formatPrice } from '../utils/format.js';

/** Управляемая панель фильтров. Состояние хранит родитель (CatalogPage), сюда приходит через props. */
export default function BookFilters({ filters, onChange, onReset, genres, priceRange, priceError }) {
  const set = (name) => (e) =>
    onChange({ [name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <form className="filters" onSubmit={(e) => e.preventDefault()} aria-label="Фильтры каталога">
      <div className="field filters__wide">
        <label htmlFor="f-q">Поиск</label>
        <input id="f-q" type="search" placeholder="Название или автор" value={filters.q} onChange={set('q')} />
      </div>

      <div className="field">
        <label htmlFor="f-genre">Жанр</label>
        <select id="f-genre" value={filters.genre} onChange={set('genre')}>
          <option value="">Все жанры</option>
          {genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="f-min">Цена от</label>
        <input id="f-min" type="number" min="0" step="any" inputMode="decimal"
          placeholder={priceRange ? String(priceRange.min) : '0'} value={filters.minPrice} onChange={set('minPrice')} />
      </div>

      <div className="field">
        <label htmlFor="f-max">Цена до</label>
        <input id="f-max" type="number" min="0" step="any" inputMode="decimal"
          placeholder={priceRange ? String(priceRange.max) : ''} value={filters.maxPrice} onChange={set('maxPrice')} />
      </div>

      <div className="field">
        <label htmlFor="f-sort">Сортировка</label>
        <select id="f-sort" value={filters.sort} onChange={set('sort')}>
          <option value="new">Сначала новые</option>
          <option value="price-asc">Дешевле</option>
          <option value="price-desc">Дороже</option>
          <option value="title">По названию</option>
          <option value="year-desc">По году издания</option>
        </select>
      </div>

      <div className="filters__row">
        <label className="check">
          <input type="checkbox" checked={filters.inStock} onChange={set('inStock')} /> Только в наличии
        </label>
        {priceRange && (
          <span className="muted">Цены в каталоге: {formatPrice(priceRange.min)} — {formatPrice(priceRange.max)}</span>
        )}
        <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>Сбросить</button>
      </div>

      {priceError && <p className="field-error filters__wide" role="alert">{priceError}</p>}
    </form>
  );
}
