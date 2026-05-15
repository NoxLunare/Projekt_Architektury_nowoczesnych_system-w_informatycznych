// src/App.js
import { useState } from "react";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import Search from "./components/Search";

function App() {
  const [selectedStation, setSelectedStation] = useState(null);

  return (
    <div style={{ background: "#eef2f7", minHeight: "100vh" }}>

      {/* HEADER */}
      <div style={{
        background: "linear-gradient(90deg, #1e3c72, #2a5298)",
        color: "white",
        padding: "15px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <h1 style={{ margin: 0, fontSize: 24, letterSpacing: 1 }}>AirQ</h1>
        <Search onSelectStation={setSelectedStation} />
      </div>

      {/* MAIN */}
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", gap: 20 }}>

          {/* SIDEBAR */}
          <Sidebar station={selectedStation} />

          {/* MAPA */}
          <div style={{
            flex: 1, height: 500,
            borderRadius: 12, overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}>
            <Map onSelectStation={setSelectedStation} />
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
