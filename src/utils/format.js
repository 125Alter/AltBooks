export const CURRENCY = '₸'; // валюта магазина — меняется в одном месте

const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
export const formatPrice = (n) => `${nf.format(n)} ${CURRENCY}`;

export const formatRating = (n) => n.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** a***@mail.com — почту не показываем целиком, пока человек сам не перейдёт к её смене. */
export function maskEmail(email = '') {
  const [local, domain] = email.split('@');
  if (!domain) return '••••••';
  return `${local[0]}${'*'.repeat(Math.min(Math.max(local.length - 1, 3), 8))}@${domain}`;
}

export const GENRES = [
  'Классика', 'Фантастика', 'Фэнтези', 'Детектив', 'Научпоп',
  'Программирование', 'Бизнес', 'Детская', 'Другое',
];
