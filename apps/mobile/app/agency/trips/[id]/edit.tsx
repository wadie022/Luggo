import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, AlertCircle } from "lucide-react-native";

const COUNTRIES = [
  { code: "FR", name: "France" }, { code: "BE", name: "Belgique" },
  { code: "ES", name: "Espagne" }, { code: "IT", name: "Italie" },
  { code: "NL", name: "Pays-Bas" }, { code: "CH", name: "Suisse" },
  { code: "DE", name: "Allemagne" }, { code: "PT", name: "Portugal" },
  { code: "MA", name: "Maroc" },
];

type Trip = {
  id: number;
  origin_country: string;
  origin_city: string;
  dest_country: string;
  dest_city: string;
  departure_at: string;
  arrival_eta: string | null;
  capacity_kg: number;
  price_per_kg: number;
  status: string;
  used_kg: number;
  pending_kg: number;
};

function CountrySelector({ value, onChange, disabled }: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRIES.find((c) => c.code === value);
  if (disabled) {
    return (
      <View className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3">
        <Text className="text-gray-400 text-sm font-semibold">{selected?.name || value}</Text>
      </View>
    );
  }
  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
      >
        <Text className="text-dark text-sm font-semibold">{selected?.name || "Choisir"}</Text>
        <Text className="text-gray-400 text-xs">{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
          {COUNTRIES.map((c) => (
            <TouchableOpacity
              key={c.code}
              onPress={() => { onChange(c.code); setOpen(false); }}
              className={`px-4 py-3 border-b border-gray-50 ${value === c.code ? "bg-blue-50" : ""}`}
            >
              <Text className={`text-sm font-semibold ${value === c.code ? "text-primary" : "text-dark"}`}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-1.5">{label}</Text>
      {children}
    </View>
  );
}

function isoToDate(iso: string) {
  return iso ? iso.slice(0, 10) : "";
}
function isoToTime(iso: string) {
  return iso ? iso.slice(11, 16) : "";
}
function buildIso(date: string, time: string) {
  if (!date || !time) return null;
  try { return new Date(`${date}T${time}:00`).toISOString(); } catch { return null; }
}

export default function EditTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [originCountry, setOriginCountry] = useState("FR");
  const [originCity, setOriginCity] = useState("");
  const [destCountry, setDestCountry] = useState("MA");
  const [destCity, setDestCity] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [capacity, setCapacity] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<"PUBLISHED" | "CLOSED">("PUBLISHED");

  useEffect(() => {
    apiFetch(`/trips/${id}/`)
      .then((r) => r.json())
      .then((t: Trip) => {
        setTrip(t);
        setOriginCountry(t.origin_country);
        setOriginCity(t.origin_city);
        setDestCountry(t.dest_country);
        setDestCity(t.dest_city);
        setDepartureDate(isoToDate(t.departure_at));
        setDepartureTime(isoToTime(t.departure_at));
        if (t.arrival_eta) {
          setArrivalDate(isoToDate(t.arrival_eta));
          setArrivalTime(isoToTime(t.arrival_eta));
        }
        setCapacity(String(t.capacity_kg));
        setPrice(String(t.price_per_kg));
        setStatus(t.status as "PUBLISHED" | "CLOSED");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const hasAccepted = (trip?.used_kg ?? 0) > 0;

  async function handleSave() {
    if (!capacity || parseFloat(capacity) <= 0) { Alert.alert("Capacité invalide"); return; }

    setSaving(true);
    try {
      let body: any = { capacity_kg: parseFloat(capacity) };

      if (!hasAccepted) {
        if (!originCity.trim() || !destCity.trim()) { Alert.alert("Villes requises"); return; }
        const depIso = buildIso(departureDate, departureTime);
        if (!depIso) { Alert.alert("Date de départ invalide"); return; }
        const arrIso = buildIso(arrivalDate, arrivalTime);

        body = {
          origin_country: originCountry,
          origin_city: originCity.trim(),
          dest_country: destCountry,
          dest_city: destCity.trim(),
          departure_at: depIso,
          arrival_eta: arrIso ?? null,
          capacity_kg: parseFloat(capacity),
          price_per_kg: parseFloat(price) || trip!.price_per_kg,
          status,
        };
      }

      const res = await apiFetch(`/agency/trips/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        Alert.alert("Enregistré !", "Le trajet a été mis à jour.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        const data = await res.json();
        Alert.alert("Erreur", data?.detail || JSON.stringify(data));
      }
    } catch {
      Alert.alert("Erreur", "Impossible de joindre le serveur.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-400">Trajet introuvable.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mb-3">
          <ArrowLeft color="#6b7280" size={22} />
        </TouchableOpacity>
        <Text className="text-xl font-black text-dark">Modifier le trajet</Text>
        <Text className="text-gray-400 text-xs mt-0.5">Trajet #{trip.id}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">

        {/* Avertissement si des colis sont acceptés */}
        {hasAccepted && (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row gap-3">
            <AlertCircle color="#d97706" size={18} />
            <View className="flex-1">
              <Text className="text-amber-700 font-bold text-sm">Modification limitée</Text>
              <Text className="text-amber-600 text-xs mt-1 leading-4">
                Des colis sont déjà acceptés ({trip.used_kg} kg). Vous ne pouvez modifier que la capacité totale.
              </Text>
            </View>
          </View>
        )}

        {/* Itinéraire */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm gap-4">
          <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest">Itinéraire</Text>
          <View className="gap-3">
            <Field label="Pays de départ">
              <CountrySelector value={originCountry} onChange={setOriginCountry} disabled={hasAccepted} />
            </Field>
            <Field label="Ville de départ">
              <TextInput
                value={originCity}
                onChangeText={setOriginCity}
                placeholder="Ex: Paris"
                placeholderTextColor="#9ca3af"
                editable={!hasAccepted}
                className={`border rounded-xl px-4 py-3 text-sm ${hasAccepted ? "bg-gray-100 border-gray-200 text-gray-400" : "bg-gray-50 border-gray-200 text-dark"}`}
              />
            </Field>
            <Field label="Pays d'arrivée">
              <CountrySelector value={destCountry} onChange={setDestCountry} disabled={hasAccepted} />
            </Field>
            <Field label="Ville d'arrivée">
              <TextInput
                value={destCity}
                onChangeText={setDestCity}
                placeholder="Ex: Casablanca"
                placeholderTextColor="#9ca3af"
                editable={!hasAccepted}
                className={`border rounded-xl px-4 py-3 text-sm ${hasAccepted ? "bg-gray-100 border-gray-200 text-gray-400" : "bg-gray-50 border-gray-200 text-dark"}`}
              />
            </Field>
          </View>
        </View>

        {/* Dates */}
        {!hasAccepted && (
          <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm gap-4">
            <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest">Dates</Text>
            <View className="gap-2">
              <Text className="text-xs font-bold text-gray-500">Départ</Text>
              <View className="flex-row gap-2">
                <TextInput
                  value={departureDate}
                  onChangeText={setDepartureDate}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                  keyboardType="numbers-and-punctuation"
                />
                <TextInput
                  value={departureTime}
                  onChangeText={setDepartureTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#9ca3af"
                  className="w-28 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold text-gray-500">Arrivée estimée (optionnel)</Text>
              <View className="flex-row gap-2">
                <TextInput
                  value={arrivalDate}
                  onChangeText={setArrivalDate}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                  keyboardType="numbers-and-punctuation"
                />
                <TextInput
                  value={arrivalTime}
                  onChangeText={setArrivalTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#9ca3af"
                  className="w-28 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          </View>
        )}

        {/* Tarifs */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm gap-4">
          <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest">Tarifs & Capacité</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label={`Capacité (kg)${hasAccepted ? ` — min ${trip.used_kg} kg` : ""}`}>
                <TextInput
                  value={capacity}
                  onChangeText={setCapacity}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                  placeholder={String(trip.capacity_kg)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="Prix/kg (€)">
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                  placeholder={String(trip.price_per_kg)}
                  editable={!hasAccepted}
                  className={`border rounded-xl px-4 py-3 text-sm ${hasAccepted ? "bg-gray-100 border-gray-200 text-gray-400" : "bg-gray-50 border-gray-200 text-dark"}`}
                />
              </Field>
            </View>
          </View>

          {/* Statut */}
          {!hasAccepted && (
            <View>
              <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">Statut</Text>
              <View className="flex-row gap-2">
                {(["PUBLISHED", "CLOSED"] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStatus(s)}
                    className={`flex-1 rounded-xl py-2.5 items-center border-2 ${
                      status === s
                        ? s === "PUBLISHED" ? "border-emerald-500 bg-emerald-50" : "border-red-400 bg-red-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <Text className={`text-xs font-bold ${
                      status === s
                        ? s === "PUBLISHED" ? "text-emerald-600" : "text-red-500"
                        : "text-gray-400"
                    }`}>
                      {s === "PUBLISHED" ? "Publié" : "Fermé"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="bg-primary rounded-full py-4 items-center"
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving
            ? <ActivityIndicator color="white" />
            : <Text className="text-white font-bold text-base">Enregistrer les modifications</Text>
          }
        </TouchableOpacity>
        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
