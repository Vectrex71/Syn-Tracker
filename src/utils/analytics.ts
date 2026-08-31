/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Robust, privacy-friendly telemetry helper for Umami Analytics.
 * - 100% GDPR & ePrivacy compliant (no cookies, no IP tracking, no personal data).
 * - Safe for offline use (gracefully fails silently if offline or blocked).
 * - Supports both Umami Cloud (cloud.umami.is) and self-hosted instances.
 * - AdBlocker-aware dual-mode delivery (official script + direct REST API fallback).
 */

declare global {
  interface Window {
    umami?: {
      track: (eventNameOrFn?: string | Record<string, unknown> | ((props: Record<string, unknown>) => Record<string, unknown>), data?: Record<string, unknown>) => void;
    };
  }
}

// Default Umami Cloud script host
export const DEFAULT_UMAMI_HOST = 'https://cloud.umami.is';
export const DEFAULT_UMAMI_WEBSITE_ID = '';

const STORAGE_KEY_WEBSITE_ID = 'syntracker_umami_website_id';
const STORAGE_KEY_HOST_URL = 'syntracker_umami_host_url';
const STORAGE_KEY_DISABLED = 'syntracker_analytics_disabled';

// Helper to check if string is a valid HTTP/HTTPS URL
function isValidHttpUrl(str: string): boolean {
  if (!str) return false;
  return /^https?:\/\//i.test(str.trim());
}

// In-memory visit counter and event buffer
let sessionInitialized = false;
const eventQueue: Array<{ name: string; data?: Record<string, unknown> }> = [];
let isQueueFlushing = false;
let sessionEventsDispatched = 0;

/**
 * Get the configured Umami Website ID (from localStorage, environment secret VITE_UMAMI_WEBSITE_ID, or empty)
 */
export function getUmamiWebsiteId(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(STORAGE_KEY_WEBSITE_ID);
  if (stored !== null && stored.trim() !== '') {
    return stored.trim();
  }
  
  const envId = (import.meta as any).env?.VITE_UMAMI_WEBSITE_ID;
  if (envId && typeof envId === 'string' && envId.trim() !== '') {
    return envId.trim();
  }
  return '';
}

/**
 * Set and activate a new Umami Website ID
 */
export function setUmamiWebsiteId(id: string): void {
  if (typeof window === 'undefined') return;
  const cleanId = id.trim();
  if (cleanId) {
    localStorage.setItem(STORAGE_KEY_WEBSITE_ID, cleanId);
  } else {
    localStorage.setItem(STORAGE_KEY_WEBSITE_ID, '');
  }
  initAnalytics(cleanId, getUmamiHostUrl());
}

/**
 * Get the configured Umami Host URL (e.g. 'https://cloud.umami.is' or custom self-hosted host)
 */
export function getUmamiHostUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_UMAMI_HOST;
  const stored = localStorage.getItem(STORAGE_KEY_HOST_URL);
  if (stored && isValidHttpUrl(stored)) {
    return stored.trim().replace(/\/+$/, '');
  }
  // Clear if invalid value (e.g. if someone accidentally stored an ID in the host field)
  if (stored && !isValidHttpUrl(stored)) {
    localStorage.removeItem(STORAGE_KEY_HOST_URL);
  }
  
  const envHost = (import.meta as any).env?.VITE_UMAMI_HOST_URL;
  if (envHost && isValidHttpUrl(envHost)) {
    return envHost.trim().replace(/\/+$/, '');
  }
  return DEFAULT_UMAMI_HOST;
}

/**
 * Set and activate a new Umami Host URL
 */
export function setUmamiHostUrl(hostUrl: string): void {
  if (typeof window === 'undefined') return;
  const cleanHost = hostUrl.trim().replace(/\/+$/, '');
  if (cleanHost) {
    localStorage.setItem(STORAGE_KEY_HOST_URL, cleanHost);
  } else {
    localStorage.removeItem(STORAGE_KEY_HOST_URL);
  }
  initAnalytics(getUmamiWebsiteId(), cleanHost || DEFAULT_UMAMI_HOST);
}

/**
 * Check if analytics is disabled by user preference
 */
export function isAnalyticsDisabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY_DISABLED) === 'true';
}

/**
 * Enable or disable analytics
 */
export function setAnalyticsDisabled(disabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_DISABLED, disabled ? 'true' : 'false');
  if (disabled) {
    removeExistingScript();
  } else {
    initAnalytics();
  }
}

function removeExistingScript(): void {
  if (typeof document === 'undefined') return;
  const scripts = document.querySelectorAll('script[data-website-id], script[src*="umami"]');
  scripts.forEach((s) => s.remove());
}

/**
 * Initialize Umami script in the DOM with the configured Website ID & Host URL
 */
