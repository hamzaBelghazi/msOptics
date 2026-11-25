import axios from "axios";
import { useState, useContext, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { AuthContext } from "@/Components/Context/AuthContext";
import { useToast } from "@/Components/Context/ToastContext";
import { inputCls, btnPrimary, labelCls, Spinner } from "@/Components/superAdmin/ui";
import { startAdminLoading, stopAdminLoading } from "@/Api/adminLoading";

export default function SuperAdminLogin() {
  const router = useRouter();
  const { isLoggedIn, user, login } = useContext(AuthContext);
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoggedIn && user) {
      const role = user.role || "client";
      if (role === "admin" || role === "superAdmin") {
        router.replace(router.query.next || "/superAdmin");
      }
    }
  }, [isLoggedIn, user, router]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    startAdminLoading();
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/login`,
        { email, password }
      );
      const u = res.data?.data?.user;
      const token = res.data?.token;
      const role = u?.role || "client";
      if (role !== "admin" && role !== "superAdmin") {
        setError("This account does not have admin access.");
        return;
      }
      login(u, token);
      addToast("Welcome back.", "success");
      router.replace(router.query.next || "/superAdmin");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setBusy(false);
      stopAdminLoading();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Head>
        <title>Admin login | msOptics</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-card-background border border-border rounded-xl p-6 shadow-md space-y-4"
      >
        <h1 className="text-xl font-extrabold text-text-primary text-center">
          msOptics <span className="text-primary">admin</span>
        </h1>
        <p className="text-center text-sm text-text-secondary">
          Sign in with a superAdmin account
        </p>
        <div>
          <span className={labelCls}>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <span className={labelCls}>Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className={btnPrimary + " w-full justify-center"}>
          {busy && <Spinner size={15} />}
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
