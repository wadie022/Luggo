import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, Star, Save, User } from "lucide-react-native";

const COUNTRIES = [
  { code: "FR", name: "France" }, { code: "BE", name: "Belgique" },
  { code: "ES", name: "Espagne" }, { code: "IT", name: "Italie" },
  { code: "NL", name: "Pays-Bas" }, { code: "CH", name: "Suisse" },
  { code: "DE", name: "Allemagne" }, { code: "PT", name: "Portugal" },
  { code: "MA", name: "Maroc" },
];

type Profile = {
  legal_name: string;
  registration_number: string;
  city: string;
  country: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  kyc_status: string;
};

type Review = {
  id: number;
  reviewer_username: string;
  rating: number;
  comment: string;
  created_at: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} color="#f59e0b" fill={n <= Math.round(rating) ? "#f59e0b" : "transparent"} />
      ))}
    </View>
  );
}

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
        <View className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
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

export default function AgencyProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [city, setCity] = useState("");
  const [country, setCountry] = useState("FR");
  const [address, setAddress] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch("/agency/profile/").then((r) => r.json()),
      apiFetch("/reviews/").then((r) => r.ok ? r.json() : []),
    ]).then(([profileData, reviewsData]) => {
      setProfile(profileData);
      setCity(profileData.city || "");
      setCountry(profileData.country || "FR");
      setAddress(profileData.address || "");
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await apiFetch("/agency/profile/", {
        method: "PATCH",
        body: JSON.stringify({ city: city.trim(), country, address: address.trim() }),
      });
      if (res.ok) {
        Alert.alert("Enregistré !", "Votre profil a été mis à jour.");
      } else {
        const data = await res.json();
        Alert.alert("Erreur", data?.detail || "Impossible d'enregistrer.");
      }
    } catch {
      Alert.alert("Erreur", "Impossible de joindre le serveur.");
    } finally {
      setSaving(false);
    }
  }

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#2563eb" />
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
        <Text className="text-xl font-black text-dark">Profil agence</Text>
        {profile?.legal_name && (
          <Text className="text-gray-400 text-sm mt-0.5">{profile.legal_name}</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">

        {/* Infos légales (lecture seule) */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm gap-3">
          <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest">
            Informations légales
          </Text>
          <View className="bg-gray-50 rounded-xl p-3 gap-2">
            <Text className="text-xs text-gray-400">Raison sociale</Text>
            <Text className="text-dark font-semibold">{profile?.legal_name || "—"}</Text>
          </View>
          <View className="bg-gray-50 rounded-xl p-3 gap-2">
            <Text className="text-xs text-gray-400">N° d'enregistrement</Text>
            <Text className="text-dark font-semibold">{profile?.registration_number || "—"}</Text>
          </View>
          <Text className="text-gray-300 text-xs">
            Ces informations sont définies lors de la vérification KYB.
          </Text>
        </View>

        {/* Coordonnées modifiables */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm gap-4">
          <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest">
            Coordonnées
          </Text>

          <Field label="Pays">
            <CountrySelector value={country} onChange={setCountry} />
          </Field>

          <Field label="Ville">
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="Ex: Paris"
              placeholderTextColor="#9ca3af"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
            />
          </Field>

          <Field label="Adresse">
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Ex: 12 rue des Lilas"
              placeholderTextColor="#9ca3af"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm"
            />
          </Field>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-primary rounded-full py-3.5 items-center flex-row justify-center gap-2"
            style={{ opacity: saving ? 0.7 : 1 }}
          >
            {saving
              ? <ActivityIndicator color="white" size="small" />
              : <>
                  <Save color="white" size={15} />
                  <Text className="text-white font-bold">Enregistrer</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* Avis reçus */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest">
              Avis clients ({reviews.length})
            </Text>
            {avgRating !== null && (
              <View className="flex-row items-center gap-1">
                <Stars rating={avgRating} />
                <Text className="text-gray-500 text-xs font-bold">{avgRating.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {reviews.length === 0 ? (
            <Text className="text-gray-400 text-sm text-center py-4">
              Aucun avis pour le moment.
            </Text>
          ) : (
            reviews.slice(0, 10).map((review, idx) => (
              <View
                key={review.id}
                className={`py-3 ${idx < Math.min(reviews.length, 10) - 1 ? "border-b border-gray-50" : ""}`}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center gap-2">
                    <View className="h-7 w-7 rounded-full bg-gray-100 items-center justify-center">
                      <Text className="text-gray-500 font-bold text-xs">
                        {review.reviewer_username.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <Text className="text-dark font-semibold text-sm">{review.reviewer_username}</Text>
                  </View>
                  <Stars rating={review.rating} />
                </View>
                {review.comment ? (
                  <Text className="text-gray-500 text-sm ml-9 leading-5">{review.comment}</Text>
                ) : null}
                <Text className="text-gray-300 text-xs mt-1 ml-9">
                  {new Date(review.created_at).toLocaleDateString("fr-FR")}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
