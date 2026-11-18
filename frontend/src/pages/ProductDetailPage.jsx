import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api.js";
import { formatPrice } from "../format.js";
import { ProductImage } from "./CatalogPage.jsx";

export default function ProductDetailPage() {
  const { id } = useParams(); // el :id de la URL /products/:id
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/products/${id}`)
      .then((data) => setProduct(data.product))
      .catch((err) => setError(err.message));
  }, [id]);

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
        </div>
      </div>
    </>
  );
}
