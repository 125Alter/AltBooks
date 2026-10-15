import { useTheme } from '../context/ThemeContext.jsx';

const Sun = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" fill="currentColor" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const Moon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

/** Тумблер светлой/тёмной темы. Для скринридеров это переключатель «Тёмная тема» (вкл/выкл). */
export default function ThemeSwitch() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button type="button" role="switch" aria-checked={dark} aria-label="Тёмная тема" title={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      className="switch" onClick={toggle}>
      <span className="switch__thumb">{dark ? <Moon /> : <Sun />}</span>
    </button>
  );
}
