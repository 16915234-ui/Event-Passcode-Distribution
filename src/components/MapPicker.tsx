"use client";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

const customIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  radius: number;
  onLocationChange: (lat: number, lng: number) => void;
}

function LocationMarker({ position, radius, onLocationChange }: { position: L.LatLngLiteral | null; radius: number; onLocationChange: MapPickerProps['onLocationChange'] }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : (
    <>
      <Marker position={position} icon={customIcon} />
      <Circle center={position} radius={radius} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }} />
    </>
  );
}

export default function MapPicker({ lat, lng, radius, onLocationChange }: MapPickerProps) {
  // Default to somewhere near ARU if not provided
  const defaultCenter = lat && lng ? [lat, lng] : [14.364440, 100.584345];
  
  return (
    <div style={{ height: "350px", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0", zIndex: 0 }}>
      <MapContainer center={defaultCenter as L.LatLngTuple} zoom={16} scrollWheelZoom={true} style={{ height: "100%", width: "100%", zIndex: 0 }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={lat && lng ? { lat, lng } : null} radius={radius} onLocationChange={onLocationChange} />
      </MapContainer>
    </div>
  );
}
