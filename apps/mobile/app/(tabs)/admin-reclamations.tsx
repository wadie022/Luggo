import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, Modal, TextInput, ScrollView,
} from "react-native";
import { apiFetch } from "@/lib/api";
import { MessageSquare, Clock, CheckCircle, X } from "lucide-react-native";

type Reclamation = {
  id: number;
  user_email: string;
  user_name: string;
  shipment_id: number;
  subject: string;
  message: string;
  status: string;
  admin_response: string | null;
  created_at: string;
};

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  OPEN:     { label: "Ouverte",   bg: "#fffbeb", text: "#d97706" },
  RESOLVED: { label: "Résolue",   bg: "#f0fdf4", text: "#16a34a" },
  CLOSED:   { label: "Fermée",    bg: "#f9fafb", text: "#6b7280" },
};

export default function AdminReclamationsScreen() {
  const [items, setItems] = useState<Reclamation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [modal, setModal] = useState<Reclamation | null>(null);
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await apiFetch("/admin/reclamations/");
      if (res.ok) setItems(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const filters = [
    { key: "ALL", label: "Toutes" },
    { key: "OPEN", label: "Ouvertes" },
    { key: "RESOLVED", label: "Résolues" },
  ];

  const filtered = activeFilter === "ALL" ? items : items.filter((i) => i.status === activeFilter);
  const openCount = items.filter((i) => i.status === "OPEN").length;

  async function submitResponse() {
    if (!modal || !response.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/admin/reclamations/${modal.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ admin_response: response, status: "RESOLVED" }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((r) => r.id === modal.id ? { ...r, admin_response: response, status: "RESOLVED" } : r)
        );
        setModal(null);
        setResponse("");
        Alert.alert("Répondu !", "La réclamation a été résolue.");
      } else {
        Alert.alert("Erreur", "Impossible d'envoyer la réponse.");
      }
    } catch {
      Alert.alert("Erreur", "Impossible d'envoyer la réponse.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-5 pt-14 pb-3 border-b border-gray-100">
        <Text className="text-xl font-black text-dark mb-1">Réclamations</Text>
        <Text className="text-gray-400 text-xs mb-3">
          {openCount} réclamation{openCount !== 1 ? "s" : ""} ouverte{openCount !== 1 ? "s" : ""}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              className={`rounded-full px-3 py-1.5 border ${activeFilter === f.key ? "bg-primary border-primary" : "bg-white border-gray-200"}`}
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
          <MessageSquare color="#d1d5db" size={48} />
          <Text className="text-gray-400 font-semibold mt-3 text-center">Aucune réclamation.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} tintColor="#2563eb" />
          }
          renderItem={({ item }) => {
            const cfg = STATUS_CFG[item.status] ?? { label: item.status, bg: "#f9fafb", text: "#6b7280" };
            return (
              <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-dark font-black text-sm" numberOfLines={1}>{item.subject}</Text>
                    <Text className="text-gray-400 text-xs mt-0.5">{item.user_name} · Colis #{item.shipment_id}</Text>
                    <View className="flex-row items-center gap-1 mt-1">
                      <Clock color="#9ca3af" size={11} />
                      <Text className="text-gray-400 text-[11px]">
                        {new Date(item.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </Text>
                    </View>
                  </View>
                  <View className="rounded-lg px-2.5 py-1" style={{ backgroundColor: cfg.bg }}>
                    <Text className="text-xs font-bold" style={{ color: cfg.text }}>{cfg.label}</Text>
                  </View>
                </View>

                <Text className="text-gray-600 text-xs leading-relaxed" numberOfLines={2}>{item.message}</Text>

                {item.admin_response && (
                  <View className="mt-2 bg-blue-50 rounded-xl px-3 py-2">
                    <Text className="text-primary text-xs font-bold mb-0.5">Votre réponse</Text>
                    <Text className="text-blue-700 text-xs">{item.admin_response}</Text>
                  </View>
                )}

                {item.status === "OPEN" && (
                  <TouchableOpacity
                    onPress={() => { setResponse(item.admin_response ?? ""); setModal(item); }}
                    className="mt-3 bg-primary rounded-xl py-2.5 flex-row items-center justify-center gap-1.5"
                  >
                    <CheckCircle color="white" size={14} />
                    <Text className="text-white font-bold text-sm">Répondre</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Modal réponse */}
      <Modal
        visible={!!modal}
        transparent
        animationType="slide"
        onRequestClose={() => setModal(null)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl px-6 pt-5 pb-10 gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-dark font-black text-lg">Répondre</Text>
              <TouchableOpacity onPress={() => setModal(null)}>
                <X color="#9ca3af" size={22} />
              </TouchableOpacity>
            </View>

            {modal && (
              <View className="bg-gray-50 rounded-xl px-4 py-3">
                <Text className="text-dark font-bold text-sm mb-1">{modal.subject}</Text>
                <Text className="text-gray-500 text-xs">{modal.message}</Text>
              </View>
            )}

            <View>
              <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-1.5">
                Votre réponse
              </Text>
              <TextInput
                value={response}
                onChangeText={setResponse}
                placeholder="Rédigez votre réponse…"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                style={{ minHeight: 100, textAlignVertical: "top" }}
              />
            </View>

            <TouchableOpacity
              onPress={submitResponse}
              disabled={submitting || !response.trim()}
              className="bg-primary rounded-full py-4 items-center"
              style={{ opacity: submitting || !response.trim() ? 0.6 : 1 }}
            >
              {submitting
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-bold text-base">Envoyer la réponse</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
