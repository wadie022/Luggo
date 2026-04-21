import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch, WEB_BASE } from "@/lib/api";
import { ArrowLeft, ArrowRight, CreditCard, Lock, AlertCircle } from "lucide-react-native";

type Shipment = {
  id: number;
  weight_kg: number;
  trip_detail: {
    origin_city: string;
    dest_city: string;
    price_per_kg: number;
    agency_name: string;
  };
  delivery_type: string;
  status: string;
};

type PaymentIntent = {
  client_secret: string;
  amount_cents: number;
  fee_cents: number;
  currency: string;
  payment_id: number;
  stripe_public_key: string;
};

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/shipments/${id}/`)
      .then((r) => r.json())
      .then(setShipment)
      .catch(() => setError("Colis introuvable."))
      .finally(() => setLoading(false));
  }, [id]);

  async function createIntent() {
    setCreating(true);
    setError(null);
    try {
      const res = await apiFetch("/payments/create-intent/", {
        method: "POST",
        body: JSON.stringify({ shipment_id: Number(id) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.detail || "Impossible de créer le paiement.");
        return;
      }
      setIntent(data);
    } catch {
      setError("Impossible de joindre le serveur.");
    } finally {
      setCreating(false);
    }
  }

  async function openPaymentPage() {
    const url = `${WEB_BASE}/payment/${id}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert(
        "Paiement en ligne",
        `Accédez à la page de paiement sur notre site web :\n\n${url}`,
        [{ text: "OK" }]
      );
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (!shipment) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-gray-400">Colis introuvable.</Text>
      </View>
    );
  }

  if (shipment.status !== "PENDING") {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="mb-3">
            <ArrowLeft color="#6b7280" size={22} />
          </TouchableOpacity>
          <Text className="text-xl font-black text-dark">Paiement</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <AlertCircle color="#d97706" size={48} />
          <Text className="text-dark font-bold text-lg text-center">Paiement non disponible</Text>
          <Text className="text-gray-400 text-sm text-center">
            Ce colis a déjà été traité (statut : {shipment.status}).
          </Text>
          <TouchableOpacity onPress={() => router.back()} className="bg-primary rounded-full px-6 py-3">
            <Text className="text-white font-bold">Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const base = intent ? (intent.amount_cents - intent.fee_cents) / 100 : shipment.weight_kg * shipment.trip_detail.price_per_kg;
  const fee = intent ? intent.fee_cents / 100 : base * 0.05;
  const delivery = shipment.delivery_type === "HOME_DELIVERY" ? 8 : 0;
  const total = intent ? intent.amount_cents / 100 : base + delivery + fee;

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mb-3">
          <ArrowLeft color="#6b7280" size={22} />
        </TouchableOpacity>
        <Text className="text-xl font-black text-dark">Paiement</Text>
        <Text className="text-gray-400 text-xs mt-0.5">Colis #{shipment.id}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>

        {/* Récapitulatif */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">Récapitulatif</Text>

          <View className="flex-row items-center gap-2 mb-3">
            <Text className="text-dark font-bold text-base">{shipment.trip_detail.origin_city}</Text>
            <ArrowRight color="#2563eb" size={14} />
            <Text className="text-dark font-bold text-base">{shipment.trip_detail.dest_city}</Text>
          </View>
          <Text className="text-gray-400 text-sm mb-4">{shipment.trip_detail.agency_name} · {shipment.weight_kg} kg</Text>

          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-500 text-sm">Transport ({shipment.weight_kg} kg × {shipment.trip_detail.price_per_kg} €)</Text>
              <Text className="text-dark font-semibold text-sm">{base.toFixed(2)} €</Text>
            </View>
            {delivery > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-gray-500 text-sm">Livraison à domicile</Text>
                <Text className="text-dark font-semibold text-sm">{delivery.toFixed(2)} €</Text>
              </View>
            )}
            <View className="flex-row justify-between">
              <Text className="text-gray-500 text-sm">Frais de service (5%)</Text>
              <Text className="text-dark font-semibold text-sm">{fee.toFixed(2)} €</Text>
            </View>
            <View className="border-t border-gray-100 pt-2 mt-1 flex-row justify-between">
              <Text className="text-dark font-bold text-base">Total</Text>
              <Text className="text-primary font-black text-xl">{total.toFixed(2)} €</Text>
            </View>
          </View>
        </View>

        {/* Erreur */}
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 flex-row gap-2">
            <AlertCircle color="#dc2626" size={16} />
            <Text className="text-red-600 text-sm flex-1">{error}</Text>
          </View>
        )}

        {/* Paiement sécurisé */}
        <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4 gap-3">
          <View className="flex-row items-center gap-2">
            <Lock color="#2563eb" size={16} />
            <Text className="text-primary font-bold text-sm">Paiement sécurisé par Stripe</Text>
          </View>
          <Text className="text-gray-500 text-sm leading-5">
            Votre paiement est traité de façon sécurisée. Vos données bancaires ne sont jamais stockées sur nos serveurs.
          </Text>
        </View>

        {/* Boutons */}
        {!intent ? (
          <TouchableOpacity
            onPress={createIntent}
            disabled={creating}
            className="bg-primary rounded-full py-4 items-center flex-row justify-center gap-2"
            style={{ opacity: creating ? 0.7 : 1 }}
          >
            {creating
              ? <ActivityIndicator color="white" />
              : <>
                  <CreditCard color="white" size={18} />
                  <Text className="text-white font-bold text-base">Procéder au paiement</Text>
                </>
            }
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={openPaymentPage}
            className="bg-primary rounded-full py-4 items-center flex-row justify-center gap-2"
          >
            <CreditCard color="white" size={18} />
            <Text className="text-white font-bold text-base">Payer {total.toFixed(2)} € →</Text>
          </TouchableOpacity>
        )}

        <Text className="text-center text-gray-300 text-xs">
          En confirmant, vous acceptez les conditions d'utilisation de Luggo.
        </Text>
      </ScrollView>
    </View>
  );
}
