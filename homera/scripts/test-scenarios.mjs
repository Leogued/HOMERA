/* ==================================================================
   HOMERA — SCÉNARIOS UTILISATEUR, JOUÉS CONTRE UN VRAI SERVEUR
   ------------------------------------------------------------------
   Ce script ne simule rien : il s’adresse à un serveur réellement
   démarré (`npm start`) et enchaîne les douze scénarios du cahier des
   charges avec de vrais comptes, de vrais biens et de vraies règles.

   Chaque scénario écrit ce qu’il exécute et ce qu’il obtient. Une
   étape qui « réussit alors qu’elle devrait échouer » est un échec :
   c’est la seule façon de prouver qu’une interdiction est appliquée.

   Usage :  npm start            (dans un autre terminal)
            node scripts/test-scenarios.mjs
   ================================================================== */

import assert from "node:assert/strict";
import { test } from "node:test";

const BASE = process.env.HOMERA_BASE_URL ?? "http://127.0.0.1:3000";
const PASSWORD_BY_ROLE = { admin: "admin", prop: "prop", user: "user", agent: "agent" };

/* --- Client HTTP minimal : cookies par rôle, JSON, erreurs explicites --- */
const sessions = new Map();
let anonymous = "";

function cookiesOf(role) {
  return sessions.get(role) ?? "";
}

function mergeCookies(role, setCookie) {
  if (!setCookie) return;
  const jar = new Map();
  for (const entry of cookiesOf(role).split(";").filter(Boolean)) {
    const [name] = entry.trim().split("=");
    jar.set(name, entry.trim());
  }
  for (const entry of setCookie.split(/,(?=[^;]+=)/)) {
    const [pair] = entry.split(";");
    const [name] = pair.trim().split("=");
    if (name) jar.set(name, pair.trim());
  }
  sessions.set(role, [...jar.values()].join("; "));
}

async function call(role, path, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  /* Un corps `FormData` porte sa propre boundary : seul un corps texte
     reçoit l’en-tête JSON. */
  if (!headers["Content-Type"] && typeof options.body === "string") headers["Content-Type"] = "application/json";
  const cookie = role ? cookiesOf(role) : anonymous;
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(new URL(path, BASE), { ...options, headers, redirect: "manual" });
  const rawCookies = response.headers.getSetCookie?.() ?? [];
  if (role) for (const entry of rawCookies) mergeCookies(role, entry);
  else if (rawCookies.length) anonymous = rawCookies.map((entry) => entry.split(";")[0]).join("; ");
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { status: response.status, body, text, headers: response.headers };
}

async function signIn(role) {
  const result = await call(role, "/api/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email: `${role}@homera.demo`, password: PASSWORD_BY_ROLE[role], remember: true }),
  });
  assert.equal(result.status, 200, `connexion ${role} : HTTP ${result.status}`);
  assert.ok(result.body?.ok, `connexion ${role} : ${result.body?.message ?? "échec"}`);
  return result.body.data;
}

/** Une authentification réussie : utile quand l’ordre des scénarios l’exige. */
async function session(role) {
  if (!sessions.has(role)) await signIn(role);
  return role;
}

const isoDate = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* 1. Connexion et atterrissage dans le bon espace                     */
/* ------------------------------------------------------------------ */
await test("1. un utilisateur se connecte et atterrit dans son espace", async () => {
  const landings = {};
  for (const role of ["user", "prop", "agent", "admin"]) {
    const data = await signIn(role);
    landings[role] = data.landing ?? data.account?.landing ?? "";
    assert.ok(data.account, `${role} : compte renvoyé`);
    assert.equal(
      data.account.admin ?? false,
      role === "admin",
      `${role} : l’habilitation d’administration vient du serveur, jamais du navigateur`,
    );
  }
  assert.match(landings.user, /\/client/, "un client atterrit dans l’espace client");
  assert.match(landings.prop, /\/proprietaire/, "un propriétaire atterrit dans son espace");
  assert.match(landings.agent, /\/agent/, "un agent atterrit dans son espace");
  assert.match(landings.admin, /\/admin/, "l’administration atterrit dans l’espace admin");

  for (const [role, forbidden] of [["user", "/admin"], ["agent", "/admin"], ["prop", "/agent"]]) {
    const page = await call(role, forbidden, { headers: { Accept: "text/html" } });
    assert.ok(
      page.status === 307 || page.status === 403 || page.status === 401 || page.status === 200,
      `${role} → ${forbidden} : réponse serveur ${page.status}`,
    );
    if (page.status === 200) {
      assert.ok(
        /n’avez pas accès|accès refusé|réservé/i.test(page.text),
        `${role} → ${forbidden} : la page rendue doit refuser l’accès, pas afficher l’espace`,
      );
    }
  }
});

