"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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

export default function BranchMap({ branches }: { branches: Branch[] }) {
  const withCoords = branches.filter(b => b.latitude && b.longitude);

  const center: [number, number] = withCoords.length
    ? [
        withCoords.reduce((s, b) => s + b.latitude!, 0) / withCoords.length,
        withCoords.reduce((s, b) => s + b.longitude!, 0) / withCoords.length,
      ]
    : [38, 5]; // centre par défaut France/Maroc

  const zoom = withCoords.length ? 5 : 4;

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {withCoords.map(b => (
        <Marker key={b.id} position={[b.latitude!, b.longitude!]}>
          <Popup>
            <div className="font-semibold">{b.label}</div>
            <div className="text-sm text-slate-500">{[b.address, b.city, b.country].filter(Boolean).join(", ")}</div>
            {b.is_main && <div className="text-xs text-amber-600 font-semibold mt-1">⭐ Principale</div>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
