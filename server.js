const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const VERIFY_TOKEN = "iconic_token";
const ACCESS_TOKEN = "EAAKCtnC52dMBRERF6M7EyKFGGc382gNL17JMGMkvekF0LxuYbgWrR5TUtnlU3tCFU7WjYpKMDROpVmzHg799TKr2cz1lwZAdwCRbGy6iJUon7I4o5YPvqXrWhoP3ypqMZCOcyd3FkzZBF5MSUtEnFn1TGPvhp6leyZCHl9kPe4ZCCudrifr9pX2A9b0as0z9wox5eDpwaoh4USifolk0LyC337KknNLTKF2ZBIYH3Q1XB20qCFwzcE9DZAE84MXofHEKOBNZC9gDLQaZAZAFnZAkVoCn43I8eEZCxep2eLN4xgZDZD";
const PHONE_NUMBER_ID = "1067476329783257";
const STAFF_NUMBER = "971503382303";

/* Webhook verification */

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verified!");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/* Receive messages */

app.post('/webhook', async (req, res) => {
  console.log("New webhook payload:");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const message =
      req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;
    const text = (message.text?.body || "").toLowerCase().trim();

    const url =
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

    const now = new Date();
    const hour = now.getHours();

    let replyText = "";

    /* Outside working hours */

    if (hour < 10 || hour >= 19) {

      replyText =
        "شكراً لتواصلك مع Iconic Hair Care.\n\n" +
        "ساعات العمل:\n" +
        "10:00 صباحاً إلى 7:00 مساءً\n\n" +
        "تم استلام رسالتك وسيتم الرد عليك خلال ساعات العمل.\n\n" +
        "------------------------------\n\n" +
        "Thank you for contacting Iconic Hair Care.\n\n" +
        "Our working hours are:\n" +
        "10:00 AM to 7:00 PM\n\n" +
        "Your message has been received and we will respond during working hours.";

    }

    /* Option 1 — Consultation */

    else if (text === "1") {

      replyText =
        "تم استلام طلب الاستشارة الخاص بك ✅\n" +
        "سيقوم فريقنا بالتواصل معك قريباً.\n\n" +
        "------------------------------\n\n" +
        "Your consultation request has been received ✅\n" +
        "Our team will contact you shortly.";

    }

    /* Option 6 — Staff */

    else if (text === "6") {

      replyText =
        "تم تحويل طلبك إلى أحد موظفينا ✅\n" +
        "سيتم التواصل معك قريباً.\n\n" +
        "------------------------------\n\n" +
        "Your request has been forwarded to our staff.";

    }

    /* Location */

    else if (
      text === "5" ||
      text.includes("location") ||
      text.includes("موقع")
    ) {

      replyText =
        "فروعنا:\n\n" +
        "دبي:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Dubai\n\n" +
        "أبوظبي:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Abu+Dhabi\n\n" +
        "------------------------------\n\n" +
        "Our branches:\n\n" +
        "Dubai:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Dubai\n\n" +
        "Abu Dhabi:\n" +
        "https://maps.google.com/?q=Iconic+Hair+Care+Abu+Dhabi";

    }

    /* Prices */

    else if (
      text.includes("price") ||
      text.includes("prices") ||
      text.includes("cost") ||
      text.includes("سعر") ||
      text.includes("الاسعار")
    ) {

      replyText =
        "تختلف الأسعار حسب نوع الخدمة والحالة المطلوبة.\n\n" +
        "يرجى اختيار أحد الخيارات التالية:\n\n" +
        "1 - طلب استشارة\n" +
        "6 - التحدث مع موظف\n\n" +
        "------------------------------\n\n" +
        "Prices vary depending on the service and your case.\n\n" +
        "Please choose one of the following:\n\n" +
        "1 - Consultation\n" +
        "6 - Talk to Staff";

    }

    /* Default Menu */

    else {

      replyText =
        "مرحباً بك في Iconic Hair Care ✨\n\n" +
        "يرجى اختيار الخدمة المطلوبة:\n\n" +
        "1 - طلب استشارة\n" +
        "6 - التحدث مع موظف\n" +
        "5 - المواقع وساعات العمل\n\n" +
        "------------------------------\n\n" +
        "Welcome to Iconic Hair Care ✨\n\n" +
        "Please choose an option:\n\n" +
        "1 - Consultation\n" +
        "6 - Talk to Staff\n" +
        "5 - Locations and Working Hours";

    }

    /* Send message to customer */

    const customerPayload = {
      messaging_product: "whatsapp",
      to: from,
      type: "text",
      text: { body: replyText }
    };

    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(customerPayload)
    });

    /* Notify staff */

    if (text === "1" || text === "6") {

      try {

        const staffBody =
          text === "1"

            ? "طلب استشارة جديد\n\n" +
              "رقم العميل:\n" +
              from +
              "\n\n" +
              "يرجى التواصل مع العميل.\n\n" +
              "------------------------------\n\n" +
              "New Consultation Request\n\n" +
              "Customer Number:\n" +
              from

            : "طلب تواصل مباشر مع موظف\n\n" +
              "رقم العميل:\n" +
              from +
              "\n\n" +
              "العميل يرغب بالتحدث مع موظف.\n\n" +
              "------------------------------\n\n" +
              "Direct Staff Request\n\n" +
              "Customer Number:\n" +
              from;

        const staffPayload = {
          messaging_product: "whatsapp",
          to: STAFF_NUMBER,
          type: "text",
          text: { body: staffBody }
        };

        await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(staffPayload)
        });

      } catch (staffError) {

        console.log("Staff notification failed:");
        console.log(staffError);

      }

    }

    return res.sendStatus(200);

  } catch (error) {

    console.error("Error sending reply:");
    console.error(error);

    return res.sendStatus(500);

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
