"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/Components/Context/currencyContext";
import { Facebook, Instagram, Twitter, LocalShipping, Shield, Refresh } from "@mui/icons-material";
import Logo from "../ui/Logo";

const Footer = () => {
  const { t } = useTranslation();
  const { format } = useCurrency();

  const footerLinks = [
    {
      title: t("footer.inside_mhsoptics"),
      links: [
        { name: t("footer.our_story"), href: "/inside/about" },
        { name: t("footer.contact_us"), href: "/inside/contact" },
        { name: t("footer.faq"), href: "/inside/faq" },
      ],
    },
    {
      title: t("footer.customer_service"),
      links: [
        { name: t("footer.shipping_policy"), href: "/inside/shipping" },
        { name: t("footer.returns_exchanges"), href: "/inside/returns" },
        { name: t("footer.warranty"), href: "/inside/warranty" },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { name: t("footer.privacy_policy"), href: "/inside/privacy" },
        { name: t("footer.terms_of_service"), href: "/inside/terms" },
        { name: t("footer.cookie_policy"), href: "/inside/cookies" },
      ],
    },
  ];

  const socials = [
    { href: "https://facebook.com", label: t("footer.social.facebook"), Icon: Facebook },
    { href: "https://instagram.com", label: t("footer.social.instagram"), Icon: Instagram },
    { href: "https://twitter.com", label: t("footer.social.twitter"), Icon: Twitter },
  ];

  return (
    <footer className="relative mt-20 overflow-hidden bg-[#141210] dark:bg-black text-[#EDE6D6]">
      {/* gold top line + glow */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
      <div className="aurora w-[500px] h-[300px] left-1/2 -translate-x-1/2 -top-40 bg-primary/20" />

      {/* trust strip */}
      <div className="relative border-b border-white/10">
        <div className="container mx-auto px-4 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {[
            { Icon: LocalShipping, text: t("footer.perks.shipping", { amount: format(99), defaultValue: "Free shipping over {{amount}}" }) },
            { Icon: Refresh, text: t("footer.perks.returns", "30-day easy returns") },
            { Icon: Shield, text: t("footer.perks.warranty", "2-year warranty included") },
          ].map(({ Icon, text }, i) => (
            <div key={i} className="flex items-center justify-center gap-2.5 text-[#EDE6D6]/80">
              <Icon className="!text-gold-soft" fontSize="small" />
              <span className="font-medium">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-5">
            <Link href="/" className="inline-block transition-transform hover:scale-[1.03]">
              <Logo size={44} tone="light" />
            </Link>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              {t("footer.description")}
            </p>
            <div className="flex gap-2.5">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid place-items-center w-10 h-10 rounded-full border border-white/15 bg-white/5 text-white/70 hover:text-white hover:border-gold/60 hover:bg-gold/10 hover:-translate-y-1 transition-all duration-300"
                >
                  <Icon fontSize="small" />
                </a>
              ))}
            </div>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title} className="space-y-4">
              <h3 className="text-sm font-bold tracking-[0.22em] uppercase text-gold-soft">
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white hover:pl-1.5 transition-all duration-300"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-7 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-xs">
            © {new Date().getFullYear()} MHS Optics. {t("footer.all_rights_reserved")}
          </p>
          <div className="flex gap-6 text-xs">
            <Link href="/inside/privacy" className="text-white/50 hover:text-gold-soft transition-colors">
              {t("footer.privacy_policy")}
            </Link>
            <Link href="/inside/terms" className="text-white/50 hover:text-gold-soft transition-colors">
              {t("footer.terms_of_service")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
