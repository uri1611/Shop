// Función única para hablar con el backend.
// - Agrega el token (si hay) en el header Authorization.
// - Si el backend responde con error, lanza un Error con su mensaje.
export async function apiFetch(path, { method = "GET", body } = {}) {
  const headers = {};
  const token = localStorage.getItem("token");

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Ocurrió un error inesperado");
  }

  return data;
}
