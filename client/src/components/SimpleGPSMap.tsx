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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string>('');

  // Client coordinates (Alan Kohl's house from your example)
  const clientCoords: [number, number] = [-124.9625, 50.0431];

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
          style: 'mapbox://styles/mapbox/dark-v10',
          center: clientCoords,
          zoom: 14
        });

        map.current.on('load', () => {
          // Add destination marker (orange like the example)
          new mapboxgl.Marker({ color: '#ef6c30' })
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

  const startRoute = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userCoords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude
        ];

        // Fly to user location
        if (map.current) {
          map.current.flyTo({ center: userCoords, zoom: 13 });
          
          // Get route and draw it
          fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${userCoords.join(',')};${clientCoords.join(',')}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`)
            .then(res => res.json())
            .then(data => {
              if (data.routes && data.routes[0]) {
                const route = data.routes[0].geometry;
                
                if (map.current) {
                  if (map.current.getSource('route')) {
                    (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData(route);
                  } else {
                    map.current.addLayer({
                      id: 'route',
                      type: 'line',
                      source: {
                        type: 'geojson',
                        data: route
                      },
                      layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                      },
                      paint: {
                        'line-color': ['interpolate', ['linear'], ['line-progress'], 0, '#00FFFF', 1, '#6B4C9A'],
                        'line-width': 6
                      }
                    });
                  }
                }
              }
            })
            .catch(err => {
              setError('Unable to get directions');
            });
        }
      },
      (err) => {
        setError('Please allow location access');
      },
      { enableHighAccuracy: true }
    );
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };



  return (
    <div className="w-full">
      {/* Map Container */}
      <div 
        className={`w-full rounded-lg overflow-hidden relative ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
        }`}
        style={{ 
          height: isFullscreen ? '100vh' : '300px',
          backgroundColor: '#0c0f1a'
        }}
      >
        <div 
          ref={mapContainer}
          className="w-full h-full"
        />
        
        {/* Map Overlay (like your example) */}
        <div 
          className="absolute top-2 left-2 bg-black bg-opacity-60 px-3 py-2 rounded-lg text-sm"
          style={{ color: '#ffaf40' }}
        >
          🏠 {clientName}<br />
          {clientAddress}
        </div>

        {/* Start Button (like your example) */}
        <button
          onClick={startRoute}
          className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700 text-white border-none px-4 py-2 rounded-lg cursor-pointer font-bold"
        >
          Start
        </button>

        {/* Fullscreen Button (like your example) */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-2 right-2 text-white border-none px-3 py-1 rounded-full cursor-pointer font-bold"
          style={{ backgroundColor: '#ef6c30' }}
        >
          ⛶
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-3 bg-red-900/20 border border-red-500 rounded-lg p-3 text-center">
          <p className="text-red-300 text-sm">{error}</p>
          <button 
            onClick={() => setError('')}
            className="mt-2 text-red-400 hover:text-red-300 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default SimpleGPSMap;