import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Заблокированному доступны только вход, регистрация, страница блокировки и профиль.
const BLOCKED_OK = ['/login', '/register', '/blocked', '/profile'];

export default function Layout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, '') || '/';
  const mustSeeBlock = Boolean(user?.blocked) && !BLOCKED_OK.includes(path);

  return (
    <>
      <Navbar />
      {user?.warning && !user.blocked && (
        <div className="container">
          <div className="plate plate--warning warning-banner" role="status">
            <span aria-hidden="true">⚠️</span>
            <div>
              <strong>Предупреждение от модерации:</strong> {user.warning.reason}
            </div>
          </div>
        </div>
      )}
      <main className="container">{mustSeeBlock ? <Navigate to="/blocked" replace /> : <Outlet />}</main>
      <footer className="footer">
        <div className="container">AltBooks — учебный проект книжного магазина на React.</div>
      </footer>
    </>
  );
}
