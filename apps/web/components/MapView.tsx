"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

type Agency = {
  id: number;
  legal_name: string;
  city: string;
  country: string;
  address: string;
  latitude: number;
  longitude: number;
};

function RecenterMap({ agencies, userLocation }: { agencies: Agency[]; userLocation: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (userLocation) {
      map.setView(userLocation, 8);
    } else if (agencies.length > 0) {
      const bounds = L.latLngBounds(agencies.map((a) => [a.latitude, a.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }
  }, [agencies, userLocation, map]);
  return null;
}

export default function MapView({
  agencies,
  userLocation = null,
}: {
  agencies: Agency[];
  userLocation?: [number, number] | null;
}) {
  const center: [number, number] =
    userLocation ?? (agencies.length > 0 ? [agencies[0].latitude, agencies[0].longitude] : [46.2276, 2.2137]);

  return (
    <MapContainer center={center} zoom={5} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      />
      <RecenterMap agencies={agencies} userLocation={userLocation} />

      {/* Marker position utilisateur */}
      {userLocation && (
        <>
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <div className="font-semibold">Votre position</div>
            </Popup>
          </Marker>
          <Circle
            center={userLocation}
            radius={100000}
            pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.08, weight: 1.5 }}
          />
        </>
      )}

      {/* Markers agences */}
      {agencies.map((a) => (
        <Marker key={a.id} position={[a.latitude, a.longitude]}>
          <Popup>
            <div className="font-semibold">{a.legal_name}</div>
            <div className="text-sm text-slate-600">{a.city}, {a.country}</div>
            {a.address && <div className="text-xs text-slate-400 mt-1">{a.address}</div>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
