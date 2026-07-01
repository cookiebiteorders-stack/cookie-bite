/** عناصر زخرفية خفيفة في خلفية الهيرو */
export function HeroDecorations() {
  return (
    <div className="cb-hero-decorations pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
      <div className="cb-hero-decorations__orb cb-hero-decorations__orb--peach" />
      <div className="cb-hero-decorations__orb cb-hero-decorations__orb--pink" />
      <div className="cb-hero-decorations__orb cb-hero-decorations__orb--mint" />
    </div>
  );
}
