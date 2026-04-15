import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, ArrowRight, Check } from "lucide-react-native";

const TRACKING_STEPS = [
  { key: "PENDING",    label: "En attente" },
  { key: "ACCEPTED",   label: "Accepté" },
  { key: "DEPOSITED",  label: "Déposé au bureau" },
  { key: "IN_TRANSIT", label: "En transit" },
  { key: "ARRIVED",    label: "Arrivé à destination" },
  { key: "DELIVERED",  label: "Livré" },
];
const STATUS_ORDER = TRACKING_STEPS.map((s) => s.key);

type Shipment = {
  id: number;
  trip_detail: {
    origin_city: string; dest_city: string;
    origin_country: string; dest_country: string;
    departure_at: string; price_per_kg: number; agency_name: string;
  };
  weight_kg: number;
  description: string;
  delivery_type: string;
  delivery_address: string;
  status: string;
  created_at: string;
};

export default function ColisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/shipments/${id}/`)
      .then((r) => r.json())
      .then(setShipment)
      .finally(() => setLoading(false));
  }, [id]);

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

        {/* Tracking steps */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-4">Suivi</Text>
          <View className="gap-0">
            {TRACKING_STEPS.map((step, idx) => {
              const isDone = idx <= currentIdx;
              const isActive = idx === currentIdx;
              const isLast = idx === TRACKING_STEPS.length - 1;
              return (
                <View key={step.key} className="flex-row items-start gap-3">
                  {/* Timeline */}
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
                          width: 2, flex: 1, minHeight: 24,
                          backgroundColor: idx < currentIdx ? "#2563eb" : "#e5e7eb",
                        }}
                      />
                    )}
                  </View>
                  {/* Label */}
                  <View className="pb-4 flex-1">
                    <Text
                      className={`text-sm font-bold mt-0.5 ${isDone ? "text-dark" : "text-gray-300"}`}
                    >
                      {step.label}
                    </Text>
                    {isActive && (
                      <Text className="text-primary text-xs mt-0.5">En cours</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Détails */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm gap-3">
          <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest">Détails</Text>
          <Row label="Poids">{shipment.weight_kg} kg</Row>
          <Row label="Prix/kg">{shipment.trip_detail.price_per_kg} €/kg</Row>
          <Row label="Total estimé">{(shipment.weight_kg * shipment.trip_detail.price_per_kg).toFixed(2)} €</Row>
          <Row label="Livraison">
            {shipment.delivery_type === "HOME_DELIVERY"
              ? `Domicile — ${shipment.delivery_address}`
              : "Retrait au bureau"}
          </Row>
          {shipment.description ? (
            <Row label="Contenu">{shipment.description}</Row>
          ) : null}
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