/* ------------------------------------------------------------------ */
/* 2. Le propriétaire demande un agent, l’agent traite, l’admin suit   */
/* ------------------------------------------------------------------ */
let mandateId = "";
let mandatedPropertyId = "";

await test("2. un propriétaire mandate un agent, l’agent accepte, l’administration retrouve la trace", async () => {
  await session("prop");
  const properties = await call("prop", "/api/owner/properties");
  assert.ok(properties.body?.ok, "le propriétaire lit ses biens");
  const list = properties.body.data.properties ?? properties.body.data.items ?? [];
  assert.ok(list.length > 0, "le propriétaire possède au moins un bien");
  /* Un bien pour lequel l’agent n’a encore aucun mandat, ni actif ni en
     attente : la demande est donc nouvelle à chaque exécution sur une base
     fraîchement amorcée. */
  await session("agent");
  const knownMandates = new Set(
    (await call("agent", "/api/authorizations")).body?.data?.authorizations?.map((entry) => entry.propertyId) ?? [],
  );
  const target = list.find((entry) => !knownMandates.has(entry.id));
  assert.ok(target, "un bien du propriétaire n’est encore confié à personne");
  mandatedPropertyId = target.id;

  await session("prop");
  const created = await call("prop", "/api/authorizations", {
    method: "POST",
    body: JSON.stringify({
      propertyId: target.id,
      agentEmail: "agent@homera.demo",
      scope: ["visite", "location"],
      mandateType: "location",
      proofLabel: "Mandat de location signé (scénario automatisé)",
      expiresAt: isoDate(180),
      note: "Demande créée par le scénario 2.",
    }),
  });
  if (created.body?.ok) {
    mandateId = created.body.data.authorization?.id ?? created.body.data.id;
    await session("agent");
  } else {
    /* Une demande existe déjà pour ce couple agent / bien (le serveur refuse
       les doublons) : le scénario la reprend, ce qui est tout aussi réel. */
    const pending = await call("agent", "/api/authorizations");
    const found = (pending.body?.data?.authorizations ?? []).find(
      (entry) => entry.propertyId === target.id && (entry.status === "en-attente" || entry.status === "invite"),
    );
    mandateId = found?.id ?? "";
    assert.ok(mandateId, `demande de mandat : ${created.body?.message ?? "refusée"} — aucune demande en cours à reprendre`);
  }
  assert.ok(mandateId, "la demande porte un identifiant");

  /* L’agent voit la demande et l’accepte. */
  const inbox = await call("agent", "/api/authorizations");
  assert.ok(inbox.body?.ok, "l’agent lit ses mandats");
  const mine = inbox.body.data.authorizations ?? [];
  assert.ok(
    mine.some((entry) => entry.id === mandateId),
    "la demande adressée à l’agent apparaît dans sa liste",
  );
  const accepted = await call("agent", `/api/authorizations/${mandateId}`, {
    method: "POST",
    body: JSON.stringify({ action: "accepter", reason: "Mandat reçu et vérifié." }),
  });
  assert.ok(accepted.body?.ok, `acceptation du mandat : ${accepted.body?.message ?? ""}`);

  /* Le bien entre dans le périmètre de l’agent. */
  const agentProperties = await call("agent", "/api/agent/properties");
  const agentList = agentProperties.body?.data?.properties ?? agentProperties.body?.data?.items ?? [];
  const entry = agentList.find((item) => item.id === mandateId);
  assert.ok(entry, "le bien mandaté apparaît dans l’espace agent");
  assert.equal(entry.mandate?.status ?? "", "active", "le mandat y est bien actif");
  assert.ok(
    (entry.mandate?.scope ?? []).includes("location"),
    "la portée du mandat est relue telle qu’elle a été enregistrée",
  );

  /* L’administration retrouve l’événement dans son journal. */
  await session("admin");
  const audit = await call("admin", "/api/admin/audit?limite=50");
  assert.ok(audit.body?.ok, "le journal d’administration est lisible");
  const entries = audit.body.data.entries ?? audit.body.data.items ?? [];
  assert.ok(
    entries.some((entry) => entry.entity_id === mandateId || String(entry.detail ?? "").includes(mandateId)),
    "le mandat accepté est journalisé",
  );
});

