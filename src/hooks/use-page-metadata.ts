import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const DEFAULT_DESCRIPTION =
  "Criclytics delivers live cricket scores, upcoming fixtures, completed results, full scorecards, and media in one production-grade match centre.";
const DEFAULT_KEYWORDS = [
  "live cricket score",
  "cricket fixtures",
  "cricket results",
  "cricket scorecard",
  "IPL live score",
  "cricket media",
  "Criclytics"
];

interface MetadataOptions {
  title: string;
  description?: string;
  image?: string;
  path?: string;
  type?: "website" | "article";
  keywords?: string[];
  robots?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>> | null;
}

export function usePageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  image = "/og-cover.svg",
  path,
  type = "website",
  keywords = DEFAULT_KEYWORDS,
  robots = "index, follow, max-image-preview:large",
  jsonLd = null
}: MetadataOptions) {
  const location = useLocation();

  useEffect(() => {
    const pageTitle = title.includes("Criclytics") ? title : `${title} | Criclytics`;
    const canonicalUrl = toAbsoluteUrl(path || location.pathname);
    const imageUrl = toAbsoluteUrl(image);

    document.title = pageTitle;

    upsertMeta("name", "description", description);
    upsertMeta("name", "keywords", keywords.join(", "));
    upsertMeta("name", "robots", robots);
    upsertMeta("name", "googlebot", robots);
    upsertMeta("name", "theme-color", "#08111f");
    upsertMeta("name", "application-name", "Criclytics");
    upsertMeta("name", "apple-mobile-web-app-title", "Criclytics");

    upsertMeta("property", "og:site_name", "Criclytics");
    upsertMeta("property", "og:title", pageTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", imageUrl);
    upsertMeta("property", "og:image:type", "image/svg+xml");
    upsertMeta("property", "og:locale", "en_IN");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", pageTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", imageUrl);

    upsertCanonical(canonicalUrl);
    upsertJsonLd(jsonLd);
  }, [description, image, jsonLd, keywords, location.pathname, path, robots, title, type]);
}

export function getSiteOrigin() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") || "";
}

export function toAbsoluteUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const origin = getSiteOrigin();

  if (!origin) {
    return path;
  }

  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    element.dataset.criclyticsManaged = "true";
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    element.dataset.criclyticsManaged = "true";
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
}

function upsertJsonLd(value: MetadataOptions["jsonLd"]) {
  for (const existing of document.head.querySelectorAll('script[data-criclytics-jsonld="true"]')) {
    existing.remove();
  }

  if (!value) {
    return;
  }

  const items = Array.isArray(value) ? value : [value];

  for (const item of items) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.criclyticsJsonld = "true";
    script.textContent = JSON.stringify(item);
    document.head.appendChild(script);
  }
}
