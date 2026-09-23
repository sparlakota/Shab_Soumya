"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { categoryMeta } from "@/lib/place-category";
import type { Place } from "@/lib/database.types";

function pinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2.5px solid #FFF3F5;box-shadow:0 2px 8px rgba(74,20,32,0.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export function WorldMapInner({
  places,
  onSelectPlace,
}: {
  places: Place[];
  onSelectPlace: (place: Place) => void;
}) {
  const center: [number, number] =
    places.length > 0 ? [places[0].lat, places[0].lng] : [20, 0];

  return (
    <MapContainer
      center={center}
      zoom={places.length > 0 ? 4 : 2}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
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
