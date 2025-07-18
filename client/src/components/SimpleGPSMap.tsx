import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface SimpleGPSMapProps {
  clientName: string;
  clientAddress: string;
  projectId: number;
}

const SimpleGPSMap: React.FC<SimpleGPSMapProps> = ({
  clientName,
  clientAddress,
  projectId
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState<string>('');
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Client coordinates (hardcoded for Alan Kohl example)
  const clientCoords: [number, number] = [-124.972, 50.032];

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      if (!mapContainer.current || map.current) return;

      try {
        const response = await fetch('/api/mapbox-token');
        const { token } = await response.json();
        mapboxgl.accessToken = token;

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: clientCoords,
          zoom: 14
        });

        map.current.on('load', () => {
          // Add destination marker
          new mapboxgl.Marker({ color: '#FF6B6B', scale: 1.5 })
            .setLngLat(clientCoords)
            .addTo(map.current!);

          setMapReady(true);
        });

      } catch (err) {
        setError('Unable to load map');
      }
    };

    initMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [
            position.coords.longitude,
            position.coords.latitude
          ];
          setUserLocation(coords);
          
          if (map.current) {
            // Add user location marker
            new mapboxgl.Marker({ color: '#4A90E2', scale: 1.2 })
              .setLngLat(coords)
              .addTo(map.current);
          }
        },
        (err) => {
          setError('Please allow location access to use GPS navigation');
        },
        { enableHighAccuracy: true }
      );
    }
  }, [mapReady]);

  const startNavigation = async () => {
    if (!userLocation || !map.current) return;

    try {
      setIsNavigating(true);
      
      // Get directions
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation[0]},${userLocation[1]};${clientCoords[0]},${clientCoords[1]}?steps=true&voice_instructions=true&access_token=${mapboxgl.accessToken}`
      );
      
      const data = await response.json();
      const route = data.routes[0];
      
      setCurrentInstruction(route.legs[0].steps[0].maneuver.instruction);
      setDistance(`${(route.distance / 1000).toFixed(1)} km`);
      setDuration(`${Math.round(route.duration / 60)} min`);

      // Add route line
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry
        }
      });

      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#007AFF', 'line-width': 6 }
      });

      // Fit map to route
      const coordinates = route.geometry.coordinates;
      const bounds = coordinates.reduce((bounds: any, coord: any) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

      map.current.fitBounds(bounds, { padding: 60 });

    } catch (err) {
      setError('Unable to get directions');
      setIsNavigating(false);
    }
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setCurrentInstruction('');
    setDistance('');
    setDuration('');
    
    if (map.current?.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }
  };

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
        <div className="text-red-400 text-lg mb-2">⚠️</div>
        <p className="text-red-300 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Navigation Header - Only show during navigation */}
      {isNavigating && (
        <div className="bg-blue-900 text-white p-4 rounded-t-lg">
          <div className="text-lg font-semibold">{currentInstruction}</div>
          <div className="text-sm opacity-80">{distance} • {duration} to {clientName}</div>
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapContainer}
        className={`w-full bg-black ${isNavigating ? 'rounded-b-lg' : 'rounded-lg'}`}
        style={{ height: '400px' }}
      />

      {/* Controls */}
      <div className="mt-4 flex gap-3">
        {!isNavigating ? (
          <button
            onClick={startNavigation}
            disabled={!userLocation}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-medium text-lg"
          >
            {userLocation ? `🧭 Navigate to ${clientName}` : '📍 Getting your location...'}
          </button>
        ) : (
          <button
            onClick={stopNavigation}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-medium text-lg"
          >
            🛑 End Navigation
          </button>
        )}
      </div>

      {/* Status */}
      <div className="mt-2 text-center text-sm text-gray-400">
        {isNavigating ? 
          'GPS Navigation Active' : 
          userLocation ? 
            'Ready to navigate' : 
            'Allow location access to start navigation'
        }
      </div>
    </div>
  );
};

export default SimpleGPSMap;