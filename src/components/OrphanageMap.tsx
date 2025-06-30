import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Vite-friendly imports for marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

function fixLeafletIcon() {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
}

export default function OrphanageMap({ lat, lng, name }: { lat: number, lng: number, name: string }) {
  useEffect(() => {
    fixLeafletIcon();
  }, []);

  const isValid = typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
  if (!isValid) return <div>Location not found</div>;
  const center: [number, number] = [lat, lng];

  return (
    <MapContainer center={center} zoom={15} style={{ height: 200, width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <Marker position={center}>
        <Popup>{name}</Popup>
      </Marker>
    </MapContainer>
  );
}
