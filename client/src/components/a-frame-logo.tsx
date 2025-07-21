import logoImage from "@assets/PAINt BRAIN LOGO 1_trans_1753079466082.png";

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