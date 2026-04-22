export function LogoIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <polygon points="16,2 30,16 16,16" fill="#dba96a" />
      <polygon points="16,2 16,16 2,16"  fill="#c29252" />
      <polygon points="16,16 30,16 16,30" fill="#a87438" />
      <polygon points="2,16 16,16 16,30"  fill="#8e5f28" />
      <line x1="2" y1="16" x2="30" y2="16" stroke="#b8854a" strokeWidth="0.4" />
      <line x1="16" y1="2" x2="16" y2="30" stroke="#b8854a" strokeWidth="0.4" />
    </svg>
  );
}
