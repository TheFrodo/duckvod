"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import useAuthStore from "@/app/store/useAuthStore";
import { env } from "next-runtime-env";

// ForceLogin component checks if the user is logged in and redirects to the login page if not
export default function ForceLogin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, isLoading } = useAuthStore();

  // legal pages must stay reachable without login
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/impressum" || pathname === "/datenschutz";

  const isForceLoginEnabled = env('NEXT_PUBLIC_REQUIRE_LOGIN')

  useEffect(() => {
    if (isForceLoginEnabled == "true" && !isLoading && !isLoggedIn && !isAuthPage) {
      router.replace("/login");
    }
  }, [isLoggedIn, isLoading, isAuthPage, router]);

  if (isForceLoginEnabled == "true" && !isAuthPage) {
    if (isLoading) return <div></div>;
    if (!isLoggedIn) return <div></div>;
  }

  return <>{children}</>;
}
