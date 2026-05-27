// src/components/Sidebar.js
import { useEffect, useState } from "react";
import { fetchRecommendation, fetchHourlyMeasurements } from "../api/api";
import { getFinalQuality, getQualityColor } from "../utils/airQuality";

function HourlyChart({ data }) {
  if (!data || data.length === 0) return null;
  const last8 = [...data].reverse().slice(0, 8);
  const max = Math.max(...last8.map((d) => d.value_avg), 1);

  return (
    <div className="hourly-chart">
      <div className="chart-bars">
        {last8.map((d, i) => {
          const h = Math.round((d.value_avg / max) * 44);
          const hour = new Date(d.hour_local).getHours();
          return (
            <div key={i} className="chart-bar-wrap">
              <div className="chart-bar" style={{ height: h }} title={`${d.value_avg} µg/m³`} />
              <div className="chart-hour">{hour}h</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function qualityStyle(quality) {
  const map = {
    "dobra":       { bg: "#16a34a", color: "#fff" },
    "umiarkowana": { bg: "#d97706", color: "#fff" },
    "zła":         { bg: "#dc2626", color: "#fff" },
    "bardzo zła":  { bg: "#7f1d1d", color: "#fca5a5" },
  };
  return map[quality] || { bg: "#374151", color: "#d1d5db" };
}

function Sidebar({ station }) {
  const [recommendation, setRecommendation] = useState("");
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (!station) return;
    setRecommendation("");
    setHourlyData([]);
    setLoading(true);

    const tasks = [];

    if (station.name) {
      tasks.push(
        fetchRecommendation(station.name)
          .then((data) => setRecommendation(data.recommendation))
          .catch(() => setRecommendation("Brak rekomendacji."))
      );
    }

    const pm10Sensor = station.sensors?.find((s) => s.parameter_name === "pm10");
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
      <div className="sidebar-wrap">
        <div className="sidebar-empty">
          <div className="sidebar-empty-icon">◈</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            Kliknij stację na mapie<br />lub wyszukaj miasto
          </div>
        </div>
      </div>
    );
  }

  const quality = station.quality || getFinalQuality(station.measurements || {});
  const qStyle = qualityStyle(quality);
  const m = station.measurements || {};

  const params = [
    { key: "pm25", label: "PM2.5" },
    { key: "pm10", label: "PM10" },
    { key: "no2",  label: "NO₂" },
    { key: "o3",   label: "O₃" },
    { key: "so2",  label: "SO₂" },
  ].filter(({ key }) => m[key] != null);

  return (
    <div className="sidebar-wrap">
      <div className="sidebar-city-name">{station.name}</div>
      {station.fullName && station.fullName !== station.name && (
        <div className="sidebar-full-name">{station.fullName}</div>
      )}

      <div
        className="quality-badge"
        style={{ background: qStyle.bg, color: qStyle.color }}
      >
        {quality}
      </div>

      {params.length > 0 && (
        <div className="measurements-grid">
          {params.map(({ key, label }) => (
            <div key={key} className="measurement-card">
              <div className="measurement-label">{label}</div>
              <div className="measurement-value">
                {m[key]}
                <span className="measurement-unit">µg/m³</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {hourlyData.length > 0 && (
        <>
          <div className="sidebar-section-label">PM10 — ostatnie 8h</div>
          <div className="recommendation-box" style={{ padding: "10px 12px" }}>
            <HourlyChart data={hourlyData} />
          </div>
        </>
      )}

      <div className="sidebar-section-label">Rekomendacje</div>
      <div className="recommendation-box">
        {loading ? (
          <span style={{ color: "var(--muted)" }}>Ładowanie...</span>
        ) : (
          recommendation || "Brak danych."
        )}
      </div>

      <div className="sidebar-actions" style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowExport(!showExport)}>
          Eksport
        </button>
        <button className="btn btn-secondary">Historia</button>
      </div>

      {showExport && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn btn-secondary">CSV</button>
          <button className="btn btn-secondary">PDF</button>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
