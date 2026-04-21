import { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  Image, ActionSheetIOS,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { apiFetch, apiUpload, fetchMe } from "@/lib/api";
import { ArrowLeft, Send, Paperclip, FileText } from "lucide-react-native";

type Msg = {
  id: number;
  sender_id: number;
  sender_username: string;
  content: string;
  msg_type: string;
  file_url: string | null;
  created_at: string;
  is_read: boolean;
};

type Me = { id: number; username: string };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [agencyName, setAgencyName] = useState("Conversation");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    const res = await apiFetch(`/conversations/${id}/messages/`);
    if (res.ok) setMessages(await res.json());
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const [meData, convsRes] = await Promise.all([fetchMe(), apiFetch("/conversations/")]);
        setMe(meData);
        if (convsRes.ok) {
          const convs = await convsRes.json();
          const conv = convs.find((c: any) => String(c.id) === String(id));
          if (conv) setAgencyName(conv.agency_name || conv.client_username || "Conversation");
        }
        apiFetch(`/conversations/${id}/read/`, { method: "PATCH" }).catch(() => {});
        await loadMessages();
      } catch {}
      finally { setLoading(false); }
    })();
  }, [id]);

  useEffect(() => {
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  async function sendText() {
    if (!text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText("");
    try {
      const res = await apiFetch(`/conversations/${id}/messages/`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error();
      await loadMessages();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert("Erreur", "Message non envoyé.");
      setText(content);
    } finally {
      setSending(false);
    }
  }

  async function sendImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setSending(true);
    try {
      const form = new FormData();
      form.append("file", {
        uri: result.assets[0].uri,
        type: "image/jpeg",
        name: "photo.jpg",
      } as any);
      form.append("msg_type", "image");
      form.append("content", "");

      const res = await apiUpload(`/conversations/${id}/messages/`, form);
      if (!res.ok) throw new Error();
      await loadMessages();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert("Erreur", "Impossible d'envoyer l'image.");
    } finally {
      setSending(false);
    }
  }

  function handleAttachment() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Annuler", "Photo"], cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) sendImage(); }
      );
    } else {
      Alert.alert("Joindre", "Que voulez-vous envoyer ?", [
        { text: "Annuler", style: "cancel" },
        { text: "Photo", onPress: sendImage },
      ]);
    }
  }

  const initials = agencyName.slice(0, 2).toUpperCase();

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View className="bg-white px-4 pt-14 pb-3 border-b border-gray-100 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ArrowLeft color="#6b7280" size={22} />
        </TouchableOpacity>
        <View className="h-10 w-10 rounded-full bg-primary items-center justify-center shrink-0">
          <Text className="text-white font-black text-sm">{initials}</Text>
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-dark font-bold text-base" numberOfLines={1}>{agencyName}</Text>
          <Text className="text-gray-400 text-xs">Conversation</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 12, gap: 6, paddingBottom: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12">
              <Text className="text-gray-400 text-sm text-center">
                Aucun message.{"\n"}Commencez la conversation !
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = me && item.sender_id === me.id;
            return (
              <View className={`flex-row ${isMe ? "justify-end" : "justify-start"}`}>
                <View
                  className={`max-w-[78%] rounded-2xl ${
                    isMe ? "bg-primary rounded-br-sm" : "bg-white border border-gray-100 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {/* Image */}
                  {item.msg_type === "image" && item.file_url ? (
                    <Image
                      source={{ uri: item.file_url }}
                      style={{ width: 200, height: 150, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  ) : item.msg_type === "document" && item.file_url ? (
                    <View className="flex-row items-center gap-2 px-4 py-3">
                      <FileText color={isMe ? "white" : "#2563eb"} size={20} />
                      <Text className={`text-sm font-semibold ${isMe ? "text-white" : "text-primary"}`}>
                        Document
                      </Text>
                    </View>
                  ) : null}

                  {/* Texte */}
                  {item.content ? (
                    <View className="px-4 py-2.5">
                      <Text className={`text-sm leading-5 ${isMe ? "text-white" : "text-dark"}`}>
                        {item.content}
                      </Text>
                    </View>
                  ) : null}

                  {/* Heure */}
                  <View className={`px-4 pb-2 ${item.content ? "pt-0" : "pt-2"}`}>
                    <Text className={`text-[10px] ${isMe ? "text-blue-200 text-right" : "text-gray-400"}`}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Input */}
      <View className="bg-white border-t border-gray-100 px-4 py-3 flex-row items-end gap-2">
        <TouchableOpacity
          onPress={handleAttachment}
          disabled={sending}
          className="h-10 w-10 rounded-full bg-gray-50 border border-gray-200 items-center justify-center"
          style={{ opacity: sending ? 0.5 : 1 }}
        >
          <Paperclip color="#6b7280" size={16} />
        </TouchableOpacity>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Votre message…"
          placeholderTextColor="#9ca3af"
          multiline
          style={{
            flex: 1, maxHeight: 100, fontSize: 14, color: "#111827",
            paddingTop: 10, paddingBottom: 10, paddingHorizontal: 16,
            backgroundColor: "#f9fafb", borderRadius: 20,
            borderWidth: 1, borderColor: "#e5e7eb",
          }}
        />

        <TouchableOpacity
          onPress={sendText}
          disabled={!text.trim() || sending}
          className="h-10 w-10 rounded-full bg-primary items-center justify-center"
          style={{ opacity: !text.trim() || sending ? 0.4 : 1 }}
        >
          {sending
            ? <ActivityIndicator color="white" size="small" />
            : <Send color="white" size={16} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
