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
    "*.e2b.app", // preview Arena
  ],
};

export default nextConfig;
