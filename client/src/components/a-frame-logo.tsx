import logoImage from "@assets/11B133FD-4E46-4980-9620-6520E00C0B57_1753078345192.png";

interface AFrameLogoProps {
  className?: string;
}

export default function AFrameLogo({ className = "w-8 h-8" }: AFrameLogoProps) {
  return (
    <img
      src={logoImage}
      alt="Paint Brain Logo"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}