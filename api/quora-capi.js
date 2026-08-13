/* ==========================================================================
   Implica — Quora Conversions API

   Server-side lead-conversion event for Quora ads, sent only when a visitor
   arrives with a qclid (Quora's click id). Fired once by download.html right
   before the store redirect. Mirrors implica-web's /api/quora-capi — same
   QUORA_AD_ACCOUNT_ID / QUORA_CAPI_TOKEN, set as env vars on this project too.
   ========================================================================== */

const crypto = require("crypto");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, reason: "Method not allowed" });
  }

  if (!process.env.QUORA_AD_ACCOUNT_ID || !process.env.QUORA_CAPI_TOKEN) {
    return res.status(200).json({ ok: false, reason: "Quora CAPI not configured" });
  }

  const clientIp =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    "";
  const userAgent = req.headers["user-agent"] || "";
  const { qclid, eventSourceUrl, language } = req.body || {};

  const payload = {
    account_id: Number(process.env.QUORA_AD_ACCOUNT_ID),
    conversion: {
      event_name: "GenerateLead",
      timestamp: Date.now() * 1000,
      click_id: qclid,
      event_id: crypto.randomUUID(),
    },
    user: {
      ip: clientIp || undefined,
    },
    device: {
      user_agent: userAgent || undefined,
      referrer: eventSourceUrl || undefined,
      language: language || undefined,
    },
  };

  const quoraRes = await fetch("https://api.quora.com/ads/v0/conversion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.QUORA_CAPI_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!quoraRes.ok) {
    const err = await quoraRes.text();
    console.error("Quora CAPI error:", err);
    return res.status(500).json({ error: "Failed to send event" });
  }

  return res.status(200).json({ ok: true });
};
