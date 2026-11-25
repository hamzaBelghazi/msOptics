import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { LogoMark } from "../ui/Logo";
import { adminApi } from "@/Api/adminApi";
import {
  LayoutDashboard,
  Images,
  Users,
  ShoppingBag,
  Glasses,
  Aperture,
  Tags,
  Layers,
  Megaphone,
  FileText,
  Watch,
  Mail,
  MailCheck,
  Code2,
  Wallet,
  Menu as MenuIcon,
  Wand2,
  X,
} from "lucide-react";

// Grouped so the growing dashboard stays scannable.
const NAV = [
  {
    label: null,
    items: [
      { href: "/superAdmin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Store",
    items: [
      { href: "/superAdmin/orders", label: "Orders", icon: ShoppingBag, badge: "pending" },
      { href: "/superAdmin/payments", label: "Payments & Sign-in", icon: Wallet },
      { href: "/superAdmin/mail", label: "Email", icon: MailCheck },
      { href: "/superAdmin/users", label: "Users", icon: Users },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/superAdmin/products", label: "Products", icon: Glasses },
      { href: "/superAdmin/lenses", label: "Lenses", icon: Aperture },
      { href: "/superAdmin/categories", label: "Categories", icon: Tags },
      { href: "/superAdmin/collections", label: "Collections", icon: Layers },
      { href: "/superAdmin/accessories", label: "Accessories", icon: Watch },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/superAdmin/menus", label: "Menus", icon: MenuIcon },
      { href: "/superAdmin/banners", label: "Banners", icon: Images },
      { href: "/superAdmin/announces", label: "Announcements", icon: Megaphone },
      { href: "/superAdmin/pages", label: "Pages", icon: FileText },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/superAdmin/studio", label: "Try-On Studio", icon: Wand2 },
      { href: "/superAdmin/scripts", label: "Scripts", icon: Code2 },
      { href: "/superAdmin/contacts", label: "Contacts", icon: Mail },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  const router = useRouter();
  const [pending, setPending] = useState(0);

  // How many orders still need attention. Refreshed on every page change, when
  // the orders table saves something, and when the tab regains focus.
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      adminApi.orders
        .pendingCount()
        .then((count) => {
          if (alive) setPending(count);
        })
        .catch(() => {});
    };
    refresh();
    window.addEventListener("admin:orders-changed", refresh);
    window.addEventListener("focus", refresh);
    // a new order can land while the admin sits on one page
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("admin:orders-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [router.pathname]);

  const isActive = (item) =>
    item.exact
      ? router.pathname === item.href
      : router.pathname === item.href ||
        router.pathname.startsWith(item.href + "/");

  return (
    <>
      {/* mobile overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        className={`fixed lg:sticky top-0 lg:top-0 z-40 h-screen w-64 shrink-0 bg-card-background border-r border-border flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-border">
          <Link
            href="/superAdmin"
            className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-text-primary"
          >
            <LogoMark size={36} />
            msOptics <span className="text-gradient">admin</span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-text-secondary hover:bg-background"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {NAV.map((group, gi) => {
            const items = group.items.filter((i) => !i.hidden);
            if (!items.length) return null;
            return (
              <div key={group.label || `group-${gi}`} className={gi ? "mt-4" : ""}>
                {group.label && (
                  <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted/80">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? "bg-primary text-white shadow-sm"
                            : "text-text-secondary hover:bg-background hover:text-text-primary"
                        }`}
                      >
                        <Icon
                          size={18}
                          className={
                            active
                              ? "shrink-0"
                              : "shrink-0 text-text-muted group-hover:text-text-primary transition-colors"
                          }
                        />
                        <span className="truncate">{item.label}</span>
                        {item.badge === "pending" && pending > 0 && (
                          <span
                            title={`${pending} pending order${pending === 1 ? "" : "s"}`}
                            className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums ${
                              active
                                ? "bg-white/25 text-white"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {pending > 99 ? "99+" : pending}
                            <span className="sr-only">
                              {" "}
                              pending order{pending === 1 ? "" : "s"}
                            </span>
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <Link
            href="/"
            className="block text-center text-xs text-text-muted hover:text-primary"
          >
            ← Back to shop
          </Link>
        </div>
      </aside>
    </>
  );
}
