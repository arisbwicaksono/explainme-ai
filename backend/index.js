import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// MEMORY CHAT SEMENTARA
const conversationMemory = new Map();

// GEMINI AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend ExplainMe AI Running");
});

// CHAT ROUTE
app.post("/api/chat", async (req, res) => {

  try {

    const { message, sessionId } = req.body;

    // IDENTITAS USER
    const memoryKey =
      sessionId ||
      `${req.ip}-${req.headers["user-agent"] || "unknown"}`;

    // AMBIL HISTORY
    const history =
      conversationMemory.get(memoryKey) || [];

    // BATASI MEMORY
    const historyContext = history
      .slice(-4)
      .map(
        (item) =>
          `${item.sender === "user" ? "User" : "AI"}: ${item.text}`
      )
      .join("\n");

    // PROMPT AI
    const prompt = `
Kamu adalah ExplainMe AI.

Tugasmu menjelaskan topik rumit menjadi sederhana, santai, dan mudah dipahami oleh orang awam.

Aturan:
- Jawab maksimal 2 paragraf pendek.
- Gunakan bahasa Indonesia yang natural dan santai.
- Hindari istilah teknis yang rumit.
- Gunakan analogi sederhana jika membantu penjelasan.
- Fokus langsung ke inti jawaban.
- Jangan terlalu panjang.
- Di akhir jawaban, tanyakan apakah ada lagi yang ingin ditanyakan atau tawarkan topik terkait yang masih berhubungan.

${historyContext ? `Percakapan sebelumnya:\n${historyContext}\n\n` : ""}

Pertanyaan user:
${message}
`;

    // TIMEOUT PROTECTION
    const controller = new AbortController();

    setTimeout(() => {
      controller.abort();
    }, 15000);

    // REQUEST KE GEMINI
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      signal: controller.signal,
    });

    // AMBIL TEXT RESPONSE
    const replyText =
      response.text ||
      response.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Maaf, terjadi kesalahan saat memproses jawaban AI.";

    // SIMPAN HISTORY
    history.push({
      sender: "user",
      text: message,
    });

    history.push({
      sender: "ai",
      text: replyText,
    });

    // BATASI TOTAL MEMORY
    if (history.length > 8) {
      history.splice(0, history.length - 8);
    }

    // UPDATE MEMORY
    conversationMemory.set(memoryKey, history);

    // RESPONSE KE FRONTEND
    res.json({
      reply: replyText,
    });

  } catch (error) {

    // LOG ERROR DETAIL
    console.error(
      "AI request error:",
      JSON.stringify(error, null, 2)
    );

    // DEFAULT ERROR
    let statusCode = 500;
    let clientMessage = "Terjadi error pada AI";

    let details =
      error?.message ||
      String(error) ||
      "Unknown error";

    // DETEKSI QUOTA ERROR
    try {

      const errStr =
        typeof error === "string"
          ? error
          : JSON.stringify(error);

      if (
        (errStr &&
          errStr.includes("RESOURCE_EXHAUSTED")) ||
        (errStr &&
          errStr.toLowerCase().includes("quota exceeded")) ||
        error?.code === 429
      ) {

        statusCode = 429;

        clientMessage =
          "Kuota AI habis. Silakan coba lagi nanti.";

      }

    } catch (e) {
      // ignore
    }

    // KIRIM ERROR KE FRONTEND
    res.status(statusCode).json({
      error: clientMessage,
      details,
    });

  }

});

// JALANKAN SERVER
app.listen(3000, () => {
  console.log("Server berjalan di port 3000");
});