// src/components/TopRankings.js
import { getQualityColor } from "../utils/airQuality";

// Kolejność jakości od najgorszej do najlepszej
const QUALITY_RANK = {
  "bardzo zła":  0,
  "zła":         1,
  "umiarkowana": 2,
  "dobra":       3,
  "brak danych": 4,
};

function qualityBadgeStyle(quality) {
  const map = {
    "dobra":       { bg: "#16a34a22", border: "#16a34a", color: "#16a34a" },
    "umiarkowana": { bg: "#d9770622", border: "#d97706", color: "#d97706" },
    "zła":         { bg: "#dc262622", border: "#dc2626", color: "#dc2626" },
    "bardzo zła":  { bg: "#7f1d1d33", border: "#991b1b", color: "#fca5a5" },
  };
  return map[quality] || { bg: "transparent", border: "#374151", color: "#6b7280" };
}

function getAqi(measurements) {
  const { pm25, pm10, no2, o3 } = measurements || {};
  const vals = [pm25, pm10, no2, o3].filter(v => v != null);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function RankItem({ station, rank, onSelectStation }) {
  const quality = station.quality || "brak danych";
  const qStyle = qualityBadgeStyle(quality);
  const aqi = getAqi(station.measurements);
  const color = getQualityColor(quality);

  return (
    <div className="rank-item" onClick={() => onSelectStation(station)}>
      <div className="rank-number">{rank}</div>
      <div className="rank-dot" style={{ background: color }} />
      <div className="rank-info">
        <div className="rank-city">{station.locality || station.name}</div>
        <div
          className="rank-quality"
          style={{ color: qStyle.color }}
        >
          {quality}
        </div>
      </div>
      {aqi != null && (
        <div className="rank-aqi" style={{ color }}>
          {aqi}
          <span className="rank-aqi-label">AQI</span>
        </div>
      )}
    </div>
  );
}

function TopRankings({ stations, onSelectStation }) {
  // Tylko stacje z danymi jakości (bez "brak danych")
  const withData = stations.filter(
    (s) => s.quality && s.quality !== "brak danych"
  );

  const sorted = [...withData].sort(
    (a, b) => QUALITY_RANK[a.quality] - QUALITY_RANK[b.quality]
  );

  const worst = sorted.slice(0, 5);
  const best  = [...sorted].reverse().slice(0, 5);

  if (withData.length === 0) return null;

  return (
    <div className="top-rankings">
      {/* TOP 5 NAJGORSZYCH */}
      <div className="ranking-panel ranking-panel--worst">
        <div className="ranking-header">
          <span className="ranking-icon">⚠</span>
          <span className="ranking-title">Top 5 najgorszych</span>
        </div>
        <div className="ranking-list">
          {worst.map((s, i) => (
            <RankItem
              key={s.id}
              station={s}
              rank={i + 1}
              onSelectStation={onSelectStation}
            />
          ))}
        </div>
      </div>

      {/* TOP 5 NAJLEPSZYCH */}
      <div className="ranking-panel ranking-panel--best">
        <div className="ranking-header">
          <span className="ranking-icon">✓</span>
          <span className="ranking-title">Top 5 najlepszych</span>
        </div>
        <div className="ranking-list">
          {best.map((s, i) => (
            <RankItem
              key={s.id}
              station={s}
              rank={i + 1}
              onSelectStation={onSelectStation}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default TopRankings;
