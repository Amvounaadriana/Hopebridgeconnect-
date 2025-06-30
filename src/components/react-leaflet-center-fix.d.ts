// Fix for react-leaflet type error: center prop missing from MapContainerProps
// See: https://github.com/PaulLeCam/react-leaflet/issues/1103

declare module 'react-leaflet' {
  import * as React from 'react';
  import { Map as LeafletMap, MapOptions, LatLngExpression } from 'leaflet';

  export interface MapContainerProps extends MapOptions {
    children?: React.ReactNode;
    className?: string;
    id?: string;
    style?: React.CSSProperties;
    whenCreated?: (map: LeafletMap) => void;
    center?: LatLngExpression;
    zoom?: number;
  }

  export const MapContainer: React.FC<MapContainerProps>;
  export const TileLayer: React.FC<any>;
  export const Marker: React.FC<any>;
  export const Popup: React.FC<any>;
}
