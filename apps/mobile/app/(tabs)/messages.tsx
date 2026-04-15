import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { MessageSquare, ChevronRight } from "lucide-react-native";

type Conversation = {
  id: number;
  agency_id: number;
  agency_name: string;
  client_username: string;
  unread_count: number;
  updated_at: string;
  last_message: { content: string; sender_username: string } | null;
};

export default function MessagesScreen() {
  const router = useRouter();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await apiFetch("/conversations/");
      if (res.ok) setConvs(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <Text className="text-xl font-black text-dark">Messages</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : convs.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MessageSquare color="#d1d5db" size={48} />
          <Text className="text-gray-400 font-semibold mt-3 text-center">
            Aucun message pour le moment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={convs}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(false); }}
              tintColor="#2563eb"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/conversation/${item.id}`)}
              className="bg-white rounded-2xl px-4 py-3.5 border border-gray-100 shadow-sm active:opacity-80 flex-row items-center gap-3"
            >
              <View className="h-11 w-11 rounded-full bg-primary items-center justify-center shrink-0">
                <Text className="text-white font-black text-sm">
                  {item.agency_name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-dark font-bold text-sm" numberOfLines={1}>
                  {item.agency_name}
                </Text>
                {item.last_message && (
                  <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
                    {item.last_message.sender_username} : {item.last_message.content}
                  </Text>
                )}
              </View>
              <View className="items-end gap-1">
                {item.unread_count > 0 && (
                  <View className="bg-primary rounded-full h-5 w-5 items-center justify-center">
                    <Text className="text-white text-[10px] font-bold">{item.unread_count}</Text>
                  </View>
                )}
                <ChevronRight color="#d1d5db" size={16} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
