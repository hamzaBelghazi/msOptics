import Link from "next/link";
import { useTranslation } from "react-i18next";


export default function FAQSection() {
  const { t } = useTranslation();
  const shortFaqs = []
  for (const key in t("faq.items", { returnObjects: true })) {
    if (Object.hasOwnProperty.call(t("faq.items", { returnObjects: true }), key)) { 
        shortFaqs.push(t("faq.items", { returnObjects: true })[key])
    }
}
  return (
    <div className="py-12 bg-bacground/80">
      <h2 className="text-3xl font-bold text-center mb-8">
       {t("faq.title")}
      </h2>
      <div className="max-w-2xl mx-auto px-4">
        {shortFaqs.slice(0, 2).map((faq) => (
          <div key={faq.id} className="mb-4 border-b pb-4">
            <h3 className="text-xl font-semibold">{faq.question}</h3>
            <p className="text-gray-400 mt-2">{faq.answer}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-center">
      <Link href="/inside/faq" className="text-blue-600 hover:underline text-center self-center">
        {t("faq.view_more")}
      </Link>
      </div>
    </div>
  );
}
