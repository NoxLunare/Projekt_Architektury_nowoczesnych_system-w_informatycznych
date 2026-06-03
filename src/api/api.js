const API_URL = "http://127.0.0.1:5000/api/v1";
const TOKEN = "SECRET123";

const headers = {
  Authorization: `Bearer ${TOKEN}`,
};

// Pobiera listę miast dla danego kraju
export async function fetchCities(country = "PL") {
  const res = await fetch(`${API_URL}/cities?country=${country}`, { headers });
  if (!res.ok) throw new Error(`fetchCities: ${res.status}`);
  return res.json();
}

// Pobiera szczegóły stacji (lokalizacja + sensory + latest)
export async function fetchStation(locationId, refresh = false) {
  const url = `${API_URL}/stations/${locationId}${refresh ? "?refresh=1" : ""}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`fetchStation: ${res.status}`);
  return res.json();
}

// Pobiera najnowsze pomiary dla danej lokalizacji
// Jeśli baza jest pusta, automatycznie odpytuje OpenAQ i ponawia
export async function fetchLatestMeasurements(locationId) {
  const res = await fetch(`${API_URL}/measurements/location/${locationId}/latest`, { headers });
  if (!res.ok) throw new Error(`fetchLatestMeasurements: ${res.status}`);
  const data = await res.json();

  if (data.length === 0) {
    // Wymuś sync sensorów i location_latest z OpenAQ
    await fetch(`${API_URL}/stations/${locationId}?refresh=1`, { headers });
    // Ponowne pobranie po syncu
    const retry = await fetch(`${API_URL}/measurements/location/${locationId}/latest`, { headers });
    if (!retry.ok) throw new Error(`fetchLatestMeasurements retry: ${retry.status}`);
    return retry.json();
  }

  return data;
}

// Pobiera pomiary godzinowe dla sensora (domyślnie ostatnie 24h)
export async function fetchHourlyMeasurements(sensorId, limit = 24) {
  const res = await fetch(
    `${API_URL}/measurements/sensor/${sensorId}/hourly?limit=${limit}`,
    { headers }
  );
  if (!res.ok) throw new Error(`fetchHourlyMeasurements: ${res.status}`);
  return res.json();
}

// Pobiera rekomendacje dla miasta
export async function fetchRecommendation(city) {
  const res = await fetch(
    `${API_URL}/recommendations?city=${encodeURIComponent(city)}`,
    { headers }
  );
  if (!res.ok) throw new Error(`fetchRecommendation: ${res.status}`);
  return res.json();
}
