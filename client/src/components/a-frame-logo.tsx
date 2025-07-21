import logoImage from "@assets/PAINt BRAIN LOGO 1_trans_1753079466082.png";

interface AFrameLogoProps {
  className?: string;
}

export default function AFrameLogo({ className = "w-8 h-8" }: AFrameLogoProps) {
  const timestamp = Date.now();
  
  return (
    <div 
      className={className} 
      style={{ 
        background: 'transparent', 
        border: '1px solid red' // Temporary debug border
      }}
    >
      <img
        src={`${logoImage}?v=${timestamp}`}
        alt="Paint Brain Logo"
        className="w-full h-full"
        style={{ 
          objectFit: 'contain',
          background: 'transparent',
          border: '1px solid blue' // Temporary debug border
        }}
        onLoad={() => console.log('Logo loaded:', logoImage)}
        onError={() => console.error('Logo failed to load:', logoImage)}
      />
    </div>
  );
}