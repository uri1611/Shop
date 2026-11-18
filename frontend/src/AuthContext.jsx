import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "./api.js";

// Guarda quién está logueado y lo comparte con todas las pantallas.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al abrir la app: si hay un token guardado, le preguntamos
  // al backend de quién es. Si ya no sirve, lo borramos.
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setLoading(false);
      return;
    }

    apiFetch("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  function saveSession(data) {
    localStorage.setItem("token", data.token);
    setUser(data.user);
  }

  async function login(email, password) {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    saveSession(data);
  }

  async function register(email, password) {
    const data = await apiFetch("/auth/register", {
      method: "POST",
      body: { email, password },
    });
    saveSession(data);
  }

  // Logout = olvidar el token en el navegador.
  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
