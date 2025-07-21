import logoImage from "@assets/11B133FD-4E46-4980-9620-6520E00C0B57_1753078345192.png";

interface AFrameLogoProps {
  className?: string;
}

export default function AFrameLogo({ className = "w-8 h-8" }: AFrameLogoProps) {
  return (
    <div className={`${className} flex items-center justify-center`} style={{ background: 'transparent' }}>
      <img
        src={`${logoImage}?v=${Date.now()}`}
        alt="Paint Brain Logo"
        className="max-w-full max-h-full"
        style={{ 
          objectFit: 'contain',
          background: 'transparent',
          mixBlendMode: 'normal'
        }}
      />
    </div>
  );
}