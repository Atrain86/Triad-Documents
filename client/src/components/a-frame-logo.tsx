interface AFrameLogoProps {
  className?: string;
}

export default function AFrameLogo({ className = "w-8 h-8" }: AFrameLogoProps) {
  const timestamp = new Date().getTime();
  
  return (
    <div 
      className={`${className} flex items-center justify-center`}
      style={{ 
        backgroundColor: 'red',
        border: '4px solid yellow',
        padding: '4px'
      }}
    >
      <img
        src={`/attached_assets/PAINt BRAIN LOGO 2_trans.png?t=${timestamp}`}
        alt="Paint Brain Logo"
        className="max-w-full max-h-full"
        style={{ 
          objectFit: 'contain',
          backgroundColor: 'blue',
          border: '4px solid white'
        }}
        onLoad={() => console.log('LOGO LOADED WITH TIMESTAMP:', timestamp)}
        onError={(e) => console.error('LOGO LOAD ERROR:', e)}
      />
    </div>
  );
}