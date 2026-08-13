/* ==========================================================================
   Implica — Meta Conversions API

   Server-side mirror of a pixel event: sends a ViewContent event straight to
   Meta so ad conversions still land when the browser blocks pixels/cookies.
   Fired once by download.html right before the store redirect. Mirrors
   implica-web's /api/capi — same FACEBOOK_PIXEL_ID / FACEBOOK_ACCESS_TOKEN,
   set as env vars on this project too.
   ========================================================================== */

const crypto = require("crypto");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, reason: "Method not allowed" });
  }

  if (!process.env.FACEBOOK_PIXEL_ID || !process.env.FACEBOOK_ACCESS_TOKEN) {
    return res.status(200).json({ ok: false, reason: "CAPI not configured" });
  }

  const clientIp =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    "";
  const userAgent = req.headers["user-agent"] || "";
  const { eventSourceUrl, fbp, fbc } = req.body || {};

  const userData = { client_user_agent: userAgent };
  if (clientIp) userData.client_ip_address = clientIp;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const event = {
    event_name: "ViewContent",
    event_time: Math.floor(Date.now() / 1000),
    event_id: crypto.randomUUID(),
    event_source_url: eventSourceUrl,
    action_source: "website",
    user_data: userData,
  };

  const url = new URL(`https://graph.facebook.com/v21.0/${process.env.FACEBOOK_PIXEL_ID}/events`);
  url.searchParams.set("access_token", process.env.FACEBOOK_ACCESS_TOKEN);

  const fbRes = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [event] }),
  });

  if (!fbRes.ok) {
    const err = await fbRes.text();
    console.error("Facebook CAPI error:", err);
    return res.status(500).json({ error: "Failed to send event" });
  }

  return res.status(200).json({ ok: true });
};
