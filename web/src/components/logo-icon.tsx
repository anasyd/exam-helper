export function LogoIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lbar" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#e8b870" />
          <stop offset="100%" stopColor="#8a5020" />
        </linearGradient>
        <radialGradient id="ldot" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fff4d6" />
          <stop offset="60%"  stopColor="#fcd98a" />
          <stop offset="100%" stopColor="#c99252" />
        </radialGradient>
        <filter id="lglow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect x="4" y="5.5"  width="24" height="5" rx="2.5" fill="url(#lbar)" />
      <rect x="4" y="13.5" width="16" height="5" rx="2.5" fill="url(#lbar)" />
      <rect x="4" y="21.5" width="24" height="5" rx="2.5" fill="url(#lbar)" />
      <circle cx="24" cy="16" r="3.8" fill="url(#ldot)" filter="url(#lglow)" />
    </svg>
  );
}
