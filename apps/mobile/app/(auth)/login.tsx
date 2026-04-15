import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { API_BASE, saveTokens } from "@/lib/api";

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError("Remplis tous les champs.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.detail || "Identifiants incorrects.");
        return;
      }

      // Récupère le rôle
      const meRes = await fetch(`${API_BASE}/me/`, {
        headers: { Authorization: `Bearer ${data.access}` },
      });
      const me = await meRes.json();
      await saveTokens(data.access, data.refresh, me.role);

      if (me.role === "AGENCY") {
        router.replace("/(tabs)/demandes");
      } else {
        router.replace("/(tabs)/trajets");
      }
    } catch {
      setError("Impossible de se connecter. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 px-6 pt-20 pb-10">

          {/* Logo */}
          <View className="items-center mb-12">
            <View className="h-16 w-16 rounded-2xl bg-primary items-center justify-center mb-4">
              <Text className="text-white text-3xl font-black">L</Text>
            </View>
            <Text className="text-3xl font-black text-dark tracking-tight">Luggo</Text>
            <Text className="text-gray-400 mt-1 text-sm">Transport Europe ↔ Maroc</Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            <View>
              <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-1.5">
                Nom d'utilisateur
              </Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="monjohn"
                placeholderTextColor="#9ca3af"
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-dark text-base"
              />
            </View>

            <View>
              <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-1.5">
                Mot de passe
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-dark text-base"
              />
            </View>

            {error && (
              <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className="bg-primary rounded-full py-4 items-center mt-2"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-bold text-base">Se connecter</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-400 text-sm">Pas encore de compte ? </Text>
            <Link href="/(auth)/register">
              <Text className="text-primary font-bold text-sm">S'inscrire</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
