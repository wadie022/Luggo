import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { fetchMe, logout, apiUpload, apiFetch } from "@/lib/api";
import {
  User, LogOut, Shield, Package, ChevronRight,
  MessageCircle, Truck, Star, Camera, Building2,
} from "lucide-react-native";

type Me = {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  kyc_status: string;
  avatar_url?: string | null;
};

type Review = {
  id: number;
  reviewer_username: string;
  agency_name?: string;
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

function MenuItem({
  icon, label, onPress, last = false,
}: {
  icon: React.ReactNode; label: string; onPress: () => void; last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-gray-50 ${last ? "" : "border-b border-gray-50"}`}
    >
      <View className="h-8 w-8 rounded-xl bg-blue-50 items-center justify-center">{icon}</View>
      <Text className="text-dark font-semibold text-sm flex-1">{label}</Text>
      <ChevronRight color="#d1d5db" size={16} />
    </TouchableOpacity>
  );
}

export default function ProfilScreen() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchMe()
      .then((meData) => {
        setMe(meData);
        return apiFetch("/reviews/");
      })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => router.replace("/(auth)/login"))
      .finally(() => setLoading(false));
  }, []);

  async function handleAvatarUpload() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("avatar", {
        uri: result.assets[0].uri,
        type: "image/jpeg",
        name: "avatar.jpg",
      } as any);
      const res = await apiUpload("/me/avatar/", form, "PATCH");
      if (res.ok) {
        const updated = await res.json();
        setMe((prev) => prev ? { ...prev, avatar_url: updated.avatar_url } : prev);
        Alert.alert("Photo mise à jour !");
      } else {
        Alert.alert("Erreur", "Impossible de mettre à jour la photo.");
      }
    } catch {
      Alert.alert("Erreur", "Impossible de joindre le serveur.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleLogout() {
    Alert.alert("Déconnexion", "Tu veux vraiment te déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion", style: "destructive",
        onPress: async () => { await logout(); router.replace("/(auth)/login"); },
      },
    ]);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }
  if (!me) return null;

  const initials = me.username.slice(0, 2).toUpperCase();
  const fullName = [me.first_name, me.last_name].filter(Boolean).join(" ");
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header avatar */}
      <View className="bg-white px-5 pt-14 pb-6 border-b border-gray-100">
        <View className="items-center">
          {/* Avatar */}
          <TouchableOpacity onPress={handleAvatarUpload} className="mb-3 relative">
            {me.avatar_url ? (
              <Image
                source={{ uri: me.avatar_url }}
                className="h-20 w-20 rounded-full"
                style={{ width: 80, height: 80, borderRadius: 40 }}
              />
            ) : (
              <View className="h-20 w-20 rounded-full bg-primary items-center justify-center">
                <Text className="text-white font-black text-3xl">{initials}</Text>
              </View>
            )}
            {uploadingAvatar ? (
              <View className="absolute inset-0 rounded-full bg-black/40 items-center justify-center">
                <ActivityIndicator color="white" size="small" />
              </View>
            ) : (
              <View className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-white border-2 border-gray-100 items-center justify-center shadow-sm">
                <Camera color="#6b7280" size={13} />
              </View>
            )}
          </TouchableOpacity>

          {fullName
            ? <Text className="text-xl font-black text-dark">{fullName}</Text>
            : <Text className="text-xl font-black text-dark">{me.username}</Text>
          }
          {fullName && <Text className="text-gray-400 text-sm mt-0.5">@{me.username}</Text>}
          <Text className="text-gray-400 text-sm mt-0.5">{me.email}</Text>

          <View className="flex-row items-center gap-2 mt-2">
            <View className="bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
              <Text className="text-primary text-xs font-bold">
                {me.role === "AGENCY" ? "Agence" : me.role === "ADMIN" ? "Admin" : "Client"}
              </Text>
            </View>
            {avgRating !== null && (
              <View className="flex-row items-center gap-1 bg-amber-50 border border-amber-100 rounded-full px-3 py-1">
                <Star color="#f59e0b" size={12} fill="#f59e0b" />
                <Text className="text-amber-600 text-xs font-bold">{avgRating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View className="px-5 py-5 gap-3">

        {/* KYC (clients) */}
        {me.role === "CLIENT" && (
          <TouchableOpacity
            onPress={() => router.push("/kyc")}
            className={`rounded-2xl p-4 border flex-row items-center gap-3 ${
              me.kyc_status === "VERIFIED" ? "bg-emerald-50 border-emerald-200"
              : me.kyc_status === "REJECTED" ? "bg-red-50 border-red-200"
              : "bg-amber-50 border-amber-200"
            }`}
          >
            <Shield
              color={me.kyc_status === "VERIFIED" ? "#16a34a" : me.kyc_status === "REJECTED" ? "#dc2626" : "#d97706"}
              size={20}
            />
            <View className="flex-1">
              <Text className={`font-bold text-sm ${
                me.kyc_status === "VERIFIED" ? "text-emerald-700"
                : me.kyc_status === "REJECTED" ? "text-red-700" : "text-amber-700"
              }`}>Vérification d'identité</Text>
              <Text className={`text-xs mt-0.5 ${
                me.kyc_status === "VERIFIED" ? "text-emerald-600"
                : me.kyc_status === "REJECTED" ? "text-red-600" : "text-amber-600"
              }`}>
                {me.kyc_status === "VERIFIED" ? "Identité vérifiée ✓"
                : me.kyc_status === "REJECTED" ? "Refusé — appuyer pour resoumettre"
                : "En attente de vérification"}
              </Text>
            </View>
            {me.kyc_status !== "VERIFIED" && <ChevronRight color="#9ca3af" size={16} />}
          </TouchableOpacity>
        )}

        {/* Menu CLIENT */}
        {me.role === "CLIENT" && (
          <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <MenuItem icon={<Package color="#2563eb" size={18} />} label="Mes colis" onPress={() => router.push("/(tabs)/mes-colis")} />
            <MenuItem icon={<MessageCircle color="#2563eb" size={18} />} label="Réclamations" onPress={() => router.push("/reclamations")} />
            <MenuItem icon={<User color="#2563eb" size={18} />} label="Informations du compte" onPress={() => {}} last />
          </View>
        )}

        {/* Menu AGENCY */}
        {me.role === "AGENCY" && (
          <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <MenuItem icon={<Truck color="#2563eb" size={18} />} label="Mes trajets" onPress={() => router.push("/(tabs)/trajets")} />
            <MenuItem icon={<Package color="#2563eb" size={18} />} label="Demandes clients" onPress={() => router.push("/(tabs)/demandes")} />
            <MenuItem icon={<Building2 color="#2563eb" size={18} />} label="Profil agence" onPress={() => router.push("/agency/profile")} />
            <MenuItem icon={<Shield color="#2563eb" size={18} />} label="Vérification KYB" onPress={() => router.push("/agency/kyb")} />
            <MenuItem icon={<MessageCircle color="#2563eb" size={18} />} label="Messages" onPress={() => router.push("/(tabs)/messages")} last />
          </View>
        )}

        {/* Avis reçus */}
        {reviews.length > 0 && (
          <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                Avis reçus ({reviews.length})
              </Text>
              {avgRating !== null && <Stars rating={avgRating} />}
            </View>
            {reviews.slice(0, 5).map((review, idx) => (
              <View
                key={review.id}
                className={`py-3 ${idx < Math.min(reviews.length, 5) - 1 ? "border-b border-gray-50" : ""}`}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-dark font-semibold text-sm">
                    {review.agency_name || review.reviewer_username}
                  </Text>
                  <Stars rating={review.rating} />
                </View>
                {review.comment ? (
                  <Text className="text-gray-500 text-sm leading-5">{review.comment}</Text>
                ) : null}
                <Text className="text-gray-300 text-xs mt-1">
                  {new Date(review.created_at).toLocaleDateString("fr-FR")}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Déconnexion */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-white rounded-2xl border border-red-100 p-4 flex-row items-center gap-3 shadow-sm"
        >
          <LogOut color="#dc2626" size={18} />
          <Text className="text-red-600 font-bold flex-1">Se déconnecter</Text>
        </TouchableOpacity>

        <Text className="text-center text-gray-300 text-xs mt-4">Luggo v1.0 · luggo.ma</Text>
      </View>
    </ScrollView>
  );
}
