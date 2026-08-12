const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 10000);
const VERIFY_TOKEN = String(process.env.VERIFY_TOKEN || "").trim();
const OBSERVER_SHEET_WEBAPP_URL = String(process.env.OBSERVER_SHEET_WEBAPP_URL || "").trim();
const OBSERVER_API_KEY = String(process.env.OBSERVER_API_KEY || "").trim();

const OBSERVER_811_PHONE_NUMBER_ID = String(
  process.env.OBSERVER_811_PHONE_NUMBER_ID || "1058100107394390"
).trim();
const OBSERVER_616_PHONE_NUMBER_ID = String(
  process.env.OBSERVER_616_PHONE_NUMBER_ID || "1042787718920007"
).trim();

const OBSERVER_LINES = new Map([
  [
    OBSERVER_811_PHONE_NUMBER_ID,
    { branch: "811 Dubai", staffNumber: "811", city: "Dubai" }
  ],
  [
    OBSERVER_616_PHONE_NUMBER_ID,
    { branch: "616 Abu Dhabi", staffNumber: "616", city: "Abu Dhabi" }
  ]
]);

const LEAD_STATUS = {
  PENDING: "Pending",
  NO_REPLY: "No reply-Aug",
  INTERESTED: "interested-AUG",
  PRICE: "the price - AUG",
  CONSULTATION: "consultation-AUG"
};

const SOURCE_LABEL = "عميل جديد من الإعلانات";
const CACHE_TTL_MS = 60 * 60 * 1000;
const leadStateCache = new Map();
const leadQueues = new Map();

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

// A brand-new row is admitted only when Meta itself supplies referral.source_id.
// Visible message text alone never proves that a conversation came from an ad.
function hasConfirmedMetaAdReferral(referral) {
  return Boolean(referral && String(referral.source_id || "").trim());
}

// The standard ad starter contains "consultation" but is not a booking request.
// Keep the known Dubai and Abu Dhabi starters as Pending on first admission.
function isKnownAdStarter(text, lineConfig) {
  const normalized = normalizeText(text);
  const city = String(lineConfig?.city || "").toLowerCase();

  if (city === "dubai") {
    return normalized.includes("i'm interested in a hair system consultation in dubai");
  }

  if (city === "abu dhabi") {
    return (
      normalized.includes("i'm interested in a hair system consultation in abu dhabi") ||
      normalized.includes("i'm interested in a hair system consultation in abudhabi")
    );
  }

  return false;
}

function isBookingScheduleReply(text) {
  const normalized = normalizeText(text)
    .replace(/[,.!?]+$/g, "")
    .trim();

  if (!normalized) return false;

  const dayNames = [
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "الاثنين", "الثلاثاء", "الاربعاء", "الخميس", "الجمعه", "السبت", "الاحد"
  ];

  const relativeDays = [
    "today", "tomorrow", "day after tomorrow",
    "next sunday", "next monday", "next tuesday", "next wednesday", "next thursday", "next friday", "next saturday",
    "on next sunday", "on next monday", "on next tuesday", "on next wednesday", "on next thursday", "on next friday", "on next saturday",
    "this sunday", "this monday", "this tuesday", "this wednesday", "this thursday", "this friday", "this saturday",
    "on this sunday", "on this monday", "on this tuesday", "on this wednesday", "on this thursday", "on this friday", "on this saturday",
    "اليوم", "بكرا", "بكره", "غدا", "بعد بكرا",
    "الاحد القادم", "الاثنين القادم", "الثلاثاء القادم", "الاربعاء القادم", "الخميس القادم", "الجمعه القادمه", "السبت القادم"
  ];

  if (relativeDays.includes(normalized)) return true;
  if (dayNames.includes(normalized)) return true;

  if (
    dayNames.some(
      (day) =>
        normalized === `on ${day}` ||
        normalized === `next ${day}` ||
        normalized === `this ${day}` ||
        normalized === `on this ${day}`
    )
  ) {
    return true;
  }

  if (/^(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?$/.test(normalized)) {
    return true;
  }

  if (/^(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)$/.test(normalized)) {
    return true;
  }

  if (/^\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)$/.test(normalized)) {
    return true;
  }

  return false;
}

