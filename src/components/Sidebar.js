// src/components/Sidebar.js
import { useEffect, useState } from "react";
import { fetchRecommendation, fetchHourlyMeasurements, fetchStation } from "../api/api";
import { getFinalQuality, getQualityColor } from "../utils/airQuality";

// ---- eksport CSV ----
function exportCSV(station, hourlyData) {
  const m = station.measurements || {};
  const params = [
    { key: "pm25", label: "PM2.5 (µg/m³)" },
    { key: "pm10", label: "PM10 (µg/m³)" },
    { key: "no2",  label: "NO2 (µg/m³)" },
    { key: "o3",   label: "O3 (µg/m³)" },
    { key: "so2",  label: "SO2 (µg/m³)" },
  ].filter(({ key }) => m[key] != null);

  const lines = [];
  lines.push("AirQ — Eksport pomiarów");
  lines.push(`Stacja;${station.name || ""}`);
  lines.push(`Miasto;${station.locality || ""}`);
  lines.push(`Jakość powietrza;${station.quality || "brak danych"}`);
  lines.push(`Data eksportu;${new Date().toLocaleString("pl-PL")}`);
  lines.push("");

  // Aktualne pomiary
  lines.push("--- AKTUALNE POMIARY ---");
  lines.push("Parametr;Wartość");
  params.forEach(({ key, label }) => lines.push(`${label};${m[key]}`));
  lines.push("");

  // Dane godzinowe PM10
  if (hourlyData.length > 0) {
    lines.push("--- PM10 DANE GODZINOWE ---");
    lines.push("Godzina;Wartość (µg/m³)");
    [...hourlyData].reverse().slice(0, 24).forEach((d) => {
      const time = new Date(d.hour_local).toLocaleString("pl-PL", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
      });
      lines.push(`${time};${d.value_avg}`);
    });
  }

  const bom = "\uFEFF"; // BOM dla poprawnego otwarcia w Excelu
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `airq_${(station.locality || station.name || "stacja").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- eksport PDF (przez print) ----
function exportPDF(station, hourlyData, recommendation) {
  const m = station.measurements || {};
  const params = [
    { key: "pm25", label: "PM2.5" },
    { key: "pm10", label: "PM10" },
    { key: "no2",  label: "NO₂" },
    { key: "o3",   label: "O₃" },
    { key: "so2",  label: "SO₂" },
  ].filter(({ key }) => m[key] != null);

  const qualityColors = {
    "dobra":       "#16a34a",
    "umiarkowana": "#d97706",
    "zła":         "#dc2626",
    "bardzo zła":  "#991b1b",
  };
  const qColor = qualityColors[station.quality] || "#6b7280";

  const hourlyRows = hourlyData.length > 0
    ? [...hourlyData].reverse().slice(0, 24).map((d) => {
        const time = new Date(d.hour_local).toLocaleString("pl-PL", {
          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
        });
        return `<tr><td>${time}</td><td>${d.value_avg} µg/m³</td></tr>`;
      }).join("")
    : "";

  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8"/>
  <title>AirQ — ${station.locality || station.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }
    h1 { font-size: 22px; color: #1e3a8a; margin-bottom: 4px; }
    .subtitle { color: #555; font-size: 12px; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 4px 14px; border-radius: 999px; color: #fff;
             font-weight: 700; font-size: 13px; background: ${qColor}; margin-bottom: 20px; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px;
                  color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; }
    .params { display: flex; gap: 12px; flex-wrap: wrap; }
    .param-card { background: #f3f4f6; border-radius: 8px; padding: 10px 16px; min-width: 90px; }
    .param-label { font-size: 10px; color: #888; text-transform: uppercase; }
    .param-value { font-size: 20px; font-weight: 700; color: #111; }
    .param-unit { font-size: 10px; color: #888; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f3f4f6; text-align: left; padding: 6px 10px; font-size: 11px; color: #555; }
    td { padding: 5px 10px; border-bottom: 1px solid #f0f0f0; }
    .rec { background: #f8fafc; border-left: 3px solid #1e3a8a; padding: 10px 14px;
           font-size: 12px; line-height: 1.7; color: #333; border-radius: 0 6px 6px 0; }
    .footer { margin-top: 32px; font-size: 10px; color: #aaa; text-align: right; }
  </style>
</head>
<body>
  <h1>AirQ — ${station.locality || station.name}</h1>
  <div class="subtitle">${station.name || ""}${station.locality ? " · " + station.locality : ""} · eksport: ${new Date().toLocaleString("pl-PL")}</div>
  <div class="badge">${station.quality || "brak danych"}</div>

  ${params.length > 0 ? `
  <div class="section">
    <h2>Aktualne pomiary</h2>
    <div class="params">
      ${params.map(({ key, label }) => `
        <div class="param-card">
          <div class="param-label">${label}</div>
          <div class="param-value">${m[key]}<span class="param-unit"> µg/m³</span></div>
        </div>`).join("")}
    </div>
  </div>` : ""}

  ${hourlyRows ? `
  <div class="section">
    <h2>PM10 — dane godzinowe</h2>
    <table>
      <thead><tr><th>Godzina</th><th>Wartość</th></tr></thead>
      <tbody>${hourlyRows}</tbody>
    </table>
  </div>` : ""}

  ${recommendation ? `
  <div class="section">
    <h2>Rekomendacje</h2>
    <div class="rec">${recommendation}</div>
  </div>` : ""}

  <div class="footer">Wygenerowano przez AirQ · ${new Date().toLocaleString("pl-PL")}</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.print(); };
}

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

  useEffect(() => {
    if (!station) return;
    setRecommendation("");
    setHourlyData([]);
    setLoading(true);

    const tasks = [];

    // Używamy locality (nazwa miasta) zamiast pełnej nazwy stacji
    const cityName = station.locality || station.name;
    if (cityName) {
      tasks.push(
        fetchRecommendation(cityName)
          .then((data) => setRecommendation(data.recommendation))
          .catch(() => setRecommendation("Brak rekomendacji."))
      );
    }

    // Sensory mogą nie być załadowane w obiekcie stacji (Map ustawia sensors: [])
    // Pobieramy je przez fetchStation żeby mieć sensor PM10 do wykresu
    tasks.push(
      fetchStation(station.id)
        .then(({ sensors = [] }) => {
          const pm10Sensor = sensors.find((s) => s.parameter_name === "pm10");
          if (pm10Sensor) {
            return fetchHourlyMeasurements(pm10Sensor.id).then(setHourlyData);
          }
        })
        .catch(() => setHourlyData([]))
    );

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
        <button className="btn btn-secondary" onClick={() => exportCSV(station, hourlyData)}>
          ↓ CSV
        </button>
        <button className="btn btn-secondary" onClick={() => exportPDF(station, hourlyData, recommendation)}>
          ↓ PDF
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
