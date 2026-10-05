"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Bell, Globe2, LockKeyhole, Moon, Settings2, ShieldCheck, Sun, Trash2, UserRound } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useWorkflow } from "@/components/providers/WorkflowProvider";
import { describeProfile, initials, maskPhone, rolesLabel } from "@/lib/auth";
import type { AccountRole } from "@/lib/auth";
import { BUTTON_SECONDARY, DemoNotice, WorkspaceHeading, WorkspacePanel } from "@/components/workspace/Primitives";

const ROLE_LABELS: Record<AccountRole, string> = { client: "Client", proprietaire: "Propriétaire", agent: "Agent" };

export function ProfilePage({ role }: { role: AccountRole }) {
  const { account } = useAuth();
  if (!account) return null;
  const lines = describeProfile(account.roles, account.profile);
  const roleLines = lines.filter((line) => {
    if (role === "client") return ["projet", "budget", "commune", "typeBien", "dateEmmenagement", "dureeSejour"].includes(line.name);
    if (role === "proprietaire") return ["portefeuille", "typeBiens", "communeBiens", "situation", "statutProprietaire"].includes(line.name);
    return ["structure", "rccm", "ifu", "zoneExercice", "specialite"].includes(line.name);
  });
  return <>
    <WorkspaceHeading eyebrow="Compte HOMERA" title="Mon profil" description="Votre identité, vos coordonnées et les informations partagées selon le rôle choisi." />
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]"><WorkspacePanel title={`${account.prenom} ${account.nom}`} description={rolesLabel(account.roles)} icon={UserRound}><div className="flex items-center gap-4"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-homera-cream-dark font-serif text-display-xs text-homera-brown">{initials(account.prenom, account.nom)}</span><div><p className="font-semibold">{account.email}</p><p className="mt-1 text-caption text-muted">{account.telephone ? maskPhone(account.telephone) : "Téléphone non renseigné"}</p><p className="mt-2 inline-flex items-center gap-1.5 text-caption font-semibold"><span className={`h-2 w-2 rounded-full ${account.emailVerified ? "bg-success" : "bg-warning"}`} aria-hidden="true" />{account.emailVerified ? "Adresse confirmée" : "Adresse à confirmer"}</p></div></div><div className="mt-5 flex flex-wrap gap-2">{account.roles.map((entry) => <span key={entry} className="rounded-full border border-border bg-background px-3 py-1.5 text-caption font-semibold">{ROLE_LABELS[entry]}</span>)}</div><p className="mt-4 text-caption leading-relaxed text-muted">Pour modifier les informations principales ou ajouter un rôle, utilisez les outils de compte HOMERA. Le profil du pilote est conservé dans ce navigateur.</p><Link href={role === "proprietaire" ? "/proprietaire/parametres" : "/client/parametres"} className="mt-4 inline-flex min-h-10 items-center gap-2 text-caption font-semibold text-homera-terracotta hover:underline"><Settings2 className="h-3.5 w-3.5" aria-hidden="true" />Paramètres et sécurité</Link></WorkspacePanel>
      <WorkspacePanel title={`Informations ${ROLE_LABELS[role].toLowerCase()}`} description="Champs fournis lors de l’inscription ou de l’ajout de rôle." icon={ShieldCheck}>{roleLines.length ? <dl className="grid gap-3 sm:grid-cols-2">{roleLines.map((line) => <div key={line.name} className="rounded-xl border border-border bg-background p-3"><dt className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-muted">{line.label}</dt><dd className="mt-1 text-note font-medium">{line.value}</dd></div>)}</dl> : <div className="rounded-xl border border-dashed border-border p-5 text-note leading-relaxed text-muted">Aucune information complémentaire n’a été enregistrée pour ce rôle. Vous pouvez compléter votre profil depuis le parcours d’inscription.</div>}<p className="mt-4 text-caption text-muted">Créé le {formatDate(account.createdAt)} · statut local</p></WorkspacePanel></div>
    <div className="mt-6"><DemoNotice>La photo de profil, l’édition des coordonnées et le dépôt sécurisé des pièces seront reliés au service de compte avant production.</DemoNotice></div>
  </>;
}

export function PreferencesPage() {
  const { data, updateData } = useWorkflow();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const preferences = data.preferences;
  const updatePreference = (key: keyof typeof preferences, value: boolean | "fr" | "en") => updateData((current) => ({ ...current, preferences: { ...current.preferences, [key]: value } }));
  return <>
    <WorkspaceHeading eyebrow="Préférences personnelles" title="Paramètres" description="Réglez les notifications, le thème et la langue de cet espace. Vos choix restent locaux au navigateur." />
    <div className="grid gap-5 xl:grid-cols-2"><WorkspacePanel title="Notifications" description="Choisissez les alertes à afficher dans votre espace." icon={Bell}><div className="space-y-2">{[
      { key: "emailNotifications" as const, label: "Notifications par e-mail", detail: "Les e-mails ne sont pas envoyés dans ce pilote.", checked: preferences.emailNotifications },
      { key: "visitNotifications" as const, label: "Visites et demandes", detail: "Confirmation, indisponibilité, fin de visite.", checked: preferences.visitNotifications },
      { key: "marketingNotifications" as const, label: "Actualités et nouveautés", detail: "Informations produit et annonces récentes.", checked: preferences.marketingNotifications },
    ].map((item) => <label key={item.key} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-background p-3.5"><span><span className="block text-note font-semibold">{item.label}</span><span className="mt-1 block text-caption text-muted">{item.detail}</span></span><input type="checkbox" checked={item.checked} onChange={(event) => updatePreference(item.key, event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-homera-terracotta" /></label>)}</div></WorkspacePanel>
      <WorkspacePanel title="Thème" description="Choisissez un thème fixe ou suivez le réglage du système." icon={resolvedTheme === "dark" ? Moon : Sun}><div className="grid gap-2 sm:grid-cols-3">{[{ id: "light", label: "Clair", icon: Sun }, { id: "dark", label: "Sombre", icon: Moon }, { id: "system", label: "Système", icon: Globe2 }].map((option) => <button key={option.id} type="button" aria-pressed={theme === option.id} onClick={() => setTheme(option.id)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-note font-semibold transition-colors ${theme === option.id ? "border-homera-terracotta bg-homera-terracotta/[0.06] text-homera-terracotta" : "border-border bg-background text-muted hover:text-foreground"}`}><option.icon className="h-4 w-4" aria-hidden="true" />{option.label}</button>)}</div><p className="mt-3 text-caption text-muted">Mode actif : {resolvedTheme === "dark" ? "sombre" : "clair"}.</p></WorkspacePanel>
      <WorkspacePanel title="Langue" description="Langue préférée pour les messages du service." icon={Globe2}><label htmlFor="workspace-language" className="text-note font-semibold">Langue de l’espace</label><select id="workspace-language" value={preferences.language} onChange={(event) => updatePreference("language", event.target.value as "fr" | "en")} className="mt-2 min-h-11 w-full rounded-input border border-border bg-background px-3 text-note"><option value="fr">Français</option><option value="en">English · préférence mémorisée, interface en français pour le moment</option></select><p className="mt-2 text-caption text-muted">La traduction de l’ensemble de l’interface n’est pas encore disponible.</p></WorkspacePanel>
      <WorkspacePanel title="Sécurité & confidentialité" description="Gérez l’accès au compte et vos données de démonstration." icon={LockKeyhole}><p className="text-note leading-relaxed text-muted">Le compte, les favoris et les parcours sont conservés dans le stockage de ce navigateur. Ils ne sont pas chiffrés côté serveur et ne sont pas partagés entre appareils.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/mot-de-passe-oublie" className={BUTTON_SECONDARY}><LockKeyhole className="h-4 w-4" aria-hidden="true" />Réinitialiser le mot de passe</Link><Link href="/legal/confidentialite" className={BUTTON_SECONDARY}>Politique de confidentialité</Link></div><div className="mt-5 rounded-xl border border-warning/25 bg-warning/[0.06] p-4"><p className="text-note font-semibold">Suppression ou désactivation du compte</p><p className="mt-1 text-caption leading-relaxed text-muted">Cette action est indisponible : le prototype n’a pas de service d’identité côté serveur. Ne stockez pas de document sensible dans cet espace.</p><button type="button" disabled className="mt-3 inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-btn bg-surface-hover px-3 text-caption font-semibold text-muted opacity-60"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Supprimer le compte · indisponible</button></div></WorkspacePanel></div>
    <div className="mt-6"><DemoNotice>Les préférences sont conservées localement. Les notifications e-mail, préférences de confidentialité serveur et suppression de compte ne sont pas activées dans ce pilote.</DemoNotice></div>
  </>;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
