Today 12:53 PM
اي نمستودع ؟
Pasted text(22).txt
Document

ممتاز جدًا 🔥 الاختبار نجح:

✅ فهم أن الفرع هو دبي
✅ احتفظ بمعلومة حل كامل
✅ لم يعِد سؤال التغطية أو الفرع
✅ انتقل مباشرة لمرحلة اختيار موعد

لكن ظهر خلل واحد واضح:

Today
Tomorrow
This Week

المحادثة عربية، لذلك الأزرار لازم تكون:

اليوم
غدًا
هذا الأسبوع

هلق من واتساب الحقيقي اضغط زر:

Tomorrow

لا تكتبه يدويًا. المفروض بعدها يسألك عن الوقت المناسب. ابعتلي الرد التالي.

برايك السياق نخلي في ازرار اجابة وهيك رحح يبان انو بوت او نشيل منو ازار الاجابة ؟

برأيي ما نشيل الأزرار بالكامل، لكن كمان ما نخليها بكل رد.

الأفضل لبوت 303 هو أسلوب هجين:

نخلي الأزرار فقط عند الاختيارات الواضحة

مثل:

دبي
أبوظبي
اليوم
غدًا
هذا الأسبوع
حجز استشارة
التحدث مع موظف

هون الأزرار تسرّع العميل وتقلل الأخطاء، وبتعطي تجربة مرتبة واحترافية.

نشيل الأزرار من الردود العادية

مثل سؤال السعر أو الموقع أو شرح الخدمة. ما لازم كل رد ينتهي بـ:

استشارة
قريبًا
نتائج

لأنها أزرار عامة وغير مرتبطة بالسؤال، وبتخلي المحادثة تبين آلية أكثر.

القرار النهائي لبوت 303

نحافظ على الأزرار، لكن فقط في نقاط القرار والحجز.
هيك البوت يبان ذكي ومنظم، مو روبوت يكرر قائمة جاهزة.

والرد الحالي بعد اختيار دبي ممتاز بالأزرار، لكن لازم تتعرب:

اليوم
غدًا
هذا الأسبوع

بدل:

Today
Tomorrow
This Week
تمام اشتغل عالموضوع وبعدين بنرجع الموضع انشا شات ع جوجول
Worked for 7m 36s

تمام 🔥 جهّزت تعديل سياسة الأزرار لبوت 303:

حذف أزرار استشارة / قريبًا / نتائج من الردود العادية.
الإبقاء على الأزرار فقط عند قرارات حقيقية: الفرع، الموعد، الحجز، والتحدث مع الفريق.
تعريب أزرار المواعيد تلقائيًا:
اليوم
غدًا
هذا الأسبوع
تعريب أزرار الفروع داخل المحادثة العربية.

حاولت أرفعه مباشرة إلى GitHub، لكن صلاحية الربط عندي ظهرت قراءة فقط 403، لذلك جهزت لك الملف كاملًا ومفحوصًا.

الخطوة الأولى فقط

نزّل هذا الملف:

button-policy.js

ثم داخل المستودع:

iconichaircare7-dot/whatsapp-webhook

والفرع:

inbox-303-ai

اضغط:

Add file → Upload files

وارفع button-policy.js ثم اعمل Commit على نفس الفرع.

اكتبلي تم، وبنعمل تعديل package.json مباشرة، وبعد الاختبار منرجع لإنشاء Google Sheet لسجل 303 والأسئلة التي لم يفهمها البوت.

عطيهني الملف txt 

تفضل:

button-policy.txt

Library
/
button-policy.txt
"use strict";

// 303 AI outbound reply-button policy.
// Loaded before server.js so customer-facing WhatsApp messages stay natural:
// - remove the generic Consultation / Coming Soon / Results button trio
// - keep true decision-point buttons
// - localize branch and booking-time buttons when the reply body is Arabic

const nativeFetch = typeof globalThis.fetch === "function"
  ? globalThis.fetch.bind(globalThis)
  : require("node-fetch");

const AI_303_PHONE_NUMBER_ID = (
  process.env.AI_303_PHONE_NUMBER_ID ||
  process.env.PHONE_NUMBER_ID ||
  "1110840048789988"
).toString().trim();

