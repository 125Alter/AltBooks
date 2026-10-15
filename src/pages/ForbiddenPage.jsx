import { EmptyState } from '../components/Status.jsx';

export default function ForbiddenPage() {
  return (
    <EmptyState title="403 — доступ запрещён" actionTo="/" actionLabel="На главную">
      У вашего аккаунта нет прав для просмотра этой страницы.
    </EmptyState>
  );
}
