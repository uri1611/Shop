import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api.js";
import { formatPrice } from "../format.js";

// Tabla con TODOS los productos (activos e inactivos).
export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/admin/products")
      .then((data) => setProducts(data.products))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-title">
        <h1>Productos (admin)</h1>
        <Link to="/admin/products/new" className="button">
          + Nuevo producto
        </Link>
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <table className="table">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  {product.imageUrl ? (
                    <img className="thumb" src={product.imageUrl} alt={product.name} />
                  ) : (
                    "—"
                  )}
                </td>
                <td>{product.name}</td>
                <td>{formatPrice(product.priceCents)}</td>
                <td>{product.isActive ? "Activo" : "Inactivo"}</td>
                <td>
                  <Link to={`/admin/products/${product.id}`}>Editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
