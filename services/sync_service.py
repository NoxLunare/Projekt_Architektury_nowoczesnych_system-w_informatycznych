"""
sync_service.py

Pobiera dane z OpenAQ API i upsertuje do lokalnej bazy SQLite.
Kolejność sync ma znaczenie ze względu na klucze obce:
  1. sync_lookup_tables()   — owners, providers, licenses, manufacturers, instruments, parameters
  2. sync_locations()       — locations + tabele pośrednie
  3. sync_sensors()         — sensors dla danej lokalizacji
  4. sync_measurements()    — pomiary dla danego sensora
  5. sync_location_latest() — cache najnowszych pomiarów
  6. sync_aggregates_*()    — agregaty godzinowe/dzienne/miesięczne/roczne
"""

from database.connection import get_connection
import services.openaq_client as oaq


# ─────────────────────────────────────────
# Tabele słownikowe
# ─────────────────────────────────────────

def sync_lookup_tables() -> dict:
    """
    Synchronizuje owners, manufacturers, licenses, instruments, providers, parameters.
    Należy wywołać jako pierwszy krok przed sync lokalizacji.
    """
    conn = get_connection()
    counts = {}

    with conn:
        # owners
        print(">>> owners", flush=True)
        owners = oaq.fetch_owners()
        print(f">>> owners type: {type(owners)}, sample: {owners[:1]}", flush=True)
        for o in owners:
            conn.execute("""
                INSERT INTO owners (id, name) VALUES (?, ?)
                ON CONFLICT(id) DO UPDATE SET name = excluded.name
            """, (o["id"], o.get("name", "")))
        counts["owners"] = len(owners)

        # manufacturers
        print(">>> manufacturers", flush=True)
        manufacturers = oaq.fetch_manufacturers()
        print(f">>> manufacturers type: {type(manufacturers)}, sample: {manufacturers[:1]}", flush=True)
        for m in manufacturers:
            conn.execute("""
                INSERT INTO manufacturers (id, name) VALUES (?, ?)
                ON CONFLICT(id) DO UPDATE SET name = excluded.name
            """, (m["id"], m.get("name", "")))
        counts["manufacturers"] = len(manufacturers)

        # licenses
        print(">>> licenses", flush=True)
        licenses = oaq.fetch_licenses()
        print(f">>> licenses type: {type(licenses)}, sample: {licenses[:1]}", flush=True)
        for lic in licenses:
            conn.execute("""
                INSERT INTO licenses (id, name, attribution_url)
                VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name            = excluded.name,
                    attribution_url = excluded.attribution_url
            """, (lic["id"], lic.get("name"), lic.get("sourceUrl")))

        # instruments
        print(">>> instruments", flush=True)
        instruments = oaq.fetch_instruments()
        print(f">>> instruments type: {type(instruments)}, sample: {instruments[:1]}", flush=True)
        for ins in instruments:
            mfr = ins.get("manufacturer") or {}
            conn.execute("""
                INSERT INTO instruments (id, name, manufacturer_id) VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name            = excluded.name,
                    manufacturer_id = excluded.manufacturer_id
            """, (ins["id"], ins.get("name", ""), mfr.get("id")))
        counts["instruments"] = len(instruments)

        # providers
        print(">>> providers", flush=True)
        providers = oaq.fetch_providers()
        print(f">>> providers type: {type(providers)}, sample: {providers[:1]}", flush=True)
        for p in providers:
            conn.execute("""
                INSERT INTO providers (id, name, source_name, export_prefix, license_id)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name          = excluded.name,
                    source_name   = excluded.source_name,
                    export_prefix = excluded.export_prefix
            """, (p["id"], p.get("name", ""), p.get("sourceName"), p.get("exportPrefix"), None))

        # parameters
        print(">>> parameters", flush=True)
        parameters = oaq.fetch_parameters()
        print(f">>> parameters type: {type(parameters)}, sample: {parameters[:1]}", flush=True)
        for param in parameters:
            conn.execute("""
                INSERT INTO parameters (id, name, display_name, description, units)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name         = excluded.name,
                    display_name = excluded.display_name,
                    description  = excluded.description,
                    units        = excluded.units
            """, (
            param["id"], param.get("name", ""), param.get("displayName"), param.get("description"), param.get("units")))

    conn.close()
    return counts


# ─────────────────────────────────────────
# Lokalizacje
# ─────────────────────────────────────────

