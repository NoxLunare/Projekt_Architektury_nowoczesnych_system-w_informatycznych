-- =============================================================
--  OpenAQ v3 — Schemat bazy danych (tylko Polska)
-- =============================================================

PRAGMA foreign_keys = ON;

-- =============================================================
-- 1. SŁOWNIKI
-- =============================================================

CREATE TABLE parameters (
    id           INTEGER NOT NULL,
    name         TEXT    NOT NULL,
    display_name TEXT    NULL,
    description  TEXT    NULL,
    units        TEXT    NOT NULL,
    is_core      INTEGER NOT NULL DEFAULT 0,  -- 0/1 zamiast BIT
    CONSTRAINT PK_parameters PRIMARY KEY (id),
    CONSTRAINT UQ_parameters_name UNIQUE (name)
);

CREATE TABLE licenses (
    id               INTEGER NOT NULL,
    name             TEXT    NOT NULL,
    attribution_name TEXT    NULL,
    attribution_url  TEXT    NULL,
    date_from        TEXT    NULL,  -- ISO 8601: 'YYYY-MM-DD'
    date_to          TEXT    NULL,
    CONSTRAINT PK_licenses PRIMARY KEY (id)
);

CREATE TABLE providers (
    id            INTEGER NOT NULL,
    name          TEXT    NOT NULL,
    source_name   TEXT    NULL,
    export_prefix TEXT    NULL,
    license_id    INTEGER NULL,
    CONSTRAINT PK_providers PRIMARY KEY (id),
    CONSTRAINT FK_providers_licenses FOREIGN KEY (license_id) REFERENCES licenses(id)
);

CREATE TABLE owners (
    id   INTEGER NOT NULL,
    name TEXT    NOT NULL,
    CONSTRAINT PK_owners PRIMARY KEY (id)
);

CREATE TABLE manufacturers (
    id   INTEGER NOT NULL,
    name TEXT    NOT NULL,
    CONSTRAINT PK_manufacturers PRIMARY KEY (id)
);

CREATE TABLE instruments (
    id              INTEGER NOT NULL,
    name            TEXT    NOT NULL,
    manufacturer_id INTEGER NULL,
    CONSTRAINT PK_instruments PRIMARY KEY (id),
    CONSTRAINT FK_instruments_manufacturers FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id)
);

-- =============================================================
-- 2. LOKALIZACJE  (stacje w Polsce — filtr iso=PL)
-- =============================================================