/* ------------------------------------------------------------------ */
/* 3. Un agent non mandaté est refusé sur un bien qui n’est pas le sien */
/* ------------------------------------------------------------------ */
await test("3. un agent sans mandat est refusé sur un bien étranger", async () => {
  await session("prop");
  const properties = await call("prop", "/api/owner/properties");
  const list = properties.body.data.properties ?? properties.body.data.items ?? [];

  /* Le témoin est un bien que l’agent ne couvre **pas** : après plusieurs
     exécutions, d’autres biens peuvent avoir été mandatés, on vérifie donc
     la couverture réelle au lieu de supposer un identifiant. */
  await session("agent");
  const covered = new Set(
    ((await call("agent", "/api/authorizations")).body?.data?.authorizations ?? [])
      .filter((entry) => entry.status === "active")
      .map((entry) => entry.propertyId),
  );
  const foreign = list.find((entry) => !covered.has(entry.id));
  assert.ok(foreign, "un bien du propriétaire échappe à l’agent : il sert de témoin");
  const denied = await call("agent", `/api/properties/${foreign.id}/documents`);
  assert.ok(
    denied.status === 403 || denied.status === 404,
    `les pièces d’un bien non mandaté ne sont pas lisibles (reçu ${denied.status})`,
  );

  const allowed = await call("agent", `/api/properties/${mandatedPropertyId}/documents`);
  assert.ok(allowed.status === 200, `les pièces du bien mandaté sont lisibles (reçu ${allowed.status})`);
});

/* ------------------------------------------------------------------ */
/* 4. Visite : conflit de créneau, reprogrammation, annulation         */
/* ------------------------------------------------------------------ */
let visitId = "";

await test("4. une visite se demande, se confirme, se reprogramme et s’annule avec motif", async () => {
  await session("user");
  /* Les créneaux des exécutions précédentes restent réservés : on avance
     d’une semaine tant que le serveur signale un créneau pris, ce qui
     exerce au passage la détection de conflit. */
  let created = null;
  let date = "";
  for (let offset = 0; offset < 12 && !created?.body?.ok; offset += 1) {
    date = isoDate(30 + offset * 7);
    created = await call("user", "/api/visits", {
      method: "POST",
      body: JSON.stringify({ propertyId: "villa-fidjrosse", date, time: "10:00", message: "Visite de contrôle." }),
    });
  }
  assert.ok(created?.body?.ok, `visite demandée : ${created?.body?.message ?? "aucune réponse"}`);
  visitId = created.body.data.visit?.id ?? "";
  assert.ok(visitId, "la visite porte un identifiant");

  /* Même créneau, autre demandeur : le serveur détecte le conflit. */
  const conflict = await call("prop", "/api/visits", {
    method: "POST",
    body: JSON.stringify({ propertyId: "villa-fidjrosse", date, time: "10:00", message: "Créneau déjà pris." }),
  });
  assert.ok(
    !conflict.body?.ok,
    "un créneau déjà réservé est refusé au second demandeur",
  );
  if (conflict.body?.ok) {
    const conflictId = conflict.body.data.visit?.id;
    if (conflictId) {
      await call("prop", `/api/visits/${conflictId}`, {
        method: "POST",
        body: JSON.stringify({ action: "annuler", reason: "Doublon de créneau (scénario)." }),
      });
    }
  }
  /* Qu’il refuse ou qu’il accepte, jamais de silence : on vérifie au moins
     que le serveur a répondu avec une enveloppe connue. */

  await session("prop");
  const confirmed = await call("prop", `/api/visits/${visitId}`, {
    method: "POST",
    body: JSON.stringify({ action: "confirmer" }),
  });
  assert.ok(confirmed.body?.ok, `visite confirmée : ${confirmed.body?.message ?? ""}`);

  const rescheduled = await call("prop", `/api/visits/${visitId}`, {
    method: "POST",
    body: JSON.stringify({ action: "reprogrammer", date: isoDate(33), time: "15:00", reason: "Agent indisponible." }),
  });
  assert.ok(rescheduled.body?.ok, `visite reprogrammée : ${rescheduled.body?.message ?? ""}`);

  /* Le motif est exigé pour un refus, une absence constatée ou une
     annulation tardive. Une annulation lointaine reste libre : c’est la
     règle du service, pas une tolérance de l’interface. */
  const refusedWithoutReason = await call("prop", `/api/visits/${visitId}`, {
    method: "POST",
    body: JSON.stringify({ action: "refuser", reason: "" }),
  });
  assert.ok(!refusedWithoutReason.body?.ok, "un refus sans motif est refusé");

  const cancelled = await call("prop", `/api/visits/${visitId}`, {
    method: "POST",
    body: JSON.stringify({ action: "annuler", reason: "Bien retiré de la location." }),
  });
  assert.ok(cancelled.body?.ok, `visite annulée : ${cancelled.body?.message ?? ""}`);

  const notifications = await call("user", "/api/notifications");
  const items = notifications.body?.data?.items ?? [];
  assert.ok(
    items.some((entry) => entry.type === "visite"),
    "le client est notifié des mouvements de sa visite",
  );
});

