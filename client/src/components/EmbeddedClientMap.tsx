import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Paint Brain color palette
const paintBrainColors = {
  orange: '#D4A574',
  yellow: '#DCDCAA', 
  green: '#6A9955',
  blue: '#569CD6',
  purple: '#8B5FBF',
  red: '#F44747'
};

interface EmbeddedClientMapProps {
  clientName: string;
  clientAddress: string;
  projectId: number;
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

const EmbeddedClientMap: React.FC<EmbeddedClientMapProps> = ({
  clientName,
  clientAddress,
  projectId
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-124.972, 50.032]);
  const [showRoute, setShowRoute] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [currentInstruction, setCurrentInstruction] = useState<string>('');
  const [nextInstruction, setNextInstruction] = useState<string>('');
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [locationError, setLocationError] = useState<string>('');

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;
    
    const initializeMap = () => {
      const token = (window as any).MAPBOX_ACCESS_TOKEN;
      
      if (token && mapContainer.current && !map.current) {
        try {
          mapboxgl.accessToken = token;
          
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: mapCenter,
            zoom: 14,
            pitch: 0,
            bearing: 0,
            antialias: true,
            interactive: true
          });

          // Add yellow marker for client location
          new mapboxgl.Marker({ 
            color: paintBrainColors.yellow,
            scale: 1.2
          })
            .setLngLat(mapCenter)
            .addTo(map.current);

          // Add navigation controls
          map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
          
          setMapReady(true);
          console.log('Embedded map initialized successfully');
          
        } catch (error) {
          console.error('Failed to initialize embedded map:', error);
        }
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(initializeMap, 200);
      }
    };

    initializeMap();

    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords: [number, number] = [
            position.coords.longitude,
            position.coords.latitude
          ];
          setUserLocation(userCoords);
          setLocationError('');
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationError('Unable to access your location. Please enable GPS.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
      );
    } else {
      setLocationError('Geolocation not supported by this browser.');
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [clientName, clientAddress, mapCenter]);

  const handleCenterMap = () => {
    if (map.current) {
      if (userLocation && showRoute) {
        // Center on user location during navigation
        map.current.flyTo({
          center: userLocation,
          zoom: 16,
          duration: 1000
        });
      } else {
        // Center on client location
        map.current.flyTo({
          center: mapCenter,
          zoom: 14,
          duration: 1000
        });
      }
    }
  };

  const stopNavigation = () => {
    setShowRoute(false);
    setIsNavigating(false);
    setCurrentInstruction('');
    setNextInstruction('');
    setDistance('');
    setDuration('');
    
    if (map.current?.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }
    
    // Re-center on client
    if (map.current) {
      map.current.flyTo({
        center: mapCenter,
        zoom: 14,
        duration: 1000
      });
    }
  };

  const handleStartNavigation = async () => {
    if (!userLocation) {
      setLocationError('Please enable location access to start navigation.');
      return;
    }
    
    if (!map.current) return;
    
    try {
      // Use user's current location as start point
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation[0]},${userLocation[1]};${mapCenter[0]},${mapCenter[1]}?steps=true&geometries=geojson&voice_instructions=true&banner_instructions=true&access_token=${mapboxgl.accessToken}`
      );
      
      const json = await query.json();
      const data = json.routes[0];
      const route = data.geometry.coordinates;
      
      // Get first instruction
      const firstStep = data.legs[0].steps[0];
      setCurrentInstruction(firstStep.maneuver.instruction);
      setDistance(`${Math.round(data.distance / 1000 * 10) / 10} km`);
      setDuration(`${Math.round(data.duration / 60)} min`);
      
      if (data.legs[0].steps[1]) {
        setNextInstruction(data.legs[0].steps[1].maneuver.instruction);
      }
      
      // Clear existing route and markers
      if (map.current.getSource('route')) {
        map.current.removeLayer('route');
        map.current.removeSource('route');
      }
      
      // Add route to map
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route
          }
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
          'line-color': '#0099CC',
          'line-width': 6,
          'line-opacity': 0.8
        }
      });
      
      // Add user location marker (blue)
      new mapboxgl.Marker({ 
        color: '#007AFF',
        scale: 1.2
      })
        .setLngLat(userLocation)
        .addTo(map.current);
        
      // Add client marker (red destination)
      new mapboxgl.Marker({ 
        color: '#FF3B30',
        scale: 1.4
      })
        .setLngLat(mapCenter)
        .addTo(map.current);
      
      // Fit map to show entire route
      const coordinates = route;
      const bounds = coordinates.reduce((bounds: any, coord: any) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
      
      map.current.fitBounds(bounds, {
        padding: 80
      });
      
      setShowRoute(true);
      setIsNavigating(true);
      
      console.log('Navigation started successfully');
      
    } catch (error) {
      console.error('Failed to start navigation:', error);
      setLocationError('Unable to start navigation. Please check your internet connection.');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Trigger map resize after fullscreen toggle
    setTimeout(() => {
      if (map.current) {
        map.current.resize();
      }
    }, 100);
  };

  return (
    <div className="space-y-4">
      {/* Embedded Map Container */}
      <div 
        className={`relative bg-black rounded-lg border-2 border-purple-500 overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : ''
        }`}
        onDoubleClick={toggleFullscreen}
        style={{ cursor: isNavigating ? 'default' : 'pointer' }}
      >
        <div 
          ref={mapContainer}
          style={{ 
            width: '100%', 
            height: isFullscreen ? '100vh' : '300px',
            backgroundColor: '#000'
          }}
        />
        
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center">
              <div className="text-yellow-400 text-2xl mb-2">🗺️</div>
              <p className="text-yellow-400 text-sm">Loading map...</p>
            </div>
          </div>
        )}
        
        {/* Location Error */}
        {locationError && (
          <div className="absolute top-3 left-3 right-3 bg-red-900/90 text-red-100 p-3 rounded-lg text-sm">
            {locationError}
          </div>
        )}
        
        {/* Navigation Instruction Overlay - Only during active navigation */}
        {isNavigating && currentInstruction && (
          <div className="absolute top-3 left-3 right-3 bg-green-900/95 backdrop-blur-sm rounded-lg p-4">
            <div className="text-green-100 font-medium text-lg mb-1">{currentInstruction}</div>
            <div className="text-green-300 text-sm">{distance} • {duration}</div>
            {nextInstruction && (
              <div className="text-green-400 text-xs mt-2">Then: {nextInstruction}</div>
            )}
          </div>
        )}
        
        {/* Client Info - Only when not navigating */}
        {!isNavigating && (
          <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-sm rounded px-3 py-2 border-l-4 border-yellow-400">
            <div className="text-white font-medium text-sm">{clientName}</div>
            <div className="text-gray-300 text-xs">{clientAddress}</div>
          </div>
        )}
        
        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-3 right-3 w-8 h-8 bg-orange-500/90 hover:bg-orange-600 text-white rounded-full flex items-center justify-center text-lg font-bold transition-colors z-20"
        >
          {isFullscreen ? '⨉' : '⤢'}
        </button>
        
        {/* Navigation Controls */}
        <div className="absolute bottom-3 left-3 right-3 flex gap-2">
          {!isNavigating ? (
            <>
              <button
                onClick={handleStartNavigation}
                disabled={!userLocation}
                className="flex-1 bg-blue-600/90 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                🧭 Start Navigation
              </button>
              
              <button
                onClick={handleCenterMap}
                className="px-4 py-3 bg-gray-600/90 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                📍
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCenterMap}
                className="px-4 py-3 bg-blue-600/90 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                📍
              </button>
              
              <button
                onClick={stopNavigation}
                className="flex-1 bg-red-600/90 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                ✕ End Navigation
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Map Status */}
      <div className="text-xs text-gray-400 text-center">
        {isNavigating ? 
          'GPS Navigation Active • Double-click for fullscreen' :
          userLocation ? 
            'Location found • Ready for navigation • Double-click for fullscreen' :
            'Waiting for location access...'
        }
      </div>
    </div>
  );
};

export default EmbeddedClientMap;