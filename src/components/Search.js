// src/components/Search.js
import { useState, useEffect, useRef } from "react";

function Search({ stations = [], onSelectStation }) {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Filtruj po liście stacji już załadowanych do mapy
  useEffect(() => {
    const q = query.trim().toLowerCase();
    console.log("[Search] query:", q, "stations.length:", stations.length);
    if (q.length === 0) {
      setFiltered([]);
      setOpen(false);
      return;
    }
    if (stations.length > 0) console.log("[Search] przykładowa stacja:", JSON.stringify(stations[0]));
    const matches = stations.filter((s) => {
      const locality = (s.locality || "").toLowerCase();
      const name = (s.name || "").toLowerCase();
      return locality.includes(q) || name.includes(q);
    });
    // Deduplikuj po locality i posortuj
    const seen = new Set();
    const unique = matches.filter((s) => {
      const key = s.locality || s.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setFiltered(unique.slice(0, 10));
    setOpen(unique.length > 0);
  }, [query, stations]);

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
    onSelectStation(station); // przekazujemy pełny obiekt stacji z koordynatami
  };

  return (
    <div ref={wrapperRef} className="search-wrap">
      <span className="search-icon">⌕</span>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Search;
