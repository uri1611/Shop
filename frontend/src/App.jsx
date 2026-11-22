import { Link, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import CatalogPage from "./pages/CatalogPage.jsx";
import ProductDetailPage from "./pages/ProductDetailPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import AdminProductsPage from "./pages/AdminProductsPage.jsx";
import AdminProductFormPage from "./pages/AdminProductFormPage.jsx";

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
              {/* El link solo se muestra a ADMIN, pero la protección real está en el backend */}
              {user.role === "ADMIN" && <Link to="/admin/products">Admin</Link>}
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
          <Route path="/" element={<CatalogPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/admin/products"
            element={
              <ProtectedRoute adminOnly>
                <AdminProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products/new"
            element={
              <ProtectedRoute adminOnly>
                <AdminProductFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products/:id"
            element={
              <ProtectedRoute adminOnly>
                <AdminProductFormPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </>
  );
}
