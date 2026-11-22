import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

// Envuelve una pantalla que requiere sesión.
// - Sin sesión: manda al login.
// - Con adminOnly y el usuario no es ADMIN: lo manda al catálogo.
// OJO: esto es solo para la experiencia de usuario. La seguridad real
// está en el backend, que rechaza la request aunque alguien saltee esto.
export default function ProtectedRoute({ adminOnly = false, children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return children;
}
