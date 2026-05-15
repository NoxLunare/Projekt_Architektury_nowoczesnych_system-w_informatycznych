from .connection import get_connection


def init_db() -> None:
    """Tworzy wszystkie tabele jeśli nie istnieją. Bezpieczne do wywołania przy każdym starcie."""
    conn = get_connection()
    with conn:
        conn.executescript("""
            -- ─────────────────────────────────────────
            -- Tabele słownikowe (bez zależności)
            -- ─────────────────────────────────────────

            CREATE TABLE IF NOT EXISTS owners (
                id   INTEGER PRIMARY KEY,
                name TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS manufacturers (
                id   INTEGER PRIMARY KEY,
                name TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS licenses (
                id               INTEGER PRIMARY KEY,
                name             TEXT,
                attribution_name TEXT,
                attribution_url  TEXT,
                date_from        TEXT,
                date_to          TEXT
            );

            CREATE TABLE IF NOT EXISTS parameters (
                id           INTEGER PRIMARY KEY,
                name         TEXT NOT NULL,
                display_name TEXT,
                description  TEXT,
                units        TEXT
            );

            -- ─────────────────────────────────────────
            -- Instrumenty i producenci
            -- ─────────────────────────────────────────

            CREATE TABLE IF NOT EXISTS instruments (
                id              INTEGER PRIMARY KEY,
                name            TEXT NOT NULL,
                manufacturer_id INTEGER REFERENCES manufacturers(id) ON DELETE SET NULL
            );

            -- ─────────────────────────────────────────
            -- Providers (dostawcy danych)
            -- ─────────────────────────────────────────

            CREATE TABLE IF NOT EXISTS providers (
                id            INTEGER PRIMARY KEY,
                name          TEXT NOT NULL,
                source_name   TEXT,
                export_prefix TEXT,
                license_id    INTEGER REFERENCES licenses(id) ON DELETE SET NULL
            );

            -- ─────────────────────────────────────────
            -- Lokalizacje (stacje pomiarowe)
            -- ─────────────────────────────────────────

            CREATE TABLE IF NOT EXISTS locations (
                id              INTEGER PRIMARY KEY,
                name            TEXT,
                locality        TEXT,
                timezone        TEXT,
                country_code    TEXT,
                owner_id        INTEGER REFERENCES owners(id)    ON DELETE SET NULL,
                provider_id     INTEGER REFERENCES providers(id) ON DELETE SET NULL,
                is_mobile       INTEGER NOT NULL DEFAULT 0,
                is_monitor      INTEGER NOT NULL DEFAULT 0,
                latitude        REAL,
                longitude       REAL,
                bounds_nw_lat   REAL,
                bounds_nw_lon   REAL,
                bounds_se_lat   REAL,
                bounds_se_lon   REAL,
                datetime_first  TEXT,
                datetime_last   TEXT,
                created_at      TEXT,
                updated_at      TEXT
            );

            CREATE INDEX IF NOT EXISTS ix_locations_country
                ON locations (country_code);
            CREATE INDEX IF NOT EXISTS ix_locations_owner
                ON locations (owner_id);
            CREATE INDEX IF NOT EXISTS ix_locations_provider
                ON locations (provider_id);

            -- ─────────────────────────────────────────
            -- Tabele pośrednie M:N
            -- ─────────────────────────────────────────

            CREATE TABLE IF NOT EXISTS location_licenses (
                location_id INTEGER NOT NULL REFERENCES locations(id)  ON DELETE CASCADE,
                license_id  INTEGER NOT NULL REFERENCES licenses(id)   ON DELETE CASCADE,
                date_from   TEXT,
                date_to     TEXT,
                PRIMARY KEY (location_id, license_id)
            );

            CREATE TABLE IF NOT EXISTS location_instruments (
                location_id   INTEGER NOT NULL REFERENCES locations(id)   ON DELETE CASCADE,
                instrument_id INTEGER NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
                PRIMARY KEY (location_id, instrument_id)
            );

            -- ─────────────────────────────────────────
            -- Sensory
            -- ─────────────────────────────────────────

            CREATE TABLE IF NOT EXISTS sensors (
                id                         INTEGER PRIMARY KEY,
                location_id                INTEGER NOT NULL REFERENCES locations(id)  ON DELETE CASCADE,
                parameter_id               INTEGER NOT NULL REFERENCES parameters(id) ON DELETE RESTRICT,
                name                       TEXT,
                datetime_first             TEXT,
                datetime_last              TEXT,
                coverage_expected_count    INTEGER,
                coverage_expected_interval TEXT,
                coverage_percent_complete  REAL,
                coverage_datetime_from     TEXT,
                coverage_datetime_to       TEXT,
                last_value                 REAL,
                last_datetime              TEXT,
                created_at                 TEXT,
                updated_at                 TEXT
            );

            CREATE INDEX IF NOT EXISTS ix_sensors_location
                ON sensors (location_id);
            CREATE INDEX IF NOT EXISTS ix_sensors_parameter
                ON sensors (parameter_id);

            -- ─────────────────────────────────────────
            -- Flagi sensorów
            -- ─────────────────────────────────────────

            CREATE TABLE IF NOT EXISTS sensor_flags (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id     INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
                datetime_from TEXT,
                datetime_to   TEXT,
                flag_type     TEXT,
                flag          TEXT,
                created_at    TEXT
            );

            CREATE INDEX IF NOT EXISTS ix_sensor_flags_sensor
                ON sensor_flags (sensor_id);

            -- ─────────────────────────────────────────
            -- Surowe pomiary
            -- ─────────────────────────────────────────

            CREATE TABLE IF NOT EXISTS measurements (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id      INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
                datetime_utc   TEXT    NOT NULL,
                datetime_local TEXT,
                value          REAL    NOT NULL,
                latitude       REAL,
                longitude      REAL,
                updated_at     TEXT,
                UNIQUE (sensor_id, datetime_utc)
            );

            CREATE INDEX IF NOT EXISTS ix_measurements_sensor
                ON measurements (sensor_id);
            CREATE INDEX IF NOT EXISTS ix_measurements_datetime
                ON measurements (datetime_utc);

            -- ─────────────────────────────────────────
            -- Najnowsze pomiary (cache per sensor)
            -- ─────────────────────────────────────────

            CREATE TABLE IF NOT EXISTS location_latest (
                location_id    INTEGER NOT NULL REFERENCES locations(id)   ON DELETE CASCADE,
                sensor_id      INTEGER NOT NULL REFERENCES sensors(id)     ON DELETE CASCADE,
                parameter_id   INTEGER NOT NULL REFERENCES parameters(id)  ON DELETE RESTRICT,
                datetime_utc   TEXT,
                datetime_local TEXT,
                value          REAL,
                latitude       REAL,
                longitude      REAL,
                updated_at     TEXT,
                PRIMARY KEY (location_id, sensor_id, parameter_id)
            );

            CREATE INDEX IF NOT EXISTS ix_location_latest_location
                ON location_latest (location_id);

            -- ─────────────────────────────────────────
            -- Agregaty godzinowe
            -- ─────────────────────────────────────────

            CREATE TABLE IF NOT EXISTS hourly_aggregates (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id        INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
                hour_utc         TEXT    NOT NULL,
                hour_local       TEXT,
                value_avg        REAL,
                value_min        REAL,
                value_max        REAL,
                value_median     REAL,
                expected_count   INTEGER,
                observed_count   INTEGER,
                percent_complete REAL,
                coverage_from    TEXT,
                coverage_to      TEXT,
                updated_at       TEXT,
                UNIQUE (sensor_id, hour_utc)
            );

            CREATE INDEX IF NOT EXISTS ix_hourly_sensor
                ON hourly_aggregates (sensor_id);

            -- ─────────────────────────────────────────
            -- Agregaty dzienne
            -- ─────────────────────────────────────────

            CREATE TABLE IF NOT EXISTS daily_aggregates (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id        INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
                day_utc          TEXT    NOT NULL,
                value_avg        REAL,
                value_min        REAL,
                value_max        REAL,
                value_median     REAL,
                expected_count   INTEGER,
                observed_count   INTEGER,
                percent_complete REAL,
                coverage_from    TEXT,
                coverage_to      TEXT,
                updated_at       TEXT,
                UNIQUE (sensor_id, day_utc)
            );

            CREATE INDEX IF NOT EXISTS ix_daily_sensor
                ON daily_aggregates (sensor_id);

            -- ─────────────────────────────────────────
            -- Agregaty miesięczne
            -- ─────────────────────────────────────────

            CREATE TABLE IF NOT EXISTS monthly_aggregates (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id        INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
                year             INTEGER NOT NULL,
                month            INTEGER NOT NULL,
                value_avg        REAL,
                value_min        REAL,
                value_max        REAL,
                value_median     REAL,
                expected_count   INTEGER,
                observed_count   INTEGER,
                percent_complete REAL,
                updated_at       TEXT,
                UNIQUE (sensor_id, year, month)
            );

            CREATE INDEX IF NOT EXISTS ix_monthly_sensor
                ON monthly_aggregates (sensor_id);

            -- ─────────────────────────────────────────
            -- Agregaty roczne
            -- ─────────────────────────────────────────

            CREATE TABLE IF NOT EXISTS yearly_aggregates (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id        INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
                year             INTEGER NOT NULL,
                value_avg        REAL,
                value_min        REAL,
                value_max        REAL,
                value_median     REAL,
                expected_count   INTEGER,
                observed_count   INTEGER,
                percent_complete REAL,
                updated_at       TEXT,
                UNIQUE (sensor_id, year)
            );

            CREATE INDEX IF NOT EXISTS ix_yearly_sensor
                ON yearly_aggregates (sensor_id);
        """)
    conn.close()