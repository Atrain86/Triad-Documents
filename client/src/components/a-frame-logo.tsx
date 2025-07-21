import logoImage from "@assets/IMG_2014_1753077652007.jpeg";

interface AFrameLogoProps {
  className?: string;
}

export default function AFrameLogo({ className = "w-8 h-8" }: AFrameLogoProps) {
  return (
    <div 
      className={`${className} flex items-center justify-center`}
      style={{
        background: `url(${logoImage})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        WebkitMask: `url(${logoImage})`,
        mask: `url(${logoImage})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        backgroundColor: 'currentColor',
        filter: 'invert(1) brightness(2) contrast(1.5)'
      }}
    />
  );
}