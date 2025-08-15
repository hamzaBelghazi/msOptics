import { useContext, useEffect, useState } from "react";
import Head from "next/head";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/router";

import { LoadingContext } from "../Context/LoadContext";
import Spinner from "../Spinner/Spinner";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import BackToTopButton from "../utils/backToTop";

export default function Layout({ children, announcement, title }) {
  const { loading, setLoading } = useContext(LoadingContext);
  const { t } = useTranslation();
  const [scripts, setScripts] = useState([]);
  const router = useRouter();

  // Show spinner only during route transitions
  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleDone = () => setLoading(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError', handleDone);
    // Ensure initial render isn't blocked by spinner
    setLoading(false);
    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError', handleDone);
    };
  }, [router.events, setLoading]);

  // Fetch enabled scripts for header/footer injection
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/scripts/get-enabled`);
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data.scripts) ? data.scripts : [];
        if (!ignore) setScripts(list);
      } catch (e) {
        // silent fail to avoid breaking layout
      }
    })();
    return () => { ignore = true; };
  }, []);

  // Reconcile and inject scripts so they actually execute, with dedupe and cleanup
  useEffect(() => {
    if (!Array.isArray(scripts) || typeof window === 'undefined') return;

    const makeId = (s) => `msoptics-script-${s._id}`;

    const reconcile = (placement) => {
      const desired = scripts.filter(s => s.enabled && s.placement === placement);
      const target = placement === 'header' ? document.head : document.body;
      if (!target) return;

      // Remove stale managed scripts for this placement
      const managed = Array.from(target.querySelectorAll('script[data-msoptics="true"][data-placement="' + placement + '"]'));
      const desiredIds = new Set(desired.map(makeId));
      for (const el of managed) {
        if (!desiredIds.has(el.id)) {
          el.parentNode && el.parentNode.removeChild(el);
        }
      }

      // Add or refresh desired scripts
      for (const s of desired) {
        const id = makeId(s);
        const existing = document.getElementById(id);
        const needsCreate = !existing || (existing && existing.getAttribute('data-hash') !== String(s.content?.length || 0));
        if (needsCreate) {
          // If exists, remove first to allow re-execution
          if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

          // Simple guard: skip scripts that contain obvious redirect patterns
          const content = s.content || '';
          if (/window\.location|location\s*\.|document\.location|href\s*=/.test(content)) {
            console.warn('[MsOptics] Skipping potentially redirecting script:', s.name || s._id);
            continue;
          }

          const el = document.createElement('script');
          el.type = 'text/javascript';
          el.id = id;
          el.setAttribute('data-msoptics', 'true');
          el.setAttribute('data-placement', placement);
          el.setAttribute('data-name', s.name || '');
          el.setAttribute('data-hash', String(s.content?.length || 0));
          // Use text to ensure execution on append
          el.text = content;
          target.appendChild(el);
        }
      }
    };

    reconcile('header');
    reconcile('footer');
  }, []);

  if (loading) {
    return <Spinner />;
  }

  const pageTitle = title ? `${title} | MHS Optics` : "MHS Optics";

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Head>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content="MHS Optics - Your trusted partner for premium eyewear and optical solutions."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header announcement={announcement} />
      <main className="flex-grow">{children}</main>

      <BackToTopButton />
      {/* Ensure Footer is always at the bottom */}
      <Footer />
    </div>
  );
}

// export const getServerSideProps = async ({ locale }) => ({
//   props: {
//     ...(await serverSideTranslations(locale, ["header"])),
//   },
// });
