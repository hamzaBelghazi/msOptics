import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "./Reveal";

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  href,
  linkLabel,
  align = "center",
}) {
  const centered = align === "center";
  return (
    <Reveal className={`mb-10 md:mb-14 ${centered ? "text-center" : "text-left"}`}>
      {eyebrow && (
        <span className={`eyebrow mb-4 ${centered ? "justify-center" : ""}`}>
          {eyebrow}
        </span>
      )}
      <h2 className="mt-3">
        {title} {/* title may contain gradient spans */}
      </h2>
      {subtitle && (
        <p className={`mt-3 max-w-2xl text-base md:text-lg ${centered ? "mx-auto" : ""}`}>
          {subtitle}
        </p>
      )}
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-primary hover:gap-3 transition-all"
        >
          {linkLabel || "View all"}
          <ArrowRight size={16} />
        </Link>
      )}
    </Reveal>
  );
}
