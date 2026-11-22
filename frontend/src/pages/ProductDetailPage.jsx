import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { formatPrice } from "../format.js";
import { ProductImage } from "./CatalogPage.jsx";

export default function ProductDetailPage() {
  const { id } = useParams(); // el :id de la URL /products/:id
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");

  useEffect(() => {
    apiFetch(`/products/${id}`)
      .then((data) => setProduct(data.product))
      .catch((err) => setError(err.message));
  }, [id]);

  async function addToCart() {
    setCartMessage("");
    setCartError("");

    try {
      // Solo mandamos productId y quantity. El precio lo pone el backend.
      await apiFetch("/cart/items", {
        method: "POST",
        body: { productId: product.id, quantity },
      });
      setCartMessage("Producto agregado al carrito");
    } catch (err) {
      setCartError(err.message);
    }
  }

  if (error) {
    return (
      <>
        <p className="error">{error}</p>
        <Link to="/">Volver al catálogo</Link>
      </>
    );
  }

  if (!product) {
    return <p>Cargando...</p>;
  }

  return (
    <>
      <Link to="/">← Volver al catálogo</Link>

      <div className="detail">
        <ProductImage product={product} />

        <div>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <h2>{formatPrice(product.priceCents)}</h2>

          {user ? (
            <div className="add-to-cart">
              <input
                type="number"
                min={1}
                max={99}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
              <button onClick={addToCart}>Agregar al carrito</button>
            </div>
          ) : (
            <p>
              <Link to="/login">Iniciá sesión</Link> para comprar.
            </p>
          )}

          {cartMessage && (
            <p>
              {cartMessage}. <Link to="/cart">Ver carrito</Link>
            </p>
          )}
          {cartError && <p className="error">{cartError}</p>}
        </div>
      </div>
    </>
  );
}
