const API_URL = "http://127.0.0.1:5000/api/v1";
const TOKEN = "SECRET123";

const headers = {
  Authorization: `Bearer ${TOKEN}`,
};

// Pobiera listę miast dla danego kraju
export async function fetchCities(country = "PL") {
  const res = await fetch(`${API_URL}/cities?country=${country}`, { headers });
  if (!res.ok) throw new Error(`fetchCities: ${res.status}`);
  return res.json(); // zwraca string[]
}

// Pobiera szczegóły stacji (lokalizacja + sensory + latest)
export async function fetchStation(locationId, refresh = false) {
  const url = `${API_URL}/stations/${locationId}${refresh ? "?refresh=1" : ""}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`fetchStation: ${res.status}`);
  return res.json();
  // zwraca { location: {...}, sensors: [...], latest: [...] }
}

// Pobiera najnowsze pomiary dla danej lokalizacji
export async function fetchLatestMeasurements(locationId) {
  const res = await fetch(`${API_URL}/measurements/location/${locationId}/latest`, { headers });
  if (!res.ok) throw new Error(`fetchLatestMeasurements: ${res.status}`);
  return res.json();
  // zwraca [{ parameter_name, display_name, value, units, datetime_utc, ... }]
}

// Pobiera pomiary godzinowe dla sensora (domyślnie ostatnie 24h)
export async function fetchHourlyMeasurements(sensorId, limit = 24) {
  const res = await fetch(
    `${API_URL}/measurements/sensor/${sensorId}/hourly?limit=${limit}`,
    { headers }
  );
  if (!res.ok) throw new Error(`fetchHourlyMeasurements: ${res.status}`);
  return res.json();
  // zwraca [{ id, sensor_id, hour_utc, hour_local, value_avg, value_min, value_max, ... }]
}

// Pobiera rekomendacje dla miasta
export async function fetchRecommendation(city) {
  const res = await fetch(
    `${API_URL}/recommendations?city=${encodeURIComponent(city)}`,
    { headers }
  );
  if (!res.ok) throw new Error(`fetchRecommendation: ${res.status}`);
  return res.json();
  // zwraca { recommendation: "..." }
}