function classifyLeadIntent(text, lineConfig) {
  const normalized = normalizeText(text);

  // Source verification is handled separately. This function only classifies intent.
  if (isKnownAdStarter(normalized, lineConfig)) {
    return {
      matched: true,
      intent: "new_lead",
      reason: "known_ad_starter"
    };
  }

  if (!normalized) {
    return { matched: false, intent: "non_text", reason: "empty_or_non_text_message" };
  }

  const consultationTerms = [
    "book a consultation", "book consultation", "book an appointment", "book appointment",
    "make an appointment", "schedule an appointment", "schedule a consultation",
    "i want to book", "i would like to book", "when can i come", "when can i visit",
    "what time i come", "what time can i come", "today what time", "appointment today",
    "available appointment", "available today", "can i come today", "can i come tomorrow",
    "i want to visit", "احجز", "اريد احجز", "اريد حجز", "بدي احجز", "بدي حجز",
    "حجز", "موعد", "بدي موعد", "اريد موعد", "في موعد", "متى اجي", "متى فيني اجي",
    "امتى اجي", "امتى فيني اجي", "اي ساعه", "الساعه كم", "بقدر اجي اليوم",
    "بقدر اجي بكرا", "ممكن اجي اليوم", "ممكن اجي بكرا"
  ];

  if (containsAny(normalized, consultationTerms)) {
    return { matched: true, intent: "consultation", reason: "booking_or_visit_intent" };
  }

  if (isBookingScheduleReply(normalized)) {
    return { matched: true, intent: "booking_reply", reason: "appointment_schedule_reply" };
  }

  const priceTerms = [
    "how much", "price", "prices", "cost", "how much for", "how much is", "how much does",
    "pricing", "charge", "charges", "charge for", "charges for", "what is the charge",
    "what are the charges", "how much charge", "rate for", "rates for", "what is the rate",
    "what are the rates", "سعر", "السعر", "اسعار", "الاسعار", "تكلفه", "التكلفه",
    "كم السعر", "كم سعر", "قديش السعر", "شو السعر", "بكم", "كم بيكلف", "كم يكلف"
  ];

  if (containsAny(normalized, priceTerms)) {
    return { matched: true, intent: "price", reason: "price_intent" };
  }

  const interestedTerms = [
    "location", "where is", "address", "send location", "location send", "more information",
    "information", "process", "maintenance", "frequency", "how it works", "how does it work",
    "details", "hair patch", "hair patches", "types of hair", "what types", "how long", "duration",
    "الموقع", "وين", "العنوان", "لوكيشن", "معلومات", "بدي معلومات", "تفاصيل", "العمليه",
    "الطريقه", "الصيانه", "انواع", "شو الانواع", "كيف", "كيف النظام", "كيف بيشتغل",
    "قديش بيدوم", "كم بيدوم", "مده"
  ];

  if (containsAny(normalized, interestedTerms)) {
    return { matched: true, intent: "interested", reason: "general_interest_or_information" };
  }

  const weakReplies = new Set([
    "yes", "yes pls", "yes please", "ok", "okay", "ok thanks", "thanks", "thank you",
    "sure", "fine", "alright", "نعم", "اي", "ايوه", "اوك", "اوكي", "تمام", "طيب",
    "شكرا", "شكرا لك", "ماشي"
  ].map(normalizeText));

  if (weakReplies.has(normalized)) {
    return { matched: true, intent: "weak_reply", reason: "weak_acknowledgement" };
  }

  const greetingOnly = new Set([
    "hi", "hello", "hey", "good morning", "good evening", "مرحبا", "مرحبا بكم",
    "السلام عليكم", "هلا"
  ].map(normalizeText));

  if (greetingOnly.has(normalized)) {
    return { matched: true, intent: "weak_reply", reason: "greeting_only" };
  }

  if (normalized.length >= 4) {
    return { matched: true, intent: "other_engagement", reason: "substantive_unclassified_reply" };
  }

  return { matched: false, intent: "unknown", reason: "no_classification_rule_matched" };
}

