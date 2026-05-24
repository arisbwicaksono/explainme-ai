import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const conversationMemory = new Map();

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
    const memoryKey = sessionId || `${req.ip}-${req.headers["user-agent"] || "unknown"}`;
    const history = conversationMemory.get(memoryKey) || [];

    const historyContext = history
      .slice(-10)
      .map((item) => `${item.sender === "user" ? "User" : "AI"}: ${item.text}`)
      .join("\n");

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

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });

    const replyText =
      response.text ||
      response.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Maaf, terjadi kesalahan saat memproses jawaban AI.";

    history.push({ sender: "user", text: message });
    history.push({ sender: "ai", text: replyText });
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    conversationMemory.set(memoryKey, history);

    res.json({
      reply: replyText,
    });

  } catch (error) {

    console.error("AI request error:", error);

    // Default response
    let statusCode = 500;
    let clientMessage = "Terjadi error pada AI";
    let details = error?.message || String(error) || "Unknown error";

    // Detect quota / rate limit errors and return 429 so frontend can show a friendly message
    try {
      const errStr = typeof error === "string" ? error : JSON.stringify(error);
      if (
        (errStr && errStr.includes("RESOURCE_EXHAUSTED")) ||
        (errStr && errStr.toLowerCase().includes("quota exceeded")) ||
        error?.code === 429
      ) {
        statusCode = 429;
        clientMessage = "Kuota AI habis. Silakan coba lagi nanti atau gunakan API key lain.";
      }
    } catch (e) {
      // ignore stringify errors
    }

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