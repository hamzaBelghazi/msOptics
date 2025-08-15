"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Facebook, Instagram, Twitter } from "@mui/icons-material";

const Footer = () => {
  const { t } = useTranslation();

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

  return (
    <footer className="bg-card-background border-t border-card-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link href="/" className="text-2xl font-bold text-text-primary">
              MS Optics
            </Link>
            <p className="text-text-secondary">{t("footer.description")}</p>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-primary transition-colors"
                aria-label={t("footer.social.facebook")}
              >
                <Facebook />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-primary transition-colors"
                aria-label={t("footer.social.instagram")}
              >
                <Instagram />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-primary transition-colors"
                aria-label={t("footer.social.twitter")}
              >
                <Twitter />
              </a>
            </div>
          </div>

          {/* Links Sections */}
          {footerLinks.map((section) => (
            <div key={section.title} className="space-y-4">
              <h3 className="text-lg font-semibold text-text-primary">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-text-secondary hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-card-border">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-text-secondary text-sm">
              © {new Date().getFullYear()} MHS Optics.{" "}
              {t("footer.all_rights_reserved")}
            </p>
            <div className="flex space-x-6">
              <Link
                href="/inside/privacy"
                className="text-text-secondary hover:text-primary transition-colors text-sm"
              >
                {t("footer.privacy_policy")}
              </Link>
              <Link
                href="/inside/terms"
                className="text-text-secondary hover:text-primary transition-colors text-sm"
              >
                {t("footer.terms_of_service")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