CREATE TABLE locations (
    id             INTEGER NOT NULL,
    name           TEXT    NULL,
    locality       TEXT    NULL,
    timezone       TEXT    NOT NULL DEFAULT 'Europe/Warsaw',
    country_code   TEXT    NOT NULL DEFAULT 'PL',
    owner_id       INTEGER NULL,
    provider_id    INTEGER NULL,
    is_mobile      INTEGER NOT NULL DEFAULT 0,  -- 0/1
    is_monitor     INTEGER NOT NULL DEFAULT 0,  -- 1 = stacja referencyjna GIOS
    latitude       REAL    NULL,
    longitude      REAL    NULL,
    bound_min_lon  REAL    NULL,
    bound_min_lat  REAL    NULL,
    bound_max_lon  REAL    NULL,
    bound_max_lat  REAL    NULL,
    datetime_first TEXT    NULL,  -- ISO 8601
    datetime_last  TEXT    NULL,
    fetched_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT PK_locations           PRIMARY KEY (id),
    CONSTRAINT FK_locations_owners    FOREIGN KEY (owner_id)    REFERENCES owners(id),
    CONSTRAINT FK_locations_providers FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE INDEX IX_locations_name ON locations(name);

CREATE TABLE location_instruments (
    location_id   INTEGER NOT NULL,
    instrument_id INTEGER NOT NULL,
    CONSTRAINT PK_location_instruments PRIMARY KEY (location_id, instrument_id),
    CONSTRAINT FK_locinst_location   FOREIGN KEY (location_id)   REFERENCES locations(id)   ON DELETE CASCADE,
    CONSTRAINT FK_locinst_instrument FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
);

CREATE TABLE location_licenses (
    location_id INTEGER NOT NULL,
    license_id  INTEGER NOT NULL,
    date_from   TEXT    NOT NULL,
    date_to     TEXT    NULL,
    CONSTRAINT PK_location_licenses PRIMARY KEY (location_id, license_id, date_from),
    CONSTRAINT FK_loclic_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    CONSTRAINT FK_loclic_license  FOREIGN KEY (license_id)  REFERENCES licenses(id)
);

-- =============================================================
-- 3. SENSORY  (1 sensor = 1 parametr w 1 lokalizacji)
-- Czyli to jest taka ala tablica wiele do wielu
-- =============================================================

CREATE TABLE sensors (
    id                         INTEGER NOT NULL,
    location_id                INTEGER NOT NULL,
    parameter_id               INTEGER NOT NULL,
    name                       TEXT    NULL,
    datetime_first             TEXT    NULL,
    datetime_last              TEXT    NULL,
    coverage_expected_count    INTEGER NULL,
    coverage_observed_count    INTEGER NULL,
    coverage_percent_complete  REAL    NULL,
    coverage_datetime_from     TEXT    NULL,
    coverage_datetime_to       TEXT    NULL,
    latest_value               REAL    NULL,
    latest_datetime            TEXT    NULL,
    fetched_at                 TEXT    NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT PK_sensors PRIMARY KEY (id),
    CONSTRAINT FK_sensors_locations  FOREIGN KEY (location_id)  REFERENCES locations(id)  ON DELETE CASCADE,
    CONSTRAINT FK_sensors_parameters FOREIGN KEY (parameter_id) REFERENCES parameters(id)
);

CREATE INDEX IX_sensors_location  ON sensors(location_id);
CREATE INDEX IX_sensors_parameter ON sensors(parameter_id);

-- =============================================================
-- 4. SUROWE POMIARY  (/v3/sensors/{id}/measurements)
-- =============================================================

CREATE TABLE measurements (
    id             INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    sensor_id      INTEGER NOT NULL,
    datetime_utc   TEXT    NOT NULL,  -- ISO 8601
    datetime_local TEXT    NULL,
    value          REAL    NOT NULL,
    latitude       REAL    NULL,
    longitude      REAL    NULL,
    fetched_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT FK_measurements_sensors FOREIGN KEY (sensor_id) REFERENCES sensors(id)
);

CREATE INDEX IX_measurements_sensor_time ON measurements(sensor_id, datetime_utc DESC);

-- =============================================================
-- 5. AGREGATY GODZINOWE  (/v3/sensors/{id}/hours)
-- =============================================================

CREATE TABLE hourly_aggregates (
    id               INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    sensor_id        INTEGER NOT NULL,
    hour_utc         TEXT    NOT NULL,
    hour_local       TEXT    NULL,
    value_avg        REAL    NULL,
    value_min        REAL    NULL,
    value_max        REAL    NULL,
    value_sd         REAL    NULL,
    expected_count   INTEGER NULL,
    observed_count   INTEGER NULL,
    percent_complete REAL    NULL,
    coverage_from    TEXT    NULL,
    coverage_to      TEXT    NULL,
    fetched_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT UQ_hourly_sensor_hour UNIQUE (sensor_id, hour_utc),
    CONSTRAINT FK_hourly_sensors     FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
);

CREATE INDEX IX_hourly_sensor_time ON hourly_aggregates(sensor_id, hour_utc DESC);

-- =============================================================
-- 6. AGREGATY DZIENNE  (/v3/sensors/{id}/days)
-- =============================================================

CREATE TABLE daily_aggregates (
    id               INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    sensor_id        INTEGER NOT NULL,
    day_utc          TEXT    NOT NULL,  -- 'YYYY-MM-DD'
    value_avg        REAL    NULL,
    value_min        REAL    NULL,
    value_max        REAL    NULL,
    value_sd         REAL    NULL,
    expected_count   INTEGER NULL,
    observed_count   INTEGER NULL,
    percent_complete REAL    NULL,
    coverage_from    TEXT    NULL,
    coverage_to      TEXT    NULL,
    fetched_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT UQ_daily_sensor_day UNIQUE (sensor_id, day_utc),
    CONSTRAINT FK_daily_sensors    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
);

CREATE INDEX IX_daily_sensor_day ON daily_aggregates(sensor_id, day_utc DESC);

-- =============================================================
-- 7. AGREGATY MIESIĘCZNE  (/v3/sensors/{id}/hours/monthly)
-- =============================================================

CREATE TABLE monthly_aggregates (
    id               INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    sensor_id        INTEGER NOT NULL,
    year             INTEGER NOT NULL,
    month            INTEGER NOT NULL,
    value_avg        REAL    NULL,
    value_min        REAL    NULL,
    value_max        REAL    NULL,
    expected_count   INTEGER NULL,
    observed_count   INTEGER NULL,
    percent_complete REAL    NULL,
    fetched_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT UQ_monthly_sensor_ym UNIQUE (sensor_id, year, month),
    CONSTRAINT FK_monthly_sensors   FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE,
    CONSTRAINT CHK_monthly_month    CHECK (month BETWEEN 1 AND 12)
);

-- =============================================================
-- 8. AGREGATY ROCZNE  (/v3/sensors/{id}/years)
-- =============================================================

CREATE TABLE yearly_aggregates (
    id               INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    sensor_id        INTEGER NOT NULL,
    year             INTEGER NOT NULL,
    value_avg        REAL    NULL,
    value_min        REAL    NULL,
    value_max        REAL    NULL,
    expected_count   INTEGER NULL,
    observed_count   INTEGER NULL,
    percent_complete REAL    NULL,
    fetched_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT UQ_yearly_sensor_year UNIQUE (sensor_id, year),
    CONSTRAINT FK_yearly_sensors     FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
);

-- =============================================================
-- 9. FLAGI JAKOŚCI  (/v3/sensors/{id}/flags)
-- =============================================================

CREATE TABLE sensor_flags (
    id            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    sensor_id     INTEGER NOT NULL,
    datetime_from TEXT    NOT NULL,
    datetime_to   TEXT    NULL,
    flag_type     TEXT    NULL,
    note          TEXT    NULL,
    fetched_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT FK_flags_sensors FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
);

CREATE INDEX IX_flags_sensor ON sensor_flags(sensor_id, datetime_from);

-- =============================================================
-- 10. CACHE OSTATNICH ODCZYTÓW  (/v3/locations/{id}/latest)
-- =============================================================

CREATE TABLE location_latest (
    location_id    INTEGER NOT NULL,
    sensor_id      INTEGER NULL,
    parameter_id   INTEGER NULL,
    datetime_utc   TEXT    NULL,
    datetime_local TEXT    NULL,
    value          REAL    NULL,
    latitude       REAL    NULL,
    longitude      REAL    NULL,
    updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT PK_location_latest   PRIMARY KEY (location_id),
    CONSTRAINT FK_latest_locations  FOREIGN KEY (location_id)  REFERENCES locations(id)  ON DELETE CASCADE,
    CONSTRAINT FK_latest_sensors    FOREIGN KEY (sensor_id)    REFERENCES sensors(id),
    CONSTRAINT FK_latest_parameters FOREIGN KEY (parameter_id) REFERENCES parameters(id)
);

-- =============================================================
-- WIDOKI POMOCNICZE
-- =============================================================

CREATE VIEW v_sensors AS
SELECT
    s.id                        AS sensor_id,
    s.name                      AS sensor_name,
    l.id                        AS location_id,
    l.name                      AS location_name,
    l.locality,
    l.latitude,
    l.longitude,
    l.is_monitor,
    l.is_mobile,
    p.id                        AS parameter_id,
    p.name                      AS parameter_name,
    p.display_name              AS parameter_display,
    p.units,
    pr.name                     AS provider_name,
    o.name                      AS owner_name,
    s.datetime_first,
    s.datetime_last,
    s.latest_value,
    s.latest_datetime,
    s.coverage_percent_complete
FROM sensors s
JOIN locations  l  ON l.id  = s.location_id
JOIN parameters p  ON p.id  = s.parameter_id
LEFT JOIN providers pr ON pr.id = l.provider_id
LEFT JOIN owners    o  ON o.id  = l.owner_id;

-- Ostatnie 24h pomiarow
CREATE VIEW v_last_24h AS
SELECT
    m.sensor_id,
    vs.location_name,
    vs.locality,
    vs.parameter_name,
    vs.units,
    m.datetime_utc,
    m.datetime_local,
    m.value,
    vs.latitude,
    vs.longitude
FROM measurements m
JOIN v_sensors vs ON vs.sensor_id = m.sensor_id
WHERE m.datetime_utc >= datetime('now', '-24 hours');
