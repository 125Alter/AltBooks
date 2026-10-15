export const DEFAULT_FILTERS = { q: '', genre: '', minPrice: '', maxPrice: '', inStock: false, sort: 'new' };

const SORTERS = {
  new: (a, b) => b.createdAt.localeCompare(a.createdAt),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  title: (a, b) => a.title.localeCompare(b.title, 'ru'),
  'year-desc': (a, b) => b.year - a.year,
};

/** Чистая функция: список книг + фильтры → отфильтрованный и отсортированный список. */
export function filterBooks(books, f) {
  const q = f.q.trim().toLowerCase();
  const min = f.minPrice === '' ? null : Number(f.minPrice);
  const max = f.maxPrice === '' ? null : Number(f.maxPrice);

  return books
    .filter(
      (b) =>
        (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) &&
        (!f.genre || b.genre === f.genre) &&
        (min === null || b.price >= min) &&
        (max === null || b.price <= max) &&
        (!f.inStock || b.stock > 0),
    )
    .sort(SORTERS[f.sort] ?? SORTERS.new);
}
