import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, ArrowRight } from "lucide-react-native";

const COUNTRIES = [
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

function CountrySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRIES.find((c) => c.code === value);
  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
      >
        <Text className={`text-sm font-semibold ${value ? "text-dark" : "text-gray-400"}`}>
          {selected?.name || "Choisir un pays"}
        </Text>
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View>
      <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-1.5">
        {label}{required && " *"}
      </Text>
      {children}
    </View>
  );
}

export default function NewTripScreen() {
  const router = useRouter();

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
  const [submitting, setSubmitting] = useState(false);

  function buildIso(date: string, time: string): string | null {
    if (!date.trim() || !time.trim()) return null;
    try {
      const iso = new Date(`${date.trim()}T${time.trim()}:00`).toISOString();
      return iso;
    } catch { return null; }
  }

  async function handleCreate() {
    if (!originCity.trim()) { Alert.alert("Ville de départ requise"); return; }
    if (!destCity.trim()) { Alert.alert("Ville d'arrivée requise"); return; }
    if (!departureDate.trim() || !departureTime.trim()) { Alert.alert("Date et heure de départ requises"); return; }
    if (!capacity.trim() || parseFloat(capacity) <= 0) { Alert.alert("Capacité invalide"); return; }
    if (!price.trim() || parseFloat(price) <= 0) { Alert.alert("Prix invalide"); return; }

    const departure_at = buildIso(departureDate, departureTime);
    if (!departure_at) { Alert.alert("Format de date invalide", "Utilisez JJ/MM/AAAA et HH:MM."); return; }

    setSubmitting(true);
    try {
      const body: any = {
        origin_country: originCountry,
        origin_city: originCity.trim(),
        dest_country: destCountry,
        dest_city: destCity.trim(),
        departure_at,
        capacity_kg: parseFloat(capacity),
        price_per_kg: parseFloat(price),
        home_delivery_price: 8,
        status: "PUBLISHED",
      };

      const arrivalIso = buildIso(arrivalDate, arrivalTime);
      if (arrivalIso) body.arrival_eta = arrivalIso;

      const res = await apiFetch("/trips/", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Erreur", data?.detail || JSON.stringify(data));
        return;
      }
      Alert.alert("Trajet créé !", `Trajet #${data.id} publié avec succès.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Erreur", "Impossible de joindre le serveur.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mb-3">
          <ArrowLeft color="#6b7280" size={22} />
        </TouchableOpacity>
        <Text className="text-xl font-black text-dark">Nouveau trajet</Text>
        <Text className="text-gray-400 text-xs mt-0.5">Créez un trajet pour vos clients</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">

        {/* Itinéraire */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm gap-4">
          <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest">Itinéraire</Text>

          <View className="flex-row items-center gap-2">
            <View className="flex-1 gap-3">
              <Field label="Pays de départ" required>
                <CountrySelector value={originCountry} onChange={setOriginCountry} />
              </Field>
              <Field label="Ville de départ" required>
                <TextInput
                  value={originCity}
                  onChangeText={setOriginCity}
                  placeholder="Ex: Paris"
                  placeholderTextColor="#9ca3af"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                />
              </Field>
            </View>

            <ArrowRight color="#2563eb" size={20} />

            <View className="flex-1 gap-3">
              <Field label="Pays d'arrivée" required>
                <CountrySelector value={destCountry} onChange={setDestCountry} />
              </Field>
              <Field label="Ville d'arrivée" required>
                <TextInput
                  value={destCity}
                  onChangeText={setDestCity}
                  placeholder="Ex: Casablanca"
                  placeholderTextColor="#9ca3af"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                />
              </Field>
            </View>
          </View>
        </View>

        {/* Dates */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm gap-4">
          <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest">Dates</Text>

          <View className="gap-3">
            <Text className="text-xs font-bold text-gray-500 -mb-1">Départ *</Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <TextInput
                  value={departureDate}
                  onChangeText={setDepartureDate}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor="#9ca3af"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View className="w-28">
                <TextInput
                  value={departureTime}
                  onChangeText={setDepartureTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#9ca3af"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-xs font-bold text-gray-500 -mb-1">Arrivée estimée (optionnel)</Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <TextInput
                  value={arrivalDate}
                  onChangeText={setArrivalDate}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor="#9ca3af"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View className="w-28">
                <TextInput
                  value={arrivalTime}
                  onChangeText={setArrivalTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#9ca3af"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Tarifs */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm gap-4">
          <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest">Tarifs & Capacité</Text>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="Capacité (kg)" required>
                <TextInput
                  value={capacity}
                  onChangeText={setCapacity}
                  placeholder="Ex: 500"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="Prix/kg (€)" required>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  placeholder="Ex: 5.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
                />
              </Field>
            </View>
          </View>

          <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row justify-between">
            <Text className="text-gray-400 text-sm">Livraison à domicile</Text>
            <Text className="text-dark font-bold text-sm">8.00 €</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleCreate}
          disabled={submitting}
          className="bg-primary rounded-full py-4 items-center"
          style={{ opacity: submitting ? 0.7 : 1 }}
        >
          {submitting
            ? <ActivityIndicator color="white" />
            : <Text className="text-white font-bold text-base">Publier le trajet</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
