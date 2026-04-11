const express = require('express');
const fetch = require('node-fetch');

const app = express();

app.use(express.json());

const VERIFY_TOKEN = "iconic_token";

/* ضع التوكن الخاص بك هنا */
const ACCESS_TOKEN = "EAAKCtnC52dMBRET8Xi1zxwwXAnsRFFGlpmaViKnYZCSGrZAia5l4XZBp74fCAvZBbrhxDxwQfU7rZARP4mUBx8g0VSZB9jy2Ff8ACSwD9xTcrV81zdQp8f1AZALlEZACWSgwgx3wI7o3YJ4zUS4MXhZBReoANS1OWjpUyAOhPHiDT4uD6CFf15VD8HqPWMWZBzMvGkW4PO2RZB97beJYYK6NInecwuZCBoNKiMoIAYv0QdswAkRPEwT2ZA0DEcvSxnV2UVHj65mI8qFi5M1uITCo2TrsZArgpG0QIZA5j2TC46vWlwZD";

/* رقم الهاتف ID */
const PHONE_NUMBER_ID = "1067476329783257";
const STAFF_NUMBER = "971503382303";

/* تحقق من Webhook */

app.get('/webhook', (req, res) => {

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {

    console.log("Webhook verified!");
    return res.status(200).send(challenge);

  } else {

    return res.sendStatus(403);

  }

});

/* استقبال الرسائل */

app.post('/webhook', async (req, res) => {

  console.log("📩 رسالة جديدة:");
  console.log(JSON.stringify(req.body, null, 2));

  try {

    const message =
      req.body.entry &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0];

    if (message) {

      const from = message.from;

      console.log("📨 رسالة من:", from);

      const text =
        message.text?.body?.toLowerCase() || "";

      const now = new Date();
      const hour = now.getHours();

      let replyText = "";

      /* خارج الدوام */

      if (hour < 10 || hour >= 19) {

        replyText =
          "شكراً لتواصلك مع Iconic Hair Care.\n\n" +
          "ساعات العمل:\n" +
          "10:00 صباحاً إلى 7:00 مساءً\n\n" +
          "تم استلام رسالتك وسيتم الرد عليك خلال ساعات العمل.\n\n" +
          "--------------------------------\n\n" +
          "Thank you for contacting Iconic Hair Care.\n\n" +
          "Our working hours are:\n" +
          "10:00 AM to 7:00 PM\n\n" +
          "Your message has been received and we will respond during working hours.";

      }

else if (text === "1") {

  replyText =
    "تم استلام طلبك لحجز استشارة.\n\n" +
    "سيقوم أحد موظفينا بالتواصل معك قريباً لتأكيد الموعد.\n\n" +
    "--------------------------------\n\n" +
    "Your consultation request has been received.\n" +
    "Our team will contact you shortly.";

  const staffPayload = {
    messaging_product: "whatsapp",
    to: STAFF_NUMBER,
    type: "text",
    text: {
      body:
        "طلب استشارة جديد\n\n" +
        "رقم العميل:\n" +
        from + "\n\n" +
        "يرجى التواصل مع العميل لتأكيد الموعد."
    }
  };

  await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(staffPayload)
  });

}

     /* التحدث مع موظف */

else if (text === "6") {

  replyText =
    "تم تحويل طلبك إلى موظف.\n\n" +
    "سيتم التواصل معك قريباً.\n\n" +
    "--------------------------------\n\n" +
    "Your request has been forwarded to our staff.";

  const staffPayload = {
    messaging_product: "whatsapp",
    to: STAFF_NUMBER,
    type: "text",
    text: {
      body:
        "طلب تواصل مباشر مع موظف\n\n" +
        "رقم العميل:\n" +
        from + "\n\n" +
        "يرغب العميل بالتحدث مع موظف."
    }
  };

  await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(staffPayload)
  });

}

      /* المواقع */

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
          "--------------------------------\n\n" +
          "Our branches:\n\n" +
          "Dubai:\n" +
          "https://maps.google.com/?q=Iconic+Hair+Care+Dubai\n\n" +
          "Abu Dhabi:\n" +
          "https://maps.google.com/?q=Iconic+Hair+Care+Abu+Dhabi";

      }

      /* إذا أرسل العميل بيانات */

      else if (
        text.includes("name") ||
        text.includes("phone") ||
        text.includes("service") ||
        text.includes("date") ||
        text.includes("time") ||
        text.includes("اسم") ||
        text.includes("رقم") ||
        text.includes("موعد")
      ) {

        replyText =
          "تم استلام طلبك بنجاح.\n\n" +
          "سيقوم فريقنا بالتواصل معك قريباً لتأكيد الموعد.\n\n" +
          "--------------------------------\n\n" +
          "Your consultation request has been received successfully.\n\n" +
          "Our team will contact you shortly to confirm your appointment.";

      }

      /* الرد الافتراضي */

      else {

        replyText =
          "مرحباً بك في مركز Iconic Hair Care.\n\n" +
          "نحن متخصصون في تركيب الشعر، الشعر المستعار، والعناية المتقدمة بالشعر للرجال والنساء.\n\n" +
          "فروعنا:\n" +
          "دبي\n" +
          "أبوظبي\n\n" +
          "يرجى كتابة استفسارك أو اختيار أحد الخيارات التالية:\n\n" +
          "1 - حجز استشارة\n" +
          "2 - خدمات تركيب الشعر\n" +
          "3 - الشعر المستعار للنساء\n" +
          "4 - الصيانة والتنظيف\n" +
          "5 - المواقع وساعات العمل\n" +
          "6 - التحدث مع موظف\n\n" +
          "--------------------------------\n\n" +
          "Welcome to Iconic Hair Care.\n\n" +
          "We specialize in advanced hair replacement solutions, custom wigs, and professional hair care services for men and women.\n\n" +
          "Our branches:\n" +
          "Dubai\n" +
          "Abu Dhabi\n\n" +
          "Please write your inquiry or select one of the following options:\n\n" +
          "1 - Book Consultation\n" +
          "2 - Hair Replacement Services\n" +
          "3 - Women Wigs\n" +
          "4 - Maintenance and Cleaning\n" +
          "5 - Locations and Working Hours\n" +
          "6 - Talk to Staff";

      }

      const url =
        `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

      const payload = {

        messaging_product: "whatsapp",

        to: from,

        type: "text",

        text: {
          body: replyText
        }

      };

      const response = await fetch(
        url,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      console.log("Response from Meta:");
      console.log(data);

    }

    res.sendStatus(200);

  }

  catch (error) {

    console.error("Error sending reply:");
    console.error(error);

    res.sendStatus(500);

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

});
