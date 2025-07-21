import logoImage from "@assets/PAINt BRAIN LOGO 2_trans_1753079675546.png";

interface AFrameLogoProps {
  className?: string;
}

export default function AFrameLogo({ className = "w-8 h-8" }: AFrameLogoProps) {
  return (
    <div 
      className={`${className} flex items-center justify-center`}
      style={{ 
        backgroundColor: 'transparent',
        border: '2px solid lime' // Very visible debug border
      }}
    >
      <img
        src={logoImage}
        alt="Paint Brain Logo"
        className="max-w-full max-h-full"
        style={{ 
          objectFit: 'contain',
          backgroundColor: 'transparent',
          border: '2px solid magenta' // Very visible debug border
        }}
        onLoad={() => console.log('NEW LOGO LOADED SUCCESSFULLY!')}
        onError={(e) => console.error('LOGO FAILED TO LOAD:', e)}
      />
    </div>
  );
}