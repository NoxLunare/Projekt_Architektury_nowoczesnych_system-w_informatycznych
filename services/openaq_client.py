import os
import datetime
import requests

OPENAQ_BASE = "https://api.openaq.org/v3"
API_KEY = os.environ.get("OPENAQ_API_KEY", "")

def _get(path: str, params: dict | None = None) -> dict:
    url = f"{OPENAQ_BASE}{path}"
    api_key = os.environ.get("OPENAQ_API_KEY", "")
    headers = {"X-API-Key": api_key} if api_key else {}
    resp = requests.get(url, params=params, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()

def _get_results(path: str, params: dict | None = None) -> list:
    """Pobiera wyniki — obsługuje zarówno {"results": [...]} jak i bezpośrednią listę."""
    data = _get(path, params)
    if isinstance(data, list):
        return data
    return data.get("results", [])

def now_iso() -> str:
    return datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

def fetch_parameters() -> list[dict]:
    return _get_results("/parameters", {"limit": 200})

def fetch_owners(limit: int = 200) -> list[dict]:
    return _get_results("/owners", {"limit": limit})

def fetch_providers(limit: int = 200) -> list[dict]:
    return _get_results("/providers", {"limit": limit})

def fetch_licenses(limit: int = 200) -> list[dict]:
    return _get_results("/licenses", {"limit": limit})

def fetch_manufacturers(limit: int = 200) -> list[dict]:
    return _get_results("/manufacturers", {"limit": limit})

def fetch_instruments(limit: int = 200) -> list[dict]:
    return _get_results("/instruments", {"limit": limit})

def fetch_country_id(iso_code: str) -> int | None:
    countries = _get_results("/countries", {"limit": 200})
    for country in countries:
        if country.get("code", "").upper() == iso_code.upper():
            return country["id"]
    return None

def fetch_locations(country_code: str = "PL", limit: int = 100, page: int = 1) -> list[dict]:
    country_id = fetch_country_id(country_code)
    if not country_id:
        raise ValueError(f"Nie znaleziono kraju o kodzie ISO: {country_code}")
    return _get_results("/locations", {
        "countries_id": country_id,
        "limit": limit,
        "page": page
    })

def fetch_location(location_id: int) -> dict | None:
    results = _get_results(f"/locations/{location_id}")
    return results[0] if results else None

def fetch_sensors(location_id: int) -> list[dict]:
    return _get_results(f"/locations/{location_id}/sensors")

def fetch_measurements(sensor_id: int, limit: int = 100) -> list[dict]:
    return _get_results(f"/sensors/{sensor_id}/measurements", {"limit": limit})

def fetch_location_latest(location_id: int) -> list[dict]:
    return _get_results(f"/locations/{location_id}/latest")

def fetch_hourly(sensor_id: int, limit: int = 168) -> list[dict]:
    return _get_results(f"/sensors/{sensor_id}/hours", {"limit": limit})

def fetch_daily(sensor_id: int, limit: int = 30) -> list[dict]:
    return _get_results(f"/sensors/{sensor_id}/days", {"limit": limit})

def fetch_monthly(sensor_id: int, limit: int = 12) -> list[dict]:
    """OpenAQ v3 nie udostępnia agregatów miesięcznych dla wszystkich sensorów."""
    return []  # endpoint niedostępny

def fetch_yearly(sensor_id: int, limit: int = 10) -> list[dict]:
    return _get_results(f"/sensors/{sensor_id}/years", {"limit": limit})