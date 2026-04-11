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

// Icône principale (or)
const mainIcon = L.divIcon({
  className: "",
  html: `<svg viewBox="0 0 34 40" width="34" height="40" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 0C8.163 0 1 7.163 1 16c0 10.5 16 24 16 24S33 26.5 33 16C33 7.163 25.837 0 17 0z"
      fill="#d97706" stroke="white" stroke-width="2"/>
    <text x="17" y="21" text-anchor="middle" font-size="14" fill="white">★</text>
  </svg>`,
  iconAnchor: [17, 40],
  iconSize: [34, 40],
});

// Icône succursale (bleu)
const branchIcon = L.divIcon({
  className: "",
  html: `<svg viewBox="0 0 28 34" width="28" height="34" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 9 14 20 14 20S28 23 28 14C28 6.268 21.732 0 14 0z"
      fill="#2563eb" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
  </svg>`,
  iconAnchor: [14, 34],
  iconSize: [28, 34],
});

export type AgencyPoint = {
  key: string;
  legal_name: string;
  label: string;
  city: string;
  country: string;
  address: string;
  latitude: number;
  longitude: number;
  is_main: boolean;
  agency_id: number;
};

function RecenterMap({ points, userLocation }: { points: AgencyPoint[]; userLocation: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (userLocation) {
      map.setView(userLocation, 8);
    } else if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }
  }, [points, userLocation, map]);
  return null;
}

export default function MapView({
  agencies,
  userLocation = null,
}: {
  agencies: AgencyPoint[];
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
      <RecenterMap points={agencies} userLocation={userLocation} />

      {userLocation && (
        <>
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <div style={{ fontWeight: 600 }}>Votre position</div>
            </Popup>
          </Marker>
          <Circle
            center={userLocation}
            radius={100000}
            pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.08, weight: 1.5 }}
          />
        </>
      )}

      {agencies.map((p) => (
        <Marker
          key={p.key}
          position={[p.latitude, p.longitude]}
          icon={p.is_main ? mainIcon : branchIcon}
        >
          <Popup>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {p.is_main && <span style={{ color: "#d97706" }}>★ </span>}
              {p.legal_name}
            </div>
            {p.label !== p.legal_name && (
              <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{p.label}</div>
            )}
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{p.city}, {p.country}</div>
            {p.address && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{p.address}</div>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
