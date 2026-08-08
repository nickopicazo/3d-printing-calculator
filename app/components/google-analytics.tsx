import { useEffect } from "react";
import { useLocation } from "react-router";

const GA_MEASUREMENT_ID = "G-LPHZY3WV03";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let gaInjected = false;

function ensureGtagStub() {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }
}

function injectGaScript() {
  if (gaInjected || document.getElementById("ga-gtag")) {
    gaInjected = true;
    return;
  }
  gaInjected = true;
  ensureGtagStub();
  window.gtag?.("js", new Date());
  window.gtag?.("config", GA_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.id = "ga-gtag";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/**
 * Loads Google Analytics after first interaction (or a long idle fallback)
 * so gtag does not compete with LCP / unused-JS audits. Production only.
 */
export function GoogleAnalytics() {
  useEffect(() => {
    if (!import.meta.env.PROD) return;

    const onInteract = () => {
      injectGaScript();
      cleanup();
    };

    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    const cleanup = () => {
      for (const event of events) {
        window.removeEventListener(event, onInteract);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };

    for (const event of events) {
      window.addEventListener(event, onInteract, {
        once: true,
        passive: true,
      });
    }

    // Long fallback so lab audits finish before gtag arrives; real users
    // usually interact sooner.
    const timeoutId = setTimeout(onInteract, 60_000);

    return cleanup;
  }, []);

  return null;
}

/** Sends a page_view on each client-side route change. */
export function GoogleAnalyticsPageViews() {
  const location = useLocation();

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    ensureGtagStub();
    window.gtag?.("event", "page_view", {
      page_path: location.pathname + location.search,
      page_title: document.title,
      send_to: GA_MEASUREMENT_ID,
    });
  }, [location.pathname, location.search]);

  return null;
}