export function initAnalytics(websiteIdOverride?: string, hostUrlOverride?: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  if (isAnalyticsDisabled()) {
    removeExistingScript();
    return;
  }

  const websiteId = (websiteIdOverride !== undefined ? websiteIdOverride : getUmamiWebsiteId()).trim();
  const hostUrl = (hostUrlOverride !== undefined ? hostUrlOverride : getUmamiHostUrl()).trim().replace(/\/+$/, '');
  
  if (!websiteId) {
    removeExistingScript();
    return;
  }

  const scriptSrc = `${hostUrl}/script.js`;

  // Check if active script matches our target configuration
  const existingScript = document.querySelector('script[data-website-id]') as HTMLScriptElement | null;
  if (existingScript) {
    const currentId = existingScript.getAttribute('data-website-id');
    const currentSrc = existingScript.src;
    if (currentId === websiteId && currentSrc.startsWith(hostUrl)) {
      pollAndFlushQueue();
      trackLocalVisit();
      return;
    }
    existingScript.remove();
  }

  try {
    const script = document.createElement('script');
    script.defer = true;
    script.src = scriptSrc;
    script.setAttribute('data-website-id', websiteId);
    script.setAttribute('data-auto-track', 'true');
    script.setAttribute('data-do-not-track', 'false');
    if (hostUrl) {
      script.setAttribute('data-host-url', hostUrl);
    }
    
    script.onload = () => {
      pollAndFlushQueue();
      trackPageView();
    };
    
    script.onerror = () => {
      console.debug('Umami script loading blocked or failed (direct API fallback enabled)');
    };
    
    document.head.appendChild(script);

    // Initial check and local stats tracking
    pollAndFlushQueue();
    trackLocalVisit();
  } catch (err) {
    console.debug('Analytics init error (non-critical):', err);
  }
}

function pollAndFlushQueue(): void {
  if (typeof window === 'undefined' || isQueueFlushing) return;
  
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (window.umami && typeof window.umami.track === 'function') {
      clearInterval(interval);
      isQueueFlushing = true;
      while (eventQueue.length > 0) {
        const item = eventQueue.shift();
        if (item) {
          try {
            if (item.data) {
              window.umami.track(item.name, item.data);
            } else {
              window.umami.track(item.name);
            }
            sessionEventsDispatched++;
          } catch (e) {
            // fallback if track threw
            sendPayloadDirectly(item.name, item.data);
          }
        }
      }
      isQueueFlushing = false;
    } else if (attempts > 15) {
      clearInterval(interval);
      // If script is blocked after 15 attempts (4.5s), flush remaining queue via direct REST fallback
      if (eventQueue.length > 0) {
        while (eventQueue.length > 0) {
          const item = eventQueue.shift();
          if (item) {
            sendPayloadDirectly(item.name, item.data);
          }
        }
      }
    }
  }, 300);
}

/**
 * Direct REST API payload sender for Umami (/api/send)
 * Works even when script.js is blocked by content blockers or in isolated iframes
 */
async function sendPayloadDirectly(eventName?: string, eventData?: Record<string, unknown>): Promise<boolean> {
  if (typeof window === 'undefined' || isAnalyticsDisabled()) return false;
  
  const websiteId = getUmamiWebsiteId();
  if (!websiteId) return false;
  
  const hostUrl = getUmamiHostUrl();
  const endpoint = `${hostUrl}/api/send`;

  const payload: Record<string, unknown> = {
    website: websiteId,
    hostname: window.location.hostname || 'localhost',
    screen: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language || 'en',
    url: window.location.pathname + window.location.search || '/',
    title: document.title || 'SYN-Tracker'
  };

  if (eventName) {
    payload.name = eventName;
    if (eventData) {
      payload.data = eventData;
    }
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'event',
        payload
      })
    });
    
    if (res.ok) {
      sessionEventsDispatched++;
      return true;
    }
    return false;
  } catch (err) {
    // Network or CORS block
    return false;
  }
}

/**
 * Track a pageview event
 */
export function trackPageView(url?: string, title?: string): void {
  if (typeof window === 'undefined' || isAnalyticsDisabled()) return;

  try {
    if (window.umami && typeof window.umami.track === 'function') {
      if (url || title) {
        window.umami.track((props: Record<string, unknown>) => ({
          ...props,
          url: url || window.location.pathname,
          title: title || document.title
        }));
      } else {
        window.umami.track();
      }
      sessionEventsDispatched++;
    } else {
      sendPayloadDirectly(undefined, undefined);
    }
  } catch (err) {
    sendPayloadDirectly(undefined, undefined);
  }
}

/**
 * Track a custom event in Umami (e.g. 'export_mod', 'play_song', 'sample_recorded')
 */
export function trackEvent(eventName: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || isAnalyticsDisabled()) return;

  try {
    if (window.umami && typeof window.umami.track === 'function') {
      if (data) {
        window.umami.track(eventName, data);
      } else {
        window.umami.track(eventName);
      }
      sessionEventsDispatched++;
    } else {
      eventQueue.push({ name: eventName, data });
      pollAndFlushQueue();
    }
  } catch (err) {
    sendPayloadDirectly(eventName, data);
  }
}

