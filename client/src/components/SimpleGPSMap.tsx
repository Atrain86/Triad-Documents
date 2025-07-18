import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface SimpleGPSMapProps {
  clientName: string;
  clientAddress: string;
  projectId: number;
}

interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  nextInstruction?: string;
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
  const [currentStep, setCurrentStep] = useState<NavigationStep | null>(null);
  const [remainingDistance, setRemainingDistance] = useState<string>('');
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [routeSteps, setRouteSteps] = useState<NavigationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

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
          style: 'mapbox://styles/mapbox/navigation-day-v1', // Better for navigation
          center: clientCoords,
          zoom: 15,
          pitch: 60, // 3D perspective like real GPS
          bearing: 0
        });

        map.current.on('load', () => {
          // Add destination marker
          new mapboxgl.Marker({ 
            color: '#FF6B6B', 
            scale: 1.5 
          })
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

  // Get user location with continuous tracking
  useEffect(() => {
    if (!mapReady) return;

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const coords: [number, number] = [
            position.coords.longitude,
            position.coords.latitude
          ];
          setUserLocation(coords);
          
          if (map.current) {
            // Update user location marker
            if (!map.current.getSource('user-location')) {
              map.current.addSource('user-location', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: { type: 'Point', coordinates: coords }
                }
              });

              map.current.addLayer({
                id: 'user-location',
                type: 'circle',
                source: 'user-location',
                paint: {
                  'circle-radius': 8,
                  'circle-color': '#007AFF',
                  'circle-stroke-color': '#FFFFFF',
                  'circle-stroke-width': 2
                }
              });
            } else {
              (map.current.getSource('user-location') as mapboxgl.GeoJSONSource).setData({
                type: 'Feature',
                properties: {},
                geometry: { type: 'Point', coordinates: coords }
              });
            }

            // During navigation, follow user location
            if (isNavigating) {
              map.current.flyTo({
                center: coords,
                zoom: 18,
                pitch: 60,
                bearing: position.coords.heading || 0,
                duration: 1000
              });
            }
          }
        },
        (err) => {
          setError('Please allow location access to use GPS navigation');
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [mapReady, isNavigating]);

  const startNavigation = async () => {
    if (!userLocation || !map.current) return;

    try {
      setIsNavigating(true);
      setError('');
      
      // Get detailed directions with steps
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation[0]},${userLocation[1]};${clientCoords[0]},${clientCoords[1]}?steps=true&voice_instructions=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      
      const data = await response.json();
      
      if (!data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }
      
      const route = data.routes[0];
      const steps = route.legs[0].steps;
      
      // Convert steps to our format
      const navigationSteps: NavigationStep[] = steps.map((step: any, index: number) => ({
        instruction: step.maneuver.instruction,
        distance: step.distance,
        duration: step.duration,
        nextInstruction: index < steps.length - 1 ? steps[index + 1].maneuver.instruction : undefined
      }));
      
      setRouteSteps(navigationSteps);
      setCurrentStepIndex(0);
      setCurrentStep(navigationSteps[0]);
      setRemainingDistance(`${(route.distance / 1000).toFixed(1)} km`);
      setRemainingTime(`${Math.round(route.duration / 60)} min`);

      // Add route line with gradient
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry
        }
      });

      map.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 
          'line-color': '#007AFF', 
          'line-width': 8,
          'line-opacity': 0.8
        }
      });

      // Switch to navigation view
      map.current.flyTo({
        center: userLocation,
        zoom: 18,
        pitch: 60,
        bearing: 0,
        duration: 2000
      });

    } catch (err) {
      console.error('Navigation error:', err);
      setError('Unable to get directions. Please check your internet connection.');
      setIsNavigating(false);
    }
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setCurrentStep(null);
    setRouteSteps([]);
    setCurrentStepIndex(0);
    setRemainingDistance('');
    setRemainingTime('');
    
    if (map.current?.getSource('route')) {
      map.current.removeLayer('route-line');
      map.current.removeSource('route');
    }

    // Return to overview
    if (map.current && userLocation) {
      const bounds = new mapboxgl.LngLatBounds()
        .extend(userLocation)
        .extend(clientCoords);
      
      map.current.fitBounds(bounds, { 
        padding: 100,
        pitch: 0,
        bearing: 0
      });
    }
  };

  const nextStep = () => {
    if (currentStepIndex < routeSteps.length - 1) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);
      setCurrentStep(routeSteps[newIndex]);
    }
  };

  const previousStep = () => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);
      setCurrentStep(routeSteps[newIndex]);
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
      {/* Navigation Interface - Full Screen During Navigation */}
      {isNavigating && currentStep ? (
        <div className="relative">
          {/* Current Direction Panel */}
          <div className="bg-green-700 text-white p-4 rounded-t-lg">
            <div className="text-xs opacity-75">Current Direction:</div>
            <div className="text-lg font-semibold">{currentStep.instruction}</div>
            <div className="text-sm opacity-90">{remainingDistance} • {remainingTime}</div>
          </div>

          {/* Next Direction Panel */}
          {currentStep.nextInstruction && (
            <div className="bg-gray-800 text-white p-3 border-b border-gray-600">
              <div className="text-xs opacity-75">Next:</div>
              <div className="text-sm">{currentStep.nextInstruction}</div>
            </div>
          )}

          {/* Map Container - Navigation Mode */}
          <div 
            ref={mapContainer}
            className="w-full bg-black"
            style={{ height: '400px' }}
          />

          {/* Navigation Controls */}
          <div className="bg-gray-900 p-3 rounded-b-lg flex gap-3">
            <button
              onClick={previousStep}
              disabled={currentStepIndex === 0}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 text-white rounded text-sm"
            >
              ← Previous
            </button>
            
            <button
              onClick={nextStep}
              disabled={currentStepIndex >= routeSteps.length - 1}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 text-white rounded text-sm"
            >
              Next →
            </button>

            <div className="flex-1"></div>

            <button
              onClick={stopNavigation}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
            >
              End Route
            </button>
          </div>
        </div>
      ) : (
        /* Regular Map View */
        <div className="w-full">
          {/* Map Container */}
          <div 
            ref={mapContainer}
            className="w-full bg-black rounded-lg"
            style={{ height: '400px' }}
          />

          {/* Start Navigation Button */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={startNavigation}
              disabled={!userLocation}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 px-6 rounded-lg font-medium text-lg"
            >
              {userLocation ? `🧭 Start Navigation to ${clientName}` : '📍 Getting your location...'}
            </button>
          </div>

          {/* Status */}
          <div className="mt-2 text-center text-sm text-gray-400">
            {userLocation ? 
              `Ready to navigate to ${clientAddress}` : 
              'Allow location access to start GPS navigation'
            }
          </div>
        </div>
      )}

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