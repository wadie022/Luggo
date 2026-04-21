import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { apiUpload, apiFetch } from "@/lib/api";
import { ArrowLeft, Shield, Upload, Check, X, AlertCircle } from "lucide-react-native";

type KYCData = {
  status: "PENDING" | "VERIFIED" | "REJECTED" | null;
  rejection_reason?: string;
  extracted_data?: {
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    id_number?: string;
    expiry_date?: string;
    country?: string;
    document_type?: string;
  };
  submitted_at?: string;
  verified_at?: string;
};

const STATUS_CONFIG = {
  VERIFIED:  { label: "Identité vérifiée",        bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a", icon: Check },
  PENDING:   { label: "En cours de vérification", bg: "#fffbeb", border: "#fde68a", text: "#d97706", icon: Shield },
  REJECTED:  { label: "Document refusé",          bg: "#fef2f2", border: "#fecaca", text: "#dc2626", icon: X },
};

export default function KYCScreen() {
  const router = useRouter();
  const [kyc, setKyc] = useState<KYCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    apiFetch("/kyc/status/")
      .then((r) => r.json())
      .then(setKyc)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function pickImage(side: "front" | "back") {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      if (side === "front") setFrontUri(result.assets[0].uri);
      else setBackUri(result.assets[0].uri);
    }
  }

  async function handleUpload() {
    if (!frontUri) {
      Alert.alert("Document requis", "Veuillez sélectionner la photo recto de votre pièce d'identité.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("id_front", {
        uri: frontUri,
        type: "image/jpeg",
        name: "id_front.jpg",
      } as any);
      if (backUri) {
        form.append("id_back", {
          uri: backUri,
          type: "image/jpeg",
          name: "id_back.jpg",
        } as any);
      }
      const res = await apiUpload("/kyc/upload/", form);
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Erreur", data?.detail || "Impossible d'envoyer les documents.");
        return;
      }
      setKyc({ status: "PENDING" });
      setFrontUri(null);
      setBackUri(null);
      Alert.alert("Envoyé !", "Vos documents ont été envoyés. La vérification prend généralement 24h.");
    } catch {
      Alert.alert("Erreur", "Impossible de joindre le serveur.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  const cfg = kyc?.status ? STATUS_CONFIG[kyc.status] : null;
  const canSubmit = !kyc?.status || kyc.status === "REJECTED";

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mb-3">
          <ArrowLeft color="#6b7280" size={22} />
        </TouchableOpacity>
        <Text className="text-xl font-black text-dark">Vérification d'identité</Text>
        <Text className="text-gray-400 text-xs mt-0.5">KYC — Know Your Customer</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>

        {/* Statut actuel */}
        {cfg && (
          <View
            className="rounded-2xl p-4 border flex-row items-start gap-3"
            style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
          >
            <cfg.icon color={cfg.text} size={20} />
            <View className="flex-1">
              <Text className="font-bold text-sm" style={{ color: cfg.text }}>{cfg.label}</Text>
              {kyc?.rejection_reason && (
                <Text className="text-red-600 text-xs mt-1">{kyc.rejection_reason}</Text>
              )}
              {kyc?.submitted_at && (
                <Text className="text-gray-400 text-xs mt-1">
                  Soumis le {new Date(kyc.submitted_at).toLocaleDateString("fr-FR")}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Données extraites (si vérifié) */}
        {kyc?.status === "VERIFIED" && kyc.extracted_data && (
          <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">
              Informations extraites
            </Text>
            {Object.entries({
              "Type de document": kyc.extracted_data.document_type,
              "Prénom": kyc.extracted_data.first_name,
              "Nom": kyc.extracted_data.last_name,
              "Date de naissance": kyc.extracted_data.date_of_birth,
              "N° de document": kyc.extracted_data.id_number,
              "Expiration": kyc.extracted_data.expiry_date,
              "Pays": kyc.extracted_data.country,
            }).map(([label, value]) =>
              value ? (
                <View key={label} className="flex-row justify-between py-2 border-b border-gray-50">
                  <Text className="text-gray-400 text-sm">{label}</Text>
                  <Text className="text-dark font-semibold text-sm">{value}</Text>
                </View>
              ) : null
            )}
          </View>
        )}

        {/* Formulaire de soumission */}
        {canSubmit && (
          <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm gap-4">
            <View>
              <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-1">
                Comment ça marche ?
              </Text>
              <Text className="text-gray-500 text-sm leading-5">
                Prenez en photo votre carte d'identité ou passeport (recto et optionnellement verso).
                La vérification est automatique et prend généralement moins de 24h.
              </Text>
            </View>

            {/* Recto */}
            <View>
              <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">
                Recto (obligatoire)
              </Text>
              <TouchableOpacity
                onPress={() => pickImage("front")}
                className="rounded-xl border-2 border-dashed items-center justify-center overflow-hidden"
                style={{ borderColor: frontUri ? "#2563eb" : "#e5e7eb", height: 140 }}
              >
                {frontUri ? (
                  <Image source={{ uri: frontUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <View className="items-center gap-2">
                    <Upload color="#9ca3af" size={28} />
                    <Text className="text-gray-400 text-sm font-semibold">Choisir une photo</Text>
                    <Text className="text-gray-300 text-xs">JPG ou PNG</Text>
                  </View>
                )}
              </TouchableOpacity>
              {frontUri && (
                <TouchableOpacity onPress={() => setFrontUri(null)} className="mt-1.5">
                  <Text className="text-red-500 text-xs text-center">Supprimer</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Verso */}
            <View>
              <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">
                Verso (optionnel)
              </Text>
              <TouchableOpacity
                onPress={() => pickImage("back")}
                className="rounded-xl border-2 border-dashed items-center justify-center overflow-hidden"
                style={{ borderColor: backUri ? "#2563eb" : "#e5e7eb", height: 120 }}
              >
                {backUri ? (
                  <Image source={{ uri: backUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <View className="items-center gap-2">
                    <Upload color="#9ca3af" size={24} />
                    <Text className="text-gray-400 text-sm font-semibold">Choisir une photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {backUri && (
                <TouchableOpacity onPress={() => setBackUri(null)} className="mt-1.5">
                  <Text className="text-red-500 text-xs text-center">Supprimer</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Note */}
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex-row gap-2">
              <AlertCircle color="#d97706" size={16} />
              <Text className="text-amber-700 text-xs flex-1 leading-4">
                Assurez-vous que les photos sont nettes, bien éclairées et que toutes les informations sont lisibles.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleUpload}
              disabled={uploading || !frontUri}
              className="bg-primary rounded-full py-4 items-center"
              style={{ opacity: uploading || !frontUri ? 0.6 : 1 }}
            >
              {uploading
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-bold text-base">Envoyer les documents</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
