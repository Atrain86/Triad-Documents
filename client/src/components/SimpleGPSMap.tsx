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
  const [isGettingLocation, setIsGettingLocation] = useState(false);

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
      console.error('Geolocation not supported');
      setError('Geolocation not supported on this device');
      return;
    }

    console.log('Getting user location...');
    console.log('Navigator.geolocation available:', !!navigator.geolocation);
    console.log('Current protocol:', location.protocol);
    console.log('Current hostname:', location.hostname);
    setIsGettingLocation(true);
    
    // Check if we're on HTTPS or localhost (required for geolocation)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && !location.hostname.includes('replit')) {
      console.error('Geolocation requires HTTPS');
      setError('GPS requires secure connection (HTTPS)');
      setIsGettingLocation(false);
      return;
    }

    console.log('Calling navigator.geolocation.getCurrentPosition...');
    
    // Check permissions first if available
    if ('permissions' in navigator) {
      navigator.permissions.query({name: 'geolocation'}).then((result) => {
        console.log('Geolocation permission status:', result.state);
        if (result.state === 'denied') {
          setError('Location access denied. Please enable location in browser settings.');
          setIsGettingLocation(false);
          return;
        }
      }).catch((err) => {
        console.log('Permission query failed:', err);
      });
    }
    
    // Set up manual timeout
    const timeoutId = setTimeout(() => {
      console.log('Manual timeout triggered - geolocation took too long');
      setError('GPS timeout - please try again or check location settings');
      setIsGettingLocation(false);
    }, 10000); // 10 second manual timeout
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId); // Clear manual timeout
        console.log('SUCCESS: Got user location:', position.coords);
        const userCoords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude
        ];
        console.log('User coordinates:', userCoords);

        // Fly to user location first
        if (map.current) {
          console.log('Flying to user location:', userCoords);
          map.current.flyTo({ center: userCoords, zoom: 13 });
          
          // Get route and draw it
          console.log('Getting route from:', userCoords, 'to:', clientCoords);
          const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${userCoords.join(',')};${clientCoords.join(',')}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`;
          console.log('Route URL:', routeUrl);
          
          fetch(routeUrl)
            .then(res => {
              console.log('Route response status:', res.status);
              if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
              }
              return res.json();
            })
            .then(data => {
              console.log('Route data received:', data);
              if (data.routes && data.routes[0]) {
                const route = data.routes[0].geometry;
                console.log('Drawing route with geometry:', route);
                
                if (map.current) {
                  // Remove existing route if any
                  try {
                    if (map.current.getLayer('route')) {
                      map.current.removeLayer('route');
                      console.log('Removed existing route layer');
                    }
                  } catch (e) {
                    console.log('No existing route layer to remove');
                  }
                  
                  try {
                    if (map.current.getSource('route')) {
                      map.current.removeSource('route');
                      console.log('Removed existing route source');
                    }
                  } catch (e) {
                    console.log('No existing route source to remove');
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
                  setError('Route loaded successfully!');
                }
              } else {
                console.log('No routes found in response');
                setError('No route found between locations');
              }
            })
            .catch(err => {
              console.error('Route fetch error:', err);
              setError('Route error: ' + err.message);
            })
            .finally(() => {
              setIsGettingLocation(false);
            });
        }
      },
      (err) => {
        clearTimeout(timeoutId); // Clear manual timeout
        console.error('Geolocation error code:', err.code);
        console.error('Geolocation error message:', err.message);
        
        let errorMessage = '';
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location access and try again.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable. Check GPS/Wi-Fi and try again.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location timeout. Try again.';
            break;
          default:
            errorMessage = 'Unknown location error: ' + err.message;
            break;
        }
        setError(errorMessage);
        setIsGettingLocation(false);
      },
      { 
        enableHighAccuracy: false,  // Try with less accuracy first
        timeout: 8000,  // 8 seconds - shorter timeout for debugging
        maximumAge: 0  // Always get fresh location
      }
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
          disabled={isGettingLocation}
          className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white border-none px-4 py-2 rounded-lg cursor-pointer font-bold"
          style={{ backgroundColor: isGettingLocation ? '#6b9bd2' : '#0099cc' }}
        >
          {isGettingLocation ? 'Getting GPS...' : 'Start'}
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
          <div className="mt-2 space-x-2">
            <button 
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-300 text-xs underline"
            >
              Dismiss
            </button>
            {error.includes('timeout') && (
              <button 
                onClick={() => {
                  setError('');
                  // Use a test location (Vancouver area) for demonstration
                  const testCoords: [number, number] = [-123.1207, 49.2827];
                  console.log('Using test location:', testCoords);
                  if (map.current) {
                    map.current.flyTo({ center: testCoords, zoom: 13 });
                    
                    const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${testCoords.join(',')};${clientCoords.join(',')}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`;
                    
                    fetch(routeUrl)
                      .then(res => res.json())
                      .then(data => {
                        if (data.routes && data.routes[0]) {
                          const route = data.routes[0].geometry;
                          
                          if (map.current) {
                            try {
                              if (map.current.getLayer('route')) {
                                map.current.removeLayer('route');
                              }
                            } catch (e) {}
                            
                            try {
                              if (map.current.getSource('route')) {
                                map.current.removeSource('route');
                              }
                            } catch (e) {}

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
                            setError('Demo route loaded successfully (Vancouver to client)');
                          }
                        }
                      })
                      .catch(err => {
                        setError('Route test failed: ' + err.message);
                      });
                  }
                }}
                className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
              >
                Try Demo Route
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleGPSMap;