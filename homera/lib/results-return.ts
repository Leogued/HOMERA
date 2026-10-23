/* ==================================================================
   HOMERA — RETOUR VERS LA PAGE DE RÉSULTATS
   ------------------------------------------------------------------
   Un visiteur qui a filtré, trié et feuilleté plusieurs écrans ne doit
   pas perdre ce travail après avoir ouvert une fiche. L’explorateur
   (et chaque page de projet ou de catégorie) mémorise donc sa dernière
   adresse dans la session ; le bouton « Retour » de la fiche y ramène
   explicitement, filtres compris.

   Sécurité : on ne mémorise qu’un chemin relatif de page de résultats
   (`/explorer`, `/acheter`, `/louer`, `/sejour` et leurs catégories).
   Toute autre valeur — y compris une URL absolue injectée dans le
   stockage — est refusée à la lecture : aucune redirection ouverte.
   ================================================================== */

const STORAGE_KEY = "homera:last-results";

/** Pages de résultats HOMERA : l’explorateur, les projets, les catégories. */
const RESULTS_PATH = /^\/(explorer|acheter|louer|sejour)([/?#]|$)/;

function readableStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Mémorise l’adresse d’une page de résultats (ignorée sinon). */
export function rememberResultsPage(pathAndQuery: string): void {
  if (!RESULTS_PATH.test(pathAndQuery)) return;
  try {
    readableStorage()?.setItem(STORAGE_KEY, pathAndQuery);
  } catch {
    /* stockage indisponible : le repli (page du projet) s’applique */
  }
}

/** Relit la dernière page de résultats mémorisée, validée deux fois. */
export function takeResultsPage(): string | null {
  let stored: string | null = null;
  try {
    stored = readableStorage()?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
  if (!stored || !RESULTS_PATH.test(stored)) return null;
  return stored;
}
