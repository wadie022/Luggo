"use client";

import { useRef, useState } from "react";
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

// Icône principale (or/étoile)
const mainBranchIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:34px;height:40px">
      <svg viewBox="0 0 34 40" width="34" height="40" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 0C8.163 0 1 7.163 1 16c0 10.5 16 24 16 24S33 26.5 33 16C33 7.163 25.837 0 17 0z"
          fill="#d97706" stroke="white" stroke-width="2"/>
        <text x="17" y="21" text-anchor="middle" font-size="14" fill="white">★</text>
      </svg>
    </div>`,
  iconAnchor: [17, 40],
  iconSize: [34, 40],
});

// Icône succursale (bleu)
const branchIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:28px;height:34px">
      <svg viewBox="0 0 28 34" width="28" height="34" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 9 14 20 14 20S28 23 28 14C28 6.268 21.732 0 14 0z"
          fill="#2563eb" stroke="white" stroke-width="2"/>
        <circle cx="14" cy="14" r="5" fill="white"/>
      </svg>
    </div>`,
  iconAnchor: [14, 34],
  iconSize: [28, 34],
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

  const zoom = withCoords.length === 1 ? 10 : withCoords.length > 1 ? 5 : 4;

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocateControl />
      {withCoords.map(b => (
        <Marker
          key={b.id}
          position={[b.latitude!, b.longitude!]}
          icon={b.is_main ? mainBranchIcon : branchIcon}
        >
          <Popup>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {b.is_main && <span style={{ color: "#d97706" }}>★ </span>}
              {b.label}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {[b.address, b.city, b.country].filter(Boolean).join(", ")}
            </div>
            {b.is_main && (
              <div style={{ fontSize: 11, color: "#d97706", fontWeight: 700, marginTop: 4 }}>
                Adresse principale
              </div>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
