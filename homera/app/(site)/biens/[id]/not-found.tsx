import { NotFoundView } from "@/components/layout/NotFoundView"; /* 404 du catalogue : la fiche demandée n’existe pas (ou plus). La coquille (site) fournit déjà l’en-tête, le main et le pied de page. */
export default function BienIntrouvable() { return <NotFoundView context="fiche" />;
}
