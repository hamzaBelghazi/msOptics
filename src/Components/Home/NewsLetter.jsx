export default function NewsletterSignup() {
  return (
    <section
      className="py-16 bg-card-background border-t border-border text-text-primary text-center"
      style={{ backgroundImage: "url('/newsletter-bg.jpg')" }}
    >
      <h2 className="text-4xl font-bold mb-4">Stay Updated</h2>
      <p className="text-xl mb-8 text-text-secondary">
        Subscribe to our newsletter for the latest news and offers.
      </p>
      <form className="flex justify-center">
        <input
          type="email"
          placeholder="Enter your email"
          className="px-4 py-2 rounded-l-full focus:outline-none text-text-primary bg-input-background border border-input-border focus:border-primary"
        />
        <button
          type="submit"
          className="bg-primary text-button-text px-6 py-2 rounded-r-full hover:bg-primary-hover transition-all"
        >
          Subscribe
        </button>
      </form>
    </section>
  );
}
