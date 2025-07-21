import logoImage from "@assets/IMG_2014_1753077652007.jpeg";

interface AFrameLogoProps {
  className?: string;
}

export default function AFrameLogo({ className = "w-8 h-8" }: AFrameLogoProps) {
  return (
    <img
      src={logoImage}
      alt="A-Frame Painting Logo"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}