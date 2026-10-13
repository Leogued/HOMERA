"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";

/* ==================================================================
   HOMERA — « POSER UNE QUESTION » : UN SEUL BOUTON, DEUX CHEMINS RÉELS
   ------------------------------------------------------------------
   Un visiteur sans compte compose son message dans sa propre
   messagerie, avec la référence du bien déjà écrite (page /contact) :
   c’est réel, rien n’est promis à la place d’un envoi.

   Un utilisateur connecté ouvre une vraie conversation HOMERA, avec
   le propriétaire et l’agent mandaté, conservée et notifiée.

   Un seul bouton : jamais deux entrées concurrentes pour la même
   intention.
   ================================================================== */

export function AskQuestionLink({
  propertyId,
  reference,
  className,
  children,
}: {
  propertyId: string;
  reference: string;
  className: string;
  children: React.ReactNode;
}) {
  const { account } = useAuth();
  const href = account ? `/messages?bien=${propertyId}` : `/contact?bien=${reference}`;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
