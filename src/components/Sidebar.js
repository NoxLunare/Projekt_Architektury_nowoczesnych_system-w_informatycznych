// src/components/Sidebar.js
import { useEffect, useState } from "react";
import { fetchRecommendation, fetchHourlyMeasurements } from "../api/api";
import { getFinalQuality, getQualityColor } from "../utils/airQuality";

// Mini wykres słupkowy dla pomiarów godzinowych
function HourlyChart({ data, label }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value_avg));
  const last8 = [...data].reverse().slice(0, 8);

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>{label} – ostatnie 8h</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40 }}>
        {last8.map((d, i) => {
          const height = Math.round((d.value_avg / max) * 40);
          const hour = new Date(d.hour_local).getHours();
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div
                title={`${d.value_avg} µg/m³`}
                style={{
                  width: "100%", height, background: "#2a5298",
                  borderRadius: "2px 2px 0 0", minHeight: 2,
                }}
              />
              <div style={{ fontSize: 9, color: "#999", marginTop: 2 }}>{hour}h</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Sidebar({ station }) {
  const [recommendation, setRecommendation] = useState("");
  const [hourlyData, setHourlyData] = useState([]);
  const [showExport, setShowExport] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!station) return;
    setRecommendation("");
    setHourlyData([]);
    setLoading(true);

    const tasks = [];

    // Rekomendacja
    if (station.name) {
      tasks.push(
        fetchRecommendation(station.name)
          .then((data) => setRecommendation(data.recommendation))
          .catch(() => setRecommendation("Brak rekomendacji."))
      );
    }

    // Dane godzinowe — bierzemy sensor PM10 jeśli dostępny
    const pm10Sensor = station.sensors?.find(
      (s) => s.parameter_name === "pm10"
    );
    if (pm10Sensor) {
      tasks.push(
        fetchHourlyMeasurements(pm10Sensor.id)
          .then(setHourlyData)
          .catch(() => setHourlyData([]))
      );
    }

    Promise.allSettled(tasks).finally(() => setLoading(false));
  }, [station]);

  if (!station) {
    return (
      <div style={containerStyle}>
        <p style={{ color: "#999", textAlign: "center", marginTop: 40 }}>
          Kliknij stację na mapie lub wyszukaj miasto
        </p>
      </div>
    );
  }

  const quality = station.quality || getFinalQuality(station.measurements || {});
  const color = getQualityColor(quality);
  const m = station.measurements || {};

  return (
    <div style={containerStyle}>
      <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>{station.name}</h2>
      {station.fullName && station.fullName !== station.name && (
        <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>{station.fullName}</div>
      )}

      {/* Jakość */}
      <div style={{
        background: color, color: "white", padding: "8px 12px",
        borderRadius: 8, marginBottom: 12, textAlign: "center", fontWeight: "bold",
      }}>
        Jakość: {quality}
      </div>

      {/* Pomiary */}
      <div style={cardStyle}>
        {[
          { key: "pm25", label: "PM2.5", unit: "µg/m³" },
          { key: "pm10", label: "PM10",  unit: "µg/m³" },
          { key: "no2",  label: "NO₂",   unit: "µg/m³" },
          { key: "o3",   label: "O₃",    unit: "µg/m³" },
          { key: "so2",  label: "SO₂",   unit: "µg/m³" },
        ]
          .filter(({ key }) => m[key] != null)
          .map(({ key, label, unit }) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
              <span style={{ fontWeight: "bold", fontSize: 13 }}>{label}</span>
              <span style={{ fontSize: 13 }}>{m[key]} {unit}</span>
            </div>
          ))}
      </div>

      {/* Wykres godzinowy PM10 */}
      {hourlyData.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 12 }}>
          <HourlyChart data={hourlyData} label="PM10" />
        </div>
      )}

      {/* Rekomendacje */}
      <div style={{ ...cardStyle, marginTop: 12 }}>
        <h4 style={{ margin: "0 0 6px", fontSize: 13 }}>Rekomendacje</h4>
        {loading ? (
          <p style={{ color: "#aaa", fontSize: 13 }}>Ładowanie...</p>
        ) : (
          <p style={{ textAlign: "justify", lineHeight: 1.6, fontSize: 13, margin: 0 }}>
            {recommendation || "Brak danych."}
          </p>
        )}
      </div>

      {/* Eksport */}
      <div style={{ marginTop: 16 }}>
        <button style={buttonStyle} onClick={() => setShowExport(!showExport)}>
          Eksport
        </button>
        {showExport && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
            <button style={subButtonStyle}>CSV</button>
            <button style={subButtonStyle}>PDF</button>
          </div>
        )}
        <button style={{ ...buttonStyle, marginTop: 8, background: "#607d8b" }}>
          Historia pomiarów
        </button>
      </div>
    </div>
  );
}

const containerStyle = {
  width: 300, minWidth: 300, padding: 20,
  background: "#f5f7fa", borderRadius: 12,
  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
  overflowY: "auto", maxHeight: "calc(100vh - 100px)",
};
const cardStyle = {
  background: "white", padding: 10,
  borderRadius: 8, boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
};
const buttonStyle = {
  width: "100%", padding: 10, border: "none",
  borderRadius: 8, background: "#2a5298",
  color: "white", cursor: "pointer", fontWeight: "bold",
};
const subButtonStyle = {
  padding: 8, border: "none", borderRadius: 6,
  background: "#e0e0e0", cursor: "pointer",
};

export default Sidebar;
