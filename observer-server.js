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

const LEAD_STATUS = {
  NO_REPLY: "No reply-Aug",
  INTERESTED: "interested-AUG",
  PRICE: "the price - AUG",
  CONSULTATION: "consultation-AUG"
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function isDubaiAdStarter(text, referral) {
  if (referral) return true;

  const normalized = normalizeText(text);
  return (
    normalized.includes("hi, i'm interested in a hair system consultation in dubai") ||
    normalized.includes("hi i'm interested in a hair system consultation in dubai") ||
    normalized.includes("i'm interested in a hair system consultation in dubai")
  );
}

function classify811Message(text, referral) {
  const normalized = normalizeText(text);

  // IMPORTANT: check the ad starter BEFORE keyword rules.
  // The starter contains the word "consultation" but is not a real booking request.
  if (isDubaiAdStarter(normalized, referral)) {
    return {
      matched: true,
      status: LEAD_STATUS.NO_REPLY,
      reason: referral ? "ad_referral_or_starter" : "known_ad_starter"
    };
  }

  if (!normalized) {
    return { matched: false, status: "", reason: "empty_or_non_text_message" };
  }

  const consultationTerms = [
    "book a consultation",
    "book consultation",
    "book an appointment",
    "book appointment",
    "make an appointment",
    "schedule an appointment",
    "schedule a consultation",
    "i want to book",
    "i would like to book",
    "when can i come",
    "when can i visit",
    "what time i come",
    "what time can i come",
    "today what time",
    "appointment today",
    "available appointment",
    "available today",
    "احجز",
    "حجز",
    "موعد",
    "متى اجي",
    "متى أجي",
    "اي ساعة",
    "أي ساعة"
  ];

  if (containsAny(normalized, consultationTerms)) {
    return {
      matched: true,
      status: LEAD_STATUS.CONSULTATION,
      reason: "booking_or_visit_intent"
    };
  }

  const priceTerms = [
    "how much",
    "price",
    "prices",
    "cost",
    "how much for",
    "how much is",
    "how much does",
    "سعر",
    "السعر",
    "اسعار",
    "أسعار",
    "تكلفة",
    "كم السعر",
    "بكم"
  ];

  if (containsAny(normalized, priceTerms)) {
    return {
      matched: true,
      status: LEAD_STATUS.PRICE,
      reason: "price_intent"
    };
  }

  // "Yes / Yes pls" alone is intentionally NOT promoted to interested.
  const weakOnlyReplies = new Set([
    "yes",
    "yes pls",
    "yes please",
    "ok",
    "okay",
    "sure",
    "نعم",
    "اي",
    "ايوه"
  ]);

  if (weakOnlyReplies.has(normalized)) {
    return {
      matched: false,
      status: "",
      reason: "weak_reply_wait_for_detail"
    };
  }

  const interestedTerms = [
    "location",
    "where is",
    "address",
    "send location",
    "location send",
    "more information",
    "information",
    "process",
    "maintenance",
    "frequency",
    "how it works",
    "how does it work",
    "details",
    "hair patch",
    "hair patches",
    "types of hair",
    "what types",
    "الموقع",
    "وين",
    "العنوان",
    "لوكيشن",
    "معلومات",
    "تفاصيل",
    "العملية",
    "الطريقة",
    "الصيانة",
    "انواع",
    "أنواع",
    "كيف"
  ];

  if (containsAny(normalized, interestedTerms)) {
    return {
      matched: true,
      status: LEAD_STATUS.INTERESTED,
      reason: "general_interest_or_information"
    };
  }

  return {
    matched: false,
    status: "",
    reason: "no_classification_rule_matched"
  };
}

app.get("/", (req, res) => {
  return res.status(200).json({
    ok: true,
    service: "ICONIC WhatsApp Observer",
    mode: "observer_only",
    classifier: "811_dry_run",
    lines: ["811", "616"]
  });
});

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    ok: true,
    service: "ICONIC WhatsApp Observer",
    mode: "observer_only",
    classifier: "811_dry_run",
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

          // Phase 2A: 811 classification DRY RUN only.
          // We deliberately do NOT write to Google Sheets yet.
          // This lets us validate classification against real WhatsApp traffic first.
          if (phoneNumberId === OBSERVER_811_PHONE_NUMBER_ID) {
            const classification = classify811Message(textBody, referral);

            console.log("[811 Classifier][DRY RUN]", {
              from,
              text: textBody,
              matched: classification.matched,
              status: classification.status,
              reason: classification.reason
            });
          } else if (phoneNumberId === OBSERVER_616_PHONE_NUMBER_ID) {
            console.log("[616 Observer] classification not enabled yet", { from });
          }
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
  console.log("Classifier: 811_dry_run");
});
