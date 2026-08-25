import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Link / useRouter / usePathname conscients de la locale : plus besoin de
// recoller le préfixe "/fr" ou "/en" à la main dans les composants.
export const { Link, useRouter, usePathname, redirect, getPathname } =
  createNavigation(routing);
