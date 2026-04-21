import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { apiUpload, apiFetch } from "@/lib/api";
import { ArrowLeft, Shield, Upload, Check, X, AlertCircle, Building2 } from "lucide-react-native";

type KYBData = {
  status: "PENDING" | "VERIFIED" | "REJECTED" | null;
  rejection_reason?: string;
  extracted_data?: {
    document_type?: string;
    company_name?: string;
    registration_number?: string;
    legal_form?: string;
    address?: string;
    manager_name?: string;
    country?: string;
  };
  submitted_at?: string;
  verified_at?: string;
};

const STATUS_CONFIG = {
  VERIFIED:  { label: "Entreprise vérifiée",        bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a", icon: Check },
  PENDING:   { label: "En cours de vérification",  bg: "#fffbeb", border: "#fde68a", text: "#d97706", icon: Shield },
  REJECTED:  { label: "Document refusé",            bg: "#fef2f2", border: "#fecaca", text: "#dc2626", icon: X },
};

export default function KYBScreen() {
  const router = useRouter();
  const [kyb, setKyb] = useState<KYBData | null>(null);
  const [loading, setLoading] = useState(true);
  const [docUri, setDocUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    apiFetch("/agency/kyb/status/")
      .then((r) => r.json())
      .then(setKyb)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function pickDocument() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setDocUri(result.assets[0].uri);
    }
  }

  async function handleUpload() {
    if (!docUri) {
      Alert.alert("Document requis", "Veuillez sélectionner votre document commercial (Kbis, Registre de commerce…).");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("document", {
        uri: docUri,
        type: "image/jpeg",
        name: "document_kyb.jpg",
      } as any);

      const res = await apiUpload("/agency/kyb/upload/", form);
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Erreur", data?.detail || "Impossible d'envoyer le document.");
        return;
      }
      setKyb({ status: "PENDING" });
      setDocUri(null);
      Alert.alert("Envoyé !", "Votre document a été envoyé. La vérification prend généralement 24-48h.");
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

  const cfg = kyb?.status ? STATUS_CONFIG[kyb.status] : null;
  const canSubmit = !kyb?.status || kyb.status === "REJECTED";

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mb-3">
          <ArrowLeft color="#6b7280" size={22} />
        </TouchableOpacity>
        <Text className="text-xl font-black text-dark">Vérification entreprise</Text>
        <Text className="text-gray-400 text-xs mt-0.5">KYB — Know Your Business</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>

        {/* Statut */}
        {cfg && (
          <View
            className="rounded-2xl p-4 border flex-row items-start gap-3"
            style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
          >
            <cfg.icon color={cfg.text} size={20} />
            <View className="flex-1">
              <Text className="font-bold text-sm" style={{ color: cfg.text }}>{cfg.label}</Text>
              {kyb?.rejection_reason && (
                <Text className="text-red-600 text-xs mt-1">{kyb.rejection_reason}</Text>
              )}
              {kyb?.submitted_at && (
                <Text className="text-gray-400 text-xs mt-1">
                  Soumis le {new Date(kyb.submitted_at).toLocaleDateString("fr-FR")}
                </Text>
              )}
              {kyb?.verified_at && (
                <Text className="text-gray-400 text-xs mt-0.5">
                  Vérifié le {new Date(kyb.verified_at).toLocaleDateString("fr-FR")}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Données extraites */}
        {kyb?.status === "VERIFIED" && kyb.extracted_data && (
          <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">
              Informations entreprise
            </Text>
            {Object.entries({
              "Type de document": kyb.extracted_data.document_type,
              "Raison sociale": kyb.extracted_data.company_name,
              "N° d'enregistrement": kyb.extracted_data.registration_number,
              "Forme juridique": kyb.extracted_data.legal_form,
              "Adresse": kyb.extracted_data.address,
              "Dirigeant": kyb.extracted_data.manager_name,
              "Pays": kyb.extracted_data.country,
            }).map(([label, value]) =>
              value ? (
                <View key={label} className="flex-row justify-between py-2 border-b border-gray-50">
                  <Text className="text-gray-400 text-sm">{label}</Text>
                  <Text className="text-dark font-semibold text-sm flex-1 text-right ml-4">{value}</Text>
                </View>
              ) : null
            )}
          </View>
        )}

        {/* Formulaire */}
        {canSubmit && (
          <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm gap-4">
            <View>
              <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-1">
                Documents acceptés
              </Text>
              <Text className="text-gray-500 text-sm leading-5">
                Kbis (France), Registre de Commerce (Maroc), ou tout document officiel prouvant l'existence légale de votre entreprise.
              </Text>
            </View>

            {/* Document */}
            <View>
              <Text className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">
                Document commercial *
              </Text>
              <TouchableOpacity
                onPress={pickDocument}
                className="rounded-xl border-2 border-dashed items-center justify-center overflow-hidden"
                style={{ borderColor: docUri ? "#2563eb" : "#e5e7eb", height: 160 }}
              >
                {docUri ? (
                  <Image source={{ uri: docUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <View className="items-center gap-2">
                    <Building2 color="#9ca3af" size={32} />
                    <Text className="text-gray-400 text-sm font-semibold">Choisir une photo du document</Text>
                    <Text className="text-gray-300 text-xs">JPG ou PNG, max 5 Mo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {docUri && (
                <TouchableOpacity onPress={() => setDocUri(null)} className="mt-1.5">
                  <Text className="text-red-500 text-xs text-center">Supprimer</Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex-row gap-2">
              <AlertCircle color="#d97706" size={16} />
              <Text className="text-amber-700 text-xs flex-1 leading-4">
                Le document doit être lisible, en cours de validité et correspondre à l'entreprise enregistrée.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleUpload}
              disabled={uploading || !docUri}
              className="bg-primary rounded-full py-4 items-center"
              style={{ opacity: uploading || !docUri ? 0.6 : 1 }}
            >
              {uploading
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-bold text-base">Envoyer le document</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
