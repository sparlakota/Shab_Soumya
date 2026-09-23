"use client";

import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import { categoryMeta } from "@/lib/place-category";
import type { Place } from "@/lib/database.types";

// A cute little map-pin teardrop instead of a plain dot, with a soft pop-in.
// The pop-in/hover animation lives on an INNER wrapper, never on the outer
// element itself — Leaflet positions markers via inline transform on that
// outer element, and a CSS animation touching the same property would fight
// it and strand the pin at the wrong spot once the animation finishes.
function pinIcon(color: string) {
  return L.divIcon({
    className: "place-pin-icon",
    html: `
      <div class="place-pin-inner">
        <svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(74,20,32,0.4))">
          <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 23 15 23s15-12.5 15-23c0-8.284-6.716-15-15-15z" fill="${color}" stroke="#FFF3F5" stroke-width="2"/>
          <circle cx="15" cy="15" r="5.5" fill="#FFF3F5"/>
        </svg>
      </div>`,
    iconSize: [30, 38],
    iconAnchor: [15, 36],
    popupAnchor: [0, -34],
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
        attribution='Tiles &copy; Esri — Source: Esri, USGS, NOAA'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}"
        maxZoom={13}
      />
      {places.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pinIcon(categoryMeta(p.category).color)}
          eventHandlers={{ click: () => onSelectPlace(p) }}
        >
          <Tooltip direction="top" offset={[0, -34]} permanent className="place-pin-label">
            {p.name}
          </Tooltip>
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
