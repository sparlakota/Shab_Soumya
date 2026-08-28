"use client";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { categoryMeta } from "@/lib/place-category";
import type { Place } from "@/lib/database.types";

function pinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2.5px solid #F5EFE6;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function ClickCapture({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function WorldMapInner({
  places,
  addMode,
  onMapClick,
  onSelectPlace,
}: {
  places: Place[];
  addMode: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onSelectPlace: (place: Place) => void;
}) {
  const center: [number, number] =
    places.length > 0 ? [places[0].lat, places[0].lng] : [20, 0];

  return (
    <MapContainer
      center={center}
      zoom={places.length > 0 ? 4 : 2}
      scrollWheelZoom
      className={`h-full w-full ${addMode ? "cursor-crosshair" : ""}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {addMode && <ClickCapture onMapClick={onMapClick} />}
      {places.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pinIcon(categoryMeta(p.category).color)}
          eventHandlers={{ click: () => onSelectPlace(p) }}
        >
          <Popup>
            <div style={{ fontFamily: "inherit", minWidth: 140 }}>
              <strong>{p.name}</strong>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{categoryMeta(p.category).label}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
