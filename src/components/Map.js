import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap
} from "react-leaflet";
import { useEffect, useState } from "react";
import { cities } from "../data/mockData";

function FixMap() {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 300);
  }, [map]);

  return null;
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
    getLevelO3(city.o3)
  ];

  if (levels.includes("bardzo zła")) return "bardzo zła";
  if (levels.includes("zła")) return "zła";
  if (levels.includes("umiarkowana")) return "umiarkowana";
  return "dobra";
}

function Markers({ onSelectCity }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const updateZoom = () => setZoom(map.getZoom());
    map.on("zoomend", updateZoom);
    return () => map.off("zoomend", updateZoom);
  }, [map]);

  function getColor(quality) {
    switch (quality) {
      case "dobra":
        return "green";
      case "umiarkowana":
        return "orange";
      case "zła":
        return "red";
      case "bardzo zła":
        return "darkred";
      default:
        return "gray";
    }
  }

  return (
    <>
      {cities.map((city, index) => {
        const quality = getFinalQuality(city);

        return (
          <CircleMarker
            key={index}
            center={city.position}
            radius={4 + zoom}
            pathOptions={{
              color: "black",
              weight: 1,
              fillColor: getColor(quality),
              fillOpacity: 0.8
            }}
            eventHandlers={{
              click: () => onSelectCity(city)
            }}
          >
            <Popup>
              <strong>{city.name}</strong><br />
              PM2.5: {city.pm25}<br />
              PM10: {city.pm10}
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

function Map({ onSelectCity }) {
  return (
    <MapContainer
      center={[52, 19]}
      zoom={6}
      style={{ width: "100%", height: "100%" }}
    >
      <FixMap />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Markers onSelectCity={onSelectCity} />
    </MapContainer>
  );
}

function Legend() {
  const style = {
    position: "absolute",
    bottom: "10px",
    right: "10px",
    background: "white",
    padding: "10px",
    borderRadius: "8px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    fontSize: "12px",
    lineHeight: "1.6"
  };

  const row = (color, label) => (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <span
        style={{
          width: "12px",
          height: "12px",
          background: color,
          borderRadius: "50%",
          display: "inline-block"
        }}
      />
      {label}
    </div>
  );

  return (
    <div style={style}>
      <strong>Jakość powietrza</strong>
      {row("green", "dobra")}
      {row("orange", "umiarkowana")}
      {row("red", "zła")}
      {row("darkred", "bardzo zła")}
    </div>
  );
}

export default Map;