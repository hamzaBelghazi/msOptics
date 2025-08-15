import React, { useState, useEffect, use } from "react";
import { useTranslation } from "react-i18next";
import { AnnouncementOutlined, Close as TimesIcon } from "@mui/icons-material";

function Announcement({ ann }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isClosed, setIsClosed] = useState(false);

  const announcements = Array.isArray(ann) ? ann : [ann];

  useEffect(() => {
    // Check if announcements were previously closed
    const closedAnnouncements = localStorage.getItem("closedAnnouncements");
    if (!closedAnnouncements)
      localStorage.setItem("closedAnnouncements", JSON.stringify([]));
    if (closedAnnouncements) {
      const closedIds = JSON.parse(closedAnnouncements);
      // If all current announcements were previously closed, set isClosed to true
      if (
        announcements?.every((ann) => {
          const announcementId = ann?._id || ann?.id || ann?.announceText;
          return closedIds.includes(announcementId);
        })
      ) {
        setIsClosed(true);
      }
    }
  }, [announcements]);

  useEffect(() => {
    if (announcements?.length <= 1 || isClosed) return;

    const fadeInterval = setInterval(() => {
      setIsVisible(false);

      // Wait for fade out animation to complete
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % announcements.length);
        setIsVisible(true);
      }, 500);
    }, 5000);

    return () => clearInterval(fadeInterval);
  }, [announcements?.length, isClosed]);

  const handleClose = () => {
    setIsClosed(true);
    // Store closed announcement IDs in localStorage
    const closedAnnouncements = localStorage.getItem("closedAnnouncements");
    const closedIds = closedAnnouncements
      ? JSON.parse(closedAnnouncements)
      : [];
    const newClosedIds = [
      ...new Set([
        ...closedIds,
        ...announcements.map((ann) => ann?._id || ann?.id || ann?.announceText),
      ]),
    ];
    localStorage.setItem("closedAnnouncements", JSON.stringify(newClosedIds));
  };

  if (!announcements?.length || !announcements[0] || isClosed) return null;

  return (
    <div
      className="announcement-bar flex justify-between items-center h-10 bg-gradient-to-r from-card-background via-primary/10 to-card-background w-full shadow-lg px-4 border-b border-border"
      style={{
        textShadow: "1px 1px 3px rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(10px)",
      }}
    >
      <AnnouncementOutlined className="w-3 md:w-5 text-primary" />
      <div
        className={`text-center flex-grow text-xs md:text-lg xl:text-xl animate-pulse text-text-primary font-medium tracking-wide transition-opacity duration-1000 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {announcements[currentIndex]?.announceText || t("announcement")}
      </div>
      <button
        className="text-text-secondary hover:text-primary focus:outline-none ml-4 transition-colors duration-200"
        onClick={handleClose}
        aria-label="Close announcement"
      >
        <TimesIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

export default Announcement;
