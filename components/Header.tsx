"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "./AuthModal";

interface HeaderProps {
  isAuthOpen?: boolean;
  setIsAuthOpen?: (open: boolean) => void;
}

export default function Header({ isAuthOpen: externalAuthOpen, setIsAuthOpen: externalSetAuthOpen }: HeaderProps) {
  const [internalAuthOpen, setInternalAuthOpen] = useState(false);
  const supabase = createClient();

  const isAuthOpen = externalAuthOpen !== undefined ? externalAuthOpen : internalAuthOpen;
  const setIsAuthOpen = externalSetAuthOpen || setInternalAuthOpen;

  return (
    <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
  );
}