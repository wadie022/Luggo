import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { apiFetch } from "@/lib/api";
import { CheckCircle, XCircle, FileText, Clock } from "lucide-react-native";

type KycEntry = {
  id: number;
  user_email: string;
  user_name: string;
  status: string;
  submitted_at: string;
  id_front_url?: string;
  id_back_url?: string;
};

type KybEntry = {
  id: number;
  agency_name: string;
  agency_email: string;
  status: string;
  submitted_at: string;
  document_url?: string;
};

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:  { label: "En attente", bg: "#fffbeb", text: "#d97706" },
  APPROVED: { label: "Approuvé",   bg: "#f0fdf4", text: "#16a34a" },
  REJECTED: { label: "Refusé",     bg: "#fef2f2", text: "#dc2626" },
};

export default function AdminVerificationsScreen() {
  const [tab, setTab] = useState<"KYC" | "KYB">("KYC");
  const [kycList, setKycList] = useState<KycEntry[]>([]);
  const [kybList, setKybList] = useState<KybEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<number | null>(null);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [kycRes, kybRes] = await Promise.all([
        apiFetch("/admin/kyc/"),
        apiFetch("/admin/kyb/"),
      ]);
      if (kycRes.ok) setKycList(await kycRes.json());
      if (kybRes.ok) setKybList(await kybRes.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  async function decide(type: "kyc" | "kyb", id: number, action: "approve" | "reject") {
    setProcessing(id);
    try {
      const res = await apiFetch(`/admin/${type}/${id}/review/`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        load(false);
        Alert.alert("Fait !", `Dossier ${action === "approve" ? "approuvé" : "refusé"}.`);
      } else {
        Alert.alert("Erreur", "Action impossible.");
      }
    } catch {
      Alert.alert("Erreur", "Action impossible.");
    } finally {
      setProcessing(null);
    }
  }

  function confirmDecide(type: "kyc" | "kyb", id: number, action: "approve" | "reject", name: string) {
    Alert.alert(
      action === "approve" ? "Approuver ?" : "Refuser ?",
      `${action === "approve" ? "Approuver" : "Refuser"} le dossier de ${name} ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: action === "approve" ? "Approuver" : "Refuser", style: action === "approve" ? "default" : "destructive", onPress: () => decide(type, id, action) },
      ]
    );
  }

  const data = tab === "KYC" ? kycList : kybList;
  const pendingCount = data.filter((d) => d.status === "PENDING").length;

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-5 pt-14 pb-3 border-b border-gray-100">
        <Text className="text-xl font-black text-dark mb-1">Vérifications</Text>
        <Text className="text-gray-400 text-xs mb-3">
          {pendingCount} dossier{pendingCount !== 1 ? "s" : ""} en attente
        </Text>

        {/* Tabs */}
        <View className="flex-row gap-2">
          {(["KYC", "KYB"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 border ${tab === t ? "bg-primary border-primary" : "bg-white border-gray-200"}`}
            >
              <Text className={`text-xs font-bold ${tab === t ? "text-white" : "text-gray-500"}`}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : data.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <FileText color="#d1d5db" size={48} />
          <Text className="text-gray-400 font-semibold mt-3 text-center">Aucun dossier {tab}.</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} tintColor="#2563eb" />
          }
          renderItem={({ item }) => {
            const cfg = STATUS_CFG[item.status] ?? { label: item.status, bg: "#f9fafb", text: "#6b7280" };
            const name = tab === "KYC" ? (item as KycEntry).user_name : (item as KybEntry).agency_name;
            const email = tab === "KYC" ? (item as KycEntry).user_email : (item as KybEntry).agency_email;
            const isProcessing = processing === item.id;
            return (
              <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-dark font-black text-sm">{name}</Text>
                    <Text className="text-gray-400 text-xs mt-0.5">{email}</Text>
                    <View className="flex-row items-center gap-1 mt-1">
                      <Clock color="#9ca3af" size={11} />
                      <Text className="text-gray-400 text-[11px]">
                        {new Date(item.submitted_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </Text>
                    </View>
                  </View>
                  <View className="rounded-lg px-2.5 py-1" style={{ backgroundColor: cfg.bg }}>
                    <Text className="text-xs font-bold" style={{ color: cfg.text }}>{cfg.label}</Text>
                  </View>
                </View>

                {item.status === "PENDING" && (
                  <View className="flex-row gap-2 mt-3">
                    <TouchableOpacity
                      onPress={() => confirmDecide(tab.toLowerCase() as "kyc" | "kyb", item.id, "approve", name)}
                      disabled={isProcessing}
                      className="flex-1 bg-green-500 rounded-xl py-2.5 flex-row items-center justify-center gap-1.5"
                      style={{ opacity: isProcessing ? 0.7 : 1 }}
                    >
                      {isProcessing ? <ActivityIndicator color="white" size="small" /> : (
                        <>
                          <CheckCircle color="white" size={14} />
                          <Text className="text-white font-bold text-sm">Approuver</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDecide(tab.toLowerCase() as "kyc" | "kyb", item.id, "reject", name)}
                      disabled={isProcessing}
                      className="flex-1 bg-red-500 rounded-xl py-2.5 flex-row items-center justify-center gap-1.5"
                      style={{ opacity: isProcessing ? 0.7 : 1 }}
                    >
                      {isProcessing ? <ActivityIndicator color="white" size="small" /> : (
                        <>
                          <XCircle color="white" size={14} />
                          <Text className="text-white font-bold text-sm">Refuser</Text>
                        </>
                      )}
                    </TouchableOpacity>
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
