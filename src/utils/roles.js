export const ROLE_LABELS = { user: 'покупатель', author: 'автор', moderator: 'модератор', admin: 'администратор' };
export const ROLES = ['user', 'author', 'moderator', 'admin'];

/** Публиковать книги могут авторы и администратор. */
export const canPublish = (user) => Boolean(user && (user.role === 'author' || user.role === 'admin'));

/** Страница модерации и чистка отзывов: модератор и администратор. */
export const canModerate = (user) => Boolean(user && (user.role === 'moderator' || user.role === 'admin'));

/** Править книгу: админ — любую, автор — только свою. Модератор менять книги не может. */
export const canEditBook = (user, book) =>
  Boolean(user && (user.role === 'admin' || (user.role === 'author' && book.ownerId === user.id)));

/** Удалять книгу: те, кто может править, плюс модератор (любые). */
export const canDeleteBook = (user, book) => canEditBook(user, book) || Boolean(user && user.role === 'moderator');

/** Удалять отзыв: свой — любой пользователь, чужой — модератор и администратор. Настоящую проверку делает сервер. */
export const canDeleteReview = (user, review) => Boolean(user && (review.userId === user.id || canModerate(user)));

/** Блокировать и удалять аккаунты: админ — любые, кроме своего; модератор — только покупателей и авторов. Проверку дублирует сервер. */
export const canModerateUser = (actor, target) =>
  Boolean(
    actor && actor.id !== target.id &&
      (actor.role === 'admin' || (actor.role === 'moderator' && (target.role === 'user' || target.role === 'author'))),
  );
