import Stripe from "stripe";

// Cliente de Stripe configurado con la clave secreta de TEST (sk_test_...).
// La clave vive en .env y nunca llega al frontend.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_sin_configurar");

export default stripe;