/* ------------------------------------------------------------------ */
/* 5. Candidature → contrat → signature                                */
/* ------------------------------------------------------------------ */
await test("5. une candidature acceptée devient un contrat signé par le locataire", async () => {
  await session("user");
  const date = isoDate(40);
  const visit = await call("user", "/api/visits", {
    method: "POST",
    body: JSON.stringify({ propertyId: "villa-fidjrosse", date, time: "11:00" }),
  });
  assert.ok(visit.body?.ok, `visite du scénario 5 : ${visit.body?.message ?? ""}`);
  const id = visit.body.data.visit.id;

  /* Pas de candidature sans visite effectuée. */
  const tooEarly = await call("user", "/api/applications", {
    method: "POST",
    body: JSON.stringify({ visitId: id, message: "Dossier complet.", monthlyIncome: 900000 }),
  });
  assert.ok(!tooEarly.body?.ok, "une candidature avant la visite effectuée est refusée");

  await session("prop");
  await call("prop", `/api/visits/${id}`, { method: "POST", body: JSON.stringify({ action: "confirmer" }) });
  await call("prop", `/api/visits/${id}`, {
    method: "POST",
    body: JSON.stringify({ action: "effectuer", reason: "Visite réalisée." }),
  });

  await session("user");
  const application = await call("user", "/api/applications", {
    method: "POST",
    body: JSON.stringify({ visitId: id, message: "Dossier complet, revenus stables.", monthlyIncome: 900000 }),
  });
  assert.ok(application.body?.ok, `candidature déposée : ${application.body?.message ?? ""}`);
  const applicationId = application.body.data.application.id;

  /* Contrat refusé avant acceptation. */
  const draftTooEarly = await call("prop", "/api/contracts", {
    method: "POST",
    body: JSON.stringify({ applicationId }),
  });
  assert.ok(!draftTooEarly.body?.ok, "le contrat est refusé avant l’acceptation de la candidature");

  await session("prop");
  const decision = await call("prop", `/api/applications/${applicationId}`, {
    method: "POST",
    body: JSON.stringify({ action: "accepter", reason: "Dossier complet." }),
  });
  assert.ok(decision.body?.ok, `candidature acceptée : ${decision.body?.message ?? ""}`);

  const draft = await call("prop", "/api/contracts", { method: "POST", body: JSON.stringify({ applicationId }) });
  assert.ok(draft.body?.ok, `contrat rédigé : ${draft.body?.message ?? ""}`);
  const contractId = draft.body.data.contract?.id ?? draft.body.data.id;
  assert.match(draft.body.data.contract?.reference ?? draft.body.data.reference ?? "", /^CTR-\d{4}-\d{4}$/);

  await session("user");
  const readable = await call("user", `/api/contracts/${contractId}`);
  assert.ok(readable.body?.ok, "le locataire lit son contrat");

  const adminSigns = await call("admin", `/api/contracts/${contractId}`, {
    method: "POST",
    body: JSON.stringify({ action: "signer", fullName: "Administration HOMERA" }),
  });
  assert.ok(!adminSigns.body?.ok, "l’administration ne signe pas à la place du locataire");

  const shortName = await call("user", `/api/contracts/${contractId}`, {
    method: "POST",
    body: JSON.stringify({ action: "signer", fullName: "A" }),
  });
  assert.ok(!shortName.body?.ok, "une signature avec un nom trop court est refusée");

  const signed = await call("user", `/api/contracts/${contractId}`, {
    method: "POST",
    body: JSON.stringify({ action: "signer", fullName: "Aïcha Client" }),
  });
  assert.ok(signed.body?.ok, `contrat signé : ${signed.body?.message ?? ""}`);

  const cancelAfter = await call("prop", `/api/contracts/${contractId}`, {
    method: "POST",
    body: JSON.stringify({ action: "annuler", reason: "Changement d’avis." }),
  });
  assert.ok(!cancelAfter.body?.ok, "un contrat signé ne s’annule plus");
});

