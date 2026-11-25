import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, X } from "lucide-react";
import { tField } from "../utils/tField";

function Announcement({ ann }) {
  const { t, i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isClosed, setIsClosed] = useState(false);

  const announcements = Array.isArray(ann) ? ann : [ann];

  useEffect(() => {
    const closedAnnouncements = localStorage.getItem("closedAnnouncements");
    if (!closedAnnouncements)
      localStorage.setItem("closedAnnouncements", JSON.stringify([]));
    if (closedAnnouncements) {
      const closedIds = JSON.parse(closedAnnouncements);
      if (
        announcements?.every((a) => {
          const id = a?._id || a?.id || a?.announceText;
          return closedIds.includes(id);
        })
      ) {
        setIsClosed(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (announcements?.length <= 1 || isClosed) return;
    const fadeInterval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((i) => (i + 1) % announcements.length);
        setIsVisible(true);
      }, 450);
    }, 5000);
    return () => clearInterval(fadeInterval);
  }, [announcements?.length, isClosed]);

  const handleClose = () => {
    setIsClosed(true);
    const closed = localStorage.getItem("closedAnnouncements");
    const closedIds = closed ? JSON.parse(closed) : [];
    const next = [
      ...new Set([
        ...closedIds,
        ...announcements.map((a) => a?._id || a?.id || a?.announceText),
      ]),
    ];
    localStorage.setItem("closedAnnouncements", JSON.stringify(next));
  };

  if (!announcements?.length || !announcements[0] || isClosed) return null;

  return (
    <div className="relative overflow-hidden bg-[#171310] dark:bg-black text-[#F3E7CF] border-b border-gold/30">
      <div className="aurora w-56 h-16 -left-10 -top-8 bg-gold/25 animate-aurora" />
      <div className="relative container mx-auto px-4 h-10 flex items-center justify-between gap-3">
        <Sparkles size={15} className="text-gold shrink-0" />
        <div
          className={`flex-1 text-center text-[11px] md:text-[13px] font-semibold tracking-[0.22em] uppercase transition-opacity duration-500 truncate ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {tField(announcements[currentIndex], "announceText", i18n.language) || t("announcement")}
        </div>
        <button
          onClick={handleClose}
          aria-label="Close announcement"
          className="text-[#F3E7CF]/60 hover:text-gold transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

export default Announcement;
