// src/components/StationGrid.js
import { getQualityColor } from "../utils/airQuality";

function qualityBadgeStyle(quality) {
  const map = {
    "dobra":       { bg: "#16a34a", color: "#fff" },
    "umiarkowana": { bg: "#d97706", color: "#fff" },
    "zła":         { bg: "#dc2626", color: "#fff" },
    "bardzo zła":  { bg: "#7f1d1d", color: "#fca5a5" },
  };
  return map[quality] || { bg: "#374151", color: "#d1d5db" };
}

// Compute a rough AQI-style number from measurements (simplified display value)
function getAqiDisplay(measurements) {
  const { pm25, pm10, no2, o3 } = measurements || {};
  const vals = [pm25, pm10, no2, o3].filter(v => v != null);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function StationCard({ station, onSelectStation }) {
  const quality = station.quality || "brak danych";
  const color = getQualityColor(quality);
  const qStyle = qualityBadgeStyle(quality);
  const m = station.measurements || {};
  const aqi = getAqiDisplay(m);

  const params = [
    { key: "pm25", label: "PM2.5" },
    { key: "pm10", label: "PM10" },
    { key: "no2",  label: "NO₂" },
    { key: "o3",   label: "O₃" },
  ].filter(({ key }) => m[key] != null);

  return (
    <div className="station-card" onClick={() => onSelectStation(station)}>
      <div className="station-card-header">
        <div className="station-card-names">
          <div className="station-card-city">{station.locality || station.name}</div>
          {station.name && station.locality && station.name !== station.locality && (
            <div className="station-card-full">{station.name}</div>
          )}
          {station.country_name && (
            <div className="station-card-region">{station.country_name}</div>
          )}
        </div>

        {aqi != null && (
          <div
            className="aqi-circle"
            style={{ background: color + "22", color }}
          >
            <span>{aqi}</span>
            <span className="aqi-circle-label">AQI</span>
          </div>
        )}
      </div>

      <div
        className="station-card-quality"
        style={{ background: qStyle.bg, color: qStyle.color }}
      >
        {quality}
      </div>

      {params.length > 0 && (
        <div className="station-card-measurements">
          {params.map(({ key, label }) => (
            <div key={key} className="station-card-param">
              <strong>{label}:</strong>
              {m[key]} µg/m³
            </div>
          ))}
        </div>
      )}

      <div className="station-card-footer">
        <span className="station-card-link">Historia →</span>
      </div>
    </div>
  );
}

function StationGrid({ stations, onSelectStation }) {
  if (!stations || stations.length === 0) {
    return (
      <div style={{ color: "var(--muted)", fontSize: 13, padding: "20px 0" }}>
        Ładowanie stacji…
      </div>
    );
  }

  return (
    <div className="station-grid">
      {stations.map((station) => (
        <StationCard
          key={station.id}
          station={station}
          onSelectStation={onSelectStation}
        />
      ))}
    </div>
  );
}

export default StationGrid;
