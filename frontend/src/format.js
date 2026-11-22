// Convierte centavos (entero) a un texto de precio, ej: 8999 -> "US$ 89,99".
// Solo se usa para MOSTRAR: las cuentas siempre se hacen en centavos.
export function formatPrice(cents) {
  return (cents / 100).toLocaleString("es-UY", {
    style: "currency",
    currency: "USD",
  });
}

// Texto en español para cada estado de una orden.
const ORDER_STATUS_LABELS = {
  PENDING: "Pendiente de pago",
  PAID: "Pagada",
  FAILED: "Falló el pago",
  CANCELLED: "Cancelada",
};

export function formatOrderStatus(status) {
  return ORDER_STATUS_LABELS[status] || status;
}

// Fecha legible, ej: "22/11/2026, 18:30".
export function formatDate(isoString) {
  return new Date(isoString).toLocaleString("es-UY", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
