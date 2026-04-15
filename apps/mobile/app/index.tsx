import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { getAccessToken, getRole } from "@/lib/api";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (token) {
        const role = await getRole();
        if (role === "AGENCY") {
          router.replace("/(tabs)/demandes");
        } else {
          router.replace("/(tabs)/trajets");
        }
      } else {
        router.replace("/(auth)/login");
      }
    })();
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator color="#2563eb" size="large" />
    </View>
  );
}
