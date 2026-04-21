import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, ArrowRight, Check } from "lucide-react-native";

const TRACKING_STEPS = [
  { key: "PENDING",    label: "En attente",         desc: "Demande envoyée, en attente de confirmation" },
  { key: "ACCEPTED",   label: "Accepté",             desc: "L'agence a accepté votre colis" },
  { key: "DEPOSITED",  label: "Déposé au bureau",    desc: "Colis déposé en agence" },
  { key: "IN_TRANSIT", label: "En transit",           desc: "Votre colis est en route" },
  { key: "ARRIVED",    label: "Arrivé à destination", desc: "Colis arrivé, en attente de livraison" },
  { key: "DELIVERED",  label: "Livré",               desc: "Colis remis au destinataire" },
];
const STATUS_ORDER = TRACKING_STEPS.map((s) => s.key);

type Shipment = {
  id: number;
  trip_detail: {
    origin_city: string; dest_city: string;
    origin_country: string; dest_country: string;
    departure_at: string; price_per_kg: number; agency_name: string;
    arrival_eta?: string;
  };
  weight_kg: number;
  description: string;
  delivery_type: string;
  delivery_address: string;
  customer_phone: string;
  status: string;
  created_at: string;
};

export default function ColisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    apiFetch(`/shipments/${id}/`)
      .then((r) => r.json())
      .then(setShipment)
      .finally(() => setLoading(false));
  }, [id]);

  async function confirmDeposit() {
    setConfirming(true);
    try {
      const res = await apiFetch(`/shipments/${id}/tracking/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "DEPOSITED" }),
      });
      if (res.ok) {
        setShipment((prev) => prev ? { ...prev, status: "DEPOSITED" } : prev);
        Alert.alert("Confirmé !", "Votre dépôt a été confirmé.");
      }
    } catch {
      Alert.alert("Erreur", "Impossible de confirmer.");
    } finally {
      setConfirming(false);
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
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-400">Colis introuvable.</Text>
      </View>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(shipment.status);
  const isRejected = shipment.status === "REJECTED";
  const total = (shipment.weight_kg * shipment.trip_detail.price_per_kg).toFixed(2);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mb-3">
          <ArrowLeft color="#6b7280" size={22} />
        </TouchableOpacity>
        <Text className="text-xl font-black text-dark">Colis #{shipment.id}</Text>
        <View className="flex-row items-center gap-1 mt-0.5">
          <Text className="text-gray-500 text-sm font-semibold">{shipment.trip_detail.origin_city}</Text>
          <ArrowRight color="#2563eb" size={13} />
          <Text className="text-gray-500 text-sm font-semibold">{shipment.trip_detail.dest_city}</Text>
        </View>
        <Text className="text-gray-400 text-xs mt-0.5">{shipment.trip_detail.agency_name}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>

        {/* Statut refusé */}
        {isRejected && (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <Text className="text-red-700 font-bold text-sm">Colis refusé</Text>
            <Text className="text-red-600 text-xs mt-1">
              Votre demande a été refusée par l'agence. Contactez-les pour plus d'informations.
            </Text>
          </View>
        )}

        {/* Action : Confirmer le dépôt */}
        {shipment.status === "ACCEPTED" && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                "Confirmer le dépôt",
                "Confirmez-vous avoir déposé votre colis en agence ?",
                [
                  { text: "Annuler", style: "cancel" },
                  { text: "Confirmer", onPress: confirmDeposit },
                ]
              );
            }}
            disabled={confirming}
            className="bg-violet-500 rounded-2xl py-4 items-center"
            style={{ opacity: confirming ? 0.7 : 1 }}
          >
            {confirming
              ? <ActivityIndicator color="white" />
              : (
                <View>
                  <Text className="text-white font-bold text-base text-center">Confirmer le dépôt en agence</Text>
                  <Text className="text-violet-200 text-xs text-center mt-0.5">
                    À faire après avoir remis votre colis
                  </Text>
                </View>
              )
            }
          </TouchableOpacity>
        )}

        {/* Tracking */}
        {!isRejected && (
          <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-4">Suivi</Text>
            <View>
              {TRACKING_STEPS.map((step, idx) => {
                const isDone = idx <= currentIdx;
                const isActive = idx === currentIdx;
                const isLast = idx === TRACKING_STEPS.length - 1;
                return (
                  <View key={step.key} className="flex-row items-start gap-3">
                    <View className="items-center" style={{ width: 28 }}>
                      <View
                        className="h-7 w-7 rounded-full items-center justify-center z-10"
                        style={{
                          backgroundColor: isDone ? "#2563eb" : "#f3f4f6",
                          borderWidth: isActive ? 2 : 0,
                          borderColor: "#2563eb",
                        }}
                      >
                        {isDone && <Check color="white" size={14} strokeWidth={3} />}
                      </View>
                      {!isLast && (
                        <View
                          style={{
                            width: 2, flex: 1, minHeight: 28,
                            backgroundColor: idx < currentIdx ? "#2563eb" : "#e5e7eb",
                          }}
                        />
                      )}
                    </View>
                    <View className="pb-4 flex-1">
                      <Text className={`text-sm font-bold mt-0.5 ${isDone ? "text-dark" : "text-gray-300"}`}>
                        {step.label}
                      </Text>
                      {isActive && (
                        <Text className="text-primary text-xs mt-0.5">{step.desc}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Détails trajet */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm gap-2.5">
          <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-1">Trajet</Text>
          <Row label="Départ">
            {new Date(shipment.trip_detail.departure_at).toLocaleDateString("fr-FR", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </Row>
          {shipment.trip_detail.arrival_eta && (
            <Row label="Arrivée estimée">
              {new Date(shipment.trip_detail.arrival_eta).toLocaleDateString("fr-FR", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </Row>
          )}
          <Row label="Prix/kg">{shipment.trip_detail.price_per_kg} €/kg</Row>
        </View>

        {/* Détails colis */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm gap-2.5">
          <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-1">Colis</Text>
          <Row label="Poids">{shipment.weight_kg} kg</Row>
          <Row label="Total estimé">{total} €</Row>
          <Row label="Réception">
            {shipment.delivery_type === "HOME_DELIVERY"
              ? `Livraison — ${shipment.delivery_address}`
              : "Retrait au bureau"}
          </Row>
          {shipment.description ? <Row label="Contenu">{shipment.description}</Row> : null}
          {shipment.customer_phone ? <Row label="Téléphone">{shipment.customer_phone}</Row> : null}
          <Row label="Créé le">
            {new Date(shipment.created_at).toLocaleDateString("fr-FR")}
          </Row>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-start justify-between">
      <Text className="text-gray-400 text-sm">{label}</Text>
      <Text className="text-dark font-semibold text-sm text-right flex-1 ml-4">{children}</Text>
    </View>
  );
}
