/** Поле формы: label связан с input, ошибка озвучивается через aria-describedby. */
export default function Field({ label, name, error, as: Tag = 'input', children, ...props }) {
  const id = `field-${name}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Tag id={id} name={name} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props}>
        {children}
      </Tag>
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}
