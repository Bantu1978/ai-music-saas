"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "./AuthModal";

interface HeaderProps {
  isAuthOpen?: boolean;
  setIsAuthOpen?: (open: boolean) => void;
}

export default function Header({ isAuthOpen: externalAuthOpen, setIsAuthOpen: externalSetAuthOpen }: HeaderProps) {
  const [internalAuthOpen, setInternalAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; credits: number } | null>(null);

  const supabase = createClient();
  const pathname = usePathname();
  const currentLocale = pathname?.startsWith("/fr") ? "fr" : "en";

  // Utilise la propriété externe si elle existe, sinon utilise l'état interne
  const isAuthOpen = externalAuthOpen !== undefined ? externalAuthOpen : internalAuthOpen;
  const setIsAuthOpen = externalSetAuthOpen || setInternalAuthOpen;

  useEffect(() => {
    const getUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, credits")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
    };

    getUserProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, credits")
          .eq("id", currentUser.id)
          .single();
        setProfile(data);
      } else {
        setProfile(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  return (
    <>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}