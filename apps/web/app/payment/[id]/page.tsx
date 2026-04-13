"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { API_BASE, authHeader, fetchMe } from "@/lib/api";
import { ArrowLeft, Package, Shield, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

type PaymentData = {
  client_secret: string;
  amount_cents: number;
  fee_cents: number;
  currency: string;
  payment_id: number;
  stripe_public_key: string;
};

// ── CheckoutForm ─────────────────────────────────────────────────────────────
function CheckoutForm({ shipmentId, amount_cents, fee_cents }: { shipmentId: string; amount_cents: number; fee_cents: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = amount_cents / 100;
  const fee = fee_cents / 100;
  const base = total - fee;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/${shipmentId}/success`,
      },
    });

    if (stripeError) {
      setError(stripeError.message || "Une erreur est survenue.");
      setProcessing(false);
    }
    // On success, Stripe redirects to return_url automatically
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Price breakdown */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Transport du colis</span>
          <span>{base.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Frais de service Luggo (5%)</span>
          <span>{fee.toFixed(2)} €</span>
        </div>
        <div className="border-t border-gray-200 pt-3 flex justify-between font-semibold text-gray-900">
          <span>Total</span>
          <span style={{ color: "#2563eb" }}>{total.toFixed(2)} €</span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <PaymentElement />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-4 rounded-full text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ backgroundColor: "#2563eb" }}
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Traitement en cours...
          </>
        ) : (
          <>
            <Shield className="w-5 h-5" />
            Payer {total.toFixed(2)} € en toute sécurité
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        Paiement sécurisé par Stripe. Vos données ne sont jamais stockées sur nos serveurs.
      </p>
    </form>
  );
}

// ── Main Payment Page ─────────────────────────────────────────────────────────
function PaymentContent() {
  const params = useParams();
  const router = useRouter();
  const shipmentId = params.id as string;

  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shipmentInfo, setShipmentInfo] = useState<{ route: string; weight: number } | null>(null);

  useEffect(() => {
    async function init() {
      const me = await fetchMe();
      if (!me) { router.replace("/login"); return; }
      if (me.role !== "CLIENT") { router.replace("/"); return; }

      // Get shipment info
      try {
        const res = await fetch(`${API_BASE}/shipments/${shipmentId}/`, { headers: authHeader() });
        if (res.ok) {
          const s = await res.json();
          const t = s.trip_detail;
          setShipmentInfo({
            route: `${t.origin_city} (${t.origin_country}) → ${t.dest_city} (${t.dest_country})`,
            weight: s.weight_kg,
          });
        }
      } catch {}

      // Create PaymentIntent
      try {
        const res = await fetch(`${API_BASE}/payments/create-intent/`, {
          method: "POST",
          headers: { ...authHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({ shipment_id: Number(shipmentId) }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.detail || "Impossible de créer le paiement.");
          setLoading(false);
          return;
        }
        setPaymentData(data);
        if (data.stripe_public_key) {
          setStripePromise(loadStripe(data.stripe_public_key));
        }
      } catch (err) {
        console.error("Payment init error:", err);
        setErrorMsg("Impossible de joindre le serveur. Vérifiez votre connexion.");
      }
      setLoading(false);
    }
    init();
  }, [shipmentId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center gap-4 px-4">
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Paiement indisponible</h2>
          <p className="text-gray-500 mb-6">{errorMsg}</p>
          <Link href="/mes-colis" className="text-[#2563eb] font-medium hover:underline">
            ← Retour à mes colis
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/mes-colis" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="font-semibold text-gray-900">Paiement sécurisé</span>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header card */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#eff6ff" }}>
              <Package className="w-6 h-6" style={{ color: "#2563eb" }} />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg">Colis #{shipmentId}</h1>
              {shipmentInfo && (
                <p className="text-sm text-gray-500">
                  {shipmentInfo.route} · {shipmentInfo.weight} kg
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Checkout */}
        {paymentData && stripePromise ? (
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 mb-6">Informations de paiement</h2>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: paymentData.client_secret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#2563eb",
                    borderRadius: "12px",
                    fontFamily: "Inter, system-ui, sans-serif",
                  },
                },
              }}
            >
              <CheckoutForm
                shipmentId={shipmentId}
                amount_cents={paymentData.amount_cents}
                fee_cents={paymentData.fee_cents}
              />
            </Elements>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 text-center text-gray-500">
            Stripe non configuré. Contactez l'administrateur.
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" />
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
