"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
export function CopyReference({ value, targetId }: { value: string; targetId: string }) {
  const [feedback, setFeedback] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const copy = async () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setFeedback("Référence copiée.");
    } catch {
      // Aucun accès au presse-papiers : la référence reste réellement récupérable.
      const element = document.getElementById(targetId);
      if (element) {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setFeedback("Référence sélectionnée. Utilisez Copier dans votre navigateur, Ctrl+C ou Commande+C.");
    }
    timer.current = setTimeout(() => setFeedback(""), 3500);
  };
  const copied = feedback === "Référence copiée.";
  return (
    <>
      {" "}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? `Copié — recopier la référence ${value}` : `Copier la référence ${value}`}
        className="homera-accent-ink homera-press inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-current/25 px-3 text-caption font-medium"
        title="Copier la référence du bien"
      >
        {" "}
        {copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}{" "}
        <span className="inline-block w-11 text-left">{copied ? "Copié" : "Copier"}</span>{" "}
      </button>{" "}
      <span role="status" aria-live="polite" className="sr-only">
        {feedback}
      </span>{" "}
    </>
  );
}
