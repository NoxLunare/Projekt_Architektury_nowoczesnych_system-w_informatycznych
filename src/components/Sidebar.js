import { useEffect, useState } from "react";
import { fetchRecommendation } from "../api/api";

function getColor(quality) {
  switch (quality) {
    case "dobra":
      return "#4caf50";
    case "umiarkowana":
      return "#ff9800";
    case "zła":
      return "#f44336";
    case "bardzo zła":
      return "#b71c1c";
    default:
      return "#999";
  }
}

function getLevelPM25(v) {
  if (v <= 10) return "dobra";
  if (v <= 25) return "umiarkowana";
  if (v <= 50) return "zła";
  return "bardzo zła";
}

function getLevelPM10(v) {
  if (v <= 20) return "dobra";
  if (v <= 50) return "umiarkowana";
  if (v <= 100) return "zła";
  return "bardzo zła";
}

function getLevelNO2(v) {
  if (v <= 40) return "dobra";
  if (v <= 100) return "umiarkowana";
  if (v <= 200) return "zła";
  return "bardzo zła";
}

function getLevelO3(v) {
  if (v <= 60) return "dobra";
  if (v <= 120) return "umiarkowana";
  if (v <= 180) return "zła";
  return "bardzo zła";
}

function getFinalQuality(city) {
  const levels = [
    getLevelPM25(city.pm25),
    getLevelPM10(city.pm10),
    getLevelNO2(city.no2),
    //getLevelO3(city.o3)
  ];

  if (levels.includes("bardzo zła")) return "bardzo zła";
  if (levels.includes("zła")) return "zła";
  if (levels.includes("umiarkowana")) return "umiarkowana";

  return "dobra";
}

function Sidebar({ city }) {
  const [showExport, setShowExport] = useState(false);

  const [recommendation, setRecommendation] = useState("");

  useEffect(() => {
    async function loadRecommendation() {
      if (!city) return;

      try {
        const data = await fetchRecommendation(city.name);

        setRecommendation(data.recommendation);
      } catch (error) {
        console.error("Błąd pobierania rekomendacji:", error);
      }
    }

    loadRecommendation();
  }, [city]);

  if (!city) {
    return (
      <div style={containerStyle}>
        <h3>Wybierz miasto</h3>
      </div>
    );
  }

  const quality = getFinalQuality(city);

  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: "10px" }}>
        {city.name}
      </h2>

      <div
        style={{
          background: getColor(quality),
          color: "white",
          padding: "8px",
          borderRadius: "8px",
          marginBottom: "15px",
          textAlign: "center"
        }}
      >
        Jakość: {quality}
      </div>

      <div style={cardStyle}>
        <p>
          <strong>PM2.5:</strong> {city.pm25}
        </p>

        <p>
          <strong>PM10:</strong> {city.pm10}
        </p>

        <p>
          <strong>NO₂:</strong> {city.no2}
        </p>
      </div>

      <div style={{ ...cardStyle, marginTop: "15px" }}>
        <h4>Rekomendacje</h4>

        <p
          style={{
            textAlign: "justify",
            lineHeight: "1.6",
            fontSize: "14px"
          }}
        >
          {recommendation}
        </p>
      </div>

      <div style={{ marginTop: "20px" }}>
        <button
          style={buttonStyle}
          onClick={() => setShowExport(!showExport)}
        >
          Eksport
        </button>

        {showExport && (
          <div
            style={{
              marginTop: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "5px"
            }}
          >
            <button style={subButtonStyle}>
              CSV
            </button>

            <button style={subButtonStyle}>
              PDF
            </button>
          </div>
        )}

        <button
          style={{
            ...buttonStyle,
            marginTop: "10px",
            background: "#607d8b"
          }}
        >
          Historia pomiarów
        </button>
      </div>
    </div>
  );
}

const containerStyle = {
  width: "300px",
  minWidth: "300px",
  padding: "20px",
  background: "#f5f7fa",
  borderRadius: "12px",
  boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
};

const cardStyle = {
  background: "white",
  padding: "10px",
  borderRadius: "8px",
  boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
};

const buttonStyle = {
  width: "100%",
  padding: "10px",
  border: "none",
  borderRadius: "8px",
  background: "#2a5298",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
};

const subButtonStyle = {
  padding: "8px",
  border: "none",
  borderRadius: "6px",
  background: "#e0e0e0",
  cursor: "pointer"
};

export default Sidebar;