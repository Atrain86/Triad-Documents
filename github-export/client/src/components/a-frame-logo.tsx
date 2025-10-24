interface AFrameLogoProps {
  className?: string;
}

export default function AFrameLogo({ className = "w-8 h-8" }: AFrameLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* A-Frame structure */}
      <g className="fill-primary">
        {/* Left side of A-frame */}
        <path d="M20 85 L50 15 L55 15 L35 85 Z" />
        {/* Right side of A-frame */}
        <path d="M45 15 L50 15 L80 85 L65 85 Z" />
        {/* Horizontal crossbeam */}
        <rect x="35" y="50" width="30" height="6" />
        {/* Base foundation */}
        <rect x="15" y="85" width="70" height="8" rx="2" />
      </g>
      {/* Paint brush accent */}
      <g className="fill-secondary">
        <path d="M75 25 L85 20 L88 25 L82 35 L75 32 Z" />
        <circle cx="78" cy="28" r="2" className="fill-white" />
      </g>
    </svg>
  );
}