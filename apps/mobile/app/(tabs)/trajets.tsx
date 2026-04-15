import { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { API_BASE } from "@/lib/api";
import { ArrowRight, MapPin, Calendar, Package } from "lucide-react-native";

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
  capacity_kg: number;
  price_per_kg: number;
  status: string;
};

export default function TrajetsScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");

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
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchTrips(); }, []);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <View className="flex-row items-center gap-2 mb-1">
          <View className="h-8 w-8 rounded-xl bg-primary items-center justify-center">
            <Text className="text-white font-black text-base">L</Text>
          </View>
          <Text className="text-xl font-black text-dark">Trajets</Text>
        </View>
        <Text className="text-gray-400 text-xs mb-4">Trouvez un trajet Europe ↔ Maroc</Text>

        {/* Filtres */}
        <View className="flex-row gap-2">
          <ScrollSelect
            options={COUNTRIES}
            value={origin}
            onChange={setOrigin}
            placeholder="Départ"
          />
          <ScrollSelect
            options={COUNTRIES}
            value={dest}
            onChange={setDest}
            placeholder="Arrivée"
          />
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

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const departure = new Date(trip.departure_at);
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:opacity-80"
    >
      {/* Route */}
      <View className="flex-row items-center gap-2 mb-2">
        <Text className="text-dark font-black text-base flex-1" numberOfLines={1}>
          {trip.origin_city}
        </Text>
        <ArrowRight color="#2563eb" size={16} />
        <Text className="text-dark font-black text-base flex-1 text-right" numberOfLines={1}>
          {trip.dest_city}
        </Text>
      </View>

      {/* Meta */}
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

// Mini picker natif simplifié
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
