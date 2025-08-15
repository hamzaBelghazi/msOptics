import Link from "next/link";

const faqs = [
  {
    id: 1,
    question: "How do I place an order?",
    answer:
      "You can place an order directly on our website by adding products to your cart and proceeding to checkout.",
  },
  {
    id: 2,
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, PayPal, and Apple Pay.",
  },
];

export default function FAQSection() {
  return (
    <div className="py-12 bg-bacground/80 text-center">
      <h2 className="text-3xl font-bold text-center mb-8">
        Frequently Asked Questions
      </h2>
      <div className="max-w-2xl mx-auto px-4 text-left">
        {faqs.map((faq) => (
          <div key={faq.id} className="mb-4 border-b pb-4">
            <h3 className="text-xl font-semibold">{faq.question}</h3>
            <p className="text-gray-400 mt-2">{faq.answer}</p>
          </div>
        ))}
      </div>
      <Link href="/inside/faq" className="text-blue-600 hover:underline">
        Learn More →
      </Link>
    </div>
  );
}
