import { useEffect } from "react";
import { useLocation } from "react-router";

const GA_MEASUREMENT_ID = "G-LPHZY3WV03";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Google Analytics (gtag.js). Loaded in production builds only so local
 * development traffic does not pollute reports.
 */
export function GoogleAnalytics() {
  if (!import.meta.env.PROD) return null;

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
`.trim(),
        }}
      />
    </>
  );
}

/** Sends a page_view on each client-side route change. */
export function GoogleAnalyticsPageViews() {
  const location = useLocation();

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    window.gtag?.("event", "page_view", {
      page_path: location.pathname + location.search,
      page_title: document.title,
      send_to: GA_MEASUREMENT_ID,
    });
  }, [location.pathname, location.search]);

  return null;
}
