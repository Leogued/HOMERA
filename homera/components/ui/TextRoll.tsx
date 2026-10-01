/* Le texte original reste l'unique libellé accessible. */
export function TextRoll({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={`homera-roll ${className}`}>
      <span className="homera-roll-original">{children}</span>
      <span className="homera-roll-echo" aria-hidden="true">{children}</span>
    </span>
  );
}
