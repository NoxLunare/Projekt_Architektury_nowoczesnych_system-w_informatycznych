const API_URL = "http://127.0.0.1:5000/api/v1";

const TOKEN = "SECRET123";

export async function fetchStations() {
  const response = await fetch(`${API_URL}/stations`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  return response.json();
}

export async function fetchAirQuality(stationId) {
  const response = await fetch(
    `${API_URL}/air-quality/station/${stationId}`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    }
  );

  return response.json();
}

export async function fetchCities(name = "") {
  const response = await fetch(
    `${API_URL}/cities?name=${name}`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    }
  );

  return response.json();
}

export async function fetchRecommendation(city) {
  const response = await fetch(
    `${API_URL}/recommendations?city=${city}`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    }
  );

  return response.json();
}