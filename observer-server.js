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
  PENDING: "Pending",
  NO_REPLY: "No reply-Aug",
  INTERESTED: "interested-AUG",
  PRICE: "the price - AUG",
  CONSULTATION: "consultation-AUG"
};

// DRY RUN state only. This Map is intentionally temporary and resets on deploy/restart.
// Persistent state will later live in Google Sheets.
const dryRunLeadState = new Map();

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(text, terms) {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function detectLanguage(text) {
  return /[\u0600-\u06FF]/.test(String(text || "")) ? "AR" : "EN";
}

function getLeadKey(phoneNumberId, from) {
  return `${String(phoneNumberId || "").trim()}|${String(from || "").trim()}`;
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

function classify811Intent(text, referral) {
  const normalized = normalizeText(text);

  // Always check the ad starter first. It contains "consultation" but is not a booking.
  if (isDubaiAdStarter(normalized, referral)) {
    return {
      matched: true,
      intent: "new_lead",
      reason: referral ? "ad_referral" : "known_ad_starter"
    };
  }

  if (!normalized) {
    return { matched: false, intent: "non_text", reason: "empty_or_non_text_message" };
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
    "can i come today",
    "can i come tomorrow",
    "i want to visit",
    "احجز",
    "اريد احجز",
    "اريد حجز",
    "بدي احجز",
    "بدي حجز",
    "حجز",
    "موعد",
    "بدي موعد",
    "اريد موعد",
    "في موعد",
    "متى اجي",
    "متى فيني اجي",
    "امتى اجي",
    "امتى فيني اجي",
    "اي ساعه",
    "الساعه كم",
    "بقدر اجي اليوم",
    "بقدر اجي بكرا",
    "ممكن اجي اليوم",
    "ممكن اجي بكرا"
  ];

  if (containsAny(normalized, consultationTerms)) {
    return {
      matched: true,
      intent: "consultation",
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
    "pricing",
    "سعر",
    "السعر",
    "اسعار",
    "الاسعار",
    "تكلفه",
    "التكلفه",
    "كم السعر",
    "كم سعر",
    "قديش السعر",
    "شو السعر",
    "بكم",
    "كم بيكلف",
    "كم يكلف"
  ];

  if (containsAny(normalized, priceTerms)) {
    return {
      matched: true,
      intent: "price",
      reason: "price_intent"
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
    "how long",
    "duration",
    "الموقع",
    "وين",
    "العنوان",
    "لوكيشن",
    "معلومات",
    "بدي معلومات",
    "تفاصيل",
    "العمليه",
    "الطريقه",
    "الصيانه",
    "انواع",
    "شو الانواع",
    "كيف",
    "كيف النظام",
    "كيف بيشتغل",
    "قديش بيدوم",
    "كم بيدوم",
    "مده"
  ];

  if (containsAny(normalized, interestedTerms)) {
    return {
      matched: true,
      intent: "interested",
      reason: "general_interest_or_information"
    };
  }

  const weakReplies = new Set([
    "yes",
    "yes pls",
    "yes please",
    "ok",
    "okay",
    "ok thanks",
    "thanks",
    "thank you",
    "sure",
    "fine",
    "alright",
    "نعم",
    "اي",
    "ايوه",
    "اوك",
    "اوكي",
    "تمام",
    "طيب",
    "شكرا",
    "شكرا لك",
    "ماشي"
  ].map(normalizeText));

  if (weakReplies.has(normalized)) {
    return {
      matched: true,
      intent: "weak_reply",
      reason: "weak_acknowledgement"
    };
  }

  const greetingOnly = new Set([
    "hi",
    "hello",
    "hey",
    "good morning",
    "good evening",
    "مرحبا",
    "مرحبا بكم",
    "السلام عليكم",
    "هلا"
  ].map(normalizeText));

  if (greetingOnly.has(normalized)) {
    return {
      matched: true,
      intent: "weak_reply",
      reason: "greeting_only"
    };
  }

  // A substantive message that is not one of the strong intents still means the lead is engaging.
  if (normalized.length >= 4) {
    return {
      matched: true,
      intent: "other_engagement",
      reason: "substantive_unclassified_reply"
    };
  }

  return {
    matched: false,
    intent: "unknown",
    reason: "no_classification_rule_matched"
  };
}

function transition811State(previousStatus, intent) {
  const previous = previousStatus || "";

  // Consultation is the strongest state. Do not downgrade it on ordinary follow-up messages.
  if (previous === LEAD_STATUS.CONSULTATION) {
    return {
      status: LEAD_STATUS.CONSULTATION,
      reason: "consultation_is_terminal_priority"
    };
  }

  if (intent === "new_lead") {
    // A new ad starter opens Pending only if we do not already have a stronger real state.
    if (!previous || previous === LEAD_STATUS.NO_REPLY || previous === LEAD_STATUS.PENDING) {
      return { status: LEAD_STATUS.PENDING, reason: "new_ad_lead_pending" };
    }
    return { status: previous, reason: "repeat_ad_starter_keep_existing_state" };
  }

  if (intent === "consultation") {
    return { status: LEAD_STATUS.CONSULTATION, reason: "promote_to_consultation" };
  }

  if (intent === "price") {
    return { status: LEAD_STATUS.PRICE, reason: "price_intent" };
  }

  if (intent === "interested") {
    return { status: LEAD_STATUS.INTERESTED, reason: "information_intent" };
  }

  if (intent === "weak_reply" || intent === "other_engagement") {
    // Key business rule:
    // If the customer asked about price and then replies again (OK / thanks / anything else),
    // they are no longer classified as a price-only stop. Move them to Interested.
    if (previous === LEAD_STATUS.PRICE) {
      return { status: LEAD_STATUS.INTERESTED, reason: "continued_after_price" };
    }

    // A customer who was previously No Reply has now actually replied.
    if (previous === LEAD_STATUS.NO_REPLY) {
      return { status: LEAD_STATUS.INTERESTED, reason: "reengaged_after_no_reply" };
    }

    // Weak acknowledgement immediately after the ad starter remains Pending until intent is clearer.
    if (previous === LEAD_STATUS.PENDING || !previous) {
      if (intent === "other_engagement") {
        return { status: LEAD_STATUS.INTERESTED, reason: "substantive_engagement_after_pending" };
      }
      return { status: LEAD_STATUS.PENDING, reason: "weak_reply_keep_pending" };
    }

    return { status: previous || LEAD_STATUS.INTERESTED, reason: "keep_existing_engaged_state" };
  }

  return { status: previous || LEAD_STATUS.PENDING, reason: "no_state_change" };
}

function apply811DryRunState({ phoneNumberId, from, text, referral }) {
  const key = getLeadKey(phoneNumberId, from);
  const previous = dryRunLeadState.get(key) || null;
  const intentResult = classify811Intent(text, referral);
  const transition = transition811State(previous?.status || "", intentResult.intent);
  const now = new Date().toISOString();

  const next = {
    status: transition.status,
    firstSeenAt: previous?.firstSeenAt || now,
    lastCustomerMessageAt: now,
    lastIntent: intentResult.intent,
    language: detectLanguage(text),
    lastText: String(text || "").slice(0, 500),
    noReplyDueAt:
      transition.status === LEAD_STATUS.PENDING
        ? previous?.noReplyDueAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : ""
  };

  dryRunLeadState.set(key, next);

  return {
    matched: intentResult.matched,
    intent: intentResult.intent,
    intentReason: intentResult.reason,
    previousStatus: previous?.status || "",
    status: next.status,
    transitionReason: transition.reason,
    language: next.language,
    noReplyDueAt: next.noReplyDueAt
  };
}

app.get("/", (req, res) => {
  return res.status(200).json({
    ok: true,
    service: "ICONIC WhatsApp Observer",
    mode: "observer_only",
    classifier: "811_state_machine_dry_run_v3",
    lines: ["811", "616"]
  });
});

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    ok: true,
    service: "ICONIC WhatsApp Observer",
    mode: "observer_only",
    classifier: "811_state_machine_dry_run_v3",
    dryRunLeadCount: dryRunLeadState.size,
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

          // Phase 2C: bilingual 811 STATE MACHINE DRY RUN only.
          // Still no Google Sheet write and no WhatsApp outbound action.
          if (phoneNumberId === OBSERVER_811_PHONE_NUMBER_ID) {
            const classification = apply811DryRunState({
              phoneNumberId,
              from,
              text: textBody,
              referral
            });

            console.log("[811 State Machine][DRY RUN]", {
              from,
              text: textBody,
              language: classification.language,
              intent: classification.intent,
              previousStatus: classification.previousStatus,
              status: classification.status,
              intentReason: classification.intentReason,
              transitionReason: classification.transitionReason,
              noReplyDueAt: classification.noReplyDueAt
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
  console.log("Classifier: 811_state_machine_dry_run_v3");
});