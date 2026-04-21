import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from "react-native";
import { apiFetch, logout } from "@/lib/api";
import { useRouter } from "expo-router";
import { TrendingUp, Users, Package, DollarSign, LogOut } from "lucide-react-native";

type Stats = {
  total_clients: number;
  total_agencies: number;
  total_shipments: number;
  total_kg: number;
  estimated_revenue: number;
  by_status: Record<string, number>;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  ACCEPTED: "Accepté",
  DEPOSITED: "Déposé",
  IN_TRANSIT: "En transit",
  ARRIVED: "Arrivé",
  DELIVERED: "Livré",
  REJECTED: "Refusé",
};

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex-1">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-gray-400 text-xs font-semibold">{label}</Text>
        <View style={{ backgroundColor: color + "20" }} className="p-2 rounded-xl">
          {icon}
        </View>
      </View>
      <Text className="text-dark font-black text-2xl">{value}</Text>
    </View>
  );
}

export default function AdminStatsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await apiFetch("/admin/stats/");
      if (res.ok) setStats(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-black text-dark">Dashboard Admin</Text>
            <Text className="text-gray-400 text-xs mt-0.5">Statistiques de la plateforme</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} className="p-2">
            <LogOut color="#9ca3af" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : !stats ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Impossible de charger les stats.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} tintColor="#2563eb" />
          }
        >
          {/* KPI row 1 */}
          <View className="flex-row gap-3">
            <StatCard
              label="Clients"
              value={stats.total_clients}
              icon={<Users color="#2563eb" size={16} />}
              color="#2563eb"
            />
            <StatCard
              label="Agences"
              value={stats.total_agencies}
              icon={<TrendingUp color="#7c3aed" size={16} />}
              color="#7c3aed"
            />
          </View>

          {/* KPI row 2 */}
          <View className="flex-row gap-3">
            <StatCard
              label="Colis total"
              value={stats.total_shipments}
              icon={<Package color="#0d9488" size={16} />}
              color="#0d9488"
            />
            <StatCard
              label="Revenue est."
              value={`${stats.estimated_revenue?.toFixed(0) ?? 0} €`}
              icon={<DollarSign color="#d97706" size={16} />}
              color="#d97706"
            />
          </View>

          {/* Total KG */}
          <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <Text className="text-gray-400 text-xs font-semibold mb-1">Poids total transporté</Text>
            <Text className="text-dark font-black text-3xl">{stats.total_kg} <Text className="text-gray-400 font-normal text-base">kg</Text></Text>
          </View>

          {/* By status */}
          <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <Text className="text-dark font-black text-base mb-3">Colis par statut</Text>
            {Object.entries(stats.by_status ?? {}).map(([status, count]) => (
              <View key={status} className="flex-row items-center justify-between py-2 border-b border-gray-50">
                <Text className="text-gray-600 text-sm">{STATUS_LABELS[status] ?? status}</Text>
                <View className="bg-gray-100 rounded-lg px-2.5 py-1">
                  <Text className="text-dark font-bold text-sm">{count}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
