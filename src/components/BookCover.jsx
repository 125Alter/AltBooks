import { useState } from 'react';

/**
 * Обложка с цепочкой запасных источников: `sources` (массив) или одиночный `src`.
 * Если картинка не загрузилась (или пришла «пустышка» 1×1), пробуем следующий источник,
 * а когда источники кончились — показываем букву на цветном фоне.
 */
export default function BookCover({ src, sources, title }) {
  const list = (sources ?? [src]).filter(Boolean);
  const key = list.join('|');
  const [state, setState] = useState({ key, index: 0 });
  const index = state.key === key ? state.index : 0; // при смене списка начинаем сначала
  const next = () => setState({ key, index: index + 1 });

  if (index >= list.length) {
    return (
      <div className="cover cover--placeholder" role="img" aria-label={`Обложка книги «${title}» отсутствует`}>
        <span>{title?.[0]?.toUpperCase() ?? '?'}</span>
      </div>
    );
  }
  return (
    <img
      key={list[index]}
      className="cover"
      src={list[index]}
      alt={`Обложка книги «${title}»`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={next}
      onLoad={(e) => e.currentTarget.naturalWidth < 60 && next()}
    />
  );
}
