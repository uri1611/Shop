import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api.js";
import { formatDate, formatOrderStatus, formatPrice } from "../format.js";

// Lista de órdenes del usuario logueado (el backend solo devuelve las suyas).
export default function OrdersPage() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/orders")
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!orders) {
    return <p>Cargando órdenes...</p>;
  }

  return (
    <>
      <h1>Mis órdenes</h1>

      {orders.length === 0 ? (
        <p>
          Todavía no hiciste ninguna compra. <Link to="/">Ver productos</Link>
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Fecha</th>
              <th>Productos</th>
              <th>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link to={`/orders/${order.id}`}>#{order.id}</Link>
                </td>
                <td>{formatDate(order.createdAt)}</td>
                <td>{order.itemCount}</td>
                <td>{formatPrice(order.totalCents)}</td>
                <td>
                  <span className={`status status-${order.status.toLowerCase()}`}>
                    {formatOrderStatus(order.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
