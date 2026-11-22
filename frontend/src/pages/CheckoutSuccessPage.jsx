import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api.js";

// Stripe nos manda acá después de pagar: /checkout/success?session_id=cs_test_...
// No asumimos que se pagó: le pedimos al backend que lo verifique con Stripe.
export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("Falta el id de la sesión de pago");
      return;
    }

    // En desarrollo React ejecuta este efecto dos veces (StrictMode).
    // No pasa nada: el endpoint confirm es idempotente.
    apiFetch("/checkout/confirm", { method: "POST", body: { sessionId } })
      .then(setResult)
      .catch((err) => setError(err.message));
  }, [sessionId]);

  if (error) {
    return (
      <>
        <h1>No pudimos confirmar el pago</h1>
        <p className="error">{error}</p>
        <Link to="/orders">Ver mis órdenes</Link>
      </>
    );
  }

  if (!result) {
    return <p>Confirmando tu pago...</p>;
  }

  if (result.status !== "PAID") {
    return (
      <>
        <h1>Pago no confirmado</h1>
        <p>Stripe todavía no confirmó el pago de esta orden.</p>
        <Link to={`/orders/${result.orderId}`}>Ver la orden</Link>
      </>
    );
  }

  return (
    <>
      <h1>¡Gracias por tu compra!</h1>
      <p>El pago se confirmó y tu orden #{result.orderId} quedó registrada.</p>
      <Link to={`/orders/${result.orderId}`}>Ver el detalle de la orden</Link>
    </>
  );
}
