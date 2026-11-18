import { Link, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";

export default function App() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <p className="container">Cargando...</p>;
  }

  return (
    <>
      <header className="header">
        <Link to="/">Shop</Link>

        <nav>
          {user ? (
            <>
              <span>
                {user.email} ({user.role})
              </span>
              <button onClick={logout}>Cerrar sesión</button>
            </>
          ) : (
            <>
              <Link to="/login">Iniciar sesión</Link>
              <Link to="/register">Registrarse</Link>
            </>
          )}
        </nav>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </main>
    </>
  );
}
