
export function getLevelPM25(v) {
  if (v == null) return null;
  if (v <= 10) return "dobra";
  if (v <= 25) return "umiarkowana";
  if (v <= 50) return "zła";
  return "bardzo zła";
}

export function getLevelPM10(v) {
  if (v == null) return null;
  if (v <= 20) return "dobra";
  if (v <= 50) return "umiarkowana";
  if (v <= 100) return "zła";
  return "bardzo zła";
}

export function getLevelNO2(v) {
  if (v == null) return null;
  if (v <= 40) return "dobra";
  if (v <= 100) return "umiarkowana";
  if (v <= 200) return "zła";
  return "bardzo zła";
}

export function getLevelO3(v) {
  if (v == null) return null;
  if (v <= 60) return "dobra";
  if (v <= 120) return "umiarkowana";
  if (v <= 180) return "zła";
  return "bardzo zła";
}

export function parseMeasurements(latestArray = []) {
  const result = {};
  for (const m of latestArray) {
    result[m.parameter_name] = m.value;
  }
  return result;
}

export function getFinalQuality(measurements) {
  const levels = [
    getLevelPM25(measurements.pm25),
    getLevelPM10(measurements.pm10),
    getLevelNO2(measurements.no2),
    getLevelO3(measurements.o3),
  ].filter(Boolean); // pomijamy brakujące parametry

  if (levels.length === 0) return "brak danych";
  if (levels.includes("bardzo zła")) return "bardzo zła";
  if (levels.includes("zła")) return "zła";
  if (levels.includes("umiarkowana")) return "umiarkowana";
  return "dobra";
}

export function getQualityColor(quality) {
  switch (quality) {
    case "dobra":      return "#4caf50";
    case "umiarkowana": return "#ff9800";
    case "zła":        return "#f44336";
    case "bardzo zła": return "#b71c1c";
    default:           return "#9e9e9e";
  }
}
