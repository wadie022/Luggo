import { useEffect, useState, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { MapView, Marker, PROVIDER_DEFAULT } from "@/components/MapViewNative";
import { API_BASE, apiFetch, getRole } from "@/lib/api";
import { ArrowRight, MapPin, Calendar, Package, Plus, Truck, Edit2, X, Map, List, Bell } from "lucide-react-native";

// Coordonnées des villes principales Europe ↔ Maroc
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "Paris": { lat: 48.8566, lng: 2.3522 },
  "Lyon": { lat: 45.7640, lng: 4.8357 },
  "Marseille": { lat: 43.2965, lng: 5.3698 },
  "Bordeaux": { lat: 44.8378, lng: -0.5792 },
  "Toulouse": { lat: 43.6047, lng: 1.4442 },
  "Nantes": { lat: 47.2184, lng: -1.5536 },
  "Lille": { lat: 50.6292, lng: 3.0573 },
  "Nice": { lat: 43.7102, lng: 7.2620 },
  "Strasbourg": { lat: 48.5734, lng: 7.7521 },
  "Casablanca": { lat: 33.5731, lng: -7.5898 },
  "Rabat": { lat: 34.0209, lng: -6.8416 },
  "Marrakech": { lat: 31.6295, lng: -7.9811 },
  "Fès": { lat: 34.0181, lng: -5.0078 },
  "Agadir": { lat: 30.4278, lng: -9.5981 },
  "Tanger": { lat: 35.7595, lng: -5.8340 },
  "Oujda": { lat: 34.6806, lng: -1.9078 },
  "Bruxelles": { lat: 50.8503, lng: 4.3517 },
  "Anvers": { lat: 51.2194, lng: 4.4025 },
  "Madrid": { lat: 40.4168, lng: -3.7038 },
  "Barcelone": { lat: 41.3851, lng: 2.1734 },
  "Rome": { lat: 41.9028, lng: 12.4964 },
  "Milan": { lat: 45.4642, lng: 9.1900 },
  "Amsterdam": { lat: 52.3676, lng: 4.9041 },
  "Genève": { lat: 46.2044, lng: 6.1432 },
  "Zurich": { lat: 47.3769, lng: 8.5417 },
  "Berlin": { lat: 52.5200, lng: 13.4050 },
  "Munich": { lat: 48.1351, lng: 11.5820 },
  "Frankfurt": { lat: 50.1109, lng: 8.6821 },
  "Lisbonne": { lat: 38.7223, lng: -9.1393 },
  "Porto": { lat: 41.1579, lng: -8.6291 },
};

const COUNTRIES = [
  { code: "", name: "Tous" },
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

type Trip = {
  id: number;
  agency: number;
  agency_name: string;
  origin_country: string;
  origin_city: string;
  dest_country: string;
  dest_city: string;
  departure_at: string;
  arrival_eta?: string;
  capacity_kg: number;
  price_per_kg: number;
  status: string;
};

// ─── VUE AGENCE ─────────────────────────────────────────────────────────────

const TRIP_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  PUBLISHED: { label: "Publié",  bg: "#f0fdf4", text: "#16a34a" },
  CLOSED:    { label: "Fermé",   bg: "#fef2f2", text: "#dc2626" },
  DRAFT:     { label: "Brouillon", bg: "#f9fafb", text: "#6b7280" },
};

