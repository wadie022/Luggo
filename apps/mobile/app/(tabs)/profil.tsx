import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { fetchMe, logout } from "@/lib/api";
import { User, LogOut, Shield, Package, ChevronRight } from "lucide-react-native";

type Me = {
  id: number;
  username: string;
  email: string;
  role: string;
  kyc_status: string;
};

export default function ProfilScreen() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe().then(setMe).catch(() => router.replace("/(auth)/login")).finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    Alert.alert("Déconnexion", "Tu veux vraiment te déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion", style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
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

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-white px-5 pt-14 pb-6 border-b border-gray-100">
        <View className="items-center">
          <View className="h-20 w-20 rounded-full bg-primary items-center justify-center mb-3">
            <Text className="text-white font-black text-3xl">{initials}</Text>
          </View>
          <Text className="text-xl font-black text-dark">{me.username}</Text>
          <Text className="text-gray-400 text-sm mt-0.5">{me.email}</Text>
          <View className="mt-2 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
            <Text className="text-primary text-xs font-bold">{me.role}</Text>
          </View>
        </View>
      </View>

      <View className="px-5 py-5 gap-3">

        {/* KYC status pour les clients */}
        {me.role === "CLIENT" && (
          <View className={`rounded-2xl p-4 border flex-row items-center gap-3 ${
            me.kyc_status === "VERIFIED"
              ? "bg-emerald-50 border-emerald-200"
              : me.kyc_status === "REJECTED"
              ? "bg-red-50 border-red-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            <Shield
              color={me.kyc_status === "VERIFIED" ? "#16a34a" : me.kyc_status === "REJECTED" ? "#dc2626" : "#d97706"}
              size={20}
            />
            <View className="flex-1">
              <Text className={`font-bold text-sm ${
                me.kyc_status === "VERIFIED" ? "text-emerald-700"
                : me.kyc_status === "REJECTED" ? "text-red-700"
                : "text-amber-700"
              }`}>
                Vérification d'identité
              </Text>
              <Text className={`text-xs mt-0.5 ${
                me.kyc_status === "VERIFIED" ? "text-emerald-600"
                : me.kyc_status === "REJECTED" ? "text-red-600"
                : "text-amber-600"
              }`}>
                {me.kyc_status === "VERIFIED" ? "Identité vérifiée"
                : me.kyc_status === "REJECTED" ? "Rejeté — soumettre à nouveau"
                : "En attente de vérification"}
              </Text>
            </View>
            {me.kyc_status !== "VERIFIED" && <ChevronRight color="#9ca3af" size={16} />}
          </View>
        )}

        {/* Menu */}
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {me.role === "CLIENT" && (
            <MenuItem
              icon={<Package color="#2563eb" size={18} />}
              label="Mes colis"
              onPress={() => router.push("/(tabs)/mes-colis")}
            />
          )}
          <MenuItem
            icon={<User color="#2563eb" size={18} />}
            label="Informations du compte"
            onPress={() => {}}
            last
          />
        </View>

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

function MenuItem({
  icon, label, onPress, last = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-gray-50 ${last ? "" : "border-b border-gray-50"}`}
    >
      <View className="h-8 w-8 rounded-xl bg-blue-50 items-center justify-center">
        {icon}
      </View>
      <Text className="text-dark font-semibold text-sm flex-1">{label}</Text>
      <ChevronRight color="#d1d5db" size={16} />
    </TouchableOpacity>
  );
}