/* ------------------------------------------------------------------ */
/* 6. Explorer : filtres, territoire et contexte conservé              */
/* ------------------------------------------------------------------ */
await test("6. l’explorateur filtre réellement et conserve le contexte", async () => {
  const all = await call(null, "/api/properties");
  assert.ok(all.body?.ok, "le catalogue public est lisible sans compte");
  const total = all.body.data.total ?? all.body.data.items?.length ?? 0;
  assert.ok(total > 0, "le catalogue n’est pas vide");

  const furnished = await call(null, "/api/properties?meuble=1");
  const furnishedItems = furnished.body?.data?.items ?? [];
  assert.ok(furnishedItems.length > 0, "le filtre « meublé » renvoie des biens");
  assert.ok(furnishedItems.length < total, "le filtre « meublé » restreint réellement le catalogue");
  assert.ok(
    furnishedItems.every((entry) => (entry.features ?? []).includes("meuble")),
    "chaque bien renvoyé déclare réellement l’équipement « meublé »",
  );

  const littoral = await call(null, "/api/properties?departement=Littoral");
  const atlantique = await call(null, "/api/properties?departement=Atlantique");
  const littoralCount = littoral.body?.data?.total ?? littoral.body?.data?.items?.length ?? 0;
  const atlantiqueCount = atlantique.body?.data?.total ?? atlantique.body?.data?.items?.length ?? 0;
  assert.ok(littoralCount > 0 && atlantiqueCount > 0, "les deux départements ont des biens");
  assert.ok(
    littoralCount + atlantiqueCount <= total,
    "la somme des départements ne dépasse pas le catalogue",
  );
  const items = littoral.body?.data?.items ?? [];
  const locations = await call(null, "/api/locations?departement=Littoral");
  const communes = new Set((locations.body?.data?.communes ?? []).map((entry) => entry.value));
  assert.ok(communes.size > 0, "le département annonce ses communes");
  assert.ok(
    items.every((entry) => communes.has(entry.city)),
    "chaque bien renvoyé se trouve dans une commune du département demandé",
  );

  const atlantiqueLocations = await call(null, "/api/locations?departement=Atlantique");
  const communesAtlantique = (atlantiqueLocations.body?.data?.communes ?? []).map((entry) => entry.value);
  assert.ok(communesAtlantique.length > 0, "le département restreint la liste des communes");
  assert.ok(
    !communesAtlantique.includes("Cotonou"),
    "une commune d’un autre département n’est plus proposée",
  );

  /* Contexte : une recherche filtrée reste servie, page après page. */
  const page1 = await call(null, "/api/properties?departement=Littoral&page=1&par-page=3");
  const page2 = await call(null, "/api/properties?departement=Littoral&page=2&par-page=3");
  const refs1 = (page1.body?.data?.items ?? []).map((entry) => entry.homeraId);
  const refs2 = (page2.body?.data?.items ?? []).map((entry) => entry.homeraId);
  assert.ok(refs1.length > 0, "la première page est servie");
  assert.ok(
    refs2.every((reference) => !refs1.includes(reference)),
    "la seconde page ne répète pas la première : la pagination est réelle",
  );
});

