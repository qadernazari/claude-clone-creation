import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeader } from "@tanstack/react-start/server";

type LogInput = {
  filmId: string;
  type: "view" | "play" | "progress" | "complete";
  value?: number | null;
  sessionId?: string | null;
  referrer?: string | null;
};

// --- Tiny UA parser (no external deps; covers the major cases) ---
function parseUA(ua: string | null | undefined) {
  if (!ua) return { device_type: null, os: null, browser: null };
  const u = ua.toLowerCase();

  // OS
  let os: string | null = null;
  if (/iphone|ipad|ipod/.test(u)) os = "iOS";
  else if (/android/.test(u)) os = "Android";
  else if (/mac os x|macintosh/.test(u)) os = "macOS";
  else if (/windows nt/.test(u)) os = "Windows";
  else if (/cros/.test(u)) os = "ChromeOS";
  else if (/linux/.test(u)) os = "Linux";

  // Device
  let device_type: string | null = null;
  if (/smart-tv|smarttv|appletv|googletv|hbbtv|netcast|viera|aquos|bravia|roku|tizen.*tv|webos.*tv/.test(u)) device_type = "Smart TV";
  else if (/ipad|tablet|playbook|silk(?!.*mobile)/.test(u)) device_type = "Tablet";
  else if (/mobi|iphone|ipod|android.*mobile|phone|blackberry|iemobile|opera mini/.test(u)) device_type = "Mobile";
  else device_type = "Desktop";

  // Browser (order matters)
  let browser: string | null = null;
  if (/edg\//.test(u)) browser = "Edge";
  else if (/opr\/|opera/.test(u)) browser = "Opera";
  else if (/firefox\/|fxios/.test(u)) browser = "Firefox";
  else if (/chrome\/|crios/.test(u) && !/edg\//.test(u)) browser = "Chrome";
  else if (/safari\//.test(u) && !/chrome|crios|android/.test(u)) browser = "Safari";
  else if (/samsungbrowser/.test(u)) browser = "Samsung Internet";

  return { device_type, os, browser };
}

// --- Referrer classification ---
function classifyReferrer(refRaw: string | null | undefined, ownHost: string | null) {
  if (!refRaw) return { source: "Direct", host: null as string | null };
  let host = "";
  try {
    host = new URL(refRaw).host.toLowerCase().replace(/^www\./, "");
  } catch {
    return { source: "Direct", host: null };
  }
  if (!host) return { source: "Direct", host: null };
  if (ownHost && host === ownHost.toLowerCase().replace(/^www\./, "")) {
    return { source: "Direct", host: null };
  }

  const map: Array<[RegExp, string]> = [
    [/(^|\.)google\./, "Google Search"],
    [/(^|\.)bing\.com$/, "Bing Search"],
    [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
    [/(^|\.)yahoo\./, "Yahoo Search"],
    [/(^|\.)instagram\.com$/, "Instagram"],
    [/(^|\.)threads\.net$/, "Threads"],
    [/(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)m\.facebook\.com$/, "Facebook"],
    [/(^|\.)twitter\.com$|(^|\.)x\.com$|(^|\.)t\.co$/, "Twitter / X"],
    [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "YouTube"],
    [/(^|\.)tiktok\.com$/, "TikTok"],
    [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, "LinkedIn"],
    [/(^|\.)reddit\.com$/, "Reddit"],
    [/(^|\.)pinterest\./, "Pinterest"],
    [/(^|\.)telegram\.|(^|\.)t\.me$/, "Telegram"],
    [/(^|\.)whatsapp\.com$|(^|\.)wa\.me$/, "WhatsApp"],
    [/(^|\.)gmail\.|(^|\.)mail\.google\.com$|(^|\.)outlook\./, "Email"],
  ];
  for (const [re, label] of map) if (re.test(host)) return { source: label, host };
  return { source: "External website", host };
}

const ALLOWED_TYPES = new Set(["view", "play", "progress", "complete"]);

export const logFilmEvent = createServerFn({ method: "POST" })
  .inputValidator((data: LogInput) => {
    if (!data || typeof data.filmId !== "string" || !data.filmId) {
      throw new Error("filmId is required");
    }
    if (!ALLOWED_TYPES.has(data.type)) throw new Error("invalid event type");
    return data;
  })
  .handler(async ({ data }) => {
    const req = getRequest();
    const ua = getRequestHeader("user-agent") ?? null;
    // Cloudflare-injected geo headers (present in production)
    const country =
      getRequestHeader("cf-ipcountry") ??
      getRequestHeader("x-vercel-ip-country") ??
      null;
    const city =
      getRequestHeader("cf-ipcity") ??
      getRequestHeader("x-vercel-ip-city") ??
      null;
    const region =
      getRequestHeader("cf-region") ??
      getRequestHeader("cf-region-code") ??
      getRequestHeader("x-vercel-ip-country-region") ??
      null;

    let ownHost: string | null = null;
    try {
      ownHost = new URL(req.url).host;
    } catch {
      // ignore
    }

    const referrer =
      data.referrer ??
      getRequestHeader("referer") ??
      getRequestHeader("referrer") ??
      null;

    const { device_type, os, browser } = parseUA(ua);
    const { source: referrer_source, host: referrer_host } = classifyReferrer(referrer, ownHost);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("events").insert({
      film_id: data.filmId,
      type: data.type,
      value: data.value ?? null,
      session_id: data.sessionId ?? null,
      country: country ? country.toUpperCase() : null,
      city: city ? decodeURIComponent(city) : null,
      region: region ?? null,
      device_type,
      os,
      browser,
      referrer_source,
      referrer_host,
      user_agent: ua,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
