"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, FolderHeart, Heart, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useVisitor } from "@/components/providers/VisitorProvider";
import { PropertyCard } from "@/components/catalog/PropertyCard";
import { PROPERTIES, type Property } from "@/lib/content";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, DemoNotice, EmptyPanel, INPUT_CLASS, WorkspaceHeading } from "@/components/workspace/Primitives";

type FavoriteFolders = { folders: string[]; assignment: Record<string, string> };
const DEFAULT_FOLDERS = ["À étudier", "À visiter"];

export function ClientFavorites() {
  const { account } = useAuth();
  const visitor = useVisitor();
  const [folders, setFolders] = useState<string[]>(DEFAULT_FOLDERS);
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const [activeFolder, setActiveFolder] = useState("Tous");
  const [newFolder, setNewFolder] = useState("");
  const [folderError, setFolderError] = useState("");
  const storageKey = `homera.favorite-folders.v1.${account?.id ?? "invite"}`;
  const favorites = useMemo(() => visitor.favorites
    .map((id) => PROPERTIES.find((property) => property.id === id))
    .filter(isProperty), [visitor.favorites]);

  /* Lecture nécessaire après montage : évite de rendre le localStorage côté serveur. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setFolders(DEFAULT_FOLDERS);
        setAssignment({});
        return;
      }
      const value = JSON.parse(raw) as Partial<FavoriteFolders>;
      setFolders(Array.isArray(value.folders) && value.folders.every((entry) => typeof entry === "string") && value.folders.length ? value.folders : DEFAULT_FOLDERS);
      setAssignment(value.assignment && typeof value.assignment === "object" ? value.assignment : {});
    } catch {
      setFolders(DEFAULT_FOLDERS);
      setAssignment({});
      setFolderError("Impossible de lire les dossiers locaux. Vous pouvez continuer sans classement.");
    }
  }, [storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const persist = (nextFolders: string[], nextAssignment: Record<string, string>) => {
    setFolders(nextFolders);
    setAssignment(nextAssignment);
    try { window.localStorage.setItem(storageKey, JSON.stringify({ folders: nextFolders, assignment: nextAssignment })); }
    catch { setFolderError("Le navigateur n’a pas autorisé la sauvegarde du classement."); }
  };

  const createFolder = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newFolder.trim();
    if (!name) { setFolderError("Donnez un nom à ce dossier."); return; }
    if (folders.some((folder) => folder.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr"))) { setFolderError("Ce dossier existe déjà."); return; }
    if (folders.length >= 8) { setFolderError("Vous pouvez créer jusqu’à huit dossiers dans ce pilote."); return; }
    persist([...folders, name], assignment);
    setNewFolder(""); setFolderError(""); setActiveFolder(name);
  };

  const removeFolder = (name: string) => {
    if (DEFAULT_FOLDERS.includes(name)) { setFolderError("Les dossiers par défaut ne peuvent pas être supprimés."); return; }
    const nextAssignment = Object.fromEntries(Object.entries(assignment).map(([id, folder]) => [id, folder === name ? "À étudier" : folder]));
    persist(folders.filter((entry) => entry !== name), nextAssignment);
    if (activeFolder === name) setActiveFolder("Tous");
    setFolderError("");
  };

  const assignTo = (propertyId: string, folder: string) => {
    const next = { ...assignment, [propertyId]: folder };
    persist(folders, next);
  };
  const visible = activeFolder === "Tous" ? favorites : favorites.filter((property) => (assignment[property.id] ?? "À étudier") === activeFolder);
  const countFor = (folder: string) => favorites.filter((property) => (assignment[property.id] ?? "À étudier") === folder).length;

  return <>
    <WorkspaceHeading eyebrow="Votre sélection" title="Favoris" description="Retrouvez les biens gardés de côté, rangez-les par dossier et reprenez la comparaison depuis leur fiche." actions={<Link href="/explorer" className={BUTTON_PRIMARY}>Explorer les biens<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} />
    {visitor.ready && favorites.length === 0 ? <EmptyPanel icon={Heart} title="Votre sélection est vide" description="Ajoutez un bien avec le bouton cœur depuis les résultats ou sa fiche. Vos favoris seront synchronisés dans le navigateur." action={<Link href="/explorer" className={BUTTON_PRIMARY}>Voir les biens<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} /> : <>
      <section className="rounded-card border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5" aria-label="Organiser les favoris"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-note font-semibold">Organiser ma sélection</p><p className="mt-1 text-caption text-muted">{favorites.length} bien{favorites.length === 1 ? "" : "s"} · dossiers privés à ce navigateur</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-homera-terracotta/[0.08] text-homera-terracotta"><FolderHeart className="h-5 w-5" aria-hidden="true" /></span></div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrer par dossier"><button type="button" role="tab" aria-selected={activeFolder === "Tous"} onClick={() => setActiveFolder("Tous")} className={`min-h-10 shrink-0 rounded-full border px-4 text-caption font-semibold ${activeFolder === "Tous" ? "border-homera-brown bg-homera-brown text-white" : "border-border text-muted hover:text-foreground"}`}>Tous · {favorites.length}</button>{folders.map((folder) => <span key={folder} className="inline-flex shrink-0 items-center rounded-full border border-border"><button type="button" role="tab" aria-selected={activeFolder === folder} onClick={() => setActiveFolder(folder)} className={`min-h-10 rounded-l-full px-4 text-caption font-semibold ${activeFolder === folder ? "bg-homera-terracotta/[0.08] text-homera-terracotta" : "text-muted hover:text-foreground"}`}>{folder} · {countFor(folder)}</button>{!DEFAULT_FOLDERS.includes(folder) && <button type="button" onClick={() => removeFolder(folder)} aria-label={`Supprimer le dossier ${folder}`} className="flex h-9 w-9 items-center justify-center rounded-r-full text-muted hover:text-error"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button>}</span>)}</div>
        <form onSubmit={createFolder} className="mt-4 flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="new-favorite-folder">Nom du nouveau dossier</label><input id="new-favorite-folder" value={newFolder} maxLength={32} onChange={(event) => setNewFolder(event.target.value)} placeholder="Créer un dossier (ex. Pour la famille)" className={`${INPUT_CLASS} sm:max-w-sm`} /><button type="submit" className={BUTTON_SECONDARY}><Plus className="h-4 w-4" aria-hidden="true" />Créer un dossier</button></form>
        {folderError && <p role="alert" className="mt-2 text-caption text-error">{folderError}</p>}
      </section>
      {!visible.length ? <div className="mt-5"><EmptyPanel icon={FolderHeart} title={`Le dossier « ${activeFolder} » est vide`} description="Déplacez un bien vers ce dossier depuis son menu sous la carte." action={<button type="button" onClick={() => setActiveFolder("Tous")} className={BUTTON_SECONDARY}>Voir tous les favoris</button>} /></div> : <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{visible.map((property) => <li key={property.id} className="flex min-w-0 flex-col gap-2"><PropertyCard property={property} layout="grid" /><label htmlFor={`folder-${property.id}`} className="text-caption font-semibold text-muted">Ranger dans</label><select id={`folder-${property.id}`} value={assignment[property.id] ?? "À étudier"} onChange={(event) => assignTo(property.id, event.target.value)} className={`${INPUT_CLASS} min-h-10 text-caption`} aria-label={`Ranger ${property.title}`}><option value="À étudier">À étudier</option>{folders.filter((folder) => folder !== "À étudier").map((folder) => <option key={folder} value={folder}>{folder}</option>)}</select></li>)}</ul>}
    </>}
    <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><p className="text-caption text-muted">Comparer des biens : disponible dans une prochaine phase.</p><button type="button" disabled className="min-h-10 cursor-not-allowed rounded-btn bg-surface-hover px-3 text-caption font-semibold text-muted opacity-65">Comparer · bientôt</button></div>
    <div className="mt-5"><DemoNotice>Les favoris sont partagés avec la page publique /favoris. Leur classement est lié à ce compte dans ce navigateur; rien n’est envoyé au serveur.</DemoNotice></div>
  </>;
}

function isProperty(value: Property | undefined): value is Property { return Boolean(value); }
