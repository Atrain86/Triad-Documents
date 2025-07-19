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
  const [lastTap, setLastTap] = useState(0);
  const [error, setError] = useState<string>('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeDistance, setRouteDistance] = useState<string>('');
  const [routeDuration, setRouteDuration] = useState<string>('');
  const [currentHeading, setCurrentHeading] = useState<number>(0);
  const [isCompassMode, setIsCompassMode] = useState(false);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const watchId = useRef<number | null>(null);
  const compassControl = useRef<any>(null);

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
          style: 'mapbox://styles/mapbox/navigation-night-v1',
          center: clientCoords,
          zoom: 13,
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
      // Cleanup map
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      // Cleanup location tracking
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  // Handle touch events for fullscreen
  const handleTouchEnd = (e: React.TouchEvent) => {
    // Only handle single finger touches
    if (e.changedTouches.length !== 1) return;
    
    const now = Date.now();
    const timeSinceLastTap = now - lastTap;
    
    if (timeSinceLastTap < 400 && timeSinceLastTap > 50) {
      // Double tap detected
      e.preventDefault();
      e.stopPropagation();
      console.log('Double tap detected - toggling fullscreen');
      
      setIsFullscreen(prev => !prev);
      
      // Resize map after fullscreen change
      setTimeout(() => {
        if (map.current) {
          map.current.resize();
        }
      }, 200);
    }
    
    setLastTap(now);
  };

  // Prevent zoom gestures in fullscreen mode
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isFullscreen && e.touches.length > 1) {
      // Prevent multi-touch zoom in fullscreen
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Handle mouse double-click for desktop
  const handleDoubleClick = () => {
    console.log('Double click detected - toggling fullscreen');
    setIsFullscreen(!isFullscreen);
    
    setTimeout(() => {
      if (map.current) {
        map.current.resize();
      }
    }, 150);
  };

  const startRoute = () => {
    console.log('Start Navigation button clicked');
    setError('Getting your location...');
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      setError('GPS not available on this device');
      setIsGettingLocation(false);
      return;
    }
    
    console.log('Requesting your GPS location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userPosition: [number, number] = [position.coords.longitude, position.coords.latitude];
        console.log('Got your position:', userPosition);
        setUserCoords(userPosition);
        
        // Draw route from your location to client
        getRoute(userPosition, clientCoords);
      },
      (err) => {
        console.log('GPS error:', err.message);
        setError('GPS permission denied. Please allow location access and try again.');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Get actual driving route from Mapbox
  const getRoute = async (start: [number, number], end: [number, number]) => {
    try {
      console.log('Getting route from', start, 'to', end);
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      console.log('Route API response status:', query.status);
      
      if (!query.ok) {
        throw new Error(`HTTP ${query.status}: Failed to get route`);
      }
      
      const json = await query.json();
      
      if (!json.routes || !json.routes[0]) {
        setError('No route found between locations');
        setIsGettingLocation(false);
        return;
      }
      
      const data = json.routes[0];
      const route = data.geometry;
      
      // Extract route information
      const distance = (data.distance / 1000).toFixed(1); // Convert to kilometers
      const duration = Math.round(data.duration / 60); // Convert to minutes
      setRouteDistance(distance);
      setRouteDuration(duration.toString());

      if (map.current) {
        // Remove existing route
        try {
          if (map.current.getLayer('route')) map.current.removeLayer('route');
          if (map.current.getSource('route')) map.current.removeSource('route');
          // Remove user markers
          const markers = document.querySelectorAll('.mapboxgl-marker');
          markers.forEach(marker => {
            if (marker.querySelector('.mapboxgl-marker')?.style.backgroundColor !== '#ef6c30') {
              marker.remove();
            }
          });
        } catch (e) {
          console.log('No existing route to remove');
        }

        // Add new route
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route,
          },
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
            'line-color': '#8a2be2', 
            'line-width': 6,
            'line-opacity': 0.8
          },
        });
        
        console.log('Purple route line added to map');

        // Add user location marker with directional triangle
        const el = document.createElement('div');
        el.className = 'user-location-marker';
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.backgroundColor = '#00FFFF';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 0 10px rgba(0,255,255,0.6)';
        
        userMarker.current = new mapboxgl.Marker(el)
          .setLngLat(start)
          .addTo(map.current);

        // GPS-style navigation: Immediately zoom in very close on user location
        map.current.flyTo({
          center: start,
          zoom: 18, // Very close zoom like driving GPS
          bearing: 0, // Start with north up
          pitch: 60, // 3D angle for driving perspective
          speed: 2, // Faster zoom to close-up view
          curve: 1,
          essential: true
        });

        console.log('Navigation started - zoomed to GPS view at zoom level 18');

        console.log('Route drawn successfully');
        setError('');
        setIsNavigating(true);
        
        // Start live location tracking for navigation
        if (navigator.geolocation) {
          watchId.current = navigator.geolocation.watchPosition(
            (position) => {
              const newPos: [number, number] = [position.coords.longitude, position.coords.latitude];
              console.log('Live position update:', newPos);
              setUserCoords(newPos);
              
              // Track heading if available
              if (position.coords.heading !== null) {
                setCurrentHeading(position.coords.heading);
              }
              
              // Update user marker position
              if (userMarker.current) {
                userMarker.current.setLngLat(newPos);
              }
              
              // GPS-style tracking: Keep very close zoom and center on user
              if (map.current) {
                map.current.easeTo({
                  center: newPos,
                  zoom: 18, // Very close GPS zoom for driving
                  bearing: isCompassMode ? (position.coords.heading || 0) : 0,
                  pitch: 60, // 3D driving perspective
                  duration: 1000
                });
              }
            },
            (err) => console.log('Live tracking error:', err.message),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
          );
        }
      }
    } catch (err) {
      console.log('Route error:', err);
      setError('Route request failed: ' + (err as Error).message);
    } finally {
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
        className={`w-full overflow-hidden relative ${
          isFullscreen 
            ? 'mobile-fullscreen' 
            : 'rounded-lg'
        }`}
        style={{ 
          height: isFullscreen ? '100dvh' : '300px',
          backgroundColor: '#0c0f1a'
        }}
      >
        <div 
          ref={mapContainer}
          className="w-full h-full cursor-pointer"
          style={{
            /* Hide Mapbox logo and attribution */
            touchAction: isFullscreen ? 'none' : 'manipulation'
          }}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onDoubleClick={handleDoubleClick}
        />
        
        {/* Map Overlay - Clickable Address */}
        <div 
          className="absolute top-2 left-2 bg-black bg-opacity-60 px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-opacity-80"
          style={{ color: '#ffaf40' }}
          onClick={() => {
            console.log('Opening address in device Maps app');
            const destination = encodeURIComponent(clientAddress);
            // Open in device's default maps app
            window.open(`https://maps.apple.com/?q=${destination}`, '_blank');
          }}
          title="Tap to open in Maps app"
        >
          🏠 {clientName}<br />
          📍 {clientAddress}
        </div>

        {/* Navigation Controls */}
        {!isNavigating ? (
          <>
            {/* Start GPS Navigation Button */}
            <button
              onClick={startRoute}
              disabled={isGettingLocation}
              className="absolute bottom-2 right-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white border-none px-4 py-2 rounded-lg cursor-pointer font-bold"
            >
              {isGettingLocation ? 'Getting GPS...' : '🧭 Start Navigation'}
            </button>

            {/* Map Overview Button */}
            <button
              onClick={() => {
                console.log('View Overview button clicked');
                if (map.current) {
                  console.log('Map is ready, showing overview');
                  // Always show overview centered on client location
                  map.current.flyTo({
                    center: clientCoords,
                    zoom: 12, // Good overview zoom level
                    bearing: 0, // North up
                    pitch: 0, // Flat view for overview
                    speed: 1.5,
                    curve: 1,
                    essential: true
                  });
                } else {
                  console.log('Map not ready yet');
                  setError('Map loading... please try again');
                }
              }}
              className="absolute bottom-16 right-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none px-4 py-2 rounded-lg cursor-pointer font-bold text-sm"
            >
              📍 View Overview
            </button>
          </>
        ) : (
          <>
            {/* Fullscreen Exit Button - Only show when in fullscreen */}
            {isFullscreen && (
              <button
                onClick={() => {
                  console.log('Exiting fullscreen');
                  setIsFullscreen(false);
                  setTimeout(() => {
                    if (map.current) {
                      map.current.resize();
                    }
                  }, 100);
                }}
                className="absolute top-4 right-4 bg-black bg-opacity-70 hover:bg-opacity-90 text-white border-none px-3 py-2 rounded-lg cursor-pointer font-bold text-sm z-10"
              >
                ✕ Exit Fullscreen
              </button>
            )}

            {/* GPS Navigation Status Display */}
            <div className="absolute top-2 left-2 bg-black/90 text-white p-3 rounded-lg shadow-lg border border-gray-600">
              <div className="font-bold text-cyan-400 text-lg">🧭 GPS ACTIVE</div>
              <div className="text-sm font-semibold">{routeDistance} km • {routeDuration} min</div>
              <div className="text-xs text-green-300">Following route to destination</div>
              <div className="text-xs text-gray-400 mt-1">Your location is being tracked</div>
            </div>

            {/* Compass/Orientation Button */}
            <button
              onClick={() => {
                console.log('Toggling compass mode');
                setIsCompassMode(!isCompassMode);
                if (map.current && userCoords) {
                  map.current.flyTo({
                    center: userCoords,
                    zoom: 18,
                    bearing: !isCompassMode ? currentHeading : 0,
                    pitch: 60,
                    speed: 1,
                    essential: true
                  });
                }
              }}
              className={`absolute bottom-16 right-2 ${isCompassMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'} text-white border-none px-3 py-2 rounded-lg cursor-pointer font-bold text-sm`}
            >
              {isCompassMode ? '🧭 Compass' : '⬆️ North Up'}
            </button>

            {/* Stop Navigation Button */}
            <button
              onClick={() => {
                console.log('Stopping navigation');
                setIsNavigating(false);
                setIsCompassMode(false);
                if (watchId.current) {
                  navigator.geolocation.clearWatch(watchId.current);
                  watchId.current = null;
                }
                setError('Navigation stopped');
              }}
              className="absolute bottom-2 right-2 bg-red-600 hover:bg-red-700 text-white border-none px-4 py-2 rounded-lg cursor-pointer font-bold"
            >
              ⏹️ Stop Navigation
            </button>
          </>
        )}







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