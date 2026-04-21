import { View, Text } from "react-native";

export const PROVIDER_DEFAULT = null;

export function Marker(_props: any) {
  return null;
}

export function MapView({ style, children }: { style?: any; children?: any }) {
  return (
    <View
      style={[
        style,
        { alignItems: "center", justifyContent: "center", backgroundColor: "#f1f5f9" },
      ]}
    >
      <Text style={{ color: "#9ca3af", fontSize: 14, fontWeight: "600" }}>
        Carte disponible sur l'application mobile
      </Text>
    </View>
  );
}

export default MapView;