/**
 * Live test function to verify connection and validity of Umami Website ID & Host URL
 */
export async function testUmamiConnection(
  websiteIdCandidate?: string,
  hostUrlCandidate?: string
): Promise<{ success: boolean; status: number; message: string; details?: string }> {
  const websiteId = (websiteIdCandidate !== undefined ? websiteIdCandidate : getUmamiWebsiteId()).trim();
  const hostUrl = (hostUrlCandidate !== undefined ? hostUrlCandidate : getUmamiHostUrl()).trim().replace(/\/+$/, '');

  if (!websiteId) {
    return {
      success: false,
      status: 0,
      message: 'Website-ID fehlt',
      details: 'Bitte gib eine gültige Umami Website-ID (UUID-Format) ein.'
    };
  }

  const endpoint = `${hostUrl}/api/send`;
  const payload = {
    website: websiteId,
    hostname: typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost',
    screen: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '1920x1080',
    language: typeof navigator !== 'undefined' ? navigator.language : 'de',
    url: typeof window !== 'undefined' ? window.location.pathname || '/' : '/',
    title: 'SYN-Tracker (Umami Ping Test)',
    name: 'test_connection_ping',
    data: {
      timestamp: new Date().toISOString(),
      client: 'SYN-Tracker Web Pro',
      type: 'diagnostic_ping'
    }
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'event',
        payload
      })
    });

    if (res.ok) {
      return {
        success: true,
        status: res.status,
        message: 'Verbindung erfolgreich!',
        details: `Umami Server hat das Test-Event empfangen (HTTP ${res.status} OK). Tracking ist voll aktiv.`
      };
    }

    let errorBody = '';
    try {
      const json = await res.json();
      errorBody = json.error || JSON.stringify(json);
    } catch {
      errorBody = await res.text().catch(() => '');
    }

    if (res.status === 404) {
      return {
        success: false,
        status: 404,
        message: 'Website nicht gefunden (404)',
        details: `Die Website-ID "${websiteId}" wurde auf dem Umami-Server "${hostUrl}" nicht gefunden. Bitte überprüfe die ID in deinem Umami Dashboard unter Einstellungen > Websites.`
      };
    }

    if (res.status === 400) {
      return {
        success: false,
        status: 400,
        message: 'Ungültige Anfrage (400)',
        details: errorBody || 'Das Payload-Format oder die Website-ID wurde vom Umami Server abgewiesen.'
      };
    }

    return {
      success: false,
      status: res.status,
      message: `Server-Antwort HTTP ${res.status}`,
      details: errorBody || `Der Umami-Server hat mit Statuscode ${res.status} geantwortet.`
    };
  } catch (err: any) {
    return {
      success: false,
      status: 0,
      message: 'Verbindung blockiert oder nicht erreichbar',
      details: err?.message || 'Prüfe deine Internetverbindung oder ob ein Adblocker (z.B. uBlock, Brave Shields) Anfragen an den Tracking-Server blockiert.'
    };
  }
}

/**
 * Tracks local visit count and returning status in localStorage
 */
export function getLocalUserStats(): {
  visitCount: number;
  firstSeen: string;
  isReturning: boolean;
  eventsCount: number;
  umamiScriptLoaded: boolean;
} {
  if (typeof window === 'undefined') {
    return { visitCount: 1, firstSeen: 'today', isReturning: false, eventsCount: 0, umamiScriptLoaded: false };
  }

  const visits = parseInt(localStorage.getItem('syntracker_local_visits') || '0', 10);
  let firstSeen = localStorage.getItem('syntracker_first_seen');
  
  if (!firstSeen) {
    firstSeen = new Date().toISOString().split('T')[0];
    localStorage.setItem('syntracker_first_seen', firstSeen);
  }

  const hasUmami = !!(window.umami && typeof window.umami.track === 'function');

  return {
    visitCount: visits,
    firstSeen,
    isReturning: visits > 1,
    eventsCount: sessionEventsDispatched,
    umamiScriptLoaded: hasUmami
  };
}

function trackLocalVisit(): void {
  if (sessionInitialized || typeof window === 'undefined') return;
  sessionInitialized = true;

  try {
    const currentVisits = parseInt(localStorage.getItem('syntracker_local_visits') || '0', 10);
    const newVisits = currentVisits + 1;
    localStorage.setItem('syntracker_local_visits', newVisits.toString());

    if (newVisits > 1) {
      trackEvent('returning_user_session', { visits: newVisits });
    } else {
      trackEvent('first_time_user_session', { firstSeen: new Date().toISOString() });
    }
  } catch (e) {
    // Ignore storage issues
  }
}
