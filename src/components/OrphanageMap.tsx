import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { geocodeAddress } from '@/utils/geocode';
import { Orphanage } from '@/types/models';

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

const defaultCenter = [7.3697, 12.3547]; // Cameroon
const defaultZoom = 7;

// Add a type for local orphanage objects with coordinates
interface OrphanageWithCoords extends Orphanage {
  coordinates: { lat: number | null; lng: number | null };
}

export default function OrphanageMap() {
  const [orphanages, setOrphanages] = useState<OrphanageWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    fixLeafletIcon();
    const unsub = onSnapshot(collection(db, 'orphanages'), async (snapshot) => {
      const data = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() } as Orphanage;
        let lat = (data as any).coordinates?.lat ?? (typeof (data as any).latitude === 'number' ? (data as any).latitude : null);
        let lng = (data as any).coordinates?.lng ?? (typeof (data as any).longitude === 'number' ? (data as any).longitude : null);
        if ((lat == null || lng == null) && data.address) {
          const geo = await geocodeAddress(data.address);
          if (geo) {
            lat = geo.lat;
            lng = geo.lng;
            try {
              await updateDoc(doc(db, 'orphanages', data.id), {
                coordinates: { lat, lng }
              });
            } catch (e) { /* ignore */ }
          }
        }
        return { ...data, coordinates: { lat, lng } } as OrphanageWithCoords;
      }));
      setOrphanages(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div>Loading map...</div>;
  const validMarkers = orphanages.filter(o => o.coordinates.lat != null && o.coordinates.lng != null);

  return (
    <MapContainer
      center={defaultCenter as [number, number]}
      zoom={defaultZoom}
      style={{ height: 400, width: '100%' }}
      whenCreated={mapInstance => (mapRef.current = mapInstance)}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      {validMarkers.map(orphanage => (
        <Marker
          key={orphanage.id}
          position={[orphanage.coordinates.lat!, orphanage.coordinates.lng!] as [number, number]}
        >
          <Popup>
            <div>
              <strong>{orphanage.name}</strong>
              <br />
              {orphanage.address}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
