import { NavLink } from 'react-router-dom';

export default function AdminTabs() {
  return (
    <nav className="tabs" aria-label="Разделы администрирования">
      <NavLink to="/admin" end>Книги</NavLink>
      <NavLink to="/admin/users">Пользователи и роли</NavLink>
    </nav>
  );
}
