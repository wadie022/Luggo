import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Linking, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch, getRole, API_BASE } from "@/lib/api";
import {
  ArrowLeft, Star, MapPin, Shield, MessageSquare,
  ArrowRight, Calendar, ExternalLink, Package,
} from "lucide-react-native";

const COUNTRY_NAMES: Record<string, string> = {
  FR: "France", BE: "Belgique", ES: "Espagne", IT: "Italie",
  NL: "Pays-Bas", CH: "Suisse", DE: "Allemagne", PT: "Portugal", MA: "Maroc",
};

type Agency = {
  id: number;
  legal_name: string;
  city: string;
  country: string;
  address: string;
  kyc_status: string;
  avg_rating: number | null;
  review_count: number;
  branches: {
    id: number;
    label: string;
    address: string;
    city: string;
    country: string;
    is_main: boolean;
    latitude: number | null;
    longitude: number | null;
  }[];
  trips: {
    id: number;
    origin_city: string;
    origin_country: string;
    dest_city: string;
    dest_country: string;
    departure_at: string;
    price_per_kg: number;
    capacity_kg: number;
  }[];
  reviews: {
    id: number;
    rating: number;
    comment: string;
    created_at: string;
    reviewer_username: string;
  }[];
};

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          color="#f59e0b"
          fill={n <= Math.round(rating) ? "#f59e0b" : "transparent"}
        />
      ))}
    </View>
  );
}

export default function AgenceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/agencies/${id}/`).then((r) => r.json()),
      getRole(),
    ]).then(([agencyData, userRole]) => {
      setAgency(agencyData);
      setRole(userRole);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, [id]);

  async function handleContact() {
    setContactLoading(true);
    try {
      const res = await apiFetch("/conversations/", {
        method: "POST",
        body: JSON.stringify({ agency_id: Number(id), content: "Bonjour, je vous contacte depuis l'application Luggo." }),
      });
      if (res.ok) {
        const conv = await res.json();
        router.push(`/conversation/${conv.id}`);
      } else {
        // Maybe conversation already exists — try to find it
        const convsRes = await apiFetch("/conversations/");
        if (convsRes.ok) {
          const convs = await convsRes.json();
          const existing = convs.find((c: any) => String(c.agency_id) === String(id));
          if (existing) {
            router.push(`/conversation/${existing.id}`);
            return;
          }
        }
        Alert.alert("Erreur", "Impossible de démarrer la conversation.");
      }
    } catch {
      Alert.alert("Erreur", "Impossible de joindre le serveur.");
    } finally {
      setContactLoading(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (!agency) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-gray-400">Agence introuvable.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mb-3">
          <ArrowLeft color="#6b7280" size={22} />
        </TouchableOpacity>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-xl font-black text-dark flex-1">{agency.legal_name}</Text>
              {agency.kyc_status === "VERIFIED" && (
                <Shield color="#16a34a" size={18} fill="#16a34a" />
              )}
            </View>
            <View className="flex-row items-center gap-1 mb-1">
              <MapPin color="#9ca3af" size={12} />
              <Text className="text-gray-400 text-sm">
                {agency.city}{agency.country ? `, ${COUNTRY_NAMES[agency.country] || agency.country}` : ""}
              </Text>
            </View>
            {agency.avg_rating !== null && (
              <View className="flex-row items-center gap-2">
                <Stars rating={agency.avg_rating} />
                <Text className="text-gray-500 text-xs">
                  {agency.avg_rating.toFixed(1)} · {agency.review_count} avis
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>

        {/* Contact button */}
        {role !== "AGENCY" && (
          <TouchableOpacity
            onPress={handleContact}
            disabled={contactLoading}
            className="bg-primary rounded-2xl py-4 flex-row items-center justify-center gap-2"
            style={{ opacity: contactLoading ? 0.7 : 1 }}
          >
            {contactLoading
              ? <ActivityIndicator color="white" size="small" />
              : <>
                  <MessageSquare color="white" size={16} />
                  <Text className="text-white font-bold text-base">Contacter l'agence</Text>
                </>
            }
          </TouchableOpacity>
        )}

        {/* Agences / adresses */}
        {agency.branches.length > 0 && (
          <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">
              Adresses ({agency.branches.length})
            </Text>
            {agency.branches.map((branch, idx) => (
              <View
                key={branch.id}
                className={`py-3 ${idx < agency.branches.length - 1 ? "border-b border-gray-50" : ""}`}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <View className="flex-row items-center gap-2 mb-0.5">
                      <Text className="text-dark font-semibold text-sm">
                        {branch.label || branch.city}
                      </Text>
                      {branch.is_main && (
                        <View className="bg-blue-50 border border-blue-100 rounded-full px-1.5 py-0.5">
                          <Text className="text-primary text-[10px] font-bold">Principale</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-gray-400 text-xs">
                      {branch.address}{branch.address ? ", " : ""}{branch.city}
                      {branch.country ? ` · ${COUNTRY_NAMES[branch.country] || branch.country}` : ""}
                    </Text>
                  </View>
                  {branch.latitude && branch.longitude && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(
                        `https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`
                      )}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-2"
                    >
                      <ExternalLink color="#6b7280" size={14} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Trajets disponibles */}
        {agency.trips.length > 0 && (
          <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">
              Trajets ({agency.trips.length})
            </Text>
            {agency.trips.map((trip, idx) => (
              <TouchableOpacity
                key={trip.id}
                onPress={() => router.push(`/trips/${trip.id}`)}
                className={`py-3 ${idx < agency.trips.length - 1 ? "border-b border-gray-50" : ""}`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2 flex-1">
                    <Text className="text-dark font-bold text-sm">{trip.origin_city}</Text>
                    <ArrowRight color="#2563eb" size={13} />
                    <Text className="text-dark font-bold text-sm">{trip.dest_city}</Text>
                  </View>
                  <Text className="text-primary font-black text-sm">{trip.price_per_kg} €/kg</Text>
                </View>
                <View className="flex-row items-center gap-1 mt-0.5">
                  <Calendar color="#9ca3af" size={11} />
                  <Text className="text-gray-400 text-xs">
                    {new Date(trip.departure_at).toLocaleDateString("fr-FR", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </Text>
                  <Text className="text-gray-300 text-xs ml-2">·</Text>
                  <Package color="#9ca3af" size={11} />
                  <Text className="text-gray-400 text-xs">{trip.capacity_kg} kg</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Avis */}
        <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest">
              Avis ({agency.review_count})
            </Text>
            {agency.avg_rating !== null && (
              <View className="flex-row items-center gap-1">
                <Stars rating={agency.avg_rating} size={12} />
                <Text className="text-gray-500 text-xs font-bold">{agency.avg_rating.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {agency.reviews.length === 0 ? (
            <Text className="text-gray-400 text-sm text-center py-4">
              Aucun avis pour le moment.
            </Text>
          ) : (
            agency.reviews.map((review, idx) => (
              <View
                key={review.id}
                className={`py-3 ${idx < agency.reviews.length - 1 ? "border-b border-gray-50" : ""}`}
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
                  <Stars rating={review.rating} size={12} />
                </View>
                {review.comment ? (
                  <Text className="text-gray-500 text-sm leading-5 ml-9">{review.comment}</Text>
                ) : null}
                <Text className="text-gray-300 text-xs mt-1 ml-9">
                  {new Date(review.created_at).toLocaleDateString("fr-FR")}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
