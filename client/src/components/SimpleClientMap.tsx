import React from 'react';

// Paint Brain color palette
const paintBrainColors = {
  orange: '#D4A574',
  yellow: '#DCDCAA', 
  green: '#6A9955',
  blue: '#569CD6',
  purple: '#8B5FBF',
  red: '#F44747'
};

interface SimpleClientMapProps {
  clientName: string;
  clientAddress: string;
  onClose?: () => void;
}

const SimpleClientMap: React.FC<SimpleClientMapProps> = ({
  clientName,
  clientAddress,
  onClose
}) => {
  const handleStartDriving = () => {
    const startAddress = encodeURIComponent('884 Hayes Rd, Manson\'s Landing, BC V0P1K0');
    const endAddress = encodeURIComponent(clientAddress);
    window.open(`https://www.google.com/maps/dir/${startAddress}/${endAddress}`, '_blank');
  };

  const handleViewMaps = () => {
    const address = encodeURIComponent(clientAddress);
    window.open(`https://www.google.com/maps/search/${address}`, '_blank');
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        style={{
          backgroundColor: '#1a1a1a',
          border: `3px solid ${paintBrainColors.red}`,
          borderRadius: '12px',
          padding: '30px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center'
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: paintBrainColors.red,
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          ×
        </button>

        {/* Map icon */}
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗺️</div>
        
        {/* Client info */}
        <h2 style={{ 
          color: paintBrainColors.orange, 
          margin: '0 0 10px 0',
          fontSize: '20px',
          fontWeight: 'bold'
        }}>
          {clientName}
        </h2>
        
        <p style={{ 
          color: paintBrainColors.yellow, 
          margin: '0 0 30px 0',
          fontSize: '16px',
          lineHeight: '1.4'
        }}>
          {clientAddress}
        </p>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button
            onClick={handleStartDriving}
            style={{
              background: paintBrainColors.green,
              color: 'white',
              border: 'none',
              padding: '15px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            🚗 Start Driving Directions
          </button>
          
          <button
            onClick={handleViewMaps}
            style={{
              background: paintBrainColors.blue,
              color: 'white',
              border: 'none',
              padding: '15px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            📍 View on Google Maps
          </button>
        </div>

        <p style={{ 
          color: '#666', 
          fontSize: '12px', 
          marginTop: '20px',
          fontStyle: 'italic'
        }}>
          Opens Google Maps in your browser for navigation
        </p>
      </div>
    </div>
  );
};

export default SimpleClientMap;