// Friendly illustration for empty states: sunny field, Mandi shed and a tractor with sacks.
function MandiScene() {
  return (
    <svg viewBox="0 0 320 170" className="mandi-scene" role="img" aria-label="Mandi">
      <defs>
        <linearGradient id="ms-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dff6ff" /><stop offset="1" stopColor="#f3fbe8" />
        </linearGradient>
      </defs>
      <rect width="320" height="170" rx="18" fill="url(#ms-sky)" />
      <circle cx="268" cy="38" r="20" fill="#fcd34d" />
      <g stroke="#fcd34d" strokeWidth="3" strokeLinecap="round">
        <path d="M268 8v-6M268 74v-6M238 38h-6M304 38h-6M247 17l-4-4M293 63l-4-4M289 17l4-4M247 59l-4 4" />
      </g>
      <path d="M0 120 C60 98 110 104 160 116 C220 130 270 108 320 112 V170 H0Z" fill="#86efac" />
      <path d="M0 140 C70 124 130 134 190 142 C240 148 280 138 320 140 V170 H0Z" fill="#4ade80" />
      {/* Mandi shed */}
      <g data-no-translate>
        <rect x="190" y="82" width="86" height="52" fill="#b45309" />
        <path d="M182 84 L233 56 L284 84Z" fill="#7c2d12" />
        <rect x="208" y="104" width="50" height="30" rx="3" fill="#78350f" />
        <rect x="211" y="70" width="44" height="13" rx="3" fill="#fef3c7" />
        <text x="233" y="80.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#7c2d12" fontFamily="sans-serif">MANDI</text>
      </g>
      {/* Tractor + trolley */}
      <g>
        <rect x="22" y="104" width="52" height="24" rx="4" fill="#d1d5db" stroke="#9ca3af" />
        <circle cx="34" cy="100" r="7" fill="#fde68a" stroke="#d97706" /><circle cx="50" cy="98" r="8" fill="#fde68a" stroke="#d97706" /><circle cx="64" cy="101" r="7" fill="#fde68a" stroke="#d97706" />
        <rect x="78" y="106" width="46" height="18" rx="4" fill="#dc2626" />
        <rect x="108" y="92" width="22" height="22" rx="4" fill="#ef4444" />
        <rect x="112" y="96" width="14" height="10" rx="2" fill="#bfdbfe" />
        <circle cx="96" cy="130" r="13" fill="#1f2937" /><circle cx="96" cy="130" r="5" fill="#9ca3af" />
        <circle cx="124" cy="134" r="8" fill="#1f2937" /><circle cx="124" cy="134" r="3" fill="#9ca3af" />
        <circle cx="38" cy="134" r="8" fill="#1f2937" /><circle cx="38" cy="134" r="3" fill="#9ca3af" />
        <circle cx="62" cy="134" r="8" fill="#1f2937" /><circle cx="62" cy="134" r="3" fill="#9ca3af" />
      </g>
    </svg>
  );
}

export default MandiScene;
