const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const { Client, middleware } = require("@line/bot-sdk");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, "data.json");

// 🟩 LINE Bot Config
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const lineClient = new Client(lineConfig);
const GROUP_ID = process.env.LINE_GROUP_ID || "C14991c0252e1bf8eea85a7c66eb0b0ef"; // fallback เผื่อไม่ได้ตั้งใน .env

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// 🟩 หน้าเว็บหลัก
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🟩 ดึงข้อมูลวัตถุดิบ
app.get("/data.json", (req, res) => {
  fs.readFile(DATA_PATH, "utf8", (err, data) => {
    if (err) {
      console.error("❌ อ่านไฟล์ data.json ไม่ได้:", err);
      return res.status(500).send("ไม่สามารถโหลดข้อมูลได้");
    }
    res.json(JSON.parse(data));
  });
});

// ✅ บันทึกข้อมูล + แจ้งเตือน LINE
app.post("/save", (req, res) => {
  const newData = req.body.data;
  const username = req.body.username || "ไม่ระบุชื่อ";

  if (!newData) {
    return res.status(400).send("❌ ไม่พบข้อมูล");
  }

  fs.writeFile(DATA_PATH, JSON.stringify(newData, null, 2), (err) => {
    if (err) {
      console.error("❌ บันทึกข้อมูลไม่สำเร็จ:", err);
      return res.status(500).send("❌ เกิดข้อผิดพลาดในการบันทึก");
    }

    console.log("✅ บันทึกข้อมูลสำเร็จแล้ว");

    const now = new Date();
    const dateStr = now.toLocaleDateString("th-TH");
    const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

    const message = {
      type: "flex",
      altText: "มีการปรับวัตถุดิบ",
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📦 มีการปรับวัตถุดิบ",
              weight: "bold",
              size: "lg",
              color: "#ffffff"
            }
          ],
          backgroundColor: "#3B82F6"
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            {
              type: "text",
              text: `👤 โดย: ${username}`,
              wrap: true
            },
            {
              type: "text",
              text: `🕒 เวลา: ${dateStr} ${timeStr}`,
              wrap: true
            }
          ]
        }
      }
    };

    console.log("ส่งแจ้งเตือนไปที่ Group ID:", GROUP_ID);

    lineClient.pushMessage(GROUP_ID, message)
      .then(() => {
        console.log("✅ ส่งแจ้งเตือนไป LINE แล้ว");
        res.status(200).send("✅ บันทึกและแจ้งเตือนเรียบร้อยแล้ว");
      })
      .catch((err) => {
        console.error("❌ แจ้งเตือน LINE ไม่สำเร็จ:", err);
        res.status(500).send("❌ บันทึกสำเร็จ แต่แจ้งเตือนไม่ได้");
      });
  });
});

// 🟩 Webhook รับข้อความจาก LINE
app.post("/webhook", (req, res) => {
  res.status(200).send("OK");

  const events = req.body.events;
  if (!events || events.length === 0) return;

  events.forEach((event) => {
    console.log("🟡 LINE Event:", JSON.stringify(event, null, 2));

    if (event.type === "message" && event.message.type === "text") {
      if (event.replyToken) {
        lineClient.replyMessage(event.replyToken, {
          type: "text",
          text: "✅ รับข้อความแล้ว: " + event.message.text,
        }).catch((err) => console.error("❌ reply error:", err));
      }
    }
  });
});

// ✅ ส่งปุ่ม "เปิดระบบ" ไปที่ LINE กลุ่มตอนรันเซิร์ฟเวอร์
function sendFlexOpenLink() {
  const message = {
    type: "flex",
    altText: "เปิดระบบจัดการวัตถุดิบ",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "ระบบจัดการวัตถุดิบร้านป.เคราทอง",
            weight: "bold",
            size: "lg"
          },
          {
            type: "button",
            style: "primary",
            action: {
              type: "uri",
              label: "เปิดระบบ",
              uri: "https://pokhaothong-ingredients.onrender.com/?groupId=C14991c0252e1bf8eea85a7c66eb0b0ef"
            }
          }
        ]
      }
    }
  };

  lineClient.pushMessage(GROUP_ID, message)
    .then(() => console.log("✅ ส่งปุ่มเปิดระบบไปยังกลุ่มแล้ว"))
    .catch((err) => console.error("❌ ส่งไม่สำเร็จ:", err));
}

// 🟩 เริ่มรันเซิร์ฟเวอร์
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  sendFlexOpenLink(); // 🟢 ส่ง Flex ตอนเริ่มเซิร์ฟเวอร์
});