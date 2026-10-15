import { useLocation, useNavigate } from 'react-router-dom';
import BookForm from '../components/BookForm.jsx';
import { booksApi } from '../services/api.js';

export default function BookCreatePage() {
  const navigate = useNavigate();
  const prefill = useLocation().state?.prefill; // данные, пришедшие со страницы Open Library

  return (
    <div className="auth auth--wide">
      <h1>Новая книга</h1>
      {prefill && <p className="notice">Поля заполнены из Open Library — укажите жанр, цену и остаток.</p>}
      <BookForm
        initial={prefill}
        submitLabel="Добавить книгу"
        onSubmit={async (values) => {
          await booksApi.create(values);
          navigate('/dashboard');
        }}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
