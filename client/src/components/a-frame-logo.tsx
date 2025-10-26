interface AFrameLogoProps {
  className?: string;
}

export default function AFrameLogo({ className = "w-8 h-8" }: AFrameLogoProps) {
  return (
    <div 
      className={`${className} flex items-center justify-center`}
    >
      <img
        src="/paint-brain-logo.png"
        alt="Paint Brain Logo"
        className="max-w-full max-h-full"
        style={{ 
          objectFit: 'contain',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      />
    </div>
  );
}
