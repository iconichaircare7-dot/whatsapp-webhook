const express = require('express');
const app = express();

app.use(express.json());

const VERIFY_TOKEN = "iconic_token";

const ACCESS_TOKEN = "EAAKCtnC52dMBRET8Xi1zxwwXAnsRFFGlpmaViKnYZCSGrZAia5l4XZBp74fCAvZBbrhxDxwQfU7rZARP4mUBx8g0VSZB9jy2Ff8ACSwD9xTcrV81zdQp8f1AZALlEZACWSgwgx3wI7o3YJ4zUS4MXhZBReoANS1OWjpUyAOhPHiDT4uD6CFf15VD8HqPWMWZBzMvGkW4PO2RZB97beJYYK6NInecwuZCBoNKiMoIAYv0QdswAkRPEwT2ZA0DEcvSxnV2UVHj65mI8qFi5M1uITCo2TrsZArgpG0QIZA5j2TC46vWlwZD";

const PHONE_NUMBER_ID = "1067476329783257";

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

      const text =
        message.text?.body?.toLowerCase() || "";

      const now = new Date();

      const hour = now.getHours();

      let replyText = "";

      /* خارج الدوام */

      if (hour < 10 || hour >= 19) {

        replyText =
          "Thank you for contacting Iconic Hair Care.\n\n" +
          "Our working hours are:\n" +
          "10:00 AM to 7:00 PM\n\n" +
          "Your message has been received.\n" +
          "Our team will respond during working hours.";

      }

      /* حجز استشارة */

      else if (

        text === "1" ||
        text.includes("consultation") ||
        text.includes("book") ||
        text.includes("حجز")

      ) {

        replyText =
          "To book a consultation, please provide the following details:\n\n" +
          "Full Name:\n" +
          "Phone Number:\n" +
          "Service Required:\n" +
          "Preferred Branch:\n" +
          "Preferred Date and Time:";

      }

      /* التحدث مع موظف */

      else if (

        text === "6" ||
        text.includes("staff") ||
        text.includes("موظف")

      ) {

        replyText =
          "Your request has been forwarded to our staff.\n\n" +
          "A team member will contact you shortly.";

      }

      /* المواقع */

      else if (

        text === "5" ||
        text.includes("location") ||
        text.includes("موقع")

      ) {

        replyText =
          "Our branches:\n\n" +
          "Dubai:\n" +
          "https://maps.google.com/?q=Iconic+Hair+Care+Dubai\n\n" +
          "Abu Dhabi:\n" +
          "https://maps.google.com/?q=Iconic+Hair+Care+Abu+Dhabi";

      }

      /* الرد الافتراضي */

      else {

        replyText =
          "Welcome to Iconic Hair Care\n\n" +
          "Thank you for contacting Iconic Hair Care Center.\n" +
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
