"use client";

import { useState, useEffect } from "react";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);
  };

  const decline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setShow(false);
    // GA 쿠키 삭제
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      if (name.startsWith("_ga")) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.soundril.com`;
      }
    });
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 rounded-xl border border-border/60 bg-card p-4 shadow-lg">
      <p className="text-sm text-muted-foreground">
        We use cookies for analytics to improve our service.
      </p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={accept}
          className="flex-1 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-8 transition-colors"
        >
          Accept
        </button>
        <button
          onClick={decline}
          className="flex-1 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-muted h-8 transition-colors"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
