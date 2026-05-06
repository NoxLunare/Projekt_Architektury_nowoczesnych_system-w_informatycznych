import { useState } from "react";
import { cities } from "../data/mockData";

function Search({ onSelectCity }) {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length > 0) {
      const results = cities.filter((c) =>
        c.name.toLowerCase().includes(value.toLowerCase())
      );
      setFiltered(results);
    } else {
      setFiltered([]);
    }
  };

  const handleSelect = (city) => {
    setQuery(city.name);
    setFiltered([]);
    onSelectCity(city);
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
              {city.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Search;