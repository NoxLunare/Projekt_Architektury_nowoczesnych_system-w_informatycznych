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

// Aktywna = ma dane z ostatnich 2 lat
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
            pathOptions={{ color: "black", weight: 1, fillColor: color, fillOpacity: 0.85 }}
            eventHandlers={{ click: () => onSelectStation(station) }}
          >
            <Popup>
              <strong>{station.locality || station.name}</strong><br />
              {m.pm10 != null && <>PM10: {m.pm10} µg/m³<br /></>}
              {m.no2  != null && <>NO₂: {m.no2} µg/m³<br /></>}
              {m.o3   != null && <>O₃: {m.o3} µg/m³</>}
              {Object.keys(m).length === 0 && <span style={{ color: "#999" }}>Brak danych</span>}
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

function Legend() {
  const items = [
    { color: "#4caf50", label: "dobra" },
    { color: "#ff9800", label: "umiarkowana" },
    { color: "#f44336", label: "zła" },
    { color: "#b71c1c", label: "bardzo zła" },
    { color: "#9e9e9e", label: "brak danych" },
  ];
  return (
    <div style={{
      position: "absolute", bottom: 10, right: 10, zIndex: 1000,
      background: "white", padding: "10px 14px", borderRadius: 8,
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)", fontSize: 12, lineHeight: "1.8"
    }}>
      <strong>Jakość powietrza</strong>
      {items.map(({ color, label }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, background: color, borderRadius: "50%", display: "inline-block" }} />
          {label}
        </div>
      ))}
    </div>
  );
}

function Map({ onSelectStation }) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStations() {
      try {
        const allStations = await fetchAllStations();

        // Tylko aktywne stacje z współrzędnymi
        const active = allStations.filter(
          (s) => s.latitude && s.longitude && isActive(s)
        );

        // Pobieramy pomiary dla każdej stacji równolegle
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
      } catch (err) {
        console.error("Błąd ładowania stacji:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStations();
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {loading && (
        <div style={{
          position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
          zIndex: 1000, background: "white", padding: "6px 14px",
          borderRadius: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          fontSize: 13, color: "#555"
        }}>
          Ładowanie stacji...
        </div>
      )}
      <MapContainer center={[52, 19]} zoom={6} style={{ width: "100%", height: "100%" }}>
        <FixMap />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Markers stations={stations} onSelectStation={onSelectStation} />
      </MapContainer>
      <Legend />
    </div>
  );
}

export default Map;
