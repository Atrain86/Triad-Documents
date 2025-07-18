import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { X } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
// Remove problematic import

// Paint Brain colors
const paintBrainColors = {
  red: '#E03E3E',
  yellow: '#F7C11F', 
  blue: '#0099CC',
  purple: '#6B4C9A',
  orange: '#EF6C30'
};

interface ClientMapProps {
  clientName: string;
  address: string;
  city?: string;
  longitude: number;
  latitude: number;
  onClose?: () => void;
}

const ClientMap: React.FC<ClientMapProps> = ({
  clientName,
  address,
  city,
  longitude,
  latitude,
  onClose
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(true);

  useEffect(() => {
    // Check if token is already available
    const setToken = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('mapbox_token');
      const tokenFromEnv = (window as any).MAPBOX_ACCESS_TOKEN;
      
      mapboxgl.accessToken = tokenFromUrl || tokenFromEnv || '';
      
      if (map.current || !mapContainer.current) return;
      
      if (!mapboxgl.accessToken) {
        console.warn('Mapbox token not found. Map will show placeholder.');
        return;
      }
      
      initializeMap();
    };

    // If token already available, use it
    if ((window as any).MAPBOX_ACCESS_TOKEN) {
      setToken();
    } else {
      // Wait a bit for the token to load from the API
      setTimeout(setToken, 500);
    }
  }, []);

  const initializeMap = () => {
    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/dark-v10',
      center: [longitude, latitude],
      zoom: 12
    });

    // Create custom yellow house marker
    const markerElement = document.createElement('div');
    markerElement.style.cssText = `
      width: 30px;
      height: 30px;
      background-color: ${paintBrainColors.yellow};
      border: 2px solid ${paintBrainColors.purple};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      cursor: pointer;
      position: relative;
    `;
    
    // Add house icon inside marker
    const houseIcon = document.createElement('div');
    houseIcon.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(45deg);
      font-size: 16px;
      color: ${paintBrainColors.purple};
    `;
    houseIcon.innerHTML = '🏠';
    markerElement.appendChild(houseIcon);

    // Add marker to map
    new mapboxgl.Marker(markerElement)
      .setLngLat([longitude, latitude])
      .addTo(map.current);
  };

  const handleClose = () => {
    setIsFullscreen(false);
    if (onClose) onClose();
  };

  const handleThumbnailClick = () => {
    setIsFullscreen(true);
  };

  if (!isFullscreen) {
    // Thumbnail view
    return (
      <div
        onClick={handleThumbnailClick}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '120px',
          height: '120px',
          border: `3px solid ${paintBrainColors.purple}`,
          borderRadius: '8px',
          cursor: 'pointer',
          zIndex: 1000,
          backgroundImage: mapboxgl.accessToken 
            ? `url(https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/${longitude},${latitude},12/120x120?access_token=${mapboxgl.accessToken})`
            : `linear-gradient(45deg, ${paintBrainColors.purple}, ${paintBrainColors.red})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
        title="Click to open map"
      />
    );
  }

  // Full map view
  return (
    <div 
      style={{
        position: 'relative',
        width: '100%',
        height: '400px',
        border: `3px solid ${paintBrainColors.purple}`,
        borderRadius: '8px',
        overflow: 'hidden',
        margin: '20px 0',
        backgroundColor: '#000'
      }}
    >
      {!mapboxgl.accessToken ? (
        // Show setup message when no token
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: paintBrainColors.yellow,
            textAlign: 'center',
            padding: '20px',
            flexDirection: 'column'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🗺️</div>
          <h3 style={{ color: paintBrainColors.red, margin: '10px 0' }}>Map Setup Required</h3>
          <p style={{ fontSize: '14px', lineHeight: '1.4', maxWidth: '300px' }}>
            Mapbox token not configured. The standalone HTML file in <code>/public/client-map.html</code> 
            includes setup instructions for adding your free Mapbox API key.
          </p>
        </div>
      ) : (
        <div 
          ref={mapContainer} 
          style={{ 
            width: '100%', 
            height: '100%' 
          }} 
        />
      )}
      
      {/* Client info box */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: '8px 12px',
          borderLeft: `4px solid ${paintBrainColors.orange}`,
          color: paintBrainColors.yellow,
          fontSize: '14px',
          borderRadius: '4px'
        }}
      >
        <strong>{clientName}</strong><br />
        {address}<br />
        {city && `${city}, BC`}
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: paintBrainColors.red,
          color: 'white',
          border: 'none',
          padding: '6px 10px',
          cursor: 'pointer',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default ClientMap;