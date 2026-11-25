import { useContext, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Menu, LogOut } from "lucide-react";
import { AuthContext } from "@/Components/Context/AuthContext";
import Sidebar from "./Sidebar";
import Guard from "./Guard";

function Shell({ children, title }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/superAdmin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <Head>
        <title>{title ? `${title} | msOptics admin` : "msOptics admin"}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="flex min-h-screen">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-20 h-16 bg-card-background border-b border-border flex items-center gap-3 px-4">
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden p-2 rounded-md text-text-secondary hover:bg-background"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-lg font-bold text-text-primary truncate">
                {title || "Dashboard"}
              </h1>
            </div>
            <span className="hidden sm:inline text-sm text-text-secondary">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-gradient-to-r from-primary to-gold text-white font-bold uppercase tracking-wider">
              {user?.role || "admin"}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-md text-text-secondary hover:bg-background hover:text-red-500"
              title="Log out"
            >
              <LogOut size={18} />
            </button>
          </header>
          <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
          <footer className="py-4 text-center text-xs text-text-muted">
            © designed and coded by Hamza belghazi
          </footer>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminLayout({ children, title }) {
  return (
    <Guard>
      <Shell title={title}>{children}</Shell>
    </Guard>
  );
}
