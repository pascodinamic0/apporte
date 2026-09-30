"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { LocateFixed } from "lucide-react";
import { cn } from "@/src/lib/utils";

export type Pin = { lat: number; lng: number };
export const GOMBE_CENTER: Pin = { lat: -4.3125, lng: 15.3105 };

const pinIcon = (L: typeof Leaflet) =>
  L.divIcon({
    className: "apporte-pin",
    html: '<span class="apporte-pin-dot"></span>',
    iconSize: [34, 44],
    iconAnchor: [17, 42],
  });

/**
 * OpenStreetMap map (Leaflet, loaded on the client only). Tap/click or drag the
 * pin to set the exact delivery spot. `readOnly` shows a static pin.
 */
export function MapPicker({
  value,
  onChange,
  readOnly = false,
  className,
  height = "h-64",
  zoom = 15,
  testId = "map-picker",
}: {
  value: Pin | null;
  onChange?: (p: Pin) => void;
  readOnly?: boolean;
  className?: string;
  height?: string;
  zoom?: number;
  testId?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const marker = useRef<Leaflet.Marker | null>(null);
  const lib = useRef<typeof Leaflet | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      const L = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      if (cancelled || !el.current || map.current) return;
      lib.current = L;
      const start = value ?? GOMBE_CENTER;
      const m = L.map(el.current, {
        center: [start.lat, start.lng],
        zoom,
        zoomControl: !readOnly,
        dragging: !readOnly,
        scrollWheelZoom: false,
        touchZoom: !readOnly,
        doubleClickZoom: !readOnly,
        attributionControl: true,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(m);
      m.attributionControl.setPrefix(false);
      if (value) {
        marker.current = L.marker([value.lat, value.lng], { icon: pinIcon(L), draggable: !readOnly, keyboard: false }).addTo(m);
        marker.current.on("dragend", () => {
          const ll = marker.current!.getLatLng();
          cb.current?.({ lat: ll.lat, lng: ll.lng });
        });
      }
      if (!readOnly) {
        m.on("click", (e: Leaflet.LeafletMouseEvent) => cb.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
      }
      map.current = m;
      setReady(true);
      setTimeout(() => m.invalidateSize(), 50);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync with the value
  useEffect(() => {
    const L = lib.current;
    const m = map.current;
    if (!L || !m || !value) return;
    if (!marker.current) {
      marker.current = L.marker([value.lat, value.lng], { icon: pinIcon(L), draggable: !readOnly, keyboard: false }).addTo(m);
      marker.current.on("dragend", () => {
        const ll = marker.current!.getLatLng();
        cb.current?.({ lat: ll.lat, lng: ll.lng });
      });
    } else marker.current.setLatLng([value.lat, value.lng]);
    if (!m.getBounds().pad(-0.2).contains([value.lat, value.lng])) m.panTo([value.lat, value.lng]);
  }, [value, ready, readOnly]);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-100", height, className)} data-testid={testId} data-ready={ready ? "1" : "0"} data-pin={value ? `${value.lat.toFixed(5)},${value.lng.toFixed(5)}` : ""}>
      <div ref={el} className="absolute inset-0 z-0" aria-label="Carte" role="application" />
      {!readOnly && (
        <>
          {!value && ready && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] mx-auto w-fit rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-800 shadow">
              Touchez la carte pour placer le repère
            </div>
          )}
          <button
            type="button"
            className="absolute bottom-3 right-3 z-[500] inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-medium text-gray-900 shadow-md disabled:opacity-60"
            disabled={locating || typeof navigator === "undefined" || !("geolocation" in navigator)}
            onClick={() => {
              setLocating(true);
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setLocating(false);
                  const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                  cb.current?.(p);
                  map.current?.setView([p.lat, p.lng], 17);
                },
                () => setLocating(false),
                { enableHighAccuracy: true, timeout: 8000 },
              );
            }}
          >
            <LocateFixed className="h-4 w-4" aria-hidden /> {locating ? "Localisation…" : "Ma position"}
          </button>
        </>
      )}
    </div>
  );
}
