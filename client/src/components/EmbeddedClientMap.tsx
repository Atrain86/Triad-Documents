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
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
            pitch: 45,
            bearing: -17.6,
            antialias: true,
            interactive: true
          });

          // Don't add markers initially - they'll be added when route is requested

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
      if (showRoute) {
        // If route is showing, fit to show both office and client
        const officeCoords: [number, number] = [-124.9831, 50.0326];
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(officeCoords);
        bounds.extend(mapCenter);
        map.current.fitBounds(bounds, { padding: 50 });
      } else {
        // Just center on client
        map.current.flyTo({
          center: mapCenter,
          zoom: 14,
          duration: 1000
        });
      }
    }
  };

  const handleNavigate = async () => {
    if (!map.current) return;
    
    try {
      // Office coordinates (884 Hayes Rd, Manson's Landing, BC)
      const officeCoords: [number, number] = [-124.9831, 50.0326];
      
      // Use Mapbox Directions API to get route
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${officeCoords[0]},${officeCoords[1]};${mapCenter[0]},${mapCenter[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      
      const json = await query.json();
      const data = json.routes[0];
      const route = data.geometry.coordinates;
      
      // Extract turn-by-turn directions
      const steps: RouteStep[] = data.legs[0].steps.map((step: any) => ({
        instruction: step.maneuver.instruction,
        distance: step.distance,
        duration: step.duration
      }));
      
      setRouteSteps(steps);
      setShowRoute(true);
      setCurrentStep(0);
      
      // Clear existing route
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
          'line-width': 4,
          'line-opacity': 0.9
        }
      });
      
      // Add office marker (blue)
      new mapboxgl.Marker({ 
        color: paintBrainColors.blue,
        scale: 1.0
      })
        .setLngLat(officeCoords)
        .setPopup(new mapboxgl.Popup({ offset: 25 })
          .setHTML('<div style="color: black; padding: 10px; font-family: system-ui;"><strong style="color: #569CD6;">A-Frame Painting Office</strong><br><span style="font-size: 12px;">884 Hayes Rd, Manson\'s Landing, BC</span></div>'))
        .addTo(map.current);
        
      // Add client marker (yellow)
      new mapboxgl.Marker({ 
        color: paintBrainColors.yellow,
        scale: 1.2
      })
        .setLngLat(mapCenter)
        .setPopup(new mapboxgl.Popup({ offset: 25 })
          .setHTML(`<div style="color: black; padding: 10px; font-family: system-ui;"><strong style="color: ${paintBrainColors.orange};">${clientName}</strong><br><span style="font-size: 12px;">${clientAddress}</span></div>`))
        .addTo(map.current);
      
      // Fit map to show entire route
      const coordinates = route;
      const bounds = coordinates.reduce((bounds: any, coord: any) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
      
      map.current.fitBounds(bounds, {
        padding: 50
      });
      
      console.log('Navigation route displayed on map');
      
    } catch (error) {
      console.error('Failed to load navigation route:', error);
      // Show error message instead of external navigation
      alert('Unable to load route. Please check your internet connection.');
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
        className={`relative bg-gray-900 rounded-lg border-2 border-purple-500 overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : ''
        }`}
        onDoubleClick={toggleFullscreen}
        style={{ cursor: 'pointer' }}
      >
        {/* House Icon */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full text-3xl z-10 pointer-events-none">
          🏠
        </div>
        
        {/* Client Info Overlay */}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded px-3 py-2 border-l-4 border-yellow-400">
          <div className="text-white font-medium text-sm">{clientName}</div>
          <div className="text-gray-300 text-xs">{clientAddress}</div>
        </div>
        
        {/* Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-3 right-3 w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center text-lg font-bold transition-colors z-10"
        >
          {isFullscreen ? '⨉' : '⤢'}
        </button>
        
        <div 
          ref={mapContainer}
          style={{ 
            width: '100%', 
            height: isFullscreen ? '100vh' : '250px',
            backgroundColor: '#000'
          }}
        />
        
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <div className="text-center">
              <div className="text-yellow-400 text-2xl mb-2">🗺️</div>
              <p className="text-yellow-400 text-sm">Loading interactive map...</p>
            </div>
          </div>
        )}
        
        {/* Navigation Controls Overlay */}
        <div className="absolute bottom-16 left-3 right-3 flex gap-2">
          {!showRoute ? (
            <>
              <button
                onClick={handleNavigate}
                className="flex-1 bg-green-600/90 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium text-sm backdrop-blur-sm transition-colors"
              >
                🚗 Get Directions
              </button>
              
              <button
                onClick={handleCenterMap}
                className="flex-1 bg-blue-600/90 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium text-sm backdrop-blur-sm transition-colors"
              >
                📍 Center
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsNavigating(!isNavigating)}
                className="flex-1 bg-green-600/90 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium text-sm backdrop-blur-sm transition-colors"
              >
                {isNavigating ? '⏸️ Pause' : '▶️ Start Driving'}
              </button>
              
              <button
                onClick={() => {
                  setShowRoute(false);
                  setIsNavigating(false);
                  setCurrentStep(0);
                  if (map.current?.getSource('route')) {
                    map.current.removeLayer('route');
                    map.current.removeSource('route');
                  }
                }}
                className="flex-1 bg-red-600/90 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium text-sm backdrop-blur-sm transition-colors"
              >
                ❌ End Route
              </button>
            </>
          )}
        </div>
        
        {/* Turn-by-Turn Directions Panel */}
        {showRoute && (
          <div className="absolute top-16 left-3 right-3 bg-black/90 backdrop-blur-sm rounded-lg p-4 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium text-sm">Navigation to {clientName}</h3>
              <div className="text-green-400 text-xs">
                Step {currentStep + 1} of {routeSteps.length}
              </div>
            </div>
            
            {routeSteps.length > 0 && (
              <div className="space-y-2">
                <div className="bg-green-600/20 border border-green-500 rounded p-3">
                  <div className="text-green-400 font-medium text-sm mb-1">Current Direction:</div>
                  <div className="text-white text-sm">{routeSteps[currentStep]?.instruction}</div>
                  <div className="text-gray-400 text-xs mt-1">
                    {Math.round(routeSteps[currentStep]?.distance || 0)}m • {Math.round((routeSteps[currentStep]?.duration || 0) / 60)}min
                  </div>
                </div>
                
                {routeSteps[currentStep + 1] && (
                  <div className="bg-gray-700/50 border border-gray-600 rounded p-2">
                    <div className="text-gray-400 text-xs mb-1">Next:</div>
                    <div className="text-gray-300 text-xs">{routeSteps[currentStep + 1].instruction}</div>
                  </div>
                )}
                
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                    className="flex-1 bg-gray-600/50 hover:bg-gray-600/70 disabled:bg-gray-700/30 disabled:text-gray-500 text-white px-2 py-1 rounded text-xs"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => setCurrentStep(Math.min(routeSteps.length - 1, currentStep + 1))}
                    disabled={currentStep === routeSteps.length - 1}
                    className="flex-1 bg-gray-600/50 hover:bg-gray-600/70 disabled:bg-gray-700/30 disabled:text-gray-500 text-white px-2 py-1 rounded text-xs"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Map Info */}
      <div className="text-xs text-gray-400 text-center">
        {showRoute ? 
          `Navigation active • ${routeSteps.length} steps • Double-click for fullscreen` :
          'Interactive map • Get Directions: plan your route • Double-click for fullscreen'
        }
      </div>
    </div>
  );
};

export default EmbeddedClientMap;