import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Send, BadgeCheck } from "lucide-react";
import Reveal from "@/Components/ui/Reveal";

export default function NewsletterSignup() {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);

  return (
    <section className="container mx-auto px-4">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] bg-[#141210] dark:bg-black text-white px-6 py-14 md:p-16 text-center shadow-xl">
          <div className="aurora w-[380px] h-[380px] -left-24 -top-24 bg-primary/30 animate-aurora" />
          <div className="aurora w-[320px] h-[320px] -right-20 -bottom-24 bg-gold/30 animate-aurora" />
          <div className="relative max-w-2xl mx-auto">
            <span className="eyebrow justify-center !text-gold-soft">Newsletter</span>
            <h2 className="text-white mt-3">Stay in focus</h2>
            <p className="text-white/70 mt-3">
              {t("newsletter.subtitle", "New drops, private offers and eye-care tips — once a month, no noise.")}
            </p>
            {done ? (
              <p className="mt-8 inline-flex items-center gap-2 glass !bg-white/10 !border-white/20 rounded-full px-6 py-3 text-sm font-semibold text-white">
                <BadgeCheck size={17} className="text-emerald-400" />
                {t("newsletter.done", "You're on the list. Welcome to the maison.")}
              </p>
            ) : (
              <form
                className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
                onSubmit={(e) => { e.preventDefault(); setDone(true); }}
              >
                <label className="flex-1 flex items-center gap-2 glass !bg-white/10 !border-white/20 rounded-full px-5 py-3.5">
                  <Mail size={17} className="text-white/60 shrink-0" />
                  <input
                    type="email"
                    required
                    placeholder={t("newsletter.placeholder", "Enter your email")}
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
                  />
                </label>
                <button type="submit" className="btn-luxe shrink-0">
                  {t("newsletter.cta", "Subscribe")} <Send size={15} />
                </button>
              </form>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
