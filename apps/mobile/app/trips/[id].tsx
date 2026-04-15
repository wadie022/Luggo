import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_BASE, apiFetch, getAccessToken } from "@/lib/api";
import { ArrowLeft, ArrowRight, Calendar, MapPin, Package, Home, Building2 } from "lucide-react-native";

type Trip = {
  id: number;
  origin_city: string;
  origin_country: string;
  dest_city: string;
  dest_country: string;
  departure_at: string;
  price_per_kg: number;
  capacity_kg: number;
  agency_name: string;
};

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  const [weight, setWeight] = useState("1");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"PICKUP" | "HOME_DELIVERY">("PICKUP");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/trips/${id}/`)
      .then((r) => r.json())
      .then(setTrip)
      .finally(() => setLoading(false));
  }, [id]);

  const basePrice = trip ? parseFloat(weight || "0") * trip.price_per_kg : 0;
  const deliveryFee = deliveryType === "HOME_DELIVERY" ? 8 : 0;
  const total = basePrice + deliveryFee;

  async function handleBook() {
    const token = await getAccessToken();
    if (!token) {
      Alert.alert("Connexion requise", "Tu dois être connecté pour réserver.", [
        { text: "Annuler", style: "cancel" },
        { text: "Se connecter", onPress: () => router.push("/(auth)/login") },
      ]);
      return;
    }
    if (!phone.trim()) { Alert.alert("Téléphone requis"); return; }
    if (deliveryType === "HOME_DELIVERY" && !address.trim()) {
      Alert.alert("Adresse requise"); return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/shipments/", {
        method: "POST",
        body: JSON.stringify({
          trip: Number(id),
          customer_phone: phone.trim(),
          weight_kg: parseFloat(weight) || 1,
          description,
          delivery_type: deliveryType,
          delivery_address: deliveryType === "HOME_DELIVERY" ? address.trim() : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Erreur", data?.detail || "Impossible de créer la demande.");
        return;
      }
      Alert.alert(
        "Demande envoyée !",
        `Colis #${data.id} créé. Tu peux suivre son état dans "Mes colis".`,
        [{ text: "Voir mes colis", onPress: () => router.replace("/(tabs)/mes-colis") }]
      );
    } catch {
      Alert.alert("Erreur", "Impossible de joindre le serveur.");
    } finally {
      setSubmitting(false);
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
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-gray-400">Trajet introuvable.</Text>
      </View>
    );
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
        <View className="flex-row items-center gap-2">
          <Text className="text-dark font-black text-xl">{trip.origin_city}</Text>
          <ArrowRight color="#2563eb" size={18} />
          <Text className="text-dark font-black text-xl">{trip.dest_city}</Text>
        </View>
        <View className="flex-row items-center gap-1 mt-1">
          <MapPin color="#9ca3af" size={12} />
          <Text className="text-gray-400 text-xs">
            {trip.origin_country} → {trip.dest_country} · {trip.agency_name}
          </Text>
        </View>
        <View className="flex-row items-center gap-1 mt-0.5">
          <Calendar color="#9ca3af" size={12} />
          <Text className="text-gray-400 text-xs">
            Départ : {new Date(trip.departure_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">

        {/* Prix estimé */}
        <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Estimation</Text>
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-500 text-sm">Transport ({weight || 0} kg)</Text>
            <Text className="text-dark font-semibold text-sm">{basePrice.toFixed(2)} €</Text>
          </View>
          {deliveryType === "HOME_DELIVERY" && (
            <View className="flex-row justify-between mb-1">
              <Text className="text-gray-500 text-sm">Livraison à domicile</Text>
              <Text className="text-dark font-semibold text-sm">8.00 €</Text>
            </View>
          )}
          <View className="border-t border-blue-200 mt-2 pt-2 flex-row justify-between">
            <Text className="font-bold text-dark">Total</Text>
            <Text className="font-black text-primary text-xl">{total.toFixed(2)} €</Text>
          </View>
        </View>

        {/* Formulaire */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 gap-4 shadow-sm">
          <Field label="Téléphone">
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+33 6 00 00 00 00"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
            />
          </Field>

          <Field label="Poids du colis (kg)">
            <TextInput
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor="#9ca3af"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
            />
          </Field>

          <Field label="Description (optionnel)">
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Vêtements, documents…"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={2}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
              style={{ minHeight: 72, textAlignVertical: "top" }}
            />
          </Field>

          {/* Mode livraison */}
          <View>
            <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">
              Mode de réception
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setDeliveryType("PICKUP")}
                className={`flex-1 rounded-xl p-3 items-center border-2 flex-row justify-center gap-2 ${
                  deliveryType === "PICKUP" ? "border-primary bg-blue-50" : "border-gray-200 bg-white"
                }`}
              >
                <Building2 color={deliveryType === "PICKUP" ? "#2563eb" : "#9ca3af"} size={16} />
                <Text className={`text-xs font-bold ${deliveryType === "PICKUP" ? "text-primary" : "text-gray-400"}`}>
                  Au bureau
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDeliveryType("HOME_DELIVERY")}
                className={`flex-1 rounded-xl p-3 items-center border-2 flex-row justify-center gap-2 ${
                  deliveryType === "HOME_DELIVERY" ? "border-primary bg-blue-50" : "border-gray-200 bg-white"
                }`}
              >
                <Home color={deliveryType === "HOME_DELIVERY" ? "#2563eb" : "#9ca3af"} size={16} />
                <Text className={`text-xs font-bold ${deliveryType === "HOME_DELIVERY" ? "text-primary" : "text-gray-400"}`}>
                  À domicile
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {deliveryType === "HOME_DELIVERY" && (
            <Field label="Adresse de livraison">
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="12 rue des Lilas, Casablanca"
                placeholderTextColor="#9ca3af"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
              />
            </Field>
          )}
        </View>

        <TouchableOpacity
          onPress={handleBook}
          disabled={submitting}
          className="bg-primary rounded-full py-4 items-center"
          style={{ opacity: submitting ? 0.7 : 1 }}
        >
          {submitting
            ? <ActivityIndicator color="white" />
            : <Text className="text-white font-bold text-base">Envoyer la demande</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
