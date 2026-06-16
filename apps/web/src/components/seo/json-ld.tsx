import { SITE_URL } from "@/lib/i18n/config";

const ORG_ID = `${SITE_URL}/#organization`;

const organization = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: "Soundril",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
};

const website = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Soundril",
  url: SITE_URL,
  publisher: { "@id": ORG_ID },
};

function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Organization + WebSite — rendered once in the root layout (all pages).
export function SiteJsonLd() {
  return (
    <JsonLd data={{ "@context": "https://schema.org", "@graph": [organization, website] }} />
  );
}

// SoftwareApplication — rendered on the landing page only.
export function SoftwareAppJsonLd({ description }: { description: string }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Soundril",
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          "Vocal removal and instrumental (MR) extraction",
          "Synchronized lyrics (LRC) generation",
          "Audio key and pitch shifting",
        ],
        publisher: { "@id": ORG_ID },
      }}
    />
  );
}
