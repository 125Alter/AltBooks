// Внешний публичный API: Open Library Search (GET, без ключа).
// Документация: https://openlibrary.org/dev/docs/api/search
const BASE = 'https://openlibrary.org/search.json';

const isbn13 = (list = []) => list.find((i) => /^97[89]\d{10}$/.test(i));

export async function searchBooks(query, signal) {
  const params = new URLSearchParams({
    q: query,
    limit: '24',
    // Просим только нужные поля — ответ легче и быстрее.
    fields: 'key,title,author_name,first_publish_year,cover_i,subject,isbn',
  });
  const res = await fetch(`${BASE}?${params}`, { signal });
  if (!res.ok) throw new Error(`Open Library вернул статус ${res.status}`);
  const data = await res.json();

  return {
    total: data.numFound ?? 0,
    items: (data.docs ?? []).map((d) => ({
      id: d.key,
      title: d.title,
      authors: d.author_name?.slice(0, 3) ?? [],
      year: d.first_publish_year ?? null,
      // Несколько источников обложки: если первый недоступен, BookCover попробует следующий.
      covers: [
        isbn13(d.isbn) && `https://books.google.com/books/content?vid=ISBN${isbn13(d.isbn)}&printsec=frontcover&img=1&zoom=1`,
        d.cover_i && `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg?default=false`,
      ].filter(Boolean),
      subjects: d.subject?.slice(0, 3) ?? [],
    })),
  };
}
