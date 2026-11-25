import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Glasses, Bookmark } from "lucide-react";
import SuperAdminLayout from "@/Components/superAdmin/SuperAdminLayout";
import { PageHeader, Card } from "@/Components/superAdmin/ui";
import { adminApi } from "@/Api/adminApi";

function StatCard({ icon: Icon, label, value, href }) {
  return (
    <Link href={href}>
      <Card className="p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
        <span className="p-3 rounded-xl bg-primary/10 text-primary">
          <Icon size={26} />
        </span>
        <span>
          <span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
            {label}
          </span>
          <span className="block text-3xl font-extrabold text-text-primary">
            {value}
          </span>
        </span>
      </Card>
    </Link>
  );
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .stats()
      .then(setStats)
      .catch((e) => setError(e.response?.data?.message || "Failed to load stats"));
  }, []);

  return (
    <SuperAdminLayout title="Dashboard">
      <PageHeader title="Dashboard" subtitle="Store overview" />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label="Users"
          value={stats?.usersCount ?? "—"}
          href="/superAdmin/users"
        />
        <StatCard
          icon={Glasses}
          label="Products"
          value={stats?.productsCount ?? "—"}
          href="/superAdmin/products"
        />
        <StatCard
          icon={Bookmark}
          label="Orders"
          value={stats?.ordersCount ?? "—"}
          href="/superAdmin/orders"
        />
      </div>
    </SuperAdminLayout>
  );
}
