import { useState } from 'react';
import Field from './Field.jsx';
import { formatPrice } from '../utils/format.js';
import { digits, formatCardNumber, formatExpiry, validateCheckout } from '../utils/checkout.js';

const EMPTY = { cardNumber: '', cardHolder: '', expiry: '', cvv: '', city: '', street: '', apartment: '', postalCode: '' };

const FORMATTERS = {
  cardNumber: formatCardNumber,
  expiry: formatExpiry,
  cvv: (v) => digits(v).slice(0, 3),
  postalCode: (v) => digits(v).slice(0, 6),
};

/**
 * Форма оформления заказа. Реквизиты карты остаются только в этом компоненте:
 * наружу (в onSubmit) уходит лишь адрес доставки.
 */
export default function CheckoutForm({ total, onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const formatted = FORMATTERS[name] ? FORMATTERS[name](value) : value;
    setForm((prev) => ({ ...prev, [name]: formatted }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validateCheckout(form);
    setErrors(found);
    if (Object.keys(found).length) {
      setFormError('Исправьте отмеченные поля — заказ пока не оформлен.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await onSubmit({
        city: form.city.trim(),
        street: form.street.trim(),
        apartment: form.apartment.trim(),
        postalCode: form.postalCode.trim(),
      });
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <section className="checkout" aria-labelledby="checkout-title">
      <h2 id="checkout-title">Оформление заказа</h2>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <fieldset className="fieldset">
          <legend>Оплата картой</legend>
          <Field label="Номер карты" name="cardNumber" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000"
            value={form.cardNumber} onChange={handleChange} error={errors.cardNumber} required />
          <Field label="Имя владельца (как на карте)" name="cardHolder" autoComplete="cc-name" placeholder="IVAN PETROV"
            value={form.cardHolder} onChange={handleChange} error={errors.cardHolder} required />
          <div className="form__grid">
            <Field label="Срок действия" name="expiry" inputMode="numeric" autoComplete="cc-exp" placeholder="ММ/ГГ"
              value={form.expiry} onChange={handleChange} error={errors.expiry} required />
            <Field label="CVV" name="cvv" type="password" inputMode="numeric" autoComplete="cc-csc" placeholder="•••"
              value={form.cvv} onChange={handleChange} error={errors.cvv} required />
          </div>
          <p className="muted">Учебный проект: реальная оплата не выполняется, данные карты никуда не отправляются. Для проверки подойдёт номер 4242 4242 4242 4242.</p>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Адрес доставки</legend>
          <div className="form__grid">
            <Field label="Город" name="city" autoComplete="address-level2" value={form.city} onChange={handleChange} error={errors.city} required />
            <Field label="Почтовый индекс" name="postalCode" inputMode="numeric" autoComplete="postal-code" placeholder="6 цифр"
              value={form.postalCode} onChange={handleChange} error={errors.postalCode} required />
          </div>
          <div className="form__grid">
            <Field label="Улица и дом" name="street" autoComplete="address-line1" value={form.street} onChange={handleChange} error={errors.street} required />
            <Field label="Квартира (если есть)" name="apartment" autoComplete="address-line2" value={form.apartment} onChange={handleChange} error={errors.apartment} />
          </div>
        </fieldset>

        {formError && <p className="field-error" role="alert">{formError}</p>}
        <div className="form__actions">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Оформляем…' : `Подтвердить заказ на ${formatPrice(total)}`}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>Отмена</button>
        </div>
      </form>
    </section>
  );
}
