import { useState } from "react";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import Search from "./components/Search";

function App() {
  const [selectedCity, setSelectedCity] = useState(null);

  return (
    <div style={{ background: "#eef2f7", minHeight: "100vh" }}>
      
      {/* 🔥 HEADER */}
      <div
        style={{
          background: "linear-gradient(90deg, #1e3c72, #2a5298)",
          color: "white",
          padding: "15px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <h1 style={{ margin: 0 }}>AirQ</h1>
        <Search onSelectCity={setSelectedCity} />
      </div>

      {/* 🔥 MAIN */}
      <div style={{ padding: "20px" }}>
        <div
          style={{
            display: "flex",
            gap: "20px"
          }}
        >
          {/* LEWA STRONA */}
          <Sidebar city={selectedCity} />

          {/* PRAWA STRONA - MAPA */}
          <div
            style={{
              flex: 1,
              height: "500px",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          >
            <Map onSelectCity={setSelectedCity} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;