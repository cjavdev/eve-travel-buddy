"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export interface MapPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  colors: string[];
  tooltip: string;
}

function pinIcon(colors: string[], selected: boolean) {
  const step = 100 / colors.length;
  const stops = colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(", ");
  const ring = selected ? "outline: 3px solid #0ea5e9; outline-offset: 2px;" : "";
  return L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgb(0 0 0 / .4);background:conic-gradient(${stops});${ring}"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

// Leaflet + OpenStreetMap tiles: free and keyless. Loaded client-only (see trip-map.tsx).
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
    map.current = L.map(container.current, { worldCopyJump: true }).setView([35, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
      L.marker([pin.lat, pin.lng], { icon: pinIcon(pin.colors, pin.id === selectedId), title: pin.name })
        .bindTooltip(pin.tooltip, { direction: "top", offset: [0, -12] })
        .on("click", () => onSelect(pin.id))
        .addTo(layer.current);
    }
    if (!fitted.current && pins.length) {
      map.current.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [40, 40] });
      fitted.current = true;
    }
  }, [pins, selectedId, onSelect]);

  return <div className="h-full min-h-[300px] w-full" ref={container} />;
}
