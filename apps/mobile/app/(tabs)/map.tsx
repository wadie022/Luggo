import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  FlatList, TextInput, Linking, Platform, Modal,
} from "react-native";
import { MapView, Marker, PROVIDER_DEFAULT } from "@/components/MapViewNative";
import { apiFetch, getRole } from "@/lib/api";
import { useRouter } from "expo-router";
import { MapPin, Building2, List, Map, Search, ExternalLink, MessageSquare } from "lucide-react-native";

type Branch = {
  id: number;
  agency_id: number;
  agency_name: string;
  label: string;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  is_main: boolean;
};

const COUNTRY_NAMES: Record<string, string> = {
  FR: "France", BE: "Belgique", ES: "Espagne", IT: "Italie",
  NL: "Pays-Bas", CH: "Suisse", DE: "Allemagne", PT: "Portugal", MA: "Maroc",
};

const DEFAULT_REGION = {
  latitude: 38.0,
  longitude: -3.0,
  latitudeDelta: 25,
  longitudeDelta: 25,
};

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [role, setRole] = useState<string | null>(null);
  const [selected, setSelected] = useState<Branch | null>(null);
  const [creatingConv, setCreatingConv] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/agency-branches/");
      if (res.ok) setBranches(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    getRole().then(setRole);
  }, []);

  const filtered = branches.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.agency_name.toLowerCase().includes(q) ||
      b.city.toLowerCase().includes(q) ||
      b.address.toLowerCase().includes(q)
    );
  });

  const withCoords = filtered.filter((b) => b.latitude && b.longitude);

  async function openMaps(b: Branch) {
    const url = b.latitude && b.longitude
      ? `https://maps.google.com/?q=${b.latitude},${b.longitude}`
      : `https://maps.google.com/?q=${encodeURIComponent((b.address || b.city) + ", " + b.country)}`;
    Linking.openURL(url);
  }

  async function contactAgency(agencyId: number) {
    setCreatingConv(true);
    try {
      const res = await apiFetch("/conversations/", {
        method: "POST",
        body: JSON.stringify({ agency_id: agencyId }),
      });
      if (res.ok) {
        const conv = await res.json();
        setSelected(null);
        router.push(`/conversation/${conv.id}`);
      }
    } catch {}
    finally { setCreatingConv(false); }
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 pt-14 pb-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xl font-black text-dark">Agences</Text>
          <View className="flex-row bg-gray-100 rounded-xl p-1 gap-1">
            <TouchableOpacity
              onPress={() => setViewMode("map")}
              className={`rounded-lg px-3 py-1.5 ${viewMode === "map" ? "bg-white shadow-sm" : ""}`}
            >
              <Map color={viewMode === "map" ? "#2563eb" : "#9ca3af"} size={16} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode("list")}
              className={`rounded-lg px-3 py-1.5 ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
            >
              <List color={viewMode === "list" ? "#2563eb" : "#9ca3af"} size={16} />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 gap-2">
          <Search color="#9ca3af" size={14} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Agence, ville, adresse…"
            placeholderTextColor="#9ca3af"
            className="flex-1 text-dark"
            style={{ fontSize: 13 }}
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : viewMode === "map" && Platform.OS !== "web" ? (
        /* ─── MAP VIEW ─── */
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={PROVIDER_DEFAULT}
          initialRegion={DEFAULT_REGION}
          showsUserLocation
          showsMyLocationButton
        >
          {withCoords.map((b) => (
            <Marker
              key={b.id}
              coordinate={{ latitude: b.latitude!, longitude: b.longitude! }}
              onPress={() => setSelected(b)}
            >
              <View
                style={{
                  backgroundColor: b.is_main ? "#2563eb" : "#7c3aed",
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderWidth: 2,
                  borderColor: "#fff",
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 10 }} numberOfLines={1}>
                  {b.agency_name.slice(0, 14)}
                </Text>
              </View>
            </Marker>
          ))}
        </MapView>
      ) : (
        /* ─── LIST VIEW (also web fallback) ─── */
        <FlatList
          data={filtered}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <Building2 color="#d1d5db" size={48} />
              <Text className="text-gray-400 font-semibold mt-3 text-center">Aucune agence trouvée.</Text>
            </View>
          }
          renderItem={({ item: b }) => (
            <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5 mb-0.5">
                    <Text className="text-dark font-black text-sm">{b.agency_name}</Text>
                    {b.is_main && (
                      <View className="bg-blue-50 rounded px-1.5 py-0.5">
                        <Text className="text-primary text-[10px] font-bold">Principale</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-gray-500 text-xs">{b.label}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1 mb-3">
                <MapPin color="#9ca3af" size={12} />
                <Text className="text-gray-400 text-xs flex-1">
                  {b.address ? `${b.address}, ` : ""}{b.city} — {COUNTRY_NAMES[b.country] ?? b.country}
                </Text>
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => openMaps(b)}
                  className="flex-1 flex-row items-center justify-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl py-2.5"
                >
                  <ExternalLink color="#6b7280" size={13} />
                  <Text className="text-gray-600 text-xs font-semibold">Itinéraire</Text>
                </TouchableOpacity>
                {role === "CLIENT" && (
                  <TouchableOpacity
                    onPress={() => contactAgency(b.agency_id)}
                    disabled={creatingConv}
                    className="flex-1 flex-row items-center justify-center gap-1.5 bg-primary rounded-xl py-2.5"
                  >
                    <MessageSquare color="white" size={13} />
                    <Text className="text-white text-xs font-bold">Contacter</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => router.push(`/agences/${b.agency_id}`)}
                  className="flex-row items-center justify-center gap-1 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5"
                >
                  <Text className="text-primary text-xs font-semibold">Profil</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Branch detail modal (on map pin tap) */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <TouchableOpacity
            style={{ flex: 1, justifyContent: "flex-end" }}
            activeOpacity={1}
            onPress={() => setSelected(null)}
          >
            <View
              style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}
              onStartShouldSetResponder={() => true}
            >
              <View style={{ width: 40, height: 4, backgroundColor: "#e5e7eb", borderRadius: 99, alignSelf: "center", marginBottom: 16 }} />
              <Text style={{ fontWeight: "900", fontSize: 18, color: "#0f172a", marginBottom: 2 }}>{selected.agency_name}</Text>
              <Text style={{ color: "#9ca3af", fontSize: 14, marginBottom: 16 }}>{selected.label}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 24 }}>
                <MapPin color="#9ca3af" size={14} />
                <Text style={{ color: "#475569", fontSize: 14, flex: 1 }}>
                  {selected.address ? `${selected.address}, ` : ""}{selected.city}
                  {" — "}{COUNTRY_NAMES[selected.country] ?? selected.country}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => openMaps(selected)}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 16, paddingVertical: 12 }}
                >
                  <ExternalLink color="#6b7280" size={16} />
                  <Text style={{ color: "#374151", fontWeight: "700", fontSize: 14 }}>Itinéraire</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setSelected(null); router.push(`/agences/${selected.agency_id}`); }}
                  style={{ flex: 1, backgroundColor: "#eff6ff", borderRadius: 16, paddingVertical: 12, alignItems: "center" }}
                >
                  <Text style={{ color: "#2563eb", fontWeight: "700", fontSize: 14 }}>Voir profil</Text>
                </TouchableOpacity>
              </View>
              {role === "CLIENT" && (
                <TouchableOpacity
                  onPress={() => contactAgency(selected.agency_id)}
                  disabled={creatingConv}
                  style={{ marginTop: 12, backgroundColor: "#2563eb", borderRadius: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: creatingConv ? 0.7 : 1 }}
                >
                  {creatingConv
                    ? <ActivityIndicator color="white" size="small" />
                    : <>
                        <MessageSquare color="white" size={16} />
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Contacter l'agence</Text>
                      </>
                  }
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
      </Modal>
    </View>
  );
}
