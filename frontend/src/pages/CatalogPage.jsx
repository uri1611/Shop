import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api.js";
import { formatPrice } from "../format.js";

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [searchInput, setSearchInput] = useState(""); // lo que se está escribiendo
  const [search, setSearch] = useState(""); // lo que se buscó al apretar "Buscar"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Se ejecuta al abrir la página y cada vez que cambia "search".
  useEffect(() => {
    setLoading(true);
    setError("");

    // encodeURIComponent protege la URL si el texto tiene espacios, &, etc.
    apiFetch(`/products?search=${encodeURIComponent(search)}`)
      .then((data) => setProducts(data.products))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search]);

  function handleSearch(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <>
      <h1>Catálogo</h1>

      <form className="search" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      {loading && <p>Cargando productos...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p>No se encontraron productos.</p>
      )}

      <div className="product-grid">
        {products.map((product) => (
          <Link key={product.id} to={`/products/${product.id}`} className="card">
            <ProductImage product={product} />
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <strong>{formatPrice(product.priceCents)}</strong>
          </Link>
        ))}
      </div>
    </>
  );
}

// Muestra la imagen del producto, o un recuadro gris si no tiene.
export function ProductImage({ product }) {
  if (!product.imageUrl) {
    return <div className="product-image placeholder">Sin imagen</div>;
  }

  return <img className="product-image" src={product.imageUrl} alt={product.name} />;
}
