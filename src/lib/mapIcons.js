import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Leaflet's default icon URLs are relative paths meant for a plain <script>
// include; under Vite/webpack bundling they 404 unless remapped to the
// bundler-resolved asset URLs, like this.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/** Small colored dot marker, used for facility types + "you are here". */
export function coloredDotIcon(color, glyphColor = "#fff") {
  return L.divIcon({
    className: "rn-map-dot",
    html: `<div style="
      width: 26px; height: 26px; border-radius: 50% 50% 50% 0;
      background: ${color}; border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
    "><div style="transform: rotate(45deg); width:8px; height:8px; border-radius:50%; background:${glyphColor};"></div></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

export function youAreHereIcon(color) {
  return L.divIcon({
    className: "rn-map-you",
    html: `<div style="position:relative; width:22px; height:22px;">
      <div style="position:absolute; inset:-9px; border-radius:50%; border:2px solid ${color}; opacity:0.35;"></div>
      <div style="width:22px; height:22px; border-radius:50%; background:${color}; border:3px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}
