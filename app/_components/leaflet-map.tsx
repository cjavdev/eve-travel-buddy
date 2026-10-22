"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export interface MapPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** How many party members would love this place; sizes the triangle. */
  weight: number;
  tooltip: string;
}

const esc = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function pinIcon(pin: MapPin, selected: boolean) {
  const size = 14 + pin.weight * 4;
  const label = pin.name.split(",")[0];
  return L.divIcon({
    className: "",
    html: `<div class="trip-pin" data-selected="${selected}" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}" viewBox="0 0 76 65" aria-hidden="true"><path d="M37.6 0L75.2 65H0z" fill="#fff"/></svg>
      <span class="trip-pin-label">${esc(label)}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Leaflet with CARTO's dark OpenStreetMap tiles: free and keyless. Loaded client-only (see trip-map.tsx).
export default function LeafletMap({
  pins,
  selectedId,
  onSelect,
}: {
  readonly pins: MapPin[];
  readonly selectedId?: string;
  readonly onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);

  useEffect(() => {
    if (!container.current || map.current) return;
    map.current = L.map(container.current, { worldCopyJump: true, zoomControl: false }).setView([35, 0], 2);
    L.control.zoom({ position: "bottomright" }).addTo(map.current);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    for (const pin of pins) {
      L.marker([pin.lat, pin.lng], { icon: pinIcon(pin, pin.id === selectedId), title: pin.name })
        .bindTooltip(pin.tooltip, { className: "trip-tooltip", direction: "top", offset: [0, -14] })
        .on("click", () => onSelect(pin.id))
        .addTo(layer.current);
    }
    if (!fitted.current && pins.length) {
      map.current.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [80, 80] });
      fitted.current = true;
    }
  }, [pins, selectedId, onSelect]);

  return <div className="h-full min-h-[300px] w-full" ref={container} />;
}
