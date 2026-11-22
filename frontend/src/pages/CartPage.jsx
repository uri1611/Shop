import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api.js";
import { formatPrice } from "../format.js";
import { ProductImage } from "./CatalogPage.jsx";

// El frontend NO calcula precios ni totales: los muestra tal cual
// vienen del backend. Cada acción (cambiar cantidad, eliminar) le
// pide al backend que la haga y este devuelve el carrito actualizado.
export default function CartPage() {
  const [cart, setCart] = useState(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    apiFetch("/cart")
      .then(setCart)
      .catch((err) => setError(err.message));
  }, []);

  // Ejecuta una acción sobre el carrito y guarda la respuesta del backend.
  async function updateCart(request) {
    setError("");
    try {
      setCart(await request);
    } catch (err) {
      setError(err.message);
    }
  }

  function changeQuantity(productId, quantity) {
    updateCart(
      apiFetch(`/cart/items/${productId}`, { method: "PATCH", body: { quantity } })
    );
  }

  function removeItem(productId) {
    updateCart(apiFetch(`/cart/items/${productId}`, { method: "DELETE" }));
  }

  // Le pide al backend que arme el pago y nos manda a la página de Stripe.
  async function goToCheckout() {
    setError("");
    setPaying(true);
    try {
      const { url } = await apiFetch("/checkout", { method: "POST" });
      window.location.href = url; // salimos de nuestra app hacia Stripe
    } catch (err) {
      setError(err.message);
      setPaying(false);
    }
  }

  if (!cart) {
    return error ? <p className="error">{error}</p> : <p>Cargando carrito...</p>;
  }

  if (cart.items.length === 0) {
    return (
      <>
        <h1>Tu carrito</h1>
        <p>Tu carrito está vacío.</p>
        <Link to="/">Ver productos</Link>
      </>
    );
  }

  return (
    <>
      <h1>Tu carrito</h1>

      {error && <p className="error">{error}</p>}

      <div className="cart-list">
        {cart.items.map((item) => (
          <div key={item.productId} className="cart-item">
            <div className="cart-image">
              <ProductImage product={item} />
            </div>

            <div className="cart-info">
              <Link to={`/products/${item.productId}`}>{item.name}</Link>
              <span>{formatPrice(item.unitPriceCents)} c/u</span>
              {!item.available && (
                <span className="error">No disponible: quitalo del carrito</span>
              )}
            </div>

            <div className="quantity">
              <button
                onClick={() => changeQuantity(item.productId, item.quantity - 1)}
                disabled={!item.available || item.quantity <= 1}
              >
                −
              </button>
              <span>{item.quantity}</span>
              <button
                onClick={() => changeQuantity(item.productId, item.quantity + 1)}
                disabled={!item.available}
              >
                +
              </button>
            </div>

            <strong>{formatPrice(item.subtotalCents)}</strong>

            <button onClick={() => removeItem(item.productId)}>Eliminar</button>
          </div>
        ))}
      </div>

      <h2 className="cart-total">Total: {formatPrice(cart.totalCents)}</h2>

      <div className="cart-actions">
        <button
          onClick={goToCheckout}
          disabled={paying || cart.items.some((item) => !item.available)}
        >
          {paying ? "Redirigiendo a Stripe..." : "Ir a pagar"}
        </button>
      </div>
    </>
  );
}
