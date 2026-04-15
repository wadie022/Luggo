import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { Package, ArrowRight, ChevronRight } from "lucide-react-native";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:    { label: "En attente",   bg: "#fffbeb", text: "#d97706" },
  ACCEPTED:   { label: "Accepté",     bg: "#eff6ff", text: "#2563eb" },
  DEPOSITED:  { label: "Déposé",      bg: "#f5f3ff", text: "#7c3aed" },
  IN_TRANSIT: { label: "En transit",   bg: "#eef2ff", text: "#4f46e5" },
  ARRIVED:    { label: "Arrivé",      bg: "#f0fdfa", text: "#0d9488" },
  DELIVERED:  { label: "Livré",       bg: "#f0fdf4", text: "#16a34a" },
  REJECTED:   { label: "Refusé",      bg: "#fef2f2", text: "#dc2626" },
};

type Shipment = {
  id: number;
  trip_detail: {
    origin_city: string;
    dest_city: string;
    origin_country: string;
    dest_country: string;
    departure_at: string;
    agency_name: string;
  };
  weight_kg: number;
  status: string;
  created_at: string;
};

export default function MesColisScreen() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await apiFetch("/shipments/");
      if (res.ok) setShipments(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <Text className="text-xl font-black text-dark">Mes colis</Text>
        <Text className="text-gray-400 text-xs mt-0.5">Suivi de vos envois en cours</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : shipments.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Package color="#d1d5db" size={48} />
          <Text className="text-gray-400 font-semibold mt-3 text-center">
            Aucun colis pour le moment.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/trajets")}
            className="mt-5 bg-primary rounded-full px-6 py-3"
          >
            <Text className="text-white font-bold text-sm">Voir les trajets</Text>
          </TouchableOpacity>
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
            return (
              <TouchableOpacity
                onPress={() => router.push(`/colis/${item.id}`)}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:opacity-80"
              >
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-gray-400 text-[11px] mb-0.5">Colis #{item.id}</Text>
                    <View className="flex-row items-center gap-1">
                      <Text className="text-dark font-black text-sm" numberOfLines={1}>
                        {item.trip_detail.origin_city}
                      </Text>
                      <ArrowRight color="#2563eb" size={13} />
                      <Text className="text-dark font-black text-sm" numberOfLines={1}>
                        {item.trip_detail.dest_city}
                      </Text>
                    </View>
                    <Text className="text-gray-400 text-xs mt-0.5">
                      {item.trip_detail.agency_name} · {item.weight_kg} kg
                    </Text>
                  </View>
                  <ChevronRight color="#d1d5db" size={16} />
                </View>

                <View
                  className="self-start rounded-lg px-2.5 py-1 mt-1"
                  style={{ backgroundColor: cfg.bg }}
                >
                  <Text className="text-xs font-bold" style={{ color: cfg.text }}>
                    {cfg.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
