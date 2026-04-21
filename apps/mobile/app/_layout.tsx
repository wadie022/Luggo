import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { apiFetch, getAccessToken } from "@/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerPushToken() {
  if (Platform.OS === "web") return;
  try {
    const token = await getAccessToken();
    if (!token) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const pushToken = (await Notifications.getExpoPushTokenAsync()).data;
    await apiFetch("/push-token/", {
      method: "POST",
      body: JSON.stringify({ token: pushToken }),
    });
  } catch {}
}

export default function RootLayout() {
  useEffect(() => {
    registerPushToken();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="trips/[id]" />
        <Stack.Screen name="colis/[id]" />
        <Stack.Screen name="conversation/[id]" />
        <Stack.Screen name="kyc" />
        <Stack.Screen name="reclamations" />
        <Stack.Screen name="agences/[id]" />
        <Stack.Screen name="payment/[id]" />
        <Stack.Screen name="agency/kyb" />
        <Stack.Screen name="agency/profile" />
        <Stack.Screen name="agency/trips/new" />
        <Stack.Screen name="agency/trips/[id]/edit" />
        <Stack.Screen name="alertes" />
      </Stack>
    </>
  );
}