def sync_locations(country_code: str = "PL", limit: int = 100) -> list[int]:
    raw = oaq.fetch_locations(country_code=country_code, limit=limit)
    conn = get_connection()
    ids = []

    with conn:
        for loc in raw:
            coords  = loc.get("coordinates") or {}
            bounds  = loc.get("bounds") or []          # lista [lon_min, lat_min, lon_max, lat_max]
            owner   = loc.get("owner") or {}
            provider = loc.get("provider") or {}
            country = loc.get("country") or {}

            conn.execute("""
                INSERT INTO locations (
                    id, name, locality, timezone, country_code,
                    owner_id, provider_id, is_mobile, is_monitor,
                    latitude, longitude,
                    bounds_nw_lat, bounds_nw_lon, bounds_se_lat, bounds_se_lon,
                    datetime_first, datetime_last
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name           = excluded.name,
                    locality       = excluded.locality,
                    timezone       = excluded.timezone,
                    country_code   = excluded.country_code,
                    owner_id       = excluded.owner_id,
                    provider_id    = excluded.provider_id,
                    is_mobile      = excluded.is_mobile,
                    is_monitor     = excluded.is_monitor,
                    latitude       = excluded.latitude,
                    longitude      = excluded.longitude,
                    bounds_nw_lat  = excluded.bounds_nw_lat,
                    bounds_nw_lon  = excluded.bounds_nw_lon,
                    bounds_se_lat  = excluded.bounds_se_lat,
                    bounds_se_lon  = excluded.bounds_se_lon,
                    datetime_first = excluded.datetime_first,
                    datetime_last  = excluded.datetime_last
            """, (
                loc["id"],
                loc.get("name"),
                loc.get("locality"),
                loc.get("timezone"),
                country.get("code"),
                owner.get("id"),
                provider.get("id"),
                int(loc.get("isMobile", False)),       # ← camelCase
                int(loc.get("isMonitor", False)),       # ← camelCase
                coords.get("latitude"),
                coords.get("longitude"),
                bounds[1] if len(bounds) > 1 else None,  # lat_min
                bounds[0] if len(bounds) > 0 else None,  # lon_min
                bounds[3] if len(bounds) > 3 else None,  # lat_max
                bounds[2] if len(bounds) > 2 else None,  # lon_max
                (loc.get("datetimeFirst") or {}).get("utc"),   # ← camelCase, bez "datetimes"
                (loc.get("datetimeLast") or {}).get("utc"),    # ← camelCase
            ))

            loc_id = loc["id"]
            ids.append(loc_id)

            # location_licenses — może być null
            for lic in loc.get("licenses") or []:
                if lic.get("id"):
                    conn.execute("""
                        INSERT OR IGNORE INTO location_licenses (location_id, license_id)
                        VALUES (?, ?)
                    """, (loc_id, lic["id"]))

            # location_instruments
            for ins in loc.get("instruments") or []:
                if ins.get("id"):
                    conn.execute("""
                        INSERT OR IGNORE INTO location_instruments (location_id, instrument_id)
                        VALUES (?, ?)
                    """, (loc_id, ins["id"]))

    conn.close()
    return ids


# ─────────────────────────────────────────
# Sensory
# ─────────────────────────────────────────

def sync_sensors(location_id: int) -> list[int]:
    """
    Pobiera i upsertuje sensory dla danej lokalizacji.
    Zwraca listę sensor_id.
    """
    raw = oaq.fetch_sensors(location_id)
    conn = get_connection()
    ids = []

    with conn:
        for s in raw:
            param = s.get("parameter") or {}
            coverage = s.get("coverage") or {}
            latest = s.get("latest") or {}

            conn.execute("""
                INSERT INTO sensors (
                    id, location_id, parameter_id, name,
                    datetime_first, datetime_last,
                    coverage_expected_count, coverage_expected_interval,
                    coverage_percent_complete, coverage_datetime_from, coverage_datetime_to,
                    last_value, last_datetime, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    location_id                = excluded.location_id,
                    parameter_id               = excluded.parameter_id,
                    name                       = excluded.name,
                    datetime_first             = excluded.datetime_first,
                    datetime_last              = excluded.datetime_last,
                    coverage_expected_count    = excluded.coverage_expected_count,
                    coverage_expected_interval = excluded.coverage_expected_interval,
                    coverage_percent_complete  = excluded.coverage_percent_complete,
                    coverage_datetime_from     = excluded.coverage_datetime_from,
                    coverage_datetime_to       = excluded.coverage_datetime_to,
                    last_value                 = excluded.last_value,
                    last_datetime              = excluded.last_datetime,
                    updated_at                 = excluded.updated_at
            """, (
                s["id"],
                location_id,
                param.get("id"),
                s.get("name"),
                (s.get("datetimes") or {}).get("first"),
                (s.get("datetimes") or {}).get("last"),
                coverage.get("expected_count"),
                coverage.get("expected_interval"),
                coverage.get("percent_complete"),
                coverage.get("datetime_from"),
                coverage.get("datetime_to"),
                latest.get("value"),
                (latest.get("datetime") or {}).get("utc"),
                s.get("created_at"),
                s.get("updated_at"),
            ))
            ids.append(s["id"])

    conn.close()
    return ids


