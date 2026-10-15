import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import ThemeSwitch from './ThemeSwitch.jsx';
import { canModerate, canPublish } from '../utils/roles.js';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Переход по ссылке должен закрывать открытое мобильное меню.
  useEffect(() => setOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="brand">Alt<span className="brand__accent">Books</span></Link>

        <button
          type="button"
          className="navbar__burger"
          aria-expanded={open}
          aria-controls="navbar-menu"
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '✕' : '☰'}
        </button>

        {/* .navbar__menu управляет анимацией раскрытия (grid-rows), .navbar__menu-inner — появлением содержимого */}
        <div id="navbar-menu" className={`navbar__menu${open ? ' is-open' : ''}`}>
          <div className="navbar__menu-inner">
            <nav className="navbar__links" aria-label="Основная навигация">
              {user?.blocked ? (
                <NavLink to="/profile">Профиль</NavLink>
              ) : (
                <>
              <NavLink to="/" end>Главная</NavLink>
              <NavLink to="/books" end>Каталог</NavLink>
              <NavLink to="/explore">Open Library</NavLink>
              {user && <NavLink to="/cart">Корзина{count > 0 && <span className="badge badge--count" aria-label={`, товаров: ${count}`}>{count}</span>}</NavLink>}
              {user && <NavLink to="/orders">Мои заказы</NavLink>}
              {canPublish(user) && <NavLink to="/dashboard">Мои книги</NavLink>}
              {canModerate(user) && <NavLink to="/moderation">Модерация</NavLink>}
              {user?.role === 'admin' && <NavLink to="/admin">Админ</NavLink>}
                </>
              )}
            </nav>
            <div className="navbar__auth">
              <ThemeSwitch />
              {loading ? null : user ? (
                <>
                  <Link to="/profile" className="navbar__user" title="Профиль">{user.name}</Link>
                {user.blocked && <span className="badge badge--off">заблокирован</span>}
                  <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>Выйти</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn--ghost btn--sm">Войти</Link>
                  <Link to="/register" className="btn btn--primary btn--sm">Регистрация</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
