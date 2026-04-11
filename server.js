const express = require('express');
const fetch = require('node-fetch');

const app = express();

app.use(express.json());

const VERIFY_TOKEN = "iconic_token";
const ACCESS_TOKEN = "EAAKCtnC52dMBRERF6M7EyKFGGc382gNL17JMGMkvekF0LxuYbgWrR5TUtnlU3tCFU7WjYpKMDROpVmzHg799TKr2cz1lwZAdwCRbGy6iJUon7I4o5YPvqXrWhoP3ypqMZCOcyd3FkzZBF5MSUtEnFn1TGPvhp6leyZCHl9kPe4ZCCudrifr9pX2A9b0as0z9wox5eDpwaoh4USifolk0LyC337KknNLTKF2ZBIYH3Q1XB20qCFwzcE9DZAE84MXofHEKOBNZC9gDLQaZAZAFnZAkVoCn43I8eEZCxep2eLN4xgZDZD";
const PHONE_NUMBER_ID = "1067476329783257";
const STAFF_NUMBER = "971503382303";

/* منع تكرار الرسائل */
const processedMessages = new Set();

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

app.post('/webhook', async (req, res) => {
  console.log("New webhook payload:");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const message =
      req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const messageId = message.id;
    if (processedMessages.has(messageId)) {
      console.log("Duplicate message ignored:", messageId);
      return res.sendStatus(200);
    }

    processedMessages.add(messageId);

    setTimeout(() => {
      processedMessages.delete(messageId);
    }, 5 * 60 * 1000);

    const from = message.from;
    const text = (message.text?.body || "").toLowerCase().trim();
    const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

    const now = new Date();
    const hour = now.getHours();

    let replyText = "";

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

    else if (text === "1") {
      replyText =
        "تم استلام طلبك لحجز استشارة.\n\n" +
        "سيقوم أحد موظفينا بالتواصل معك قريباً لتأكيد الموعد.\n\n" +
        "------------------------------\n\n" +
        "Your consultation request has been received.\n" +
        "Our team will contact you shortly.";
    }

    else if (text === "2") {
      replyText =
        "خدمات تركيب الشعر لدينا تشمل حلولاً مخصصة بمظهر طبيعي ونتيجة مناسبة لحالتك.\n\n" +
        "إذا رغبت بالمتابعة:\n" +
        "1 - حجز استشارة\n" +
        "6 - التحدث مع موظف\n\n" +
        "------------------------------\n\n" +
        "Our hair replacement services include customized solutions with a natural look based on your needs.\n\n" +
        "If you would like to proceed:\n" +
        "1 - Book Consultation\n" +
        "6 - Talk to Staff";
    }

    else if (text === "3") {
      replyText =
        "نوفر حلول شعر مستعار للنساء بتصاميم مختلفة ومظهر طبيعي.\n\n" +
        "إذا رغبت بالمتابعة:\n" +
        "1 - حجز استشارة\n" +
        "6 - التحدث مع موظف\n\n" +
        "------------------------------\n\n" +
        "We provide women wig solutions in different styles with a natural look.\n\n" +
        "If you would like to proceed:\n" +
        "1 - Book Consultation\n" +
        "6 - Talk to Staff";
    }

    else if (text === "4") {
      replyText =
        "نوفر خدمات الصيانة والتنظيف والعناية الدورية للحفاظ على أفضل نتيجة.\n\n" +
        "إذا رغبت بالمتابعة:\n" +
        "1 - حجز استشارة\n" +
        "6 - التحدث مع موظف\n\n" +
        "------------------------------\n\n" +
        "We provide maintenance, cleaning, and regular care services to maintain the best result.\n\n" +
        "If you would like to proceed:\n" +
        "1 - Book Consultation\n" +
        "6 - Talk to Staff";
    }

    else if (text === "5" || text.includes("location") || text.includes("موقع")) {
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

    else if (text === "6") {
      replyText =
        "تم تحويل طلبك إلى موظف.\n\n" +
        "سيتم التواصل معك قريباً.\n\n" +
        "------------------------------\n\n" +
        "Your request has been forwarded to our staff.";
    }

    else if (
      text.includes("price") ||
      text.includes("prices") ||
      text.includes("cost") ||
      text.includes("سعر") ||
      text.includes("الاسعار") ||
      text.includes("السعر")
    ) {
      replyText =
        "تختلف الأسعار حسب نوع الخدمة والحالة المطلوبة.\n\n" +
        "يمكننا مساعدتك بشكل أدق بعد معرفة الخدمة المناسبة لك.\n\n" +
        "1 - حجز استشارة\n" +
        "6 - التحدث مع موظف\n\n" +
        "------------------------------\n\n" +
        "Prices vary depending on the service and your case.\n\n" +
        "We can guide you better after understanding your needs.\n\n" +
        "1 - Book Consultation\n" +
        "6 - Talk to Staff";
    }

    else if (
      text.includes("hair replacement") ||
      text.includes("hair system") ||
      text.includes("patch") ||
      text.includes("تركيب شعر") ||
      text.includes("بديل شعر") ||
      text.includes("هير سيستم")
    ) {
      replyText =
        "خدمات تركيب الشعر لدينا مصممة لتمنحك مظهراً طبيعياً ونتيجة مناسبة لحالتك.\n\n" +
        "1 - حجز استشارة\n" +
        "6 - التحدث مع موظف\n\n" +
        "------------------------------\n\n" +
        "Our hair replacement services are designed to provide a natural look based on your needs.\n\n" +
        "1 - Book Consultation\n" +
        "6 - Talk to Staff";
    }

    else if (
      text.includes("wig") ||
      text.includes("wigs") ||
      text.includes("شعر مستعار") ||
      text.includes("باروكة") ||
      text.includes("باروكه")
    ) {
      replyText =
        "نوفر حلول شعر مستعار بتصاميم مختلفة وبمظهر طبيعي.\n\n" +
        "1 - حجز استشارة\n" +
        "6 - التحدث مع موظف\n\n" +
        "------------------------------\n\n" +
        "We provide women wig solutions in different styles with a natural look.\n\n" +
        "1 - Book Consultation\n" +
        "6 - Talk to Staff";
    }

    else if (
      text.includes("maintenance") ||
      text.includes("cleaning") ||
      text.includes("صيانة") ||
      text.includes("تنظيف")
    ) {
      replyText =
        "نوفر خدمات الصيانة والتنظيف والعناية الدورية.\n\n" +
        "1 - حجز استشارة\n" +
        "6 - التحدث مع موظف\n\n" +
        "------------------------------\n\n" +
        "We provide maintenance, cleaning, and regular care services.\n\n" +
        "1 - Book Consultation\n" +
        "6 - Talk to Staff";
    }

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
        "------------------------------\n\n" +
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

    const customerPayload = {
      messaging_product: "whatsapp",
      to: from,
      type: "text",
      text: { body: replyText }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(customerPayload)
    });

    const data = await response.json();
    console.log("Customer response:");
    console.log(data);

    if (text === "1" || text === "6") {
      try {
        const staffBody =
          text === "1"
            ? "طلب استشارة جديد\n\n" +
              "رقم العميل:\n" +
              from +
              "\n\n" +
              "يرجى التواصل مع العميل لتأكيد الموعد.\n\n" +
              "--------------------------------\n\n" +
              "New Consultation Request\n\n" +
              "Customer Number:\n" +
              from +
              "\n\n" +
              "Please contact the client to confirm the appointment."
            : "طلب تواصل مباشر مع موظف\n\n" +
              "رقم العميل:\n" +
              from +
              "\n\n" +
              "يرغب العميل بالتحدث مع موظف.\n\n" +
              "--------------------------------\n\n" +
              "Direct Staff Request\n\n" +
              "Customer Number:\n" +
              from +
              "\n\n" +
              "The client would like to speak with a staff member.";

        const staffPayload = {
          messaging_product: "whatsapp",
          to: STAFF_NUMBER,
          type: "text",
          text: { body: staffBody }
        };

        const staffResponse = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(staffPayload)
        });

        const staffData = await staffResponse.json();
        console.log("Staff notification:");
        console.log(staffData);
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
