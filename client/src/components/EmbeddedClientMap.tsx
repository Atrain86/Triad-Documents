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

const EmbeddedClientMap: React.FC<EmbeddedClientMapProps> = ({
  clientName,
  clientAddress,
  projectId
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-124.972, 50.032]);

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
            style: 'mapbox://styles/mapbox/dark-v10',
            center: mapCenter,
            zoom: 12,
            interactive: true
          });

          // Add yellow marker for client location
          const marker = new mapboxgl.Marker({ 
            color: paintBrainColors.yellow,
            scale: 1.2
          })
            .setLngLat(mapCenter)
            .addTo(map.current);

          // Add popup with client info
          const popup = new mapboxgl.Popup({ 
            offset: 25,
            closeButton: true,
            closeOnClick: false
          })
            .setLngLat(mapCenter)
            .setHTML(`
              <div style="color: black; padding: 12px; font-family: system-ui;">
                <h3 style="margin: 0 0 5px 0; color: ${paintBrainColors.orange}; font-weight: bold; font-size: 14px;">${clientName}</h3>
                <p style="margin: 0; font-size: 12px; color: #333; line-height: 1.3;">${clientAddress}</p>
              </div>
            `)
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
      map.current.flyTo({
        center: mapCenter,
        zoom: 14,
        duration: 1000
      });
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
          'line-color': paintBrainColors.green,
          'line-width': 5,
          'line-opacity': 0.8
        }
      });
      
      // Add office marker
      new mapboxgl.Marker({ 
        color: paintBrainColors.blue,
        scale: 0.8
      })
        .setLngLat(officeCoords)
        .setPopup(new mapboxgl.Popup({ offset: 25 })
          .setHTML('<div style="color: black; padding: 8px;"><strong>A-Frame Painting Office</strong><br>884 Hayes Rd, Manson\'s Landing, BC</div>'))
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
      // Fallback to external navigation
      const startAddress = encodeURIComponent('884 Hayes Rd, Manson\'s Landing, BC V0P1K0');
      const endAddress = encodeURIComponent(clientAddress);
      window.open(`https://www.google.com/maps/dir/${startAddress}/${endAddress}`, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {/* Embedded Map Container */}
      <div className="relative bg-gray-900 rounded-lg border-2 border-red-500 overflow-hidden">
        <div 
          ref={mapContainer}
          style={{ 
            width: '100%', 
            height: '300px',
            backgroundColor: '#1a1a1a'
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
        <div className="absolute bottom-4 left-4 right-4 flex gap-2">
          <button
            onClick={handleNavigate}
            className="flex-1 bg-green-600/90 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium text-sm backdrop-blur-sm transition-colors"
          >
            🚗 Show Route
          </button>
          
          <button
            onClick={handleCenterMap}
            className="flex-1 bg-blue-600/90 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium text-sm backdrop-blur-sm transition-colors"
          >
            📍 Center
          </button>
          
          <button
            onClick={() => {
              const startAddress = encodeURIComponent('884 Hayes Rd, Manson\'s Landing, BC V0P1K0');
              const endAddress = encodeURIComponent(clientAddress);
              window.open(`https://www.google.com/maps/dir/${startAddress}/${endAddress}`, '_blank');
            }}
            className="flex-1 bg-purple-600/90 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-medium text-sm backdrop-blur-sm transition-colors"
          >
            🧭 External
          </button>
        </div>
      </div>
      
      {/* Map Info */}
      <div className="text-xs text-gray-400 text-center">
        Interactive map • Show Route: displays driving directions • Center: focus on client • External: open in Google Maps
      </div>
    </div>
  );
};

export default EmbeddedClientMap;