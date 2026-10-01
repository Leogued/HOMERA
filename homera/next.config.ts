import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev uniquement : origines autorisées à charger le JS du serveur de dev (HMR, hydratation).
  // Sans ça, la page s'affiche mais rien n'est cliquable (menu hamburger, bouton thème...).
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.*.*", // réseau local (Wi-Fi / box)
    "10.*.*.*", // réseau local
    "172.*.*.*", // réseau local / WSL / Docker
    "169.254.*.*", // adresse lien-local (carte virtuelle Windows / APIPA)
    "*.e2b.app", // preview Arena
  ],

  /* ------------------------------------------------------------------
     IMAGES — performance d’abord
     ------------------------------------------------------------------
     • qualités autorisées : HOMERA n’en utilise que quelques-unes (62 à
       75 selon la taille d’affichage réelle du visuel) ;
     • AVIF puis WebP : le navigateur reçoit le format le plus léger qu’il
       sait décoder, sinon le JPEG d’origine ;
     • cache long : les visuels sont immuables (nom de fichier stable).
     Toutes les images sont déjà serviables en JPEG progressif optimisé
     (voir scripts/build-images.mjs), l’optimisation à la volée ajoute la
     bonne largeur et le bon format.
     ------------------------------------------------------------------ */
  images: {
    qualities: [62, 68, 70, 72, 74, 75],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
