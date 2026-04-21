import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, Plus, ChevronDown, ChevronUp, MessageCircle } from "lucide-react-native";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  OPEN:        { label: "Ouvert",      bg: "#eff6ff", text: "#2563eb" },
  IN_PROGRESS: { label: "En cours",   bg: "#fefce8", text: "#ca8a04" },
  RESOLVED:    { label: "Résolu",     bg: "#f0fdf4", text: "#16a34a" },
  CLOSED:      { label: "Clôturé",    bg: "#f9fafb", text: "#6b7280" },
};

type Shipment = { id: number; trip_detail: { origin_city: string; dest_city: string } };
type Reclamation = {
  id: number;
  subject: string;
  message: string;
  status: string;
  admin_response: string;
  shipment: number | null;
  shipment_route: string | null;
  created_at: string;
};

export default function ReclamationsScreen() {
  const router = useRouter();
  const [reclamations, setReclamations] = useState<Reclamation[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [shipmentId, setShipmentId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        apiFetch("/reclamations/"),
        apiFetch("/shipments/"),
      ]);
      if (rRes.ok) setReclamations(await rRes.json());
      if (sRes.ok) setShipments(await sRes.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  async function handleSubmit() {
    if (!subject.trim()) { Alert.alert("Sujet requis"); return; }
    if (!message.trim()) { Alert.alert("Message requis"); return; }
    setSubmitting(true);
    try {
      const body: any = { subject: subject.trim(), message: message.trim() };
      if (shipmentId) body.shipment = shipmentId;
      const res = await apiFetch("/reclamations/", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        Alert.alert("Erreur", data?.detail || "Impossible d'envoyer.");
        return;
      }
      setSubject("");
      setMessage("");
      setShipmentId(null);
      setShowForm(false);
      Alert.alert("Réclamation envoyée !", "Notre équipe vous répondra dans les 48h.");
      load(false);
    } catch {
      Alert.alert("Erreur", "Impossible de joindre le serveur.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mb-3">
          <ArrowLeft color="#6b7280" size={22} />
        </TouchableOpacity>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-black text-dark">Réclamations</Text>
            <Text className="text-gray-400 text-xs mt-0.5">Suivi de vos demandes d'assistance</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowForm(!showForm)}
            className="bg-primary rounded-full px-4 py-2 flex-row items-center gap-1.5"
          >
            <Plus color="white" size={14} />
            <Text className="text-white font-bold text-xs">Nouvelle</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(false); }}
            tintColor="#2563eb"
          />
        }
      >
        {/* Formulaire nouvelle réclamation */}
        {showForm && (
          <View className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm gap-3">
            <Text className="font-bold text-dark text-base">Nouvelle réclamation</Text>

            {/* Colis lié (optionnel) */}
            {shipments.length > 0 && (
              <View>
                <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">
                  Colis concerné (optionnel)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setShipmentId(null)}
                    className={`rounded-lg px-3 py-1.5 mr-2 border ${
                      shipmentId === null ? "bg-blue-50 border-primary" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Text className={`text-xs font-semibold ${shipmentId === null ? "text-primary" : "text-gray-500"}`}>
                      Aucun
                    </Text>
                  </TouchableOpacity>
                  {shipments.slice(0, 10).map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setShipmentId(s.id)}
                      className={`rounded-lg px-3 py-1.5 mr-2 border ${
                        shipmentId === s.id ? "bg-blue-50 border-primary" : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <Text className={`text-xs font-semibold ${shipmentId === s.id ? "text-primary" : "text-gray-500"}`}>
                        #{s.id} · {s.trip_detail.origin_city} → {s.trip_detail.dest_city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View>
              <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-1.5">Sujet</Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="Ex: Colis endommagé, retard de livraison…"
                placeholderTextColor="#9ca3af"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
              />
            </View>

            <View>
              <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-1.5">Message</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Décrivez votre problème en détail…"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                style={{ minHeight: 100, textAlignVertical: "top" }}
              />
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setShowForm(false)}
                className="flex-1 bg-gray-100 rounded-full py-3 items-center"
              >
                <Text className="text-gray-600 font-bold text-sm">Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-primary rounded-full py-3 items-center"
                style={{ opacity: submitting ? 0.7 : 1 }}
              >
                {submitting
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text className="text-white font-bold text-sm">Envoyer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Liste */}
        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#2563eb" />
          </View>
        ) : reclamations.length === 0 ? (
          <View className="py-12 items-center gap-3">
            <MessageCircle color="#d1d5db" size={48} />
            <Text className="text-gray-400 font-semibold text-center">
              Aucune réclamation.
            </Text>
            <Text className="text-gray-300 text-sm text-center">
              En cas de problème avec un colis ou une agence, créez une réclamation.
            </Text>
          </View>
        ) : (
          reclamations.map((r) => {
            const cfg = STATUS_CONFIG[r.status] ?? { label: r.status, bg: "#f9fafb", text: "#6b7280" };
            return (
              <ReclamationCard key={r.id} r={r} cfg={cfg} />
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function ReclamationCard({ r, cfg }: { r: Reclamation; cfg: { label: string; bg: string; text: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        className="px-4 py-3.5 flex-row items-center justify-between"
      >
        <View className="flex-1 min-w-0 mr-3">
          <View className="flex-row items-center gap-2 mb-1">
            <View className="rounded-lg px-2 py-0.5" style={{ backgroundColor: cfg.bg }}>
              <Text className="text-xs font-bold" style={{ color: cfg.text }}>{cfg.label}</Text>
            </View>
            <Text className="text-gray-300 text-xs">
              {new Date(r.created_at).toLocaleDateString("fr-FR")}
            </Text>
          </View>
          <Text className="text-dark font-bold text-sm" numberOfLines={1}>{r.subject}</Text>
          {r.shipment_route && (
            <Text className="text-gray-400 text-xs mt-0.5">Colis : {r.shipment_route}</Text>
          )}
        </View>
        {open ? <ChevronUp color="#9ca3af" size={18} /> : <ChevronDown color="#9ca3af" size={18} />}
      </TouchableOpacity>

      {open && (
        <View className="px-4 pb-4 gap-3 border-t border-gray-50">
          <View className="mt-3">
            <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-1">
              Votre message
            </Text>
            <Text className="text-dark text-sm leading-5">{r.message}</Text>
          </View>
          {r.admin_response ? (
            <View className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <Text className="text-xs font-bold uppercase text-blue-400 tracking-widest mb-1">
                Réponse de l'équipe
              </Text>
              <Text className="text-dark text-sm leading-5">{r.admin_response}</Text>
            </View>
          ) : (
            <View className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <Text className="text-amber-600 text-xs">
                En attente de réponse · Délai estimé : 48h
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
