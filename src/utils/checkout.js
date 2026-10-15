export const digits = (s) => s.replace(/\D/g, '');
export const formatCardNumber = (s) => digits(s).slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
export const formatExpiry = (s) => {
  const d = digits(s).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

/** Алгоритм Луна: отсеивает номера карт с опечатками. */
function luhn(num) {
  let sum = 0;
  let double = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = Number(num[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

export function validateCheckout(f) {
  const e = {};

  const num = digits(f.cardNumber);
  if (num.length !== 16) e.cardNumber = 'Номер карты — 16 цифр';
  else if (!luhn(num)) e.cardNumber = 'Проверьте номер карты: он не прошёл контрольную проверку';

  if (!/^\p{L}[\p{L}\s.'-]{1,39}$/u.test(f.cardHolder.trim())) e.cardHolder = 'Имя как на карте, только буквы';

  const m = /^(\d{2})\/(\d{2})$/.exec(f.expiry);
  if (!m) e.expiry = 'Формат ММ/ГГ';
  else {
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    if (month < 1 || month > 12) e.expiry = 'Месяц — от 01 до 12';
    else if (new Date(year, month, 1) <= new Date()) e.expiry = 'Срок действия карты истёк'; // карта действует до конца месяца
  }

  if (!/^\d{3}$/.test(f.cvv)) e.cvv = 'CVV — 3 цифры';

  if (f.city.trim().length < 2) e.city = 'Укажите город';
  if (f.street.trim().length < 3) e.street = 'Укажите улицу и дом';
  if (f.apartment.trim().length > 20) e.apartment = 'Не длиннее 20 символов';
  if (!/^\d{6}$/.test(f.postalCode.trim())) e.postalCode = 'Индекс — 6 цифр';
  return e;
}
