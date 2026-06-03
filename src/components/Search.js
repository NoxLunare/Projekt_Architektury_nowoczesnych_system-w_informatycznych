// src/components/Search.js
import { useState, useEffect, useRef, useCallback } from "react";

function Search({ stations = [], onSelectStation }) {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  // Trzymamy aktualną listę stacji w ref — bez wywoływania efektu przy każdej aktualizacji
  const stationsRef = useRef(stations);
  useEffect(() => { stationsRef.current = stations; }, [stations]);

  const runFilter = useCallback((q) => {
    const query = q.trim().toLowerCase();
    if (query.length === 0) {
      setFiltered([]);
      setOpen(false);
      return;
    }
    const matches = stationsRef.current.filter((s) => {
      const locality = (s.locality || "").toLowerCase();
      const name = (s.name || "").toLowerCase();
      const street = (s.street || s.address || s.street_name || "").toLowerCase();
      return locality.includes(query) || name.includes(query) || street.includes(query);
    });
    // Deduplikuj po locality
    const seen = new Set();
    const unique = matches.filter((s) => {
      const key = s.locality || s.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setFiltered(unique.slice(0, 10));
    setOpen(unique.length > 0);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    runFilter(val);
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (station) => {
    setQuery(station.locality || station.name);
    setOpen(false);
    onSelectStation(station);
  };

  return (
    <div ref={wrapperRef} className="search-wrap">
      <span className="search-icon">⌕</span>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Szukaj miasta lub stacji..."
        className="search-input"
      />
      {open && (
        <div className="search-dropdown">
          {filtered.map((station) => (
            <div
              key={station.id}
              className="search-item"
              onClick={() => handleSelect(station)}
            >
              <span style={{ fontWeight: 600 }}>{station.locality || station.name}</span>
              {station.locality && station.name !== station.locality && (
                <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 6 }}>
                  {station.name}
                </span>
              )}
              {(station.street || station.address || station.street_name) && (
                <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 6 }}>
                  ul. {station.street || station.address || station.street_name}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Search;
