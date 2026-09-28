import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

/* ---------------------------------------------------------------
   Typographie du header — équivalents web des polices système.
   Perpetua, Script MT Bold et Brush Script MT n'existent que sur
   Windows / Office : sur Android, iOS, macOS et Linux le navigateur
   retombait sur une police serif / cursive quelconque.
   Ces deux polices prennent le relais UNIQUEMENT quand la police
   système est absente — le rendu Windows reste inchangé.
   Fichiers embarqués dans public/fonts/ (sous-ensemble latin, WOFF2) :
   le build ne dépend pas de Google Fonts et fonctionne hors ligne.
   --------------------------------------------------------------- */

// Perpetua → Cormorant Garamond (serif classique aux empattements fins,
// même petite hauteur d'x). Police variable : un seul fichier couvre 300–700.
const cormorant = localFont({
  src: "../public/fonts/CormorantGaramond-latin-wght.woff2",
  variable: "--font-cormorant",
  weight: "300 700",
  style: "normal",
  display: "swap",
});

// Brush Script MT → Yellowtail (script au pinceau, lié et penché).
const yellowtail = localFont({
  src: "../public/fonts/Yellowtail-latin.woff2",
  variable: "--font-yellowtail",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HOMERA — Plateforme Immobilière de Confiance au Bénin",
  description: "Plateforme immobilière de confiance au Bénin. Retrouvez des biens certifiés et sécurisés.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} ${cormorant.variable} ${yellowtail.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}