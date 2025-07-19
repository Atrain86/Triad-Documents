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
    setIsGettingLocation(true);
    
    // Function to draw route with given coordinates
    const drawRoute = (userCoords: [number, number]) => {
      console.log('Drawing route from:', userCoords, 'to:', clientCoords);
      
      if (map.current) {
        map.current.flyTo({ center: userCoords, zoom: 13 });
        
        const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${userCoords.join(',')};${clientCoords.join(',')}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`;
        
        fetch(routeUrl)
          .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return res.json();
          })
          .then(data => {
            console.log('Full route response:', data);
            if (data.routes && data.routes[0]) {
              const route = data.routes[0].geometry;
              console.log('Route geometry type:', route.type);
              console.log('Route coordinates count:', route.coordinates?.length);
              
              // Remove existing route and markers
              try {
                if (map.current?.getLayer('route')) map.current.removeLayer('route');
                if (map.current?.getSource('route')) map.current.removeSource('route');
                // Remove existing markers
                const markers = document.querySelectorAll('.mapboxgl-marker');
                markers.forEach(marker => marker.remove());
              } catch (e) {
                console.log('Error removing existing route:', e);
              }

              // Add new route
              if (map.current) {
                console.log('Route geometry:', route);
                console.log('Route coordinates length:', route.coordinates?.length);
                
                map.current.addSource('route', {
                  type: 'geojson',
                  data: {
                    type: 'Feature',
                    properties: {},
                    geometry: route
                  }
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
                    'line-color': '#00FFFF',  // Solid cyan color instead of gradient
                    'line-width': 8,  // Thicker line for better visibility
                    'line-opacity': 0.8
                  }
                });
                
                // Add user location marker
                new mapboxgl.Marker({ color: '#00FFFF' })
                  .setLngLat(userCoords)
                  .addTo(map.current);
                
                // Fit map to show both points
                const bounds = new mapboxgl.LngLatBounds();
                bounds.extend(userCoords);
                bounds.extend(clientCoords);
                map.current.fitBounds(bounds, { padding: 50 });
                
                console.log('Route drawn successfully! Route should be visible as cyan line.');
                setError('Navigation route displayed! Follow the cyan line to your destination.');
              }
            } else {
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
    };
    
    // Try to get real GPS location with better options
    if (navigator.geolocation) {
      console.log('Getting your real GPS location for navigation...');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('SUCCESS: Got your real location:', position.coords);
          const userCoords: [number, number] = [
            position.coords.longitude,
            position.coords.latitude
          ];
          console.log('Starting navigation from your location:', userCoords);
          drawRoute(userCoords);
        },
        (err) => {
          console.error('GPS failed:', err);
          setError(`GPS failed: ${err.message}. Please enable location access in your browser settings and try again.`);
          setIsGettingLocation(false);
        },
        { 
          enableHighAccuracy: true,  // High accuracy for precise navigation
          timeout: 15000,  // 15 seconds to get accurate location
          maximumAge: 0  // Always get fresh location for navigation
        }
      );
    } else {
      setError('GPS not supported on this device. Navigation requires location services.');
      setIsGettingLocation(false);
    }
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
          className="w-full h-full cursor-pointer"
          style={{
            /* Hide Mapbox logo and attribution */
          }}
          onDoubleClick={toggleFullscreen}
        />
        
        {/* Map Overlay (like your example) */}
        <div 
          className="absolute top-2 left-2 bg-black bg-opacity-60 px-3 py-2 rounded-lg text-sm"
          style={{ color: '#ffaf40' }}
        >
          🏠 {clientName}<br />
          {clientAddress}
        </div>

        {/* Start Navigation Button */}
        <button
          onClick={startRoute}
          disabled={isGettingLocation}
          className="absolute bottom-2 right-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white border-none px-4 py-2 rounded-lg cursor-pointer font-bold"
          style={{ backgroundColor: isGettingLocation ? '#9ca3af' : '#16a34a' }}
        >
          {isGettingLocation ? 'Getting Your Location...' : '🧭 Start Navigation'}
        </button>

        {/* Demo Route Button - Always available */}
        <button
          onClick={() => {
            console.log('Demo route button clicked');
            setError('');
            setIsGettingLocation(false);
            // Use Vancouver coordinates as demo starting point
            const testCoords: [number, number] = [-123.1207, 49.2827];
            console.log('Using demo location:', testCoords);
            
            if (map.current) {
              map.current.flyTo({ center: testCoords, zoom: 13 });
              
              const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${testCoords.join(',')};${clientCoords.join(',')}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`;
              
              fetch(routeUrl)
                .then(res => res.json())
                .then(data => {
                  if (data.routes && data.routes[0]) {
                    const route = data.routes[0].geometry;
                    
                    try {
                      if (map.current?.getLayer('route')) {
                        map.current.removeLayer('route');
                      }
                    } catch (e) {}
                    
                    try {
                      if (map.current?.getSource('route')) {
                        map.current.removeSource('route');
                      }
                    } catch (e) {}

                    if (map.current) {
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
                      setError('Demo route loaded! (Vancouver to client location)');
                    }
                  } else {
                    setError('No route found for demo');
                  }
                })
                .catch(err => {
                  console.error('Demo route error:', err);
                  setError('Demo route failed: ' + err.message);
                });
            }
          }}
          className="absolute bottom-2 left-2 bg-green-600 hover:bg-green-700 text-white border-none px-3 py-2 rounded-lg cursor-pointer font-bold text-sm"
        >
          Demo Route
        </button>

        {/* Navigation Status Notice */}
        {isGettingLocation && (
          <div className="absolute bottom-16 right-2 bg-black bg-opacity-80 text-white p-2 rounded text-xs max-w-48">
            📍 Getting your current location for navigation... Please allow location access if prompted.
          </div>
        )}

        {/* Double-click hint for fullscreen */}
        {!isFullscreen && (
          <div className="absolute top-12 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs pointer-events-none">
            Double-click map for fullscreen
          </div>
        )}

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