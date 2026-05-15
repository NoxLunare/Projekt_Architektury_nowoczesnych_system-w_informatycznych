// src/components/Search.js
import { useState, useEffect, useRef } from "react";
import { fetchCities } from "../api/api";

function Search({ onSelectStation }) {
  const [query, setQuery] = useState("");
  const [allCities, setAllCities] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Pobieramy pełną listę miast raz przy starcie
  useEffect(() => {
    fetchCities("PL")
      .then(setAllCities)
      .catch((err) => console.error("Błąd pobierania miast:", err));
  }, []);

  // Filtrujemy lokalnie — nie trzeba bić w backend przy każdym znaku
  useEffect(() => {
    if (query.trim().length === 0) {
      setFiltered([]);
      setOpen(false);
      return;
    }
    const q = query.toLowerCase();
    const matches = allCities.filter((city) => city.toLowerCase().includes(q));
    setFiltered(matches);
    setOpen(matches.length > 0);
  }, [query, allCities]);

  // Zamknij dropdown przy kliknięciu poza
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (city) => {
    setQuery(city);
    setOpen(false);
    // Przekazujemy nazwę miasta — App.js / Map.js może użyć tego do podświetlenia markera
    onSelectStation({ name: city });
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: 300 }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Wyszukaj miasto..."
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 6,
          border: "1px solid #ccc",
          fontSize: 14,
          boxSizing: "border-box",
        }}
      />

      {open && (
        <div style={{
          position: "absolute", top: 40, width: "100%",
          background: "white", border: "1px solid #ccc",
          borderRadius: 6, zIndex: 1000,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          maxHeight: 220, overflowY: "auto",
        }}>
          {filtered.map((city) => (
            <div
              key={city}
              onClick={() => handleSelect(city)}
              style={{
                padding: "8px 12px", cursor: "pointer", color: "#222",
                fontSize: 14,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f4ff")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              {city}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Search;
