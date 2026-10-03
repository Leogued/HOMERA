"use client";
import { useMemo, useState } from "react";
import { Mail, Send } from "lucide-react";
import { SERVICES } from "@/lib/content";
import { TextRoll } from "@/components/ui/TextRoll";
/* ================================================================== HOMERA — FORMULAIRE DE CONTACT ------------------------------------------------------------------ Aucun serveur ne reçoit encore de message : le formulaire compose donc un e-mail complet (sujet, référence du bien, projet, message) et l’ouvre dans le client de messagerie du visiteur. Rien n’est simulé, rien ne disparaît dans le vide — et le texte le dit. ================================================================== */ const PROJECTS =
  ["Acheter", "Louer", "Séjour", "Gestion d’un bien", "Autre demande"];
export function ContactForm({
  defaultReference = "",
  defaultSubject = "",
}: {
  defaultReference?: string;
  defaultSubject?: string;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [project, setProject] = useState(PROJECTS[0]);
  const [city, setCity] = useState("");
  const [reference, setReference] = useState(defaultReference);
  const [message, setMessage] = useState("");
  const mailto = useMemo(() => {
    const subject = defaultSubject
      ? `HOMERA — ${defaultSubject}`
      : reference
        ? `HOMERA — demande sur le bien ${reference}`
        : `HOMERA — ${project}`;
    const body = [
      `Nom : ${name || "—"}`,
      `Contact : ${contact || "—"}`,
      `Projet : ${project}`,
      `Commune recherchée : ${city || "—"}`,
      `Référence du bien : ${reference || "—"}`,
      "",
      message || "(votre message)",
      "",
      "— Envoyé depuis la page Contact de homera.",
    ].join("\n");
    return `mailto:contact@homera.bj?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [city, contact, defaultSubject, message, name, project, reference]);
  const fieldClass =
    "h-11 w-full rounded-input border border-border bg-card px-3.5 text-body-sm text-foreground outline-none transition-colors placeholder:text-muted-light focus:border-homera-terracotta/60";
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        window.location.href = mailto;
      }}
    >
      {" "}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {" "}
        <div>
          {" "}
          <label htmlFor="contact-nom" className="mb-1.5 block text-note font-medium text-foreground">
            Votre nom
          </label>{" "}
          <input
            id="contact-nom"
            name="nom"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
            placeholder="Nom et prénom"
            autoComplete="name"
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label htmlFor="contact-coordonnees" className="mb-1.5 block text-note font-medium text-foreground">
            Téléphone ou e-mail
          </label>{" "}
          <input
            id="contact-coordonnees"
            name="contact"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            className={fieldClass}
            placeholder="+229 … ou vous@exemple.com"
            autoComplete="email"
          />{" "}
        </div>{" "}
      </div>{" "}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {" "}
        <div>
          {" "}
          <label htmlFor="contact-projet" className="mb-1.5 block text-note font-medium text-foreground">
            Votre projet
          </label>{" "}
          <select
            id="contact-projet"
            name="projet"
            value={project}
            onChange={(event) => setProject(event.target.value)}
            className={fieldClass}
          >
            {" "}
            {PROJECTS.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}{" "}
            {SERVICES.map((service) => (
              <option key={service.id} value={service.title}>
                {service.title}
              </option>
            ))}{" "}
          </select>{" "}
        </div>{" "}
        <div>
          {" "}
          <label htmlFor="contact-commune" className="mb-1.5 block text-note font-medium text-foreground">
            Commune concernée
          </label>{" "}
          <input
            id="contact-commune"
            name="commune"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className={fieldClass}
            placeholder="Cotonou, Abomey-Calavi…"
          />{" "}
        </div>{" "}
      </div>{" "}
      <div>
        {" "}
        <label htmlFor="contact-reference" className="mb-1.5 block text-note font-medium text-foreground">
          Référence d’un bien (facultatif)
        </label>{" "}
        <input
          id="contact-reference"
          name="reference"
          value={reference}
          onChange={(event) => setReference(event.target.value.toUpperCase())}
          className={`${fieldClass} font-mono`}
          placeholder="HOM-CTN-000421"
        />{" "}
        <p className="mt-1.5 text-caption text-muted">
          {" "}
          La référence figure sur chaque fiche : elle permet de retrouver le dossier exact, sans ambiguïté.{" "}
        </p>{" "}
      </div>{" "}
      <div>
        {" "}
        <label htmlFor="contact-message" className="mb-1.5 block text-note font-medium text-foreground">
          Votre message
        </label>{" "}
        <textarea
          id="contact-message"
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={6}
          className="w-full rounded-input border border-border bg-card px-3.5 py-3 text-body-sm text-foreground outline-none transition-colors placeholder:text-muted-light focus:border-homera-terracotta/60"
          placeholder="Décrivez votre besoin : type de bien, délai, budget, questions sur une fiche…"
        />{" "}
      </div>{" "}
      <div className="flex flex-wrap items-center gap-4">
        {" "}
        <button
          type="submit"
          className="homera-press inline-flex min-h-12 items-center gap-2 rounded-btn homera-cta px-5 text-body-sm font-medium text-white transition-colors "
        >
          {" "}
          <Send className="h-4 w-4" aria-hidden="true" /> <TextRoll>Ouvrir l’e-mail</TextRoll>{" "}
        </button>{" "}
        <p className="text-caption leading-relaxed text-muted">
          {" "}
          Le bouton ouvre votre logiciel de messagerie avec un message prérempli — vous gardez la main jusqu’à
          l’envoi.{" "}
        </p>{" "}
      </div>{" "}
      <p className="flex items-start gap-2 rounded-2xl border border-border bg-card/60 px-4 py-3 text-caption leading-relaxed text-muted">
        {" "}
        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-homera-terracotta" aria-hidden="true" /> Aucun envoi
        automatique n’a lieu depuis cette page : ni base de données, ni accusé de réception. Tant que l’espace
        connecté n’est pas ouvert, les échanges se poursuivent par e-mail et par téléphone.{" "}
      </p>{" "}
    </form>
  );
}
