"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export default function LeafletMap({
  lat,
  lon,
  zoom = 16,
  gmapsLink,
  className = "",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [lat, lon],
        zoom,
        zoomControl: true,
        scrollWheelZoom: false, // don't hijack page scroll on a snap-scroll site
        attributionControl: true,
      });
      mapRef.current = map;

      // Dark raster tiles (CARTO dark basemap, built on OpenStreetMap data — no API key needed)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 20,
          subdomains: "abcd",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      ).addTo(map);

      // Custom marker (avoids broken default icon image paths under bundlers)
      const icon = L.divIcon({
        className: "ccid-map-pin",
        html:
          '<span style="display:block;width:16px;height:16px;border-radius:50% 50% 50% 0;' +
          "transform:rotate(-45deg);background:#ffffff;" +
          'box-shadow:0 0 0 3px rgba(0,0,0,0.35),0 2px 6px rgba(0,0,0,0.4);"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 16],
      });
      L.marker([lat, lon], { icon }).addTo(map);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lon, zoom]);

  return (
    <div
      className={`relative rounded-[3px] overflow-hidden border border-white/15 ${className}`}
    >
      <div ref={containerRef} className="w-full h-[240px] bg-[#0f0f13]" />
      {gmapsLink ? (
        <a
          href={gmapsLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open location in Google Maps"
          className="absolute bottom-2 right-2 z-[1200] bg-black/65 hover:bg-black/80 text-white text-[0.7rem] tracking-[0.02em] px-2 py-1 rounded-[3px] transition-colors"
        >
          Open in Google Maps
        </a>
      ) : null}
    </div>
  );
}
