import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { INTENT_LABELS, TYPE_LABELS, formatFCFA } from "@/lib/format";
import {
  availabilityWindows, currentUnavailability, frenchDate, loadProperty, publicOwnerProfile, similarProperties,
} from "@/lib/server/services/properties";
import { getDb } from "@/lib/server/db/client";
import { PropertyDetail } from "@/components/catalog/PropertyDetail";
/* ==================================================================
   /biens/<identifiant> — LA FICHE PUBLIQUE D’UN BIEN
   ------------------------------------------------------------------
   La fiche est lue dans la base au moment de la requête : un bien
   publié, suspendu ou loué apparaît tel que le serveur le connaît,
   sans attendre un redéploiement. Les fiches connues à la construction
   sont pré-rendues pour le partage et l’indexation ; les autres sont
   rendues à la demande (`dynamicParams`), et une référence inconnue
   rend un vrai 404 décidé par le serveur.
   ================================================================== */

/* Rendu à la demande : un bien publié, suspendu ou loué apparaît tel que
   la base le connaît, sans délai de revalidation ni redéploiement. Une
   référence inconnue rend un vrai 404 (statut HTTP compris). */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const property = loadProperty(getDb(), id);
  if (!property) return { title: "Bien introuvable — HOMERA" };
  const place = `${property.district}, ${property.city}`;
  const price = `${formatFCFA(property.price)}${property.pricePeriod ? ` ${property.pricePeriod}` : ""}`;
  return {
    title: `${property.title} — ${place} | HOMERA`,
    description: `${TYPE_LABELS[property.type]} ${INTENT_LABELS[property.intent].toLowerCase()} à ${place} : ${price}, ${property.surface} m². Référence ${property.homeraId}, vérifiée le ${property.verifiedOn}.`,
    openGraph: {
      title: `${property.title} — HOMERA`,
      description: `${place} · ${price} · référence ${property.homeraId}`,
      type: "article",
      locale: "fr_BJ",
    },
  };
}
export default async function BienPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const property = loadProperty(db, id);
  if (!property) notFound();

  /* Tout ce que la fiche affiche au-delà du bien lui-même est lu en base :
     les biens comparables, les périodes d’indisponibilité déclarées et le
     profil public du propriétaire. Rien n’est déduit d’un fichier figé. */
  const similar = similarProperties(db, property, 3);
  const windows = availabilityWindows(db, property.id);
  const blocked = currentUnavailability(db, property.id);
  const ownerId = db
    .prepare<[string], { owner_id: string | null }>("SELECT owner_id FROM properties WHERE id = ?")
    .get(property.id)?.owner_id ?? null;
  const owner = publicOwnerProfile(db, ownerId);

  return (
    <PropertyDetail
      property={property}
      similar={similar}
      availability={{
        status: blocked.unavailable ? "indisponible" : (property.availabilityStatus ?? "disponible"),
        windows,
        note: blocked.unavailable
          ? blocked.until
            ? `Indisponible jusqu’au ${frenchDate(blocked.until)}${blocked.reason ? ` · ${blocked.reason}` : ""}.`
            : "Le propriétaire n’a pas précisé de date de retour."
          : "",
      }}
      owner={owner}
    />
  );
}