function transitionLeadState(previousStatus, intent) {
  const previous = previousStatus || "";

  if (previous === LEAD_STATUS.CONSULTATION) {
    return { status: LEAD_STATUS.CONSULTATION, reason: "consultation_is_terminal_priority" };
  }

  if (intent === "new_lead") {
    if (!previous || previous === LEAD_STATUS.NO_REPLY || previous === LEAD_STATUS.PENDING) {
      return { status: LEAD_STATUS.PENDING, reason: "new_ad_lead_pending" };
    }
    return { status: previous, reason: "repeat_ad_starter_keep_existing_state" };
  }

  if (intent === "consultation" || intent === "booking_reply") {
    return {
      status: LEAD_STATUS.CONSULTATION,
      reason: intent === "booking_reply" ? "appointment_schedule_reply" : "promote_to_consultation"
    };
  }

  if (intent === "price") {
    return { status: LEAD_STATUS.PRICE, reason: "price_intent" };
  }

  if (intent === "interested") {
    return { status: LEAD_STATUS.INTERESTED, reason: "information_intent" };
  }

  if (intent === "weak_reply" || intent === "other_engagement") {
    if (previous === LEAD_STATUS.PRICE) {
      return { status: LEAD_STATUS.INTERESTED, reason: "continued_after_price" };
    }
    if (previous === LEAD_STATUS.NO_REPLY) {
      return { status: LEAD_STATUS.INTERESTED, reason: "reengaged_after_no_reply" };
    }
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

function sheetIntegrationConfigured() {
  return Boolean(OBSERVER_SHEET_WEBAPP_URL && OBSERVER_API_KEY);
}

async function callObserverSheetApi(action, payload = {}) {
  if (!sheetIntegrationConfigured()) {
    throw new Error("observer_sheet_not_configured");
  }

  const response = await fetch(OBSERVER_SHEET_WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, action, apiKey: OBSERVER_API_KEY }),
    redirect: "follow",
    timeout: 8000
  });

  const raw = await response.text();
  let data;

  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(`observer_sheet_invalid_json_http_${response.status}`);
  }

  if (!response.ok || !data || data.ok !== true) {
    throw new Error(`observer_sheet_${data?.error || `http_${response.status}`}`);
  }

  return data;
}

function normalizePersistentLead(lead) {
  if (!lead) return null;

  return {
    status: String(lead.currentStatus || "").trim(),
    firstSeenAt: String(lead.firstSeenAt || "").trim(),
    noReplyDueAt: String(lead.noReplyDueAt || "").trim(),
    language: String(lead.language || "").trim(),
    customerName: String(lead.customerName || "").trim()
  };
}

function applyPendingExpiryLocally(state) {
  if (!state || state.status !== LEAD_STATUS.PENDING || !state.noReplyDueAt) {
    return state;
  }

  const dueMs = new Date(state.noReplyDueAt).getTime();
  if (!Number.isFinite(dueMs) || dueMs > Date.now()) {
    return state;
  }

  return { ...state, status: LEAD_STATUS.NO_REPLY, noReplyDueAt: "" };
}

async function loadLeadState(phoneNumberId, from, staffNumber) {
  const key = getLeadKey(phoneNumberId, from);
  const cached = leadStateCache.get(key);

  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    const state = applyPendingExpiryLocally(cached.state);

    if (state !== cached.state) {
      leadStateCache.set(key, { state, loadedAt: cached.loadedAt, found: true });
    }

    return { ok: true, found: cached.found, state, source: "cache" };
  }

  if (!sheetIntegrationConfigured()) {
    return { ok: false, found: false, state: null, source: "not_configured" };
  }

  try {
    // v2-line-key Apps Script requires BOTH phoneNumberId and customer phone.
    const data = await callObserverSheetApi("get_lead", {
      phoneNumberId,
      phone: from
    });

    const state = applyPendingExpiryLocally(normalizePersistentLead(data.lead));
    leadStateCache.set(key, {
      state,
      found: Boolean(data.found),
      loadedAt: Date.now()
    });

    return {
      ok: true,
      found: Boolean(data.found),
      state,
      source: "sheet"
    };
  } catch (error) {
    console.error(`[${staffNumber} Sheet] read failed`, {
      phoneNumberId,
      from,
      error: error.message
    });

    return { ok: false, found: false, state: null, source: "error" };
  }
}

