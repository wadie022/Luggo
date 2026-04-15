import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from "react-native";
import { apiFetch } from "@/lib/api";
import { Package, ChevronRight, ArrowRight } from "lucide-react-native";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:    { label: "En attente",  bg: "#fffbeb", text: "#d97706" },
  ACCEPTED:   { label: "Accepté",    bg: "#eff6ff", text: "#2563eb" },
  DEPOSITED:  { label: "Déposé",     bg: "#f5f3ff", text: "#7c3aed" },
  IN_TRANSIT: { label: "En transit",  bg: "#eef2ff", text: "#4f46e5" },
  ARRIVED:    { label: "Arrivé",     bg: "#f0fdfa", text: "#0d9488" },
  DELIVERED:  { label: "Livré",      bg: "#f0fdf4", text: "#16a34a" },
  REJECTED:   { label: "Refusé",     bg: "#fef2f2", text: "#dc2626" },
};

const NEXT_STATUS: Record<string, { label: string; next: string; color: string }> = {
  PENDING:    { label: "Accepter",          next: "ACCEPTED",   color: "#16a34a" },
  ACCEPTED:   { label: "Colis reçu",        next: "DEPOSITED",  color: "#7c3aed" },
  DEPOSITED:  { label: "Marquer en transit", next: "IN_TRANSIT", color: "#4f46e5" },
  IN_TRANSIT: { label: "Marquer arrivé",     next: "ARRIVED",    color: "#0d9488" },
  ARRIVED:    { label: "Confirmer livraison", next: "DELIVERED",  color: "#16a34a" },
};

type Shipment = {
  id: number;
  trip_summary: { route: string; price_per_kg: number; departure_at: string };
  customer_name: string;
  customer_phone: string;
  weight_kg: number;
  delivery_type: string;
  delivery_address: string;
  status: string;
};

export default function DemandesScreen() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await apiFetch("/agency/shipments/");
      if (res.ok) setShipments(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  async function changeStatus(id: number, newStatus: string) {
    try {
      await apiFetch(`/shipments/${id}/tracking/`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setShipments((prev) =>
        prev.map((s) => s.id === id ? { ...s, status: newStatus } : s)
      );
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour.");
    }
  }

  async function rejectShipment(id: number) {
    Alert.alert("Refuser ?", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Refuser", style: "destructive",
        onPress: () => changeStatus(id, "REJECTED"),
      },
    ]);
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <Text className="text-xl font-black text-dark">Demandes</Text>
        <Text className="text-gray-400 text-xs mt-0.5">Gérez les colis de vos clients</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : shipments.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Package color="#d1d5db" size={48} />
          <Text className="text-gray-400 font-semibold mt-3 text-center">
            Aucune demande pour le moment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={shipments}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(false); }}
              tintColor="#2563eb"
            />
          }
          renderItem={({ item }) => {
            const cfg = STATUS_CONFIG[item.status] ?? { label: item.status, bg: "#f9fafb", text: "#6b7280" };
            const next = NEXT_STATUS[item.status];
            return (
              <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm gap-2">
                {/* Header */}
                <View className="flex-row items-start justify-between">
                  <View>
                    <Text className="text-gray-400 text-[11px]">Demande #{item.id}</Text>
                    <Text className="text-dark font-black text-base mt-0.5">{item.customer_name}</Text>
                    {item.customer_phone ? (
                      <Text className="text-gray-400 text-xs">{item.customer_phone}</Text>
                    ) : null}
                  </View>
                  <View className="rounded-lg px-2.5 py-1" style={{ backgroundColor: cfg.bg }}>
                    <Text className="text-xs font-bold" style={{ color: cfg.text }}>{cfg.label}</Text>
                  </View>
                </View>

                {/* Info colis */}
                <View className="bg-gray-50 rounded-xl p-3 gap-1">
                  <Text className="text-xs text-gray-500">
                    <Text className="font-bold text-dark">{item.weight_kg} kg</Text>
                    {" · "}{item.trip_summary?.route}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {item.delivery_type === "HOME_DELIVERY"
                      ? `Livraison domicile — ${item.delivery_address}`
                      : "Retrait au bureau"}
                  </Text>
                </View>

                {/* Actions */}
                {next && (
                  <View className="flex-row gap-2 mt-1">
                    <TouchableOpacity
                      onPress={() => changeStatus(item.id, next.next)}
                      className="flex-1 rounded-xl py-2.5 items-center"
                      style={{ backgroundColor: next.color + "15", borderWidth: 1, borderColor: next.color + "40" }}
                    >
                      <Text className="font-bold text-xs" style={{ color: next.color }}>{next.label}</Text>
                    </TouchableOpacity>
                    {item.status === "PENDING" && (
                      <TouchableOpacity
                        onPress={() => rejectShipment(item.id)}
                        className="rounded-xl px-4 py-2.5 items-center bg-red-50 border border-red-200"
                      >
                        <Text className="font-bold text-xs text-red-600">Refuser</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
