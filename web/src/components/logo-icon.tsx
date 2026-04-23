export function LogoIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
    >
      {/* Open book from above — left page (light side) */}
      <path d="M16 2 L2 16 L16 30 Z" fill="#c99252" />
      {/* Right page (shadow side) */}
      <path d="M16 2 L30 16 L16 30 Z" fill="#9e6830" />
      {/* Spine */}
      <line x1="16" y1="2" x2="16" y2="30" stroke="#6b4418" strokeWidth="1.5" strokeLinecap="round" />
      {/* Left page lines */}
      <line x1="15.5" y1="10" x2="8"  y2="12.5" stroke="rgba(255,255,255,0.38)" strokeWidth="1" strokeLinecap="round" />
      <line x1="15.5" y1="14" x2="5"  y2="15"   stroke="rgba(255,255,255,0.38)" strokeWidth="1" strokeLinecap="round" />
      <line x1="15.5" y1="18" x2="6"  y2="18.5" stroke="rgba(255,255,255,0.38)" strokeWidth="1" strokeLinecap="round" />
      <line x1="15.5" y1="22" x2="9"  y2="21.5" stroke="rgba(255,255,255,0.30)" strokeWidth="1" strokeLinecap="round" />
      {/* Right page lines */}
      <line x1="16.5" y1="10" x2="24" y2="12.5" stroke="rgba(0,0,0,0.18)" strokeWidth="1" strokeLinecap="round" />
      <line x1="16.5" y1="14" x2="27" y2="15"   stroke="rgba(0,0,0,0.18)" strokeWidth="1" strokeLinecap="round" />
      <line x1="16.5" y1="18" x2="26" y2="18.5" stroke="rgba(0,0,0,0.18)" strokeWidth="1" strokeLinecap="round" />
      <line x1="16.5" y1="22" x2="23" y2="21.5" stroke="rgba(0,0,0,0.14)" strokeWidth="1" strokeLinecap="round" />
      {/* Spark at apex */}
      <circle cx="16" cy="2" r="2" fill="#f5c97a" />
    </svg>
  );
}
