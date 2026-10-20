// Simple, distinct drawings of each crop (so a farmer can pick by picture, not by reading).
// Swap for real photos later by replacing these with <img> tags — the tile layout stays the same.
function CropIcon({ crop, size = 84 }) {
  const common = { width: size, height: size, viewBox: '0 0 100 100', 'aria-hidden': true };

  if (crop === 'Wheat') {
    const grains = [[50, 22], [41, 31], [59, 31], [41, 43], [59, 43], [42, 55], [58, 55]];
    return (
      <svg {...common}>
        <path d="M50 92 C50 70 50 60 50 30" stroke="#a16207" strokeWidth="3" fill="none" strokeLinecap="round" />
        {grains.map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="6" ry="10" fill="#e0a526" stroke="#b7791f" strokeWidth="1.2"
            transform={`rotate(${x < 50 ? -22 : x > 50 ? 22 : 0} ${x} ${y})`} />
        ))}
        <path d="M50 14 L50 3 M41 22 L34 8 M59 22 L66 8" stroke="#b7791f" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M50 78 C38 74 30 66 26 56 C38 58 46 66 50 78Z" fill="#65a30d" />
      </svg>
    );
  }
  if (crop === 'Paddy') {
    const grains = [[30, 26], [38, 20], [47, 18], [56, 20], [64, 27], [69, 37], [71, 48]];
    return (
      <svg {...common}>
        <path d="M30 94 C28 60 30 40 48 24 C58 16 70 22 71 40" stroke="#4d7c0f" strokeWidth="3" fill="none" strokeLinecap="round" />
        {grains.map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y + 8} rx="4.5" ry="8" fill="#d6c24a" stroke="#a3922a" strokeWidth="1"
            transform={`rotate(${20 + i * 12} ${x} ${y + 8})`} />
        ))}
        <path d="M30 80 C44 78 56 70 62 58 C48 60 36 68 30 80Z" fill="#84cc16" />
      </svg>
    );
  }
  if (crop === 'Mustard') {
    const blooms = [[50, 20], [38, 28], [62, 28], [44, 38], [56, 38], [50, 30]];
    return (
      <svg {...common}>
        <path d="M50 94 L50 38 M50 66 L32 52 M50 62 L68 48" stroke="#4d7c0f" strokeWidth="3" fill="none" strokeLinecap="round" />
        {blooms.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" fill="#fbd600" stroke="#d4a900" strokeWidth="1" />)}
        <circle cx="32" cy="50" r="5" fill="#fbd600" /><circle cx="68" cy="46" r="5" fill="#fbd600" />
        <path d="M50 84 C36 82 28 74 26 66 C38 66 46 72 50 84Z" fill="#65a30d" />
      </svg>
    );
  }
  if (crop === 'Cotton') {
    return (
      <svg {...common}>
        <path d="M50 94 L50 56" stroke="#4d7c0f" strokeWidth="3" strokeLinecap="round" />
        <path d="M30 52 L38 66 L50 56 L62 66 L70 52 L50 44Z" fill="#7c5a2b" />
        {[[36, 38], [50, 30], [64, 38], [43, 46], [57, 46]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="13" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
        ))}
        <path d="M50 80 C62 78 70 72 74 64 C62 64 54 70 50 80Z" fill="#84cc16" />
      </svg>
    );
  }
  // Sunflower
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg {...common}>
      <path d="M50 96 L50 62" stroke="#4d7c0f" strokeWidth="4" strokeLinecap="round" />
      {petals.map((a) => (
        <ellipse key={a} cx="50" cy="20" rx="6.5" ry="13" fill="#fbbf24" stroke="#d97706" strokeWidth="1"
          transform={`rotate(${a} 50 42) translate(0 4)`} />
      ))}
      <circle cx="50" cy="42" r="14" fill="#6b3f1d" stroke="#4a2a12" strokeWidth="1.5" />
      <path d="M50 84 C64 82 72 76 76 68 C62 68 54 74 50 84Z" fill="#84cc16" />
    </svg>
  );
}

export default CropIcon;
