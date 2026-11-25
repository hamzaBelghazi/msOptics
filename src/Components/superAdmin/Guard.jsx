import { useContext, useEffect } from "react";
import { useRouter } from "next/router";
import { AuthContext } from "@/Components/Context/AuthContext";
import Spinner from "@/Components/Spinner/Spinner";

// Client-side gate for the superAdmin area.
// Allows users whose role is admin or superAdmin.
export default function SuperAdminGuard({ children }) {
  const router = useRouter();
  const { isLoggedIn, user, authLoading } = useContext(AuthContext);

  const role = user?.role || "client";
  const allowed = role === "admin" || role === "superAdmin";

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.replace(`/superAdmin/login?next=${router.asPath}`);
    } else if (!allowed) {
      router.replace("/");
    }
  }, [authLoading, isLoggedIn, allowed, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Spinner />
      </div>
    );
  }

  if (!isLoggedIn || !allowed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Spinner />
      </div>
    );
  }

  return children;
}
