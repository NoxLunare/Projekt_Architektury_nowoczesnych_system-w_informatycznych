import { useState, useEffect } from "react";
import { fetchCities } from "../api/api";

function Search({ onSelectCity }) {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    async function loadCities() {
      if (query.length === 0) {
        setFiltered([]);
        return;
      }

      try {
        const data = await fetchCities(query);

        setFiltered(data);
      } catch (error) {
        console.error("Błąd pobierania miast:", error);
      }
    }

    loadCities();
  }, [query]);

  const handleChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSelect = (city) => {
    setQuery(city);
    setFiltered([]);

    onSelectCity({
      name: city
    });
  };

  return (
    <div style={{ position: "relative", width: "300px" }}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Wyszukaj miasto..."
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: "6px",
          border: "1px solid #ccc"
        }}
      />

      {filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "40px",
            width: "100%",
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "6px",
            zIndex: 1000
          }}
        >
          {filtered.map((city, index) => (
            <div
              key={index}
              onClick={() => handleSelect(city)}
              style={{
                padding: "8px",
                cursor: "pointer",
                color: "black"
              }}
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