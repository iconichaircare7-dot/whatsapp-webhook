const express = require('express');
const app = express();

app.use(express.json());

const VERIFY_TOKEN = "iconic_token";

// ضع التوكن هنا
const ACCESS_TOKEN = "EAAKCtnC52dMBRMmRWs7s9WAHYjWQkIvSbcAqDQA1YU824mBa4f57pvlrARmfZBWPupZCnT9PsgzqI5GynoZCKVsOFDSVl600lFP10JhmumHqTIzZBXY0aKDBwOEGm7wCb7dQcVrOZBpnJeHZCxqDQs6ZAc8cmeLS4RtRcHfTat0PwkqXD6thy0ZB3ZC7og9qLJM2WZCIs8HnkMyIalEi2TRXHyhom2aenW0OWPfqG5dSfKqReVgx1O995VKIMtXL3F371ZAhuTq5o81N6QWXdbIW9hhLJzBns8mKp5AzJuVKQZDZD";

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

// استقبال الرسائل والرد تلقائي
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

      // إرسال رد تلقائي
      await fetch(
        "https://graph.facebook.com/v18.0/1067476329783257/messages",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: from,
            type: "text",
            text: {
              body: "أهلًا بك في Iconic Hair Care 👋\nكيف يمكننا مساعدتك؟"
            }
          })
        }
      );
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("Error:", error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
