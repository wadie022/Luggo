"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix icône Leaflet avec webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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

function RecenterMap({ agencies }: { agencies: Agency[] }) {
  const map = useMap();
  useEffect(() => {
    if (agencies.length > 0) {
      const bounds = L.latLngBounds(agencies.map((a) => [a.latitude, a.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }
  }, [agencies, map]);
  return null;
}

export default function MapView({ agencies }: { agencies: Agency[] }) {
  const center: [number, number] = agencies.length > 0
    ? [agencies[0].latitude, agencies[0].longitude]
    : [46.2276, 2.2137]; // France par défaut

  return (
    <MapContainer center={center} zoom={5} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      />
      <RecenterMap agencies={agencies} />
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
