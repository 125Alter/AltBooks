import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loader } from './Status.jsx';

/**
 * Защищённый маршрут-обёртка.
 * 1) пока сессия восстанавливается — показываем загрузку (иначе гость «мигнёт» на /login);
 * 2) гость → /login, запоминая исходный адрес в location.state.from;
 * 3) если указан список допустимых ролей, а у пользователя другая → /403.
 */
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader text="Проверяем сессию…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/403" replace />;
  return <Outlet />;
}