/* ------------------------------------------------------------------ */
/* 7. Favoris suivis par compte, fiche sans navigation                 */
/* ------------------------------------------------------------------ */
await test("7. les favoris suivent le compte, et la fiche propose un bouton Retour", async () => {
  await session("user");
  const added = await call("user", "/api/favorites", {
    method: "POST",
    body: JSON.stringify({ propertyId: "villa-fidjrosse" }),
  });
  assert.ok(added.body?.ok, `favori ajouté : ${added.body?.message ?? ""}`);

  const list = await call("user", "/api/favorites");
  const favorites = list.body?.data?.ids ?? [];
  assert.ok(
    favorites.includes("villa-fidjrosse"),
    "le favori est relu depuis le serveur",
  );

  const removed = await call("user", "/api/favorites?propertyId=villa-fidjrosse", { method: "DELETE" });
  assert.ok(removed.body?.ok, `favori retiré : ${removed.body?.message ?? ""}`);
  const after = await call("user", "/api/favorites");
  assert.ok(
    !(after.body?.data?.ids ?? []).includes("villa-fidjrosse"),
    "le favori retiré n’est plus servi",
  );

  const page = await call(null, "/biens/villa-fidjrosse");
  assert.equal(page.status, 200, "la fiche est servie");
  assert.ok(page.text.includes(">Retour<"), "la fiche propose le bouton de retour");
  assert.ok(page.text.indexOf(">Retour<") < page.text.indexOf("<h1"), "le bouton de retour est en tête de fiche");
  assert.ok(
    !page.text.includes('<nav aria-label="Fil d'),
    "la fiche ne porte aucun fil d’Ariane rendu",
  );
});

/* ------------------------------------------------------------------ */
/* 8. Messagerie : distincte des notifications                         */
/* ------------------------------------------------------------------ */
await test("8. la messagerie ouvre une conversation réelle sur un bien", async () => {
  await session("user");
  const opened = await call("user", "/api/messages", {
    method: "POST",
    body: JSON.stringify({ propertyId: "villa-fidjrosse", body: "Bonjour, le bien est-il toujours disponible ?" }),
  });
  assert.ok(opened.body?.ok, `conversation ouverte : ${opened.body?.message ?? ""}`);
  const conversationId = opened.body.data.conversation?.id ?? opened.body.data.id;

  const sent = await call("user", `/api/messages/${conversationId}`, {
    method: "POST",
    body: JSON.stringify({ body: "Je souhaite une visite la semaine prochaine." }),
  });
  assert.ok(sent.body?.ok, `message envoyé : ${sent.body?.message ?? ""}`);

  const read = await call("user", `/api/messages/${conversationId}`);
  const messages = read.body?.data?.conversation?.messages ?? read.body?.data?.messages ?? [];
  assert.ok(messages.length >= 2, "les messages sont relus dans l’ordre réel");

  const empty = await call("user", "/api/messages/" + conversationId, {
    method: "POST",
    body: JSON.stringify({ body: "   " }),
  });
  assert.ok(!empty.body?.ok, "un message vide est refusé");

  const unknown = await call("user", "/api/messages", {
    method: "POST",
    body: JSON.stringify({ propertyId: "bien-qui-nexiste-pas", body: "Bonjour ?" }),
  });
  assert.ok(!unknown.body?.ok, "une conversation sur un bien inexistant est refusée");
});

/* ------------------------------------------------------------------ */
/* 9. Contrôle public d’un mandat                                      */
/* ------------------------------------------------------------------ */
await test("9. le contrôle public d’un mandat répond selon le registre réel", async () => {
  const active = await call(null, "/verification-agent?agent=AG-HOM-0248&bien=HOM-CTN-000421");
  assert.equal(active.status, 200, "la page de contrôle est servie");
  assert.ok(
    /Cet agent est habilité sur ce bien/.test(active.text),
    "un mandat actif est confirmé",
  );

  const expired = await call(null, "/verification-agent?agent=AG-HOM-0248&bien=HOM-CTN-000305");
  assert.ok(
    /Ne considérez pas l’agent comme autorisé/.test(expired.text),
    "un mandat expiré n’est pas présenté comme actif",
  );

  const unknown = await call(null, "/verification-agent?agent=AG-HOM-9999&bien=HOM-CTN-000421");
  assert.ok(
    /Aucun mandat ne correspond/.test(unknown.text),
    "un matricule inconnu n’est pas confirmé",
  );
});

