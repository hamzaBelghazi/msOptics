import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowRight, MessageCircleQuestion } from "lucide-react";
import SectionHeading from "@/Components/ui/SectionHeading";
import Reveal from "@/Components/ui/Reveal";

export default function FAQSection() {
  const { t } = useTranslation();
  const items = t("faq.items", { returnObjects: true });
  const shortFaqs = items && typeof items === "object" ? Object.values(items) : [];

  return (
    <div className="container mx-auto px-4">
      <SectionHeading
        eyebrow={t("faq.eyebrow", "Good to know")}
        title={t("faq.title")}
        href="/inside/faq"
        linkLabel={t("faq.view_more")}
      />
      <div className="max-w-3xl mx-auto space-y-4">
        {shortFaqs.slice(0, 3).map((faq, i) => (
          <Reveal key={faq.question || i} delay={i * 0.08}>
            <div className="glass-card p-5 md:p-6 flex gap-4">
              <span className="grid place-items-center w-11 h-11 rounded-2xl bg-primary/10 text-primary shrink-0">
                <MessageCircleQuestion size={20} />
              </span>
              <div>
                <h3 className="font-bold text-text-primary">{faq.question}</h3>
                <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">{faq.answer}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      <div className="flex justify-center mt-8">
        <Link href="/inside/faq" className="btn-glass text-sm">
          {t("faq.view_more")} <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
