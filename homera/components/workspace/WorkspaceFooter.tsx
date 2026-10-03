import Link from "next/link";

const LINKS = [
  { label: "Aide et contact", href: "/contact" },
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "Confidentialité", href: "/legal/confidentialite" },
  { label: "Règles de visite", href: "/regles-visite" },
  { label: "Règles de location", href: "/regles-location" },
];

export function WorkspaceFooter() {
  return <footer className="border-t border-border bg-card/55 px-4 py-6 text-caption text-muted sm:px-6"><div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} HOMERA · Espaces pilote</p><nav aria-label="Aide et informations légales"><ul className="flex flex-wrap gap-x-5 gap-y-2">{LINKS.map((link) => <li key={link.href}><Link href={link.href} className="underline-offset-4 hover:text-foreground hover:underline">{link.label}</Link></li>)}</ul></nav></div></footer>;
}
