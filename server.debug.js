
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
const LAST_USER_PATH = path.join(__dirname, "lastUser.json");

// LINE Config
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const lineClient = new Client(lineConfig);
const GROUP_ID = process.env.LINE_GROUP_ID;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.post("/webhook", middleware(lineConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then(() => res.end());
});

async function handleEvent(event) {
  try {
    console.log("📥 Event ที่เข้ามา:", JSON.stringify(event, null, 2));

    if (!event.source || !event.source.userId) {
      console.log("⛔ ไม่มี userId ใน event");
      return;
    }

    if (event.type !== "message" && event.type !== "postback") {
      console.log("⏭ ข้าม event ประเภทนี้:", event.type);
      return;
    }

    const userId = event.source.userId;
    console.log("✅ ได้ userId:", userId);

    fs.writeFileSync(LAST_USER_PATH, JSON.stringify({ userId }), "utf8");
    console.log("💾 บันทึก lastUser.json เรียบร้อย");
  } catch (err) {
    console.error("❌ ERROR ใน handleEvent:", err);
  }
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/data.json", (req, res) => {
  fs.readFile(DATA_PATH, "utf8", (err, data) => {
    if (err) {
      res.status(500).json({ error: "อ่าน data.json ไม่ได้" });
    } else {
      res.json(JSON.parse(data));
    }
  });
});

app.post("/save", async (req, res) => {
  try {
    if (!fs.existsSync(LAST_USER_PATH)) {
      return res.status(400).json({ error: "ยังไม่มีข้อมูลผู้ใช้ล่าสุด กรุณาพิมพ์ใน LINE กลุ่มก่อน" });
    }

    const lastUserRaw = fs.readFileSync(LAST_USER_PATH, "utf8");
    const { userId } = JSON.parse(lastUserRaw);

    const profile = await lineClient.getProfile(userId);
    const name = profile.displayName;

    const now = new Date();
    const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    const dateStr = now.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

    const message = `📌 ${name} ปรับปรุงรายการวัตถุดิบแล้ว\n🕓 เวลา ${timeStr} วันที่ ${dateStr}`;
    await lineClient.pushMessage(GROUP_ID, { type: "text", text: message });

    res.json({ message: "ส่งแจ้งเตือนไปที่ LINE group แล้ว" });
  } catch (err) {
    console.error("❌ SAVE ERROR:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึก" });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server เริ่มทำงานที่พอร์ต", PORT);
});
