import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, Alert, Modal, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { Package, ArrowRight, ChevronRight, Search, Star, X } from "lucide-react-native";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:    { label: "En attente",   bg: "#fffbeb", text: "#d97706" },
  ACCEPTED:   { label: "Accepté",     bg: "#eff6ff", text: "#2563eb" },
  DEPOSITED:  { label: "Déposé",      bg: "#f5f3ff", text: "#7c3aed" },
  IN_TRANSIT: { label: "En transit",   bg: "#eef2ff", text: "#4f46e5" },
  ARRIVED:    { label: "Arrivé",      bg: "#f0fdfa", text: "#0d9488" },
  DELIVERED:  { label: "Livré",       bg: "#f0fdf4", text: "#16a34a" },
  REJECTED:   { label: "Refusé",      bg: "#fef2f2", text: "#dc2626" },
};

const FILTERS = [
  { key: "ALL", label: "Tous" },
  { key: "PENDING", label: "En attente" },
  { key: "ACCEPTED", label: "Accepté" },
  { key: "DEPOSITED", label: "Déposé" },
  { key: "IN_TRANSIT", label: "En transit" },
  { key: "ARRIVED", label: "Arrivé" },
  { key: "DELIVERED", label: "Livré" },
  { key: "REJECTED", label: "Refusé" },
];

type Shipment = {
  id: number;
  trip_detail: {
    origin_city: string;
    dest_city: string;
    origin_country: string;
    dest_country: string;
    departure_at: string;
    agency_name: string;
    agency_id: number | null;
  };
  weight_kg: number;
  description: string;
  status: string;
  created_at: string;
};

export default function MesColisScreen() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Review modal state
  const [reviewModal, setReviewModal] = useState<{ shipmentId: number; agencyId: number } | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingDeposit, setSubmittingDeposit] = useState<number | null>(null);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await apiFetch("/shipments/");
      if (res.ok) setShipments(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = shipments.filter((s) => {
    const matchStatus = activeFilter === "ALL" || s.status === activeFilter;
    if (!search.trim()) return matchStatus;
    const q = search.toLowerCase();
    return matchStatus && (
      s.trip_detail.origin_city.toLowerCase().includes(q) ||
      s.trip_detail.dest_city.toLowerCase().includes(q) ||
      s.trip_detail.agency_name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  });

  async function confirmDeposit(id: number) {
    setSubmittingDeposit(id);
    try {
      const res = await apiFetch(`/shipments/${id}/tracking/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "DEPOSITED" }),
      });
      if (res.ok) {
        setShipments((prev) => prev.map((s) => s.id === id ? { ...s, status: "DEPOSITED" } : s));
        Alert.alert("Confirmé !", "Votre dépôt a été confirmé.");
      }
    } catch {
      Alert.alert("Erreur", "Impossible de confirmer.");
    } finally {
      setSubmittingDeposit(null); }
  }

  async function submitReview() {
    if (!reviewModal) return;
    setSubmittingReview(true);
    try {
      const res = await apiFetch("/reviews/", {
        method: "POST",
        body: JSON.stringify({
          agency: reviewModal.agencyId,
          shipment: reviewModal.shipmentId,
          rating,
          comment: reviewComment,
        }),
      });
      if (!res.ok) throw new Error();
      setReviewModal(null);
      setRating(5);
      setReviewComment("");
      Alert.alert("Merci !", "Votre avis a été publié.");
    } catch {
      Alert.alert("Erreur", "Impossible d'envoyer l'avis.");
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 pt-14 pb-3 border-b border-gray-100">
        <Text className="text-xl font-black text-dark mb-1">Mes colis</Text>

        {/* Search */}
        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 gap-2 mb-3">
          <Search color="#9ca3af" size={14} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Ville, agence, contenu…"
            placeholderTextColor="#9ca3af"
            className="flex-1 text-dark text-xs"
            style={{ fontSize: 13 }}
          />
        </View>

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              className={`rounded-full px-3 py-1.5 border ${
                activeFilter === f.key
                  ? "bg-primary border-primary"
                  : "bg-white border-gray-200"
              }`}
            >
              <Text className={`text-xs font-bold ${activeFilter === f.key ? "text-white" : "text-gray-500"}`}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Package color="#d1d5db" size={48} />
          <Text className="text-gray-400 font-semibold mt-3 text-center">
            {search || activeFilter !== "ALL" ? "Aucun résultat." : "Aucun colis pour le moment."}
          </Text>
          {!search && activeFilter === "ALL" && (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/trajets")}
              className="mt-5 bg-primary rounded-full px-6 py-3"
            >
              <Text className="text-white font-bold text-sm">Voir les trajets</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
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

                <View className="self-start rounded-lg px-2.5 py-1 mt-1" style={{ backgroundColor: cfg.bg }}>
                  <Text className="text-xs font-bold" style={{ color: cfg.text }}>{cfg.label}</Text>
                </View>

                {/* Actions */}
                {item.status === "PENDING" && (
                  <TouchableOpacity
                    onPress={() => router.push(`/payment/${item.id}`)}
                    className="mt-3 bg-primary rounded-xl py-2.5 items-center"
                  >
                    <Text className="text-white font-bold text-sm">Payer maintenant</Text>
                  </TouchableOpacity>
                )}

                {item.status === "ACCEPTED" && (
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        "Confirmer le dépôt",
                        "Confirmez-vous avoir déposé votre colis en agence ?",
                        [
                          { text: "Annuler", style: "cancel" },
                          { text: "Confirmer", onPress: () => confirmDeposit(item.id) },
                        ]
                      );
                    }}
                    disabled={submittingDeposit === item.id}
                    className="mt-3 bg-violet-500 rounded-xl py-2.5 items-center"
                    style={{ opacity: submittingDeposit === item.id ? 0.7 : 1 }}
                  >
                    {submittingDeposit === item.id
                      ? <ActivityIndicator color="white" size="small" />
                      : <Text className="text-white font-bold text-sm">Confirmer le dépôt</Text>
                    }
                  </TouchableOpacity>
                )}

                {item.status === "DELIVERED" && item.trip_detail.agency_id && (
                  <TouchableOpacity
                    onPress={() => {
                      setRating(5);
                      setReviewComment("");
                      setReviewModal({ shipmentId: item.id, agencyId: item.trip_detail.agency_id! });
                    }}
                    className="mt-3 bg-amber-400 rounded-xl py-2.5 items-center flex-row justify-center gap-1.5"
                  >
                    <Star color="white" size={14} fill="white" />
                    <Text className="text-white font-bold text-sm">Laisser un avis</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal avis */}
      <Modal
        visible={!!reviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModal(null)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl px-6 pt-5 pb-10 gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-dark font-black text-lg">Laisser un avis</Text>
              <TouchableOpacity onPress={() => setReviewModal(null)}>
                <X color="#9ca3af" size={22} />
              </TouchableOpacity>
            </View>

            {/* Étoiles */}
            <View>
              <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">Note</Text>
              <View className="flex-row gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setRating(n)}>
                    <Star
                      size={36}
                      color="#f59e0b"
                      fill={n <= rating ? "#f59e0b" : "transparent"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-1.5">
                Commentaire (optionnel)
              </Text>
              <TextInput
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="Partagez votre expérience…"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                style={{ minHeight: 80, textAlignVertical: "top" }}
              />
            </View>

            <TouchableOpacity
              onPress={submitReview}
              disabled={submittingReview}
              className="bg-primary rounded-full py-4 items-center"
              style={{ opacity: submittingReview ? 0.7 : 1 }}
            >
              {submittingReview
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-bold text-base">Publier l'avis</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
