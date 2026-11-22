// Función única para hablar con el backend.
// - Agrega el token (si hay) en el header Authorization.
// - Si el body es un FormData (subida de archivos), lo manda tal cual.
//   Si es un objeto común, lo manda como JSON.
// - Si el backend responde con error, lanza un Error con su mensaje.
export async function apiFetch(path, { method = "GET", body } = {}) {
  const headers = {};
  const token = localStorage.getItem("token");

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const isFormData = body instanceof FormData;

  // Con FormData NO ponemos Content-Type: el navegador lo arma solo
  // (incluye el "boundary" que separa las partes del archivo).
  if (body && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Ocurrió un error inesperado");
  }

  return data;
}
