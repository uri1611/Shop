import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api.js";
import { formatDate, formatOrderStatus, formatPrice } from "../format.js";

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/orders/${id}`)
      .then((data) => setOrder(data.order))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <>
        <p className="error">{error}</p>
        <Link to="/orders">Volver a mis órdenes</Link>
      </>
    );
  }

  if (!order) {
    return <p>Cargando...</p>;
  }

  return (
    <>
      <Link to="/orders">← Volver a mis órdenes</Link>

      <h1>Orden #{order.id}</h1>
      <p>
        {formatDate(order.createdAt)} ·{" "}
        <span className={`status status-${order.status.toLowerCase()}`}>
          {formatOrderStatus(order.status)}
        </span>
      </p>

      {/* Nombre y precio son los del momento de la compra */}
      <table className="table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Precio unitario</th>
            <th>Cantidad</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.productId}>
              <td>{item.productName}</td>
              <td>{formatPrice(item.unitPriceCents)}</td>
              <td>{item.quantity}</td>
              <td>{formatPrice(item.subtotalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="cart-total">Total: {formatPrice(order.totalCents)}</h2>
    </>
  );
}
