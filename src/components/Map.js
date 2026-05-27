// src/components/Map.js
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import { fetchLatestMeasurements } from "../api/api";
import { parseMeasurements, getFinalQuality, getQualityColor } from "../utils/airQuality";

const API_URL = "http://127.0.0.1:5000/api/v1";
const TOKEN = "SECRET123";

async function fetchAllStations() {
  const res = await fetch(`${API_URL}/stations?country=PL`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`fetchAllStations: ${res.status}`);
  return res.json();
}

function isActive(station) {
  if (!station.datetime_last) return false;
  const last = new Date(station.datetime_last);
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  return last >= twoYearsAgo;
}

function FixMap() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 300);
  }, [map]);
  return null;
}

// Komponent który rejestruje funkcję flyTo w ref przekazanym z App
function FlyToController({ flyToRef }) {
  const map = useMap();
  useEffect(() => {
    flyToRef.current = (lat, lng) => {
      map.flyTo([lat, lng], 12, { duration: 1.2 });
    };
  }, [map, flyToRef]);
  return null;
}

function Markers({ stations, onSelectStation }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const update = () => setZoom(map.getZoom());
    map.on("zoomend", update);
    return () => map.off("zoomend", update);
  }, [map]);

  return (
    <>
      {stations.map((station) => {
        const color = getQualityColor(station.quality);
        const m = station.measurements || {};
        return (
          <CircleMarker
            key={station.id}
            center={[station.latitude, station.longitude]}
            radius={4 + zoom * 0.5}
            pathOptions={{
              color: "rgba(255,255,255,0.2)",
              weight: 1,
              fillColor: color,
              fillOpacity: 0.9,
            }}
            eventHandlers={{ click: () => onSelectStation(station) }}
          >
            <Popup>
              <div style={{ fontFamily: "sans-serif", fontSize: 13, minWidth: 120 }}>
                <strong>{station.locality || station.name}</strong>
                <br />
                {m.pm10 != null && <>PM10: {m.pm10} µg/m³<br /></>}
                {m.no2  != null && <>NO₂: {m.no2} µg/m³<br /></>}
                {m.o3   != null && <>O₃: {m.o3} µg/m³</>}
                {Object.keys(m).length === 0 && (
                  <span style={{ color: "#999" }}>Brak danych</span>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

function Legend() {
  const items = [
    { color: "#22c55e", label: "dobra" },
    { color: "#f59e0b", label: "umiarkowana" },
    { color: "#ef4444", label: "zła" },
    { color: "#991b1b", label: "bardzo zła" },
    { color: "#4b5563", label: "brak danych" },
  ];
  return (
    <div className="map-legend">
      <strong>Jakość powietrza</strong>
      {items.map(({ color, label }) => (
        <div key={label} className="map-legend-item">
          <span className="map-legend-dot" style={{ background: color }} />
          {label}
        </div>
      ))}
    </div>
  );
}

function Map({ onSelectStation, onStationsLoaded, theme, flyToRef }) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStations() {
      try {
        const allStations = await fetchAllStations();
        const active = allStations.filter(
          (s) => s.latitude && s.longitude && isActive(s)
        );
        const withMeasurements = await Promise.all(
          active.map(async (station) => {
            try {
              const latest = await fetchLatestMeasurements(station.id);
              const measurements = parseMeasurements(latest);
              const quality = getFinalQuality(measurements);
              return { ...station, measurements, quality, sensors: [] };
            } catch {
              return { ...station, measurements: {}, quality: "brak danych", sensors: [] };
            }
          })
        );
        setStations(withMeasurements);
        if (onStationsLoaded) onStationsLoaded(withMeasurements);
      } catch (err) {
        console.error("Błąd ładowania stacji:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStations();
  }, []); // eslint-disable-line

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {loading && <div className="map-loading">Ładowanie stacji…</div>}
      <MapContainer center={[52, 19]} zoom={6} style={{ width: "100%", height: "100%" }}>
        <FixMap />
        <FlyToController flyToRef={flyToRef} />
        <TileLayer
          url={theme === "light"
            ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
          attribution='© <a href="https://carto.com/">CARTO</a>'
        />
        <Markers stations={stations} onSelectStation={onSelectStation} />
      </MapContainer>
      <Legend />
    </div>
  );
}

export default Map;