function normalizeText(value = "") {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/أ|إ|آ/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

function hasArabic(value = "") {
  return /[\u0600-\u06FF]/.test((value || "").toString());
}

function getReplyButtons(payload = {}) {
  const buttons = payload?.interactive?.action?.buttons;
  return Array.isArray(buttons) ? buttons : [];
}

function getButtonId(button = {}) {
  return (button?.reply?.id || "").toString().trim().toLowerCase();
}

function getButtonTitle(button = {}) {
  return (button?.reply?.title || "").toString().trim();
}

function setButtonTitle(button = {}, title = "") {
  if (button?.reply) button.reply.title = title;
}

function isGenericActionSet(buttons = []) {
  const ids = buttons.map(getButtonId);
  const titles = buttons.map((button) => normalizeText(getButtonTitle(button)));
  const values = [...ids, ...titles];

  const hasResults = values.some((value) =>
    value.includes("result") || value.includes("نتايج") || value.includes("نتائج")
  );
  const hasSoon = values.some((value) =>
    value.includes("soon") || value.includes("coming") || value.includes("قريبا") || value.includes("قريب")
  );
  const hasConsult = values.some((value) =>
    value.includes("consult") || value.includes("استشاره") || value.includes("استشارة")
  );

  return buttons.length >= 3 && hasResults && hasSoon && hasConsult;
}

function localizeDecisionButtons(buttons = [], bodyText = "") {
  if (!hasArabic(bodyText)) return false;

  let changed = false;

  buttons.forEach((button) => {
    const id = getButtonId(button);
    const title = normalizeText(getButtonTitle(button));

    if (id === "fast_time_today" || title === "today") {
      setButtonTitle(button, "اليوم");
      changed = true;
      return;
    }

    if (id === "fast_time_tomorrow" || title === "tomorrow") {
      setButtonTitle(button, "غدًا");
      changed = true;
      return;
    }

    if (id === "fast_time_week" || title === "this week") {
      setButtonTitle(button, "هذا الأسبوع");
      changed = true;
      return;
    }

    if (id === "fast_book_dubai" || title === "dubai") {
      setButtonTitle(button, "دبي");
      changed = true;
      return;
    }

    if (id === "fast_book_abudhabi" || title === "abu dhabi") {
      setButtonTitle(button, "أبوظبي");
      changed = true;
      return;
    }

    if (id === "talk_to_team" || title === "team") {
      setButtonTitle(button, "التحدث مع الفريق");
      changed = true;
    }
  });

  return changed;
}

function is303MessagesRequest(input = "") {
  const url = typeof input === "string" ? input : (input?.url || "").toString();
  return url.includes(`/${AI_303_PHONE_NUMBER_ID}/messages`);
}

function apply303ButtonPolicy(input, init = {}) {
  if (!is303MessagesRequest(input)) return init;
  if (!init || typeof init.body !== "string") return init;

  let payload;

  try {
    payload = JSON.parse(init.body);
  } catch (_) {
    return init;
  }

  if (
    payload?.messaging_product !== "whatsapp" ||
    payload?.type !== "interactive" ||
    payload?.interactive?.type !== "button"
  ) {
    return init;
  }

  const bodyText = (payload?.interactive?.body?.text || "").toString();
  const buttons = getReplyButtons(payload);

  if (!bodyText || !buttons.length) return init;

  if (isGenericActionSet(buttons)) {
    payload.type = "text";
    payload.text = { body: bodyText };
    delete payload.interactive;
    console.log("[303 Button Policy] generic action buttons removed; sent as natural text reply");
  } else if (localizeDecisionButtons(buttons, bodyText)) {
    console.log("[303 Button Policy] Arabic decision buttons localized");
  } else {
    return init;
  }

  return {
    ...init,
    body: JSON.stringify(payload)
  };
}

globalThis.fetch = function iconic303ButtonPolicyFetch(input, init) {
  return nativeFetch(input, apply303ButtonPolicy(input, init || {}));
};

Library
/
button-policy.txt
"use strict";

// 303 AI outbound reply-button policy.
// Loaded before server.js so customer-facing WhatsApp messages stay natural:
// - remove the generic Consultation / Coming Soon / Results button trio
// - keep true decision-point buttons
// - localize branch and booking-time buttons when the reply body is Arabic

const nativeFetch = typeof globalThis.fetch === "function"
  ? globalThis.fetch.bind(globalThis)
  : require("node-fetch");

const AI_303_PHONE_NUMBER_ID = (
  process.env.AI_303_PHONE_NUMBER_ID ||
  process.env.PHONE_NUMBER_ID ||
  "1110840048789988"
).toString().trim();

function normalizeText(value = "") {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/أ|إ|آ/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

function hasArabic(value = "") {
  return /[\u0600-\u06FF]/.test((value || "").toString());
}

function getReplyButtons(payload = {}) {
  const buttons = payload?.interactive?.action?.buttons;
  return Array.isArray(buttons) ? buttons : [];
}

function getButtonId(button = {}) {
  return (button?.reply?.id || "").toString().trim().toLowerCase();
}

function getButtonTitle(button = {}) {
  return (button?.reply?.title || "").toString().trim();
}

function setButtonTitle(button = {}, title = "") {
  if (button?.reply) button.reply.title = title;
}

function isGenericActionSet(buttons = []) {
  const ids = buttons.map(getButtonId);
  const titles = buttons.map((button) => normalizeText(getButtonTitle(button)));
  const values = [...ids, ...titles];

  const hasResults = values.some((value) =>
    value.includes("result") || value.includes("نتايج") || value.includes("نتائج")
  );
  const hasSoon = values.some((value) =>
    value.includes("soon") || value.includes("coming") || value.includes("قريبا") || value.includes("قريب")
  );
  const hasConsult = values.some((value) =>
    value.includes("consult") || value.includes("استشاره") || value.includes("استشارة")
  );

  return buttons.length >= 3 && hasResults && hasSoon && hasConsult;
}

function localizeDecisionButtons(buttons = [], bodyText = "") {
  if (!hasArabic(bodyText)) return false;

  let changed = false;

  buttons.forEach((button) => {
    const id = getButtonId(button);
    const title = normalizeText(getButtonTitle(button));

    if (id === "fast_time_today" || title === "today") {
      setButtonTitle(button, "اليوم");
      changed = true;
      return;
    }

    if (id === "fast_time_tomorrow" || title === "tomorrow") {
      setButtonTitle(button, "غدًا");
      changed = true;
      return;
    }

    if (id === "fast_time_week" || title === "this week") {
      setButtonTitle(button, "هذا الأسبوع");
      changed = true;
      return;
    }

    if (id === "fast_book_dubai" || title === "dubai") {
      setButtonTitle(button, "دبي");
      changed = true;
      return;
    }

    if (id === "fast_book_abudhabi" || title === "abu dhabi") {
      setButtonTitle(button, "أبوظبي");
      changed = true;
      return;
    }

    if (id === "talk_to_team" || title === "team") {
      setButtonTitle(button, "التحدث مع الفريق");
      changed = true;
    }
  });

  return changed;
}

function is303MessagesRequest(input = "") {
  const url = typeof input === "string" ? input : (input?.url || "").toString();
  return url.includes(`/${AI_303_PHONE_NUMBER_ID}/messages`);
}

function apply303ButtonPolicy(input, init = {}) {
  if (!is303MessagesRequest(input)) return init;
  if (!init || typeof init.body !== "string") return init;

  let payload;

  try {
    payload = JSON.parse(init.body);
  } catch (_) {
    return init;
  }

  if (
    payload?.messaging_product !== "whatsapp" ||
    payload?.type !== "interactive" ||
    payload?.interactive?.type !== "button"
  ) {
    return init;
  }

  const bodyText = (payload?.interactive?.body?.text || "").toString();
  const buttons = getReplyButtons(payload);

  if (!bodyText || !buttons.length) return init;

  if (isGenericActionSet(buttons)) {
    payload.type = "text";
    payload.text = { body: bodyText };
    delete payload.interactive;
    console.log("[303 Button Policy] generic action buttons removed; sent as natural text reply");
  } else if (localizeDecisionButtons(buttons, bodyText)) {
    console.log("[303 Button Policy] Arabic decision buttons localized");
  } else {
    return init;
  }

  return {
    ...init,
    body: JSON.stringify(payload)
  };
}

globalThis.fetch = function iconic303ButtonPolicyFetch(input, init) {
  return nativeFetch(input, apply303ButtonPolicy(input, init || {}));
};
