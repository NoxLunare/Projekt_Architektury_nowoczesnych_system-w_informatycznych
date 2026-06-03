// src/App.js
import { useState, useRef } from "react";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import Search from "./components/Search";
import StationGrid from "./components/StationGrid";
import "./App.css";

function App() {
  const [selectedStation, setSelectedStation] = useState(null);
  const [allStations, setAllStations] = useState([]);
  const [theme, setTheme] = useState("dark");
  const flyToRef = useRef(null); // funkcja do centrowania mapy, ustawiana przez Map

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  // Klik na mapie — tylko zaznacza, bez przybliżania
  const handleSelectStation = (station) => {
    setSelectedStation(station);
  };

  // Wybór z wyszukiwarki — zaznacza i przybliża mapę
  const handleSelectFromSearch = (station) => {
    setSelectedStation(station);
    if (station?.latitude && station?.longitude && flyToRef.current) {
      flyToRef.current(station.latitude, station.longitude);
    }
  };

  return (
    <div className="app-root" data-theme={theme}>

      {/* HEADER */}
      <header className="app-header">
        <div className="header-brand">
          <svg className="header-logo-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 18H7M10 18H21M5 21H12M16 21H19M8.8 15C6.14903 15 4 12.9466 4 10.4137C4 8.31435 5.6 6.375 8 6C8.75283 4.27403 10.5346 3 12.6127 3C15.2747 3 17.4504 4.99072 17.6 7.5C19.0127 8.09561 20 9.55741 20 11.1402C20 13.2719 18.2091 15 16 15L8.8 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="header-title">AirQ</span>
          <span className="header-subtitle">Monitor jakości powietrza</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Search stations={allStations} onSelectStation={handleSelectFromSearch} />
          <button className="theme-toggle" onClick={toggleTheme} title="Zmień motyw">
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </header>

      {/* TOP SECTION: Sidebar + Map */}
      <section className="top-section">
        <div className="top-left">
          <Sidebar station={selectedStation} />
        </div>
        <div className="top-right">
          <Map
            theme={theme}
            onSelectStation={handleSelectStation}
            onStationsLoaded={setAllStations}
            flyToRef={flyToRef}
          />
        </div>
      </section>

      {/* BOTTOM: karty wszystkich stacji */}
      <section className="stations-section">
        <h2 className="section-title">Wszystkie stacje pomiarowe</h2>
        <StationGrid stations={allStations} onSelectStation={handleSelectStation} />
      </section>

    </div>
  );
}

export default App;
