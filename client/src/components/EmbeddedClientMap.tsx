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

  const handleNavigate = () => {
    const startAddress = encodeURIComponent('884 Hayes Rd, Manson\'s Landing, BC V0P1K0');
    const endAddress = encodeURIComponent(clientAddress);
    window.open(`https://www.google.com/maps/dir/${startAddress}/${endAddress}`, '_blank');
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
            🚗 Navigate
          </button>
          
          <button
            onClick={handleCenterMap}
            className="flex-1 bg-blue-600/90 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium text-sm backdrop-blur-sm transition-colors"
          >
            📍 Center
          </button>
        </div>
      </div>
      
      {/* Map Info */}
      <div className="text-xs text-gray-400 text-center">
        Interactive map • Pan and zoom • Click marker for details
      </div>
    </div>
  );
};

export default EmbeddedClientMap;