import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api.js";

// Un solo formulario para crear y editar.
// - /admin/products/new  -> crear (no hay id)
// - /admin/products/5    -> editar el producto 5
export default function AdminProductFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(""); // en dólares, como lo escribe el admin
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState(null); // imagen actual
  const [imageFile, setImageFile] = useState(null); // imagen nueva elegida
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Si estamos editando, cargamos los datos actuales del producto.
  useEffect(() => {
    if (isNew) return;

    apiFetch(`/admin/products/${id}`)
      .then(({ product }) => {
        setName(product.name);
        setDescription(product.description);
        setPrice((product.priceCents / 100).toFixed(2));
        setIsActive(product.isActive);
        setImageUrl(product.imageUrl);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    // El admin escribe "89.99" (o "89,99"); el backend espera centavos: 8999.
    // Math.round evita errores de decimales (ej: 0.29 * 100 = 28.999...).
    const priceCents = Math.round(Number(price.replace(",", ".")) * 100);

    if (!(priceCents > 0)) {
      setError("Ingresá un precio válido mayor a 0");
      return;
    }

    // Chequeo rápido de la imagen ANTES de guardar, para no crear el producto
    // y que después falle la imagen. El backend igual lo vuelve a validar.
    if (imageFile && imageFile.size > 5 * 1024 * 1024) {
      setError("La imagen no puede pesar más de 5 MB");
      return;
    }

    setSaving(true);

    try {
      const body = { name, description, priceCents, isActive };

      // 1) Guardar los datos del producto.
      const { product } = isNew
        ? await apiFetch("/admin/products", { method: "POST", body })
        : await apiFetch(`/admin/products/${id}`, { method: "PATCH", body });

      // 2) Si se eligió una imagen, subirla. Va en un paso aparte porque
      //    es multipart/form-data y porque al crear necesitamos el id primero.
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        await apiFetch(`/admin/products/${product.id}/image`, {
          method: "POST",
          body: formData,
        });
      }

      navigate("/admin/products");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Cargando...</p>;
  }

  return (
    <>
      <Link to="/admin/products">← Volver a productos</Link>

      <form className="form" onSubmit={handleSubmit}>
        <h1>{isNew ? "Nuevo producto" : "Editar producto"}</h1>

        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label>
          Descripción
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
          />
        </label>

        <label>
          Precio (US$)
          <input
            type="text"
            inputMode="decimal"
            placeholder="89.99"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Activo (visible en el catálogo)
        </label>

        {imageUrl && <img className="thumb-large" src={imageUrl} alt={name} />}

        <label>
          {imageUrl ? "Reemplazar imagen" : "Imagen"} (JPG, PNG o WEBP, máx. 5 MB)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setImageFile(e.target.files[0] || null)}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </form>
    </>
  );
}
