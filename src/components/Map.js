// src/components/Map.js
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useEffect, useState, useRef } from "react";
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

async function runInBatches(items, batchSize, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

function FixMap() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 300);
  }, [map]);
  return null;
}

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
  const [loadingProgress, setLoadingProgress] = useState("");
  const stationsRef = useRef([]);

  useEffect(() => {
    let cancelled = false;

    async function loadStations() {
      try {
        const allStations = await fetchAllStations();
        const active = allStations.filter(
          (s) => s.latitude && s.longitude && isActive(s)
        );

        const bare = active.map((s) => ({
          ...s,
          measurements: {},
          quality: "brak danych",
          sensors: [],
        }));

        if (!cancelled) {
          stationsRef.current = bare;
          setStations([...bare]);
          // Przekazujemy listę stacji do App od razu — wyszukiwarka już działa
          if (onStationsLoaded) onStationsLoaded([...bare]);
          setLoading(false);
          setLoadingProgress(`Ładowanie pomiarów… 0 / ${bare.length}`);
        }

        let done = 0;
        await runInBatches(bare, 5, async (station) => {
          if (cancelled) return;
          try {
            const latest = await fetchLatestMeasurements(station.id);
            const measurements = parseMeasurements(latest);
            const quality = getFinalQuality(measurements);

            stationsRef.current = stationsRef.current.map((s) =>
              s.id === station.id ? { ...s, measurements, quality } : s
            );
          } catch {
            // zostaje "brak danych"
          } finally {
            done++;
            if (!cancelled) {
              setStations([...stationsRef.current]);
              setLoadingProgress(`Ładowanie pomiarów… ${done} / ${bare.length}`);
              if (done === bare.length) {
                setLoadingProgress("");
                // Ostateczna aktualizacja z pomiarami — aktualizujemy App tylko raz na koniec
                if (onStationsLoaded) onStationsLoaded([...stationsRef.current]);
              }
            }
          }
        });
      } catch (err) {
        console.error("Błąd ładowania stacji:", err);
        if (!cancelled) setLoading(false);
      }
    }

    loadStations();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {loading && <div className="map-loading">Ładowanie stacji…</div>}
      {!loading && loadingProgress && (
        <div className="map-loading">{loadingProgress}</div>
      )}
      <MapContainer center={[52, 19]} zoom={6} style={{ width: "100%", height: "100%" }}>
        <FixMap />
        <FlyToController flyToRef={flyToRef} />
        <TileLayer
          key={theme}
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