function shouldPersistTransition({ found, previousStatus, nextStatus, confirmedAdEntry }) {
  // A confirmed Meta referral is the only way a new row may be created.
  if (!found) return confirmedAdEntry;
  return previousStatus !== nextStatus;
}

function updateLeadCache(phoneNumberId, from, state, found = true) {
  leadStateCache.set(getLeadKey(phoneNumberId, from), {
    state,
    found,
    loadedAt: Date.now()
  });
}

async function persistLead({
  phoneNumberId,
  from,
  customerName,
  lineConfig,
  text,
  referral,
  language,
  intentResult,
  transition,
  previousState
}) {
  const now = new Date().toISOString();
  const noReplyDueAt =
    transition.status === LEAD_STATUS.PENDING
      ? previousState?.noReplyDueAt ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : "";

  const payload = {
    phone: from,
    customerName,
    branch: lineConfig.branch,
    staffNumber: lineConfig.staffNumber,
    phoneNumberId,
    language,
    sourceLabel: SOURCE_LABEL,
    entrySource: hasConfirmedMetaAdReferral(referral) ? "Referral" : "Existing Ad Lead",
    referralSourceId: referral?.source_id || "",
    firstMessage: text,
    firstSeenAt: previousState?.firstSeenAt || now,
    lastMessage: text,
    lastCustomerMessageAt: now,
    currentStatus: transition.status,
    lastIntent: intentResult.intent,
    transitionReason: transition.reason,
    noReplyDueAt
  };

  const result = await callObserverSheetApi("upsert_lead", payload);

  const nextState = {
    status: transition.status,
    firstSeenAt: previousState?.firstSeenAt || now,
    noReplyDueAt,
    language,
    customerName
  };

  updateLeadCache(phoneNumberId, from, nextState, true);

  return {
    result: result.result || {},
    state: nextState
  };
}

async function processLeadMessage({
  phoneNumberId,
  from,
  customerName,
  lineConfig,
  textBody,
  referral
}) {
  const staffNumber = lineConfig.staffNumber;
  const language = detectLanguage(textBody);
  const confirmedAdEntry = hasConfirmedMetaAdReferral(referral);
  const intentResult = classifyLeadIntent(textBody, lineConfig);
  const loaded = await loadLeadState(phoneNumberId, from, staffNumber);

  // If persistent state cannot be read, only a message carrying a confirmed
  // Meta referral may attempt a safe upsert. Other messages are skipped.
  if (!loaded.ok && !confirmedAdEntry) {
    console.log(`[${staffNumber} State Machine][SHEET] skipped: persistent state unavailable`, {
      from,
      intent: intentResult.intent
    });
    return;
  }

  // Source verification and intent classification stay separate:
  // referral/source_id proves ad acquisition; message content chooses the state.
  // Once admitted, later messages continue the same branch timeline without referral.
  if (loaded.ok && !loaded.found && !confirmedAdEntry) {
    console.log(`[${staffNumber} State Machine][SHEET] ignored untracked conversation`, {
      from,
      text: textBody,
      intent: intentResult.intent,
      reason: "no_confirmed_ad_entry"
    });
    return;
  }

  const previousState = loaded.state || null;
  const previousStatus = previousState?.status || "";
  const transition = transitionLeadState(previousStatus, intentResult.intent);

  const persist = shouldPersistTransition({
    found: loaded.found,
    previousStatus,
    nextStatus: transition.status,
    confirmedAdEntry
  });

  console.log(`[${staffNumber} State Machine][SHEET]`, {
    branch: lineConfig.branch,
    phoneNumberId,
    from,
    text: textBody,
    language,
    confirmedAdEntry,
    intent: intentResult.intent,
    previousStatus,
    status: transition.status,
    intentReason: intentResult.reason,
    transitionReason: transition.reason,
    stateSource: loaded.source,
    persist
  });

  if (!persist) {
    const memoryState = {
      ...(previousState || {}),
      status: transition.status,
      language: language || previousState?.language || "",
      customerName: customerName || previousState?.customerName || "",
      noReplyDueAt:
        transition.status === LEAD_STATUS.PENDING
          ? previousState?.noReplyDueAt ||
            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : ""
    };

    updateLeadCache(phoneNumberId, from, memoryState, loaded.found);
    return;
  }

  try {
    const saved = await persistLead({
      phoneNumberId,
      from,
      customerName,
      lineConfig,
      text: textBody,
      referral,
      language,
      intentResult,
      transition,
      previousState
    });

    console.log(`[${staffNumber} Sheet] persisted`, {
      phoneNumberId,
      from,
      created: Boolean(saved.result.created),
      row: saved.result.row || "",
      status: saved.state.status,
      noReplyDueAt: saved.state.noReplyDueAt
    });
  } catch (error) {
    console.error(`[${staffNumber} Sheet] write failed`, {
      phoneNumberId,
      from,
      status: transition.status,
      error: error.message
    });
  }
}

