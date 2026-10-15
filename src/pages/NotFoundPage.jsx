import { EmptyState } from '../components/Status.jsx';

export default function NotFoundPage() {
  return (
    <EmptyState title="404 — страница не найдена" actionTo="/books" actionLabel="Перейти в каталог">
      Проверьте адрес или начните с каталога.
    </EmptyState>
  );
}
