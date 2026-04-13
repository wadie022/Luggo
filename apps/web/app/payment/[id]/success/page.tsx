"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

function PaymentSuccessContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const shipmentId = params.id as string;
  const [status, setStatus] = useState<"loading" | "success" | "processing" | "failed">("loading");

  useEffect(() => {
    const paymentIntent = searchParams.get("payment_intent");
    const redirectStatus = searchParams.get("redirect_status");

    if (redirectStatus === "succeeded") {
      setStatus("success");
    } else if (redirectStatus === "processing") {
      setStatus("processing");
    } else {
      setStatus("failed");
    }
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#2563eb" }} />
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✗</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement échoué</h1>
          <p className="text-gray-500 mb-6">Le paiement n'a pas pu être traité. Veuillez réessayer.</p>
          <Link
            href={`/payment/${shipmentId}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold"
            style={{ backgroundColor: "#2563eb" }}
          >
            Réessayer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#eff6ff" }}>
          <CheckCircle2 className="w-8 h-8" style={{ color: "#2563eb" }} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {status === "processing" ? "Paiement en cours..." : "Paiement confirmé !"}
        </h1>
        <p className="text-gray-500 mb-8">
          {status === "processing"
            ? "Votre paiement est en cours de traitement. Vous serez notifié dès sa confirmation."
            : `Votre colis #${shipmentId} est maintenant pris en charge. Vous pouvez suivre son état dans votre espace.`}
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={`/mes-colis/${shipmentId}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-white font-semibold"
            style={{ backgroundColor: "#2563eb" }}
          >
            Suivre mon colis
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/mes-colis"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
          >
            Tous mes colis
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#2563eb" }} />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