function enqueueLeadTask(key, task) {
  const previous = leadQueues.get(key) || Promise.resolve();

  const next = previous
    .catch(() => {})
    .then(task)
    .finally(() => {
      if (leadQueues.get(key) === next) {
        leadQueues.delete(key);
      }
    });

  leadQueues.set(key, next);
  return next;
}

async function processWebhookBody(body) {
  const entries = Array.isArray(body?.entry) ? body.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    for (const change of changes) {
      const value = change?.value || {};
      const phoneNumberId = String(value?.metadata?.phone_number_id || "").trim();
      const displayPhoneNumber = String(value?.metadata?.display_phone_number || "").trim();
      const lineConfig = OBSERVER_LINES.get(phoneNumberId);

      if (!lineConfig) {
        console.log("[Observer] ignored unknown phone number", {
          phoneNumberId,
          displayPhoneNumber
        });
        continue;
      }

      const messages = Array.isArray(value.messages) ? value.messages : [];
      const statuses = Array.isArray(value.statuses) ? value.statuses : [];

      if (!messages.length && statuses.length) {
        console.log("[Observer] status acknowledged", {
          branch: lineConfig.branch,
          phoneNumberId,
          statuses: statuses
            .map((item) => item?.status || "")
            .filter(Boolean)
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
          branch: lineConfig.branch,
          phoneNumberId,
          displayPhoneNumber,
          from,
          customerName,
          messageType,
          text: textBody,
          hasReferral: Boolean(referral),
          referralSourceId: referral?.source_id || ""
        });

        const key = getLeadKey(phoneNumberId, from);

        enqueueLeadTask(key, () =>
          processLeadMessage({
            phoneNumberId,
            from,
            customerName,
            lineConfig,
            textBody,
            referral
          })
        ).catch((error) => {
          console.error(`[${lineConfig.staffNumber} Processor] unexpected error`, {
            phoneNumberId,
            from,
            error: error.message
          });
        });
      }
    }
  }
}

const CLASSIFIER_VERSION = "811_616_state_machine_sheet_v1_5_line_key";

app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "ICONIC WhatsApp Observer",
    mode: "observer_only",
    classifier: CLASSIFIER_VERSION,
    sheetIntegration: sheetIntegrationConfigured() ? "configured" : "missing_env",
    lines: ["811", "616"]
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "ICONIC WhatsApp Observer",
    mode: "observer_only",
    classifier: CLASSIFIER_VERSION,
    sheetIntegration: sheetIntegrationConfigured() ? "configured" : "missing_env",
    cachedLeads: leadStateCache.size,
    queuedLeads: leadQueues.size,
    time: new Date().toISOString()
  });
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge || "");
  }

  return res.sendStatus(403);
});

app.post("/webhook", (req, res) => {
  const body = req.body || {};

  // Acknowledge Meta immediately. Processing remains observer-only and async.
  res.sendStatus(200);

  setImmediate(() => {
    processWebhookBody(body).catch((error) => {
      console.error("[Observer] webhook processing error", error);
    });
  });
});

app.listen(PORT, () => {
  console.log(`ICONIC WhatsApp Observer running on port ${PORT}`);
  console.log("Mode: observer_only");
  console.log(`Classifier: ${CLASSIFIER_VERSION}`);
  console.log(`Sheet integration: ${sheetIntegrationConfigured() ? "configured" : "missing_env"}`);
});
