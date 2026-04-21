import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, TextInput,
} from "react-native";
import { apiFetch } from "@/lib/api";
import { Search, Users, Ban, CheckCircle } from "lucide-react-native";

type AppUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  date_joined: string;
};

const ROLE_CFG: Record<string, { label: string; color: string }> = {
  CLIENT: { label: "Client", color: "#2563eb" },
  AGENCY: { label: "Agence", color: "#7c3aed" },
  ADMIN:  { label: "Admin",  color: "#d97706" },
};

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await apiFetch("/admin/users/");
      if (res.ok) setUsers(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q)
    );
  });

  async function toggleBan(user: AppUser) {
    const action = user.is_active ? "Désactiver" : "Réactiver";
    Alert.alert(
      `${action} le compte ?`,
      `${action} le compte de ${user.first_name} ${user.last_name} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: action,
          style: user.is_active ? "destructive" : "default",
          onPress: async () => {
            setProcessing(user.id);
            try {
              const res = await apiFetch(`/admin/users/${user.id}/`, {
                method: "PATCH",
                body: JSON.stringify({ is_active: !user.is_active }),
              });
              if (res.ok) {
                setUsers((prev) =>
                  prev.map((u2) => u2.id === user.id ? { ...u2, is_active: !u2.is_active } : u2)
                );
              } else {
                Alert.alert("Erreur", "Action impossible.");
              }
            } catch {
              Alert.alert("Erreur", "Action impossible.");
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-5 pt-14 pb-3 border-b border-gray-100">
        <Text className="text-xl font-black text-dark mb-1">Utilisateurs</Text>
        <Text className="text-gray-400 text-xs mb-3">{users.length} comptes enregistrés</Text>

        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 gap-2">
          <Search color="#9ca3af" size={14} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher par nom ou email…"
            placeholderTextColor="#9ca3af"
            className="flex-1 text-dark text-xs"
            style={{ fontSize: 13 }}
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Users color="#d1d5db" size={48} />
          <Text className="text-gray-400 font-semibold mt-3 text-center">
            {search ? "Aucun résultat." : "Aucun utilisateur."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => String(u.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} tintColor="#2563eb" />
          }
          renderItem={({ item }) => {
            const roleCfg = ROLE_CFG[item.role] ?? { label: item.role, color: "#6b7280" };
            const isProcessing = processing === item.id;
            return (
              <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-0.5">
                      <Text className="text-dark font-black text-sm">
                        {item.first_name} {item.last_name}
                      </Text>
                      {!item.is_active && (
                        <View className="bg-red-50 rounded px-1.5 py-0.5">
                          <Text className="text-red-600 text-[10px] font-bold">Banni</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-gray-400 text-xs">{item.email}</Text>
                    <View className="flex-row items-center gap-2 mt-1.5">
                      <View className="rounded-lg px-2 py-0.5" style={{ backgroundColor: roleCfg.color + "15" }}>
                        <Text className="text-[11px] font-bold" style={{ color: roleCfg.color }}>{roleCfg.label}</Text>
                      </View>
                      <Text className="text-gray-300 text-[11px]">
                        Inscrit {new Date(item.date_joined).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </Text>
                    </View>
                  </View>

                  {item.role !== "ADMIN" && (
                    <TouchableOpacity
                      onPress={() => toggleBan(item)}
                      disabled={isProcessing}
                      className={`flex-row items-center gap-1 rounded-xl px-3 py-2 ${item.is_active ? "bg-red-50 border border-red-100" : "bg-green-50 border border-green-100"}`}
                      style={{ opacity: isProcessing ? 0.7 : 1 }}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color={item.is_active ? "#dc2626" : "#16a34a"} />
                      ) : item.is_active ? (
                        <>
                          <Ban color="#dc2626" size={13} />
                          <Text className="text-red-600 text-xs font-bold">Bannir</Text>
                        </>
                      ) : (
                        <>
                          <CheckCircle color="#16a34a" size={13} />
                          <Text className="text-green-700 text-xs font-bold">Réactiver</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
