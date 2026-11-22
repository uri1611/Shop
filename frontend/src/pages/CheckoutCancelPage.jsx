import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api.js";

// Stripe nos manda acá si el usuario tocó "volver" sin pagar:
// /checkout/cancel?order_id=12
export default function CheckoutCancelPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;

    // Marcamos la orden como CANCELLED. El carrito no se toca.
    apiFetch("/checkout/cancel", { method: "POST", body: { orderId } }).catch(
      (err) => setError(err.message)
    );
  }, [orderId]);

  return (
    <>
      <h1>Pago cancelado</h1>
      <p>No se realizó ningún cobro. Tus productos siguen en el carrito.</p>
      {error && <p className="error">{error}</p>}
      <Link to="/cart">Volver al carrito</Link>
    </>
  );
}
