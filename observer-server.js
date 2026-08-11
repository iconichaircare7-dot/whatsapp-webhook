const express = require("express");

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 10000);
const VERIFY_TOKEN = (process.env.VERIFY_TOKEN || "").toString().trim();

// Observer-only WhatsApp lines.
// Render ENV can override these values without changing code.
const OBSERVER_811_PHONE_NUMBER_ID = (
  process.env.OBSERVER_811_PHONE_NUMBER_ID || "1058100107394390"
).toString().trim();

const OBSERVER_616_PHONE_NUMBER_ID = (
  process.env.OBSERVER_616_PHONE_NUMBER_ID || "1042787718920007"
).toString().trim();

const OBSERVER_LINES = new Map([
  [OBSERVER_811_PHONE_NUMBER_ID, "811 Dubai"],
  [OBSERVER_616_PHONE_NUMBER_ID, "616 Abu Dhabi"]
]);

app.get("/", (req, res) => {
  return res.status(200).json({
    ok: true,
    service: "ICONIC WhatsApp Observer",
    mode: "observer_only",
    lines: ["811", "616"]
  });
});

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    ok: true,
    service: "ICONIC WhatsApp Observer",
    mode: "observer_only",
    time: new Date().toISOString()
  });
});

// Meta webhook verification.
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge || "");
  }

  return res.sendStatus(403);
});

// Observer-only webhook receiver.
// IMPORTANT: this endpoint never sends WhatsApp messages and never calls Team Inbox automation.
app.post("/webhook", (req, res) => {
  try {
    const body = req.body || {};
    const entries = Array.isArray(body.entry) ? body.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        const value = change?.value || {};
        const phoneNumberId = String(value?.metadata?.phone_number_id || "").trim();
        const displayPhoneNumber = String(value?.metadata?.display_phone_number || "").trim();
        const branch = OBSERVER_LINES.get(phoneNumberId);

        // Ignore every WhatsApp line except the two observer lines.
        if (!branch) {
          console.log("[Observer] ignored unknown phone number", {
            phoneNumberId,
            displayPhoneNumber
          });
          continue;
        }

        const messages = Array.isArray(value.messages) ? value.messages : [];
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];

        // Delivery/read/status callbacks are acknowledged only.
        if (!messages.length && statuses.length) {
          console.log("[Observer] status acknowledged", {
            branch,
            phoneNumberId,
            statuses: statuses.map((item) => item?.status || "").filter(Boolean)
          });
          continue;
        }

        for (const message of messages) {
          const contact = Array.isArray(value.contacts) ? value.contacts[0] || {} : {};
          const from = String(message?.from || contact?.wa_id || "").trim();
          const customerName = String(contact?.profile?.name || "").trim();
          const messageType = String(message?.type || "").trim();
          const textBody = String(message?.text?.body || "").trim();
          const referral = message?.referral || null;

          console.log("[Observer] inbound captured", {
            branch,
            phoneNumberId,
            displayPhoneNumber,
            from,
            customerName,
            messageType,
            text: textBody,
            hasReferral: Boolean(referral),
            referralSourceId: referral?.source_id || ""
          });

          // Phase 1: log only. No Google Sheet write, no classifications,
          // no bot reply, no staff notification, no conversation-state mutation.
        }
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("[Observer] webhook error", error);
    // Return 200 so Meta does not retry endlessly while we are in observer-only testing.
    return res.sendStatus(200);
  }
});

app.listen(PORT, () => {
  console.log(`ICONIC WhatsApp Observer running on port ${PORT}`);
  console.log("Mode: observer_only");
});
