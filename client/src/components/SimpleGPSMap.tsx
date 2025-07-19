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
  const [userInteracting, setUserInteracting] = useState(false);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const watchId = useRef<number | null>(null);
  const compassControl = useRef<any>(null);

  // Get client coordinates from actual address
  const [clientCoords, setClientCoords] = useState<[number, number]>([-124.9625, 50.0431]);
  
  // Geocode the real client address
  useEffect(() => {
    const geocodeClientAddress = async () => {
      if (!clientAddress) return;
      
      try {
        const response = await fetch('/api/mapbox-token');
        const { token } = await response.json();
        
        // Use Mapbox Geocoding to get exact coordinates for client address
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(clientAddress)}.json?access_token=${token}&limit=1`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.features && geocodeData.features[0]) {
          const [lng, lat] = geocodeData.features[0].center;
          console.log(`Geocoded "${clientAddress}" to coordinates:`, [lng, lat]);
          setClientCoords([lng, lat]);
        } else {
          console.log('Geocoding failed, using default coordinates');
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      }
    };
    
    geocodeClientAddress();
  }, [clientAddress]);

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
          style: 'mapbox://styles/mapbox/dark-v11', // Dark style with street names
          center: clientCoords,
          zoom: 14,
          attributionControl: false, // Remove info button
          logoPosition: 'top-left', // This will be hidden with CSS
          // Improve touch handling to fix zoom issues
          touchZoomRotate: true,
          touchPitch: false,
          dragRotate: false,
          keyboard: false,
          doubleClickZoom: false // Disable double-click zoom to prevent conflicts
        });

        // Track user interactions to prevent auto-centering
        map.current.on('dragstart', () => setUserInteracting(true));
        map.current.on('dragend', () => {
          setTimeout(() => setUserInteracting(false), 3000); // Stop auto-center for 3 seconds after dragging
        });
        map.current.on('zoomstart', () => setUserInteracting(true));
        map.current.on('zoomend', () => {
          setTimeout(() => setUserInteracting(false), 2000); // Stop auto-center for 2 seconds after zooming
        });

        map.current.on('load', () => {
          // Add destination marker (orange like the example)
          new mapboxgl.Marker({ color: '#ef6c30' })
            .setLngLat(clientCoords)
            .addTo(map.current!);

          // Auto-show route overview on map load
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const userPos: [number, number] = [position.coords.longitude, position.coords.latitude];
                setUserCoords(userPos);
                
                // Show route overview automatically
                getRoutePreview(userPos, clientCoords);
              },
              (err) => {
                console.log('Could not get location for auto-overview:', err.message);
                // Fallback to just showing client location
                if (map.current) {
                  map.current.flyTo({
                    center: clientCoords,
                    zoom: 13,
                    essential: true
                  });
                }
              },
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
            );
          }

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

  // Simplified double-tap handling without text selection interference
  const handleTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTap;
    
    // Always prevent text selection on map
    e.preventDefault();
    
    if (timeSinceLastTap < 300 && timeSinceLastTap > 50) {
      // Quick double tap detected
      e.stopPropagation();
      console.log('Quick double tap detected - toggling fullscreen');
      
      setIsFullscreen(prev => {
        const newState = !prev;
        setTimeout(() => {
          if (map.current) {
            map.current.resize();
          }
        }, 100);
        return newState;
      });
    }
    
    setLastTap(now);
  };

  // Prevent all text selection and context menus
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Allow normal map gestures but prevent text selection
    if (e.touches.length === 1) {
      // Single finger - allow map panning
      return;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
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

  // Get route preview for automatic overview
  // Return to overview map
  const returnToOverview = () => {
    if (userCoords && map.current) {
      console.log('Returning to overview...');
      getRoutePreview(userCoords, clientCoords);
    } else if (map.current) {
      // Fallback to client location if no user coords
      map.current.flyTo({
        center: clientCoords,
        zoom: 13,
        bearing: 0,
        pitch: 0,
        essential: true
      });
    }
  };

  const getRoutePreview = async (start: [number, number], end: [number, number]) => {
    try {
      console.log('Getting route preview from', start, 'to', end);
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      
      if (!query.ok) {
        throw new Error('Route preview failed');
      }
      
      const json = await query.json();
      const data = json.routes[0];
      const route = data.geometry.coordinates;
      
      // Add purple route line
      if (map.current) {
        if (map.current.getSource('route')) {
          map.current.removeLayer('route');
          map.current.removeSource('route');
        }
        
        map.current.addSource('route', {
          'type': 'geojson',
          'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': {
              'type': 'LineString',
              'coordinates': route
            }
          }
        });
        
        map.current.addLayer({
          'id': 'route',
          'type': 'line',
          'source': 'route',
          'layout': {
            'line-join': 'round',
            'line-cap': 'round'
          },
          'paint': {
            'line-color': '#8a2be2', // Purple route line
            'line-width': 5
          }
        });
        
        // Fit view to show entire route
        const bounds = new mapboxgl.LngLatBounds()
          .extend(start)
          .extend(end);
          
        map.current.fitBounds(bounds, {
          padding: 50,
          speed: 1,
          essential: true
        });
      }
      
    } catch (err) {
      console.log('Route preview error:', err);
    }
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
        
        // Set current heading if available
        if (position.coords.heading !== null) {
          setCurrentHeading(position.coords.heading);
        }
        
        // Immediately zoom to user location with driver orientation
        if (map.current) {
          const initialBearing = position.coords.heading || 0;
          console.log('Starting navigation zoom with bearing:', initialBearing);
          
          map.current.flyTo({
            center: userPosition,
            zoom: 19, // Very close zoom like Google Maps navigation
            bearing: initialBearing, // Use actual heading direction
            pitch: 60, // 3D driving perspective
            speed: 1.0, // Fast zoom transition
            curve: 1,
            essential: true
          });
          
          console.log('Navigation zoom to user location completed');
        }
        
        // Draw route from your location to client (but don't change zoom)
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
            'line-color': ['interpolate', ['linear'], ['line-progress'], 0, '#00FFFF', 1, '#6B4C9A'], 
            'line-width': 6
          },
        });
        
        console.log('Purple route line added to map');

        // Add user location marker with directional triangle (like Google Maps)
        const el = document.createElement('div');
        el.className = 'user-location-marker';
        el.innerHTML = `
          <div style="
            width: 24px;
            height: 24px;
            position: relative;
            transform: rotate(${currentHeading || 0}deg);
          ">
            <div style="
              width: 0;
              height: 0;
              border-left: 8px solid transparent;
              border-right: 8px solid transparent;
              border-bottom: 20px solid #1E90FF;
              position: absolute;
              top: 2px;
              left: 4px;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
            "></div>
            <div style="
              width: 8px;
              height: 8px;
              background: #00BFFF;
              border-radius: 50%;
              border: 2px solid white;
              position: absolute;
              top: 16px;
              left: 6px;
              box-shadow: 0 0 8px rgba(30,144,255,0.6);
            "></div>
          </div>
        `;
        
        userMarker.current = new mapboxgl.Marker(el)
          .setLngLat(start)
          .addTo(map.current);

        // Navigation zoom is now handled in startRoute function immediately after GPS

        console.log('Route drawn successfully');
        setError('');
        setIsNavigating(true);
        setIsGettingLocation(false); // Navigation setup complete
        
        // Start live location tracking for navigation
        if (navigator.geolocation) {
          watchId.current = navigator.geolocation.watchPosition(
            (position) => {
              const newPos: [number, number] = [position.coords.longitude, position.coords.latitude];
              console.log('Live position update:', newPos);
              setUserCoords(newPos);
              
              // Track heading for automatic driver orientation
              if (position.coords.heading !== null) {
                const newHeading = position.coords.heading;
                setCurrentHeading(newHeading);
              }
              
              // Update user marker position and rotation
              if (userMarker.current) {
                userMarker.current.setLngLat(newPos);
                
                // Update triangle rotation to match heading
                if (position.coords.heading !== null) {
                  const markerEl = userMarker.current.getElement();
                  const triangleContainer = markerEl.querySelector('div');
                  if (triangleContainer) {
                    triangleContainer.style.transform = `rotate(${position.coords.heading}deg)`;
                  }
                }
              }
              
              // GPS-style tracking: Only update if user isn't interacting with map
              if (map.current && !userInteracting) {
                const currentZoom = map.current.getZoom();
                // Only auto-zoom if user hasn't manually zoomed out
                const targetZoom = currentZoom < 14 ? currentZoom : Math.max(currentZoom, 16);
                
                // Always use driver orientation (heading direction)
                const targetBearing = position.coords.heading !== null ? position.coords.heading : 0;
                
                map.current.easeTo({
                  center: newPos,
                  zoom: targetZoom, // Respect user's zoom level if they zoomed out
                  bearing: targetBearing, // Driver orientation - follow heading
                  pitch: 60, // 3D driving perspective
                  duration: 800 // Smooth updates
                });
              } else if (map.current && userInteracting) {
                // Only update marker position when user is interacting, don't move map
                // Map will stay where user positioned it
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
          className="w-full h-full cursor-pointer map-no-select"
          style={{
            /* Hide Mapbox logo and attribution */
            touchAction: 'pan-x pan-y pinch-zoom',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none'
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onContextMenu={handleContextMenu}
          onDoubleClick={handleDoubleClick}
        />
        
        {/* Client Info Overlay - Your custom theme */}
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
          🏠 {clientName}<br />{clientAddress}
        </div>

        {/* Navigation Controls */}
        {!isNavigating ? (
          <>
            {/* Start Navigation Button - Your custom theme */}
            <button
              onClick={startRoute}
              disabled={isGettingLocation}
              className="absolute bottom-2 right-2 text-white border-none px-4 py-2 rounded-lg cursor-pointer font-bold"
              style={{ backgroundColor: '#0099cc' }}
            >
              {isGettingLocation ? 'Getting GPS...' : 'Start'}
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
                className="absolute top-2 left-2 bg-black bg-opacity-70 hover:bg-opacity-90 text-white border-none px-3 py-2 rounded-lg cursor-pointer font-bold text-sm z-[10000]"
              >
                ✕ Exit
              </button>
            )}

            {/* GPS Navigation Status Display - Position based on fullscreen mode */}
            <div className={`absolute ${isFullscreen ? 'top-2 right-2' : 'top-2 left-2'} bg-black/90 text-white p-3 rounded-lg shadow-lg border border-gray-600 z-[9999]`}>
              <div className="font-bold text-cyan-400 text-lg">🧭 GPS ACTIVE</div>
              <div className="text-sm font-semibold">{routeDistance} km • {routeDuration} min</div>
              <div className="text-xs text-green-300">Following route to destination</div>
              <div className="text-xs text-gray-400 mt-1">Your location is being tracked</div>
            </div>



            {/* Stop Navigation Button */}
            <button
              onClick={() => {
                console.log('Stopping navigation and returning to overview');
                setIsNavigating(false);
                if (watchId.current) {
                  navigator.geolocation.clearWatch(watchId.current);
                  watchId.current = null;
                }
                
                // Return to overview automatically
                setTimeout(() => {
                  returnToOverview();
                }, 500);
                
                setError('Navigation stopped - returning to overview');
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