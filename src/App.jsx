import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import BookDetailsPage from './pages/BookDetailsPage.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import CartPage from './pages/CartPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import BookCreatePage from './pages/BookCreatePage.jsx';
import BookEditPage from './pages/BookEditPage.jsx';
import BlockedPage from './pages/BlockedPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ModerationPage from './pages/ModerationPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ForbiddenPage from './pages/ForbiddenPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* публичные */}
        <Route index element={<HomePage />} />
        <Route path="books" element={<CatalogPage />} />
        <Route path="books/:id" element={<BookDetailsPage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="blocked" element={<BlockedPage />} />

        {/* любой вошедший пользователь */}
        <Route element={<ProtectedRoute />}>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="orders" element={<OrdersPage />} />
        </Route>

        {/* авторы и администратор: публикация и управление книгами */}
        <Route element={<ProtectedRoute roles={['author', 'admin']} />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="books/new" element={<BookCreatePage />} />
          <Route path="books/:id/edit" element={<BookEditPage />} />
        </Route>

        {/* модератор и администратор */}
        <Route element={<ProtectedRoute roles={['moderator', 'admin']} />}>
          <Route path="moderation" element={<ModerationPage />} />
        </Route>

        {/* только для администратора */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="admin" element={<AdminPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
        </Route>

        <Route path="403" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
