"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Fix default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Icône bleue pour la position actuelle
const myLocationIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(37,99,235,0.3)"></div>`,
  iconAnchor: [9, 9],
});

type Branch = {
  id: number;
  label: string;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  is_main: boolean;
};

function LocateControl() {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const markerRef = useRef<L.Marker | null>(null);

  function handleLocate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 13, { duration: 1.2 });
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = L.marker([latitude, longitude], { icon: myLocationIcon })
          .addTo(map)
          .bindPopup("Ma position actuelle")
          .openPopup();
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: 10, marginRight: 10 }}>
      <div className="leaflet-control">
        <button
          onClick={handleLocate}
          disabled={locating}
          title="Ma position"
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: "white", border: "2px solid #cbd5e1",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,.2)",
          }}
        >
          {locating ? (
            <span style={{ fontSize: 16 }}>⏳</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
              <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" fill="#2563eb" fillOpacity=".15"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default function BranchMap({ branches }: { branches: Branch[] }) {
  const withCoords = branches.filter(b => b.latitude && b.longitude);

  const center: [number, number] = withCoords.length
    ? [
        withCoords.reduce((s, b) => s + b.latitude!, 0) / withCoords.length,
        withCoords.reduce((s, b) => s + b.longitude!, 0) / withCoords.length,
      ]
    : [38, 5];

  const zoom = withCoords.length ? 5 : 4;

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocateControl />
      {withCoords.map(b => (
        <Marker key={b.id} position={[b.latitude!, b.longitude!]}>
          <Popup>
            <div style={{ fontWeight: 600 }}>{b.label}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>{[b.address, b.city, b.country].filter(Boolean).join(", ")}</div>
            {b.is_main && <div style={{ fontSize: 12, color: "#d97706", fontWeight: 600, marginTop: 4 }}>⭐ Principale</div>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
