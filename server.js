const express = require('express');
const app = express();

app.use(express.json());

const VERIFY_TOKEN = "iconic_token";

// ضع التوكن الحقيقي هنا
const ACCESS_TOKEN = "EAAKCtnC52dMBRFwGfmsZBQv9qJtUWSemfoTT54qfZAjc6KUl478QHkj630FPAZC7njJ8cBPqxWMXkigqZA2JufHViyeTuyKRZC5UcLoI2PYX1EoUj5UhIKOHMZCsy6W4lZB6TbB6J4nKzFDiTlWFItkihF69mas8hFCZB7v7NdLb46e4ZAsSv20f9s5zB4JihhexrfBcha2DQnu1qsEr6HYNdGxBaFB5XUs3UYC2jWVsdO1rCESHCLIxYBAgc1JWNtrX3M2UdZCnGZAQoiq0BFRoXb3JsMZCvBwNsym1h44jhgZDZD";

// رقم الهاتف ID (موجود عندك)
const PHONE_NUMBER_ID = "1067476329783257";

// تحقق من Webhook
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

// استقبال الرسائل والرد
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

      const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

      const payload = {
        messaging_product: "whatsapp",
        to: from,
        type: "text",
        text: {
          body: "أهلًا بك في Iconic Hair Care 👋\nتم استلام رسالتك."
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      console.log("Response from Meta:");
      console.log(data);
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("Error sending reply:");
    console.error(error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
