// Brand mark: an "IM" monogram on a leather patch, framed by a saddle-stitch seam
// (the same stitched-seam motif as the hero and focus rings). Inline SVG: no image request.
export default function Logo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="logo">
      <rect x="1" y="1" width="46" height="46" rx="11" fill="var(--espresso)" />
      <rect x="5" y="5" width="38" height="38" rx="8" fill="none" stroke="#c88a4e" strokeWidth="1.3" strokeDasharray="2.6 2.2" />
      <text
        x="24"
        y="30.5"
        textAnchor="middle"
        fontFamily="'Bodoni Moda', Didot, Georgia, serif"
        fontSize="18"
        fontWeight="500"
        letterSpacing="0.6"
        fill="#f2efec"
      >
        IM
      </text>
    </svg>
  );
}
