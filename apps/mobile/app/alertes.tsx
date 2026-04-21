import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, Modal, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { Bell, Plus, Trash2, X, ChevronLeft, ArrowRight } from "lucide-react-native";

type RouteAlert = {
  id: number;
  origin_country: string;
  dest_country: string;
  max_price: number | null;
};

const COUNTRIES = [
  { code: "", name: "Tous pays" },
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgique" },
  { code: "ES", name: "Espagne" },
  { code: "IT", name: "Italie" },
  { code: "NL", name: "Pays-Bas" },
  { code: "CH", name: "Suisse" },
  { code: "DE", name: "Allemagne" },
  { code: "PT", name: "Portugal" },
  { code: "MA", name: "Maroc" },
];

const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]));

const PRICES = [
  { value: null, label: "Peu importe" },
  { value: 5, label: "≤ 5 €/kg" },
  { value: 8, label: "≤ 8 €/kg" },
  { value: 10, label: "≤ 10 €/kg" },
  { value: 15, label: "≤ 15 €/kg" },
];

export default function AlertesScreen() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<RouteAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await apiFetch("/alerts/");
      if (res.ok) setAlerts(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  async function createAlert() {
    setSubmitting(true);
    try {
      const res = await apiFetch("/alerts/", {
        method: "POST",
        body: JSON.stringify({ origin_country: origin, dest_country: dest, max_price: maxPrice }),
      });
      if (res.ok) {
        const newAlert = await res.json();
        setAlerts((prev) => [newAlert, ...prev]);
        setModal(false);
        setOrigin(""); setDest(""); setMaxPrice(null);
      } else {
        Alert.alert("Erreur", "Impossible de créer l'alerte.");
      }
    } catch {
      Alert.alert("Erreur", "Impossible de créer l'alerte.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAlert(id: number) {
    Alert.alert("Supprimer l'alerte ?", "Vous ne serez plus notifié pour ce trajet.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          setDeleting(id);
          try {
            await apiFetch(`/alerts/${id}/`, { method: "DELETE" });
            setAlerts((prev) => prev.filter((a) => a.id !== id));
          } catch {}
          finally { setDeleting(null); }
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <View className="flex-row items-center gap-3 mb-1">
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft color="#374151" size={22} />
          </TouchableOpacity>
          <Text className="text-xl font-black text-dark flex-1">Mes alertes</Text>
          <TouchableOpacity
            onPress={() => setModal(true)}
            className="bg-primary rounded-full px-4 py-2 flex-row items-center gap-1.5"
          >
            <Plus color="white" size={14} />
            <Text className="text-white font-bold text-xs">Nouvelle</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-gray-400 text-xs ml-9">Soyez notifié dès qu'un trajet correspond</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : alerts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Bell color="#d1d5db" size={48} />
          <Text className="text-gray-400 font-semibold mt-3 text-center">
            Aucune alerte. Créez-en une pour être notifié dès qu'un trajet correspond à vos critères.
          </Text>
          <TouchableOpacity
            onPress={() => setModal(true)}
            className="mt-5 bg-primary rounded-full px-6 py-3"
          >
            <Text className="text-white font-bold text-sm">Créer une alerte</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} tintColor="#2563eb" />
          }
          renderItem={({ item }) => (
            <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2 flex-1">
                  <Bell color="#2563eb" size={16} />
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-dark font-black text-sm">
                      {COUNTRY_NAMES[item.origin_country] || "Tous"}
                    </Text>
                    <ArrowRight color="#9ca3af" size={13} />
                    <Text className="text-dark font-black text-sm">
                      {COUNTRY_NAMES[item.dest_country] || "Tous"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => deleteAlert(item.id)}
                  disabled={deleting === item.id}
                  className="p-1.5"
                >
                  {deleting === item.id
                    ? <ActivityIndicator size="small" color="#dc2626" />
                    : <Trash2 color="#dc2626" size={16} />
                  }
                </TouchableOpacity>
              </View>
              {item.max_price && (
                <Text className="text-gray-400 text-xs mt-1.5 ml-6">
                  Prix max : {item.max_price} €/kg
                </Text>
              )}
            </View>
          )}
        />
      )}

      {/* Create alert modal */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ fontWeight: "900", fontSize: 18, color: "#0f172a" }}>Nouvelle alerte</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <X color="#9ca3af" size={22} />
              </TouchableOpacity>
            </View>

            {/* Origin */}
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Pays de départ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {COUNTRIES.map((c) => (
                  <TouchableOpacity
                    key={c.code}
                    onPress={() => setOrigin(c.code)}
                    style={{
                      borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8,
                      borderWidth: 1,
                      backgroundColor: origin === c.code ? "#2563eb" : "#fff",
                      borderColor: origin === c.code ? "#2563eb" : "#e5e7eb",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: origin === c.code ? "#fff" : "#6b7280" }}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Dest */}
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Pays d'arrivée</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {COUNTRIES.map((c) => (
                  <TouchableOpacity
                    key={c.code}
                    onPress={() => setDest(c.code)}
                    style={{
                      borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8,
                      borderWidth: 1,
                      backgroundColor: dest === c.code ? "#2563eb" : "#fff",
                      borderColor: dest === c.code ? "#2563eb" : "#e5e7eb",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: dest === c.code ? "#fff" : "#6b7280" }}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Max price */}
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Prix maximum</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {PRICES.map((p) => (
                <TouchableOpacity
                  key={String(p.value)}
                  onPress={() => setMaxPrice(p.value)}
                  style={{
                    borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8,
                    borderWidth: 1,
                    backgroundColor: maxPrice === p.value ? "#2563eb" : "#fff",
                    borderColor: maxPrice === p.value ? "#2563eb" : "#e5e7eb",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: maxPrice === p.value ? "#fff" : "#6b7280" }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={createAlert}
              disabled={submitting}
              style={{ backgroundColor: "#2563eb", borderRadius: 99, paddingVertical: 16, alignItems: "center", opacity: submitting ? 0.7 : 1 }}
            >
              {submitting
                ? <ActivityIndicator color="white" />
                : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Créer l'alerte</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