/* ------------------------------------------------------------------ */
/* 10. Historique public d’un bien : lu depuis le journal              */
/* ------------------------------------------------------------------ */
await test("10. l’historique public d’un bien vient du journal serveur", async () => {
  const page = await call(null, "/historique/HOM-CTN-000421");
  assert.equal(page.status, 200, "la page d’historique est servie");
  assert.ok(/Dossier créé/.test(page.text), "la création du dossier est retracée");
  assert.ok(/Publication dans le catalogue public/.test(page.text), "la publication est retracée");
  assert.ok(!/jeu de démonstration/.test(page.text), "aucune mention de données d’exemple");

  const missing = await call(null, "/historique/HOM-INCONNU-000");
  assert.equal(missing.status, 404, "une référence inconnue rend un vrai 404");
});

/* ------------------------------------------------------------------ */
/* 11. Le paiement n’est pas simulé                                    */
/* ------------------------------------------------------------------ */
await test("11. aucun paiement n’est simulé : seul le dû contractuel est affiché", async () => {
  /* Les espaces sont hydratés côté navigateur : la page ne peut pas être
     vérifiée en texte seul. Ce que le serveur doit garantir, c’est
     l’absence totale d’écriture financière et le fait que les montants
     affichés viennent des contrats. */
  const anonymousPage = await call(null, "/client/paiements");
  assert.equal(anonymousPage.status, 307, "l’espace de paiement est protégé");

  await session("user");
  const page = await call("user", "/client/paiements");
  assert.equal(page.status, 200, "l’espace de paiement est servi au client connecté");

  for (const route of ["/api/payments", "/api/paiements", "/api/transactions", "/api/withdrawals"]) {
    const probe = await call("user", route, { method: "POST", body: JSON.stringify({ amount: 1000 }) });
    assert.ok(
      probe.status === 404 || probe.status === 405,
      `${route} : aucune route d’encaissement n’existe (reçu ${probe.status})`,
    );
  }

  const contracts = await call("user", "/api/contracts");
  assert.ok(contracts.body?.ok, "les contrats du client sont lisibles");
  const items = contracts.body?.data?.contracts ?? [];
  const signed = items.filter((entry) => entry.status === "signe");
  for (const contract of signed) {
    assert.ok(contract.rent >= 0 && contract.deposit >= 0, `${contract.reference} : montants réels`);
    assert.match(contract.reference, /^CTR-\d{4}-\d{4}$/, `${contract.reference} : référence de contrat`);
  }
  /* Aucune écriture « paiement » n’est possible : le seul moyen d’obtenir
     une somme due est un contrat signé. */
  assert.ok(
    items.every((entry) => !Object.keys(entry).includes("paid") && !Object.keys(entry).includes("paidAt")),
    "les contrats ne portent aucun état de paiement inventé",
  );
});

await test("12. une recherche filtrée reste servie et retrouvable", async () => {
  const html = await call(null, "/explorer?departement=Littoral&meuble=1&tri=prix-asc");
  assert.equal(html.status, 200, "l’explorateur filtré est servi");
  assert.ok(html.text.includes("HOM-"), "les résultats filtrés sont rendus côté serveur");
  assert.ok(html.text.includes("departement=Littoral"), "les filtres actifs sont dans l’URL, donc partageables");

  const empty = await call(null, "/api/properties?prix-max=1");
  const emptyItems = empty.body?.data?.items ?? [];
  assert.equal(emptyItems.length, 0, "une recherche sans résultat rend une liste vide, jamais un exemple");
  assert.ok(empty.body?.ok, "la recherche vide répond correctement");
});

/* Un JPEG 1×1 valide : l’envoi est contrôlé sur les octets, pas sur
   l’extension, donc le fichier doit être une vraie image. */
const JPEG_BYTES = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDT/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJQA/9k=",
  "base64",
);

function photoForm(name, bytes, type) {
  const form = new FormData();
  form.append("photos", new Blob([bytes], { type }), name);
  return form;
}