# ─────────────────────────────────────────
# Pomiary
# ─────────────────────────────────────────

def sync_measurements(sensor_id: int, limit: int = 100) -> int:
    """
    Pobiera i zapisuje surowe pomiary dla sensora.
    Używa INSERT OR IGNORE — nie nadpisuje istniejących pomiarów (UNIQUE na sensor_id+datetime_utc).
    Zwraca liczbę nowo dodanych rekordów.
    """
    raw = oaq.fetch_measurements(sensor_id, limit=limit)
    conn = get_connection()
    inserted = 0

    with conn:
        for m in raw:
            dt = m.get("period") or m.get("datetime") or {}
            value = m.get("value")
            coords = m.get("coordinates") or {}

            if value is None:
                continue

            cur = conn.execute("""
                INSERT OR IGNORE INTO measurements
                    (sensor_id, datetime_utc, datetime_local, value, latitude, longitude, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                sensor_id,
                dt.get("utc") if isinstance(dt, dict) else dt,
                dt.get("local") if isinstance(dt, dict) else None,
                value,
                coords.get("latitude"),
                coords.get("longitude"),
                m.get("updated_at") or oaq.now_iso(),
            ))
            inserted += cur.rowcount

    conn.close()
    return inserted


# ─────────────────────────────────────────
# Location latest
# ─────────────────────────────────────────

def sync_location_latest(location_id: int) -> int:
    """
    Pobiera i upsertuje najnowsze pomiary dla lokalizacji (cache per sensor+parametr).
    """
    raw = oaq.fetch_location_latest(location_id)
    conn = get_connection()
    count = 0

    with conn:
        for item in raw:
            sensor_id = (item.get("sensorsId") or item.get("sensor_id"))
            param_id  = (item.get("parameterId") or item.get("parameter_id"))
            dt        = item.get("datetime") or {}
            coords    = item.get("coordinates") or {}
            value     = item.get("value")

            if not sensor_id or value is None:
                continue

            conn.execute("""
                INSERT INTO location_latest
                    (location_id, sensor_id, parameter_id, datetime_utc, datetime_local,
                     value, latitude, longitude, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(location_id, sensor_id, parameter_id) DO UPDATE SET
                    datetime_utc   = excluded.datetime_utc,
                    datetime_local = excluded.datetime_local,
                    value          = excluded.value,
                    latitude       = excluded.latitude,
                    longitude      = excluded.longitude,
                    updated_at     = excluded.updated_at
            """, (
                location_id, sensor_id, param_id,
                dt.get("utc") if isinstance(dt, dict) else dt,
                dt.get("local") if isinstance(dt, dict) else None,
                value,
                coords.get("latitude"),
                coords.get("longitude"),
                item.get("updated_at") or oaq.now_iso(),
            ))
            count += 1

    conn.close()
    return count


# ─────────────────────────────────────────
# Agregaty
# ─────────────────────────────────────────

def _upsert_aggregates(conn, table: str, sensor_id: int, rows: list[dict], time_col: str, extra_cols: list) -> int:
    """Wspólna logika upsert dla tabel agregatów."""
    inserted = 0
    col_names = ", ".join(["sensor_id", time_col] + extra_cols)
    placeholders = ", ".join(["?"] * (2 + len(extra_cols)))
    conflict_updates = ", ".join([f"{c} = excluded.{c}" for c in extra_cols])

    for row in rows:
        time_val = row.get(time_col) or row.get("period", {})
        if isinstance(time_val, dict):
            time_val = time_val.get("utc") or time_val.get("datetimeFrom", {}).get("utc")

        values = [sensor_id, time_val] + [row.get(c) for c in extra_cols]

        cur = conn.execute(f"""
            INSERT INTO {table} ({col_names}) VALUES ({placeholders})
            ON CONFLICT(sensor_id, {time_col}) DO UPDATE SET {conflict_updates}
        """, values)
        inserted += cur.rowcount

    return inserted


def sync_hourly(sensor_id: int, limit: int = 168) -> int:
    raw = oaq.fetch_hourly(sensor_id, limit=limit)
    conn = get_connection()
    with conn:
        n = _upsert_aggregates(conn, "hourly_aggregates", sensor_id, raw, "hour_utc", [
            "hour_local", "value_avg", "value_min", "value_max", "value_median",
            "expected_count", "observed_count", "percent_complete",
            "coverage_from", "coverage_to", "updated_at"
        ])
    conn.close()
    return n


def sync_daily(sensor_id: int, limit: int = 30) -> int:
    raw = oaq.fetch_daily(sensor_id, limit=limit)
    conn = get_connection()
    with conn:
        n = _upsert_aggregates(conn, "daily_aggregates", sensor_id, raw, "day_utc", [
            "value_avg", "value_min", "value_max", "value_median",
            "expected_count", "observed_count", "percent_complete",
            "coverage_from", "coverage_to", "updated_at"
        ])
    conn.close()
    return n


def sync_monthly(sensor_id: int, limit: int = 12) -> int:
    raw = oaq.fetch_monthly(sensor_id, limit=limit)
    conn = get_connection()
    with conn:
        for row in raw:
            conn.execute("""
                INSERT INTO monthly_aggregates
                    (sensor_id, year, month, value_avg, value_min, value_max, value_median,
                     expected_count, observed_count, percent_complete, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(sensor_id, year, month) DO UPDATE SET
                    value_avg        = excluded.value_avg,
                    value_min        = excluded.value_min,
                    value_max        = excluded.value_max,
                    value_median     = excluded.value_median,
                    expected_count   = excluded.expected_count,
                    observed_count   = excluded.observed_count,
                    percent_complete = excluded.percent_complete,
                    updated_at       = excluded.updated_at
            """, (
                sensor_id,
                row.get("year"),
                row.get("month"),
                row.get("value_avg") or row.get("value", {}).get("avg"),
                row.get("value_min") or row.get("value", {}).get("min"),
                row.get("value_max") or row.get("value", {}).get("max"),
                row.get("value_median") or row.get("value", {}).get("median"),
                row.get("expected_count") or row.get("coverage", {}).get("expected_count"),
                row.get("observed_count") or row.get("coverage", {}).get("observed_count"),
                row.get("percent_complete") or row.get("coverage", {}).get("percent_complete"),
                row.get("updated_at") or oaq.now_iso(),
            ))
    conn.close()
    return len(raw)


def sync_yearly(sensor_id: int, limit: int = 10) -> int:
    raw = oaq.fetch_yearly(sensor_id, limit=limit)
    conn = get_connection()
    with conn:
        for row in raw:
            conn.execute("""
                INSERT INTO yearly_aggregates
                    (sensor_id, year, value_avg, value_min, value_max, value_median,
                     expected_count, observed_count, percent_complete, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(sensor_id, year) DO UPDATE SET
                    value_avg        = excluded.value_avg,
                    value_min        = excluded.value_min,
                    value_max        = excluded.value_max,
                    value_median     = excluded.value_median,
                    expected_count   = excluded.expected_count,
                    observed_count   = excluded.observed_count,
                    percent_complete = excluded.percent_complete,
                    updated_at       = excluded.updated_at
            """, (
                sensor_id,
                row.get("year"),
                row.get("value_avg") or row.get("value", {}).get("avg"),
                row.get("value_min") or row.get("value", {}).get("min"),
                row.get("value_max") or row.get("value", {}).get("max"),
                row.get("value_median") or row.get("value", {}).get("median"),
                row.get("expected_count") or row.get("coverage", {}).get("expected_count"),
                row.get("observed_count") or row.get("coverage", {}).get("observed_count"),
                row.get("percent_complete") or row.get("coverage", {}).get("percent_complete"),
                row.get("updated_at") or oaq.now_iso(),
            ))
    conn.close()
    return len(raw)