import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { VisitorProvider } from "@/components/providers/VisitorProvider";
import "./globals.css"; /* --------------------------------------------------------------- TYPOGRAPHIE HOMERA — 4 rôles, 4 polices (voir app/globals.css) 1. Mot-symbole « HOMERA » → Script MT Bold (police système Windows / Office). Non chargeable : le secours web Cakecafe est déclaré en @font-face dans globals.css. Jamais utilisée ailleurs sur le site. 2. Navigation, boutons, textes → Manrope (variable 200–800) 3. Grands titres → DM Serif Display (400) 4. Accents éditoriaux → Cormorant Garamond Italic (variable 300–700) Les polices 2 à 4 sont auto-hébergées via next/font/local : sous-ensembles latin (accents français inclus) commités dans public/fonts/. Aucun réseau au build, aucun appel externe au navigateur, pas de layout shift. --------------------------------------------------------------- */ // Manrope — police principale : Regular (textes), Medium (menus, boutons),
// SemiBold (éléments importants). Grande hauteur d'x = très lisible sur mobile.
const manrope = localFont({
  src: "../public/fonts/Manrope-latin-wght.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  style: "normal",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial", "Helvetica", "sans-serif"],
  adjustFontFallback: "Arial",
}); // DM Serif Display — grands titres only. Un seul poids (400) : les
// titres n'affichent donc jamais de faux gras synthétique.
const dmSerif = localFont({
  src: "../public/fonts/DMSerifDisplay-latin-400.woff2",
  variable: "--font-dm-serif",
  weight: "400",
  style: "normal",
  display: "swap",
  fallback: ["Palatino Linotype", "Book Antiqua", "Palatino", "Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
}); // Cormorant Garamond Italic — accents éditoriaux, usage très limité.
const cormorant = localFont({
  src: "../public/fonts/CormorantGaramond-latin-wght-italic.woff2",
  variable: "--font-cormorant",
  weight: "300 700",
  style: "italic",
  display: "swap",
  fallback: ["Palatino Linotype", "Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});
export const metadata: Metadata = {
  title: "HOMERA — Plateforme Immobilière de Confiance au Bénin",
  description: "Plateforme immobilière de confiance au Bénin. Retrouvez des biens certifiés et sécurisés.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>
      {" "}
      <body className={`${manrope.variable} ${dmSerif.variable} ${cormorant.variable}`}>
        {" "}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {" "}
          <AuthProvider>
            {" "}
            <VisitorProvider>{children}</VisitorProvider>{" "}
          </AuthProvider>{" "}
        </ThemeProvider>{" "}
      </body>{" "}
    </html>
  );
}
