// Convierte centavos (entero) a un texto de precio, ej: 8999 -> "US$ 89,99".
// Solo se usa para MOSTRAR: las cuentas siempre se hacen en centavos.
export function formatPrice(cents) {
  return (cents / 100).toLocaleString("es-UY", {
    style: "currency",
    currency: "USD",
  });
}
