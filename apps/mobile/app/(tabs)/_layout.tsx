import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { getRole } from "@/lib/api";
import { Package, MessageSquare, User, Home, Truck, Map, BarChart2, ShieldCheck, Users, AlertCircle } from "lucide-react-native";

export default function TabsLayout() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    getRole().then(setRole);
  }, []);

  if (role === "ADMIN") {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#2563eb",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopColor: "#f3f4f6",
            paddingBottom: 4,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="admin-stats"
          options={{
            title: "Stats",
            tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="admin-verifications"
          options={{
            title: "Vérifications",
            tabBarIcon: ({ color, size }) => <ShieldCheck color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="admin-users"
          options={{
            title: "Utilisateurs",
            tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="admin-reclamations"
          options={{
            title: "Réclamations",
            tabBarIcon: ({ color, size }) => <AlertCircle color={color} size={size} />,
          }}
        />
        <Tabs.Screen name="trajets" options={{ href: null }} />
        <Tabs.Screen name="mes-colis" options={{ href: null }} />
        <Tabs.Screen name="map" options={{ href: null }} />
        <Tabs.Screen name="messages" options={{ href: null }} />
        <Tabs.Screen name="profil" options={{ href: null }} />
        <Tabs.Screen name="demandes" options={{ href: null }} />
      </Tabs>
    );
  }

  if (role === "AGENCY") {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#2563eb",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopColor: "#f3f4f6",
            paddingBottom: 4,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="demandes"
          options={{
            title: "Demandes",
            tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="trajets"
          options={{
            title: "Trajets",
            tabBarIcon: ({ color, size }) => <Truck color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: "Messages",
            tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profil"
          options={{
            title: "Profil",
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />
        <Tabs.Screen name="mes-colis" options={{ href: null }} />
        <Tabs.Screen name="map" options={{ href: null }} />
        <Tabs.Screen name="admin-stats" options={{ href: null }} />
        <Tabs.Screen name="admin-verifications" options={{ href: null }} />
        <Tabs.Screen name="admin-users" options={{ href: null }} />
        <Tabs.Screen name="admin-reclamations" options={{ href: null }} />
      </Tabs>
    );
  }

  // CLIENT
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#f3f4f6",
          paddingBottom: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="trajets"
        options={{
          title: "Trajets",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="mes-colis"
        options={{
          title: "Mes colis",
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Agences",
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="demandes" options={{ href: null }} />
      <Tabs.Screen name="admin-stats" options={{ href: null }} />
      <Tabs.Screen name="admin-verifications" options={{ href: null }} />
      <Tabs.Screen name="admin-users" options={{ href: null }} />
      <Tabs.Screen name="admin-reclamations" options={{ href: null }} />
    </Tabs>
  );
}
