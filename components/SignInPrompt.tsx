"use client";

import { useState } from "react";
import AuthModal from "./AuthModal";

/**
 * État « non connecté » d'une page protégée : un message et un bouton qui
 * ouvre la fenêtre d'authentification, sans quitter la page.
 */
export default function SignInPrompt({ label }: { label: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30"
      >
        {label}
      </button>
      <AuthModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
