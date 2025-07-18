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
          zoom: 14,
          attributionControl: false, // Remove info button
          logoPosition: 'top-left' // This will be hidden with CSS
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
    console.log('Start button clicked!');
    setError(''); // Clear any existing errors
    
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    console.log('Getting user location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Got user location:', position.coords);
        const userCoords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude
        ];

        // Fly to user location first
        if (map.current) {
          console.log('Flying to user location:', userCoords);
          map.current.flyTo({ center: userCoords, zoom: 13 });
          
          // Get route and draw it
          console.log('Getting route from:', userCoords, 'to:', clientCoords);
          fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${userCoords.join(',')};${clientCoords.join(',')}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`)
            .then(res => {
              console.log('Route response status:', res.status);
              return res.json();
            })
            .then(data => {
              console.log('Route data:', data);
              if (data.routes && data.routes[0]) {
                const route = data.routes[0].geometry;
                console.log('Drawing route with geometry:', route);
                
                if (map.current) {
                  // Remove existing route if any
                  if (map.current.getLayer('route')) {
                    map.current.removeLayer('route');
                  }
                  if (map.current.getSource('route')) {
                    map.current.removeSource('route');
                  }

                  // Add new route
                  map.current.addSource('route', {
                    type: 'geojson',
                    data: route
                  });

                  map.current.addLayer({
                    id: 'route',
                    type: 'line',
                    source: 'route',
                    layout: {
                      'line-join': 'round',
                      'line-cap': 'round'
                    },
                    paint: {
                      'line-color': ['interpolate', ['linear'], ['line-progress'], 0, '#00FFFF', 1, '#6B4C9A'],
                      'line-width': 6
                    }
                  });
                  console.log('Route drawn successfully!');
                }
              } else {
                console.log('No routes found in response');
                setError('No route found');
              }
            })
            .catch(err => {
              console.error('Route fetch error:', err);
              setError('Unable to get directions: ' + err.message);
            });
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Please allow location access: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
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
          style={{
            /* Hide Mapbox logo and attribution */
          }}
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
          style={{ backgroundColor: '#0099cc' }}
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