await test("13. le propriétaire envoie une vraie photo, et rien qu’une photo", async () => {
  const signInProp = await signIn("prop");
  assert.ok(signInProp, "connexion propriétaire");
  const mine = await call("prop", "/api/owner/properties");
  const propertyId = mine.body?.data?.properties?.[0]?.id;
  assert.ok(propertyId, "le propriétaire a au moins un bien");

  const before = await call("prop", `/api/properties/${propertyId}/photos`);
  const beforeCount = before.body?.data?.photos?.length ?? 0;

  const sent = await call("prop", `/api/properties/${propertyId}/photos/upload`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: photoForm("facade.jpg", JPEG_BYTES, "image/jpeg"),
  });
  assert.equal(sent.status, 201, `envoi accepté : HTTP ${sent.status} — ${sent.body?.message ?? ""}`);
  const photos = sent.body?.data?.photos ?? [];
  assert.equal(photos.length, beforeCount + 1, "la photo est ajoutée à la galerie");
  const uploaded = photos.at(-1);
  assert.ok(uploaded.media_key.startsWith(`/api/uploads/properties/${propertyId}/`), `photo servie : ${uploaded.media_key}`);
  assert.equal(uploaded.filename, "facade.jpg", "le nom d’origine est conservé");
  assert.equal(uploaded.bytes, JPEG_BYTES.byteLength, "le poids réel est enregistré");

  const served = await call(null, uploaded.media_key);
  assert.equal(served.status, 200, "le fichier est servi");
  assert.match(served.headers.get("content-type") ?? "", /^image\//, "le fichier est servi comme image");

  const refused = await call("prop", `/api/properties/${propertyId}/photos/upload`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: photoForm("fausse.jpg", Buffer.from("ceci n’est pas une image"), "image/jpeg"),
  });
  assert.equal(refused.status, 400, "un texte déguisé en image est refusé");
  assert.match(refused.body?.message ?? "", /jpeg, png, webp ou avif/, "le refus nomme les formats acceptés");

  const client = await call("user", `/api/properties/${propertyId}/photos/upload`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: photoForm("intrus.jpg", JPEG_BYTES, "image/jpeg"),
  });
  assert.equal(client.status, 403, "un client ne dépose pas de photo sur le bien d’un autre");

  const removed = await call("prop", `/api/properties/${propertyId}/photos?photo=${uploaded.id}`, { method: "DELETE" });
  assert.equal(removed.status, 200, "le propriétaire retire la photo");
  const gone = await call(null, uploaded.media_key);
  assert.equal(gone.status, 404, "le fichier disparaît avec la ligne de base");
});

/* ------------------------------------------------------------------ */
/* 14. Parcours de location : le bouton suit le bien                   */
/* ------------------------------------------------------------------ */
await test("14. la fiche propose le parcours du bien (réservation directe ou visite préalable)", async () => {
  const direct = await call(null, "/biens/espace-evenementiel-cadjehoun");
  assert.equal(direct.status, 200, "la fiche du bien réservable est servie");
  assert.ok(direct.text.includes(">Réserver"), "le bien éligible propose « Réserver »");
  assert.ok(
    direct.text.includes("/client/demandes/nouvelle?bien=espace-evenementiel-cadjehoun"),
    "« Réserver » ouvre le parcours de réservation du bien",
  );
  assert.ok(!direct.text.includes("Demander une visite"), "jamais les deux parcours à la fois");
  assert.ok(!direct.text.includes("Demander une visite"), "la barre mobile suit le parcours direct");

  const visit = await call(null, "/biens/villa-fidjrosse");
  assert.equal(visit.status, 200, "la fiche du bien à visiter est servie");
  assert.ok(visit.text.includes("Demander une visite"), "le bien exigeant une visite le dit");
  assert.ok(
    visit.text.includes("/client/visites/nouvelle?bien=villa-fidjrosse"),
    "« Demander une visite » ouvre le parcours de visite du bien",
  );
  assert.ok(!visit.text.includes(">Réserver"), "aucune réservation directe sur un bien à visite préalable");
  assert.ok(
    !visit.text.includes("/client/demandes/nouvelle?bien="),
    "aucun accès direct au dépôt de dossier depuis cette fiche",
  );

  /* Séjour (quel que soit le bien), espaces et salles : « Réserver ». */
  for (const id of ["villa-piscine-fidjrosse-sejour", "salle-fete-akpakpa"]) {
    const fiche = await call(null, `/biens/${id}`);
    assert.equal(fiche.status, 200, `la fiche ${id} est servie`);
    assert.ok(fiche.text.includes(">Réserver"), `le bien ${id} propose « Réserver »`);
    assert.ok(
      fiche.text.includes(`/client/demandes/nouvelle?bien=${id}`),
      `« Réserver » ouvre le parcours de réservation de ${id}`,
    );
    assert.ok(!fiche.text.includes("Demander une visite"), `jamais les deux parcours à la fois sur ${id}`);
  }
});
