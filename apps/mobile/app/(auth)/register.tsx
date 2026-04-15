import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { API_BASE, saveTokens } from "@/lib/api";

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CLIENT" | "AGENCY">("CLIENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError("Remplis tous les champs.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), email: email.trim(), password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.username?.[0] || data?.email?.[0] || data?.password?.[0] || data?.detail || "Erreur d'inscription.";
        setError(msg);
        return;
      }

      // Auto-login
      const loginRes = await fetch(`${API_BASE}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const tokens = await loginRes.json();
      await saveTokens(tokens.access, tokens.refresh, role);

      if (role === "AGENCY") {
        router.replace("/(tabs)/demandes");
      } else {
        router.replace("/(tabs)/trajets");
      }
    } catch {
      setError("Impossible de s'inscrire. Vérifie ta connexion.");
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
        <View className="flex-1 px-6 pt-16 pb-10">

          {/* Logo */}
          <View className="items-center mb-10">
            <View className="h-14 w-14 rounded-2xl bg-primary items-center justify-center mb-3">
              <Text className="text-white text-2xl font-black">L</Text>
            </View>
            <Text className="text-2xl font-black text-dark">Créer un compte</Text>
          </View>

          {/* Role toggle */}
          <View className="flex-row bg-gray-100 rounded-2xl p-1 mb-6">
            {(["CLIENT", "AGENCY"] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRole(r)}
                className={`flex-1 py-2.5 rounded-xl items-center ${role === r ? "bg-white shadow-sm" : ""}`}
              >
                <Text className={`font-bold text-sm ${role === r ? "text-primary" : "text-gray-400"}`}>
                  {r === "CLIENT" ? "Client" : "Agence"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="moi@email.com"
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
              onPress={handleRegister}
              disabled={loading}
              className="bg-primary rounded-full py-4 items-center mt-2"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-bold text-base">Créer mon compte</Text>
              }
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-400 text-sm">Déjà un compte ? </Text>
            <Link href="/(auth)/login">
              <Text className="text-primary font-bold text-sm">Se connecter</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
