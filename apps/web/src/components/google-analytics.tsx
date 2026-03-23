"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function GoogleAnalytics() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    setConsented(localStorage.getItem("cookie-consent") === "accepted");

    const handleStorage = () => {
      setConsented(localStorage.getItem("cookie-consent") === "accepted");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // localStorage 변경을 같은 탭에서도 감지
  useEffect(() => {
    const interval = setInterval(() => {
      const current = localStorage.getItem("cookie-consent") === "accepted";
      if (current !== consented) setConsented(current);
    }, 1000);
    return () => clearInterval(interval);
  }, [consented]);

  if (!GA_ID || !consented) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
