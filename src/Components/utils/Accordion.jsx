import { useState } from "react";

export default function Accordion({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left py-4 px-6 flex justify-between items-center focus:outline-none hover:bg-card-background/50 transition-colors"
      >
        <h3 className="text-lg font-medium text-text-primary">{question}</h3>
        <svg
          className={`w-5 h-5 transform transition-transform text-text-secondary ${
            isOpen ? "rotate-180" : ""
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div
        className={`${isOpen ? "block" : "hidden"} px-6 pb-4 text-text-secondary`}
      >
        <p>{answer}</p>
      </div>
    </div>
  );
}