function AgencyTripsView() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchTrips(showLoader = true) {
    if (showLoader) setLoading(true);
    try {
      const res = await apiFetch("/agency/trips/");
      if (res.ok) setTrips(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { fetchTrips(); }, []);

  async function closeTrip(id: number) {
    Alert.alert("Fermer le trajet ?", "Le trajet sera masqué des clients.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Fermer",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/trips/${id}/`, {
              method: "PATCH",
              body: JSON.stringify({ status: "CLOSED" }),
            });
            fetchTrips(false);
          } catch {
            Alert.alert("Erreur", "Impossible de fermer le trajet.");
          }
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-black text-dark">Mes trajets</Text>
            <Text className="text-gray-400 text-xs mt-0.5">Gérez vos trajets publiés</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/agency/trips/new")}
            className="bg-primary rounded-full px-4 py-2 flex-row items-center gap-1.5"
          >
            <Plus color="white" size={14} />
            <Text className="text-white font-bold text-xs">Nouveau</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : trips.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <Truck color="#d1d5db" size={48} />
          <Text className="text-gray-400 font-semibold text-center">
            Vous n'avez pas encore de trajet.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/agency/trips/new")}
            className="bg-primary rounded-full px-6 py-3"
          >
            <Text className="text-white font-bold text-sm">Créer un trajet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchTrips(false); }}
              tintColor="#2563eb"
            />
          }
          renderItem={({ item }) => {
            const cfg = TRIP_STATUS[item.status] ?? { label: item.status, bg: "#f9fafb", text: "#6b7280" };
            const departure = new Date(item.departure_at);
            return (
              <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text className="text-dark font-black text-base">{item.origin_city}</Text>
                      <ArrowRight color="#2563eb" size={15} />
                      <Text className="text-dark font-black text-base">{item.dest_city}</Text>
                    </View>
                    <View className="flex-row items-center gap-1 mb-1">
                      <MapPin color="#9ca3af" size={12} />
                      <Text className="text-gray-400 text-xs">
                        {item.origin_country} → {item.dest_country}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Calendar color="#9ca3af" size={12} />
                      <Text className="text-gray-400 text-xs">
                        {departure.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </Text>
                    </View>
                  </View>
                  <View className="rounded-lg px-2.5 py-1" style={{ backgroundColor: cfg.bg }}>
                    <Text className="text-xs font-bold" style={{ color: cfg.text }}>{cfg.label}</Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between mt-2">
                  <View className="flex-row gap-3">
                    <Text className="text-gray-400 text-xs">
                      <Text className="text-dark font-bold">{item.capacity_kg} kg</Text> capacité
                    </Text>
                    <Text className="text-gray-400 text-xs">
                      <Text className="text-dark font-bold">{item.price_per_kg} €</Text>/kg
                    </Text>
                  </View>
                    <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => router.push(`/agency/trips/${item.id}/edit`)}
                      className="flex-row items-center gap-1 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1"
                    >
                      <Edit2 color="#2563eb" size={12} />
                      <Text className="text-primary text-xs font-semibold">Modifier</Text>
                    </TouchableOpacity>
                    {item.status === "PUBLISHED" && (
                      <TouchableOpacity
                        onPress={() => closeTrip(item.id)}
                        className="flex-row items-center gap-1 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1"
                      >
                        <X color="#dc2626" size={12} />
                        <Text className="text-red-600 text-xs font-semibold">Fermer</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

// ─── VUE CLIENT ─────────────────────────────────────────────────────────────

function ClientTripsView() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  async function fetchTrips(showLoader = true) {
    if (showLoader) setLoading(true);
    try {
      let url = `${API_BASE}/trips/`;
      const params: string[] = [];
      if (origin) params.push(`origin_country=${origin}`);
      if (dest) params.push(`dest_country=${dest}`);
      if (params.length) url += "?" + params.join("&");
      const res = await fetch(url);
      const data: Trip[] = await res.json();
      const now = new Date();
      setTrips(data.filter((t) => new Date(t.departure_at) > now));
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { fetchTrips(); }, []);

  const tripsWithCoords = trips.filter((t) => CITY_COORDS[t.origin_city]);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 rounded-xl bg-primary items-center justify-center">
              <Text className="text-white font-black text-base">L</Text>
            </View>
            <Text className="text-xl font-black text-dark">Trajets</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => router.push("/alertes")}
              className="p-2 bg-amber-50 rounded-xl border border-amber-200"
            >
              <Bell color="#d97706" size={16} />
            </TouchableOpacity>
            {Platform.OS !== "web" && (
              <View className="flex-row bg-gray-100 rounded-xl p-1 gap-1">
                <TouchableOpacity
                  onPress={() => setViewMode("list")}
                  className={`rounded-lg px-2.5 py-1.5 ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
                >
                  <List color={viewMode === "list" ? "#2563eb" : "#9ca3af"} size={15} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setViewMode("map")}
                  className={`rounded-lg px-2.5 py-1.5 ${viewMode === "map" ? "bg-white shadow-sm" : ""}`}
                >
                  <Map color={viewMode === "map" ? "#2563eb" : "#9ca3af"} size={15} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        <Text className="text-gray-400 text-xs mb-4">Trouvez un trajet Europe ↔ Maroc</Text>

        <View className="flex-row gap-2">
          <ScrollSelect options={COUNTRIES} value={origin} onChange={setOrigin} placeholder="Départ" />
          <ScrollSelect options={COUNTRIES} value={dest} onChange={setDest} placeholder="Arrivée" />
          <TouchableOpacity
            onPress={() => fetchTrips()}
            className="bg-primary rounded-xl px-4 items-center justify-center"
          >
            <Text className="text-white font-bold text-xs">OK</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : viewMode === "map" && Platform.OS !== "web" ? (
        /* ─── MAP VIEW ─── */
        <>
          <MapView
            style={{ flex: 1 }}
            provider={PROVIDER_DEFAULT}
            initialRegion={{ latitude: 38.0, longitude: -3.0, latitudeDelta: 25, longitudeDelta: 25 }}
          >
            {tripsWithCoords.map((t) => {
              const coords = CITY_COORDS[t.origin_city];
              return (
                <Marker
                  key={t.id}
                  coordinate={{ latitude: coords.lat, longitude: coords.lng }}
                  onPress={() => setSelectedTrip(t)}
                >
                  <View style={{
                    backgroundColor: "#2563eb", borderRadius: 12,
                    paddingHorizontal: 10, paddingVertical: 6,
                    borderWidth: 2, borderColor: "#fff",
                    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
                  }}>
                    <Text style={{ color: "#fff", fontWeight: "900", fontSize: 11 }}>
                      {t.origin_city}
                    </Text>
                    <Text style={{ color: "#bfdbfe", fontWeight: "700", fontSize: 10 }}>
                      {t.price_per_kg}€/kg
                    </Text>
                  </View>
                </Marker>
              );
            })}
          </MapView>
          {/* Trip popup on map marker tap */}
          {selectedTrip && (
            <View style={{
              position: "absolute", bottom: 24, left: 16, right: 16,
              backgroundColor: "#fff", borderRadius: 20, padding: 16,
              shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
            }}>
              <TouchableOpacity
                style={{ position: "absolute", top: 12, right: 12, zIndex: 1 }}
                onPress={() => setSelectedTrip(null)}
              >
                <X color="#9ca3af" size={18} />
              </TouchableOpacity>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Text style={{ fontWeight: "900", fontSize: 16, color: "#0f172a" }}>{selectedTrip.origin_city}</Text>
                <ArrowRight color="#2563eb" size={14} />
                <Text style={{ fontWeight: "900", fontSize: 16, color: "#0f172a" }}>{selectedTrip.dest_city}</Text>
              </View>
              <Text style={{ color: "#9ca3af", fontSize: 12, marginBottom: 12 }}>
                {selectedTrip.agency_name} · {new Date(selectedTrip.departure_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "900", fontSize: 20, color: "#2563eb" }}>
                  {selectedTrip.price_per_kg} €<Text style={{ fontWeight: "400", fontSize: 12, color: "#9ca3af" }}>/kg</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => { setSelectedTrip(null); router.push(`/trips/${selectedTrip.id}`); }}
                  style={{ backgroundColor: "#2563eb", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Voir le trajet</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      ) : trips.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Package color="#d1d5db" size={48} />
          <Text className="text-gray-400 font-semibold mt-3 text-center">
            Aucun trajet pour ces critères.
          </Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchTrips(false); }}
              tintColor="#2563eb"
            />
          }
          renderItem={({ item }) => (
            <TripCard trip={item} onPress={() => router.push(`/trips/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

// ─── ROOT ────────────────────────────────────────────────────────────────────

export default function TrajetsScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    getRole().then((r) => { setRole(r); setRoleLoaded(true); });
  }, []);

  if (!roleLoaded) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (role === "AGENCY") return <AgencyTripsView />;
  return <ClientTripsView />;
}

// ─── COMPOSANTS ──────────────────────────────────────────────────────────────

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const departure = new Date(trip.departure_at);
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:opacity-80"
    >
      <View className="flex-row items-center gap-2 mb-2">
        <Text className="text-dark font-black text-base flex-1" numberOfLines={1}>
          {trip.origin_city}
        </Text>
        <ArrowRight color="#2563eb" size={16} />
        <Text className="text-dark font-black text-base flex-1 text-right" numberOfLines={1}>
          {trip.dest_city}
        </Text>
      </View>

      <View className="flex-row items-center gap-1 mb-3">
        <MapPin color="#9ca3af" size={12} />
        <Text className="text-gray-400 text-xs">
          {trip.origin_country} → {trip.dest_country}
          {trip.agency_name ? ` · ${trip.agency_name}` : ""}
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          <Calendar color="#9ca3af" size={12} />
          <Text className="text-gray-500 text-xs">
            {departure.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        </View>
        <View className="bg-blue-50 rounded-xl px-3 py-1.5">
          <Text className="text-primary font-black text-base">
            {trip.price_per_kg} €
            <Text className="text-gray-400 font-normal text-xs">/kg</Text>
          </Text>
        </View>
      </View>

      {trip.status === "PUBLISHED" && (
        <View className="mt-2 self-start bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5">
          <Text className="text-emerald-700 text-[11px] font-bold">Disponible</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function ScrollSelect({
  options, value, onChange, placeholder,
}: {
  options: { code: string; name: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.code === value);

  return (
    <View className="flex-1">
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 flex-row items-center justify-between"
      >
        <Text className="text-dark text-xs font-semibold" numberOfLines={1}>
          {selected?.name || placeholder}
        </Text>
        <Text className="text-gray-400 text-xs ml-1">{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View className="absolute top-10 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-hidden">
          <FlatList
            data={options}
            keyExtractor={(o) => o.code}
            nestedScrollEnabled
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { onChange(item.code); setOpen(false); }}
                className={`px-3 py-2.5 border-b border-gray-50 ${value === item.code ? "bg-blue-50" : ""}`}
              >
                <Text className={`text-xs font-semibold ${value === item.code ? "text-primary" : "text-dark"}`}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}
