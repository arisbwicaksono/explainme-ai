import { useState, useEffect, useRef } from "react";

function App() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [quotaMessage, setQuotaMessage] = useState(null);
  const [apiError, setApiError] = useState(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // AMBIL DARI LOCAL STORAGE (Lebih simpel tanpa fungsi normalisasi teks)
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("chatMessages");
    return saved
      ? JSON.parse(saved)
      : [
          {
            sender: "ai",
            text: "Halo 👋 Saya ExplainMe AI. Tanyakan apa saja dan saya akan menjelaskan dengan sederhana.",
          },
        ];
  });

  // AUTO SCROLL
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // SAVE LOCAL STORAGE
  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  // AUTO RESIZE TEXTAREA
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // CLEAR CHAT
  const clearChat = () => {
    setMessages([
      {
        sender: "ai",
        text: "Halo 👋 Saya ExplainMe AI. Tanyakan apa saja dan saya akan menjelaskan dengan sederhana.",
      },
    ]);
    localStorage.removeItem("chatMessages");
  };

  // FORMAT HURUF KAPITAL AWAL USER
  const formatUserText = (text) => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  // SEND MESSAGE
  const sendMessage = async () => {
    if (!message.trim()) return;

    const current = message;
    setMessages((prev) => [...prev, { sender: "user", text: current }]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: current }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Handle quota specific message
        if (res.status === 429) {
          setQuotaMessage(data.details || data.error || "Kuota AI habis. Silakan coba lagi nanti.");
        } else {
          setApiError(data.error || "Terjadi error pada AI");
        }
        setLoading(false);
        return;
      }

      // Bersih dari karakter \n\n tambahan
      setMessages((prev) => [...prev, { sender: "ai", text: data.reply }]);
    } catch (err) {
      console.error(err);
      setApiError("Terjadi error pada AI");
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Terjadi error 😢" },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center">
      {/* HEADER */}
      <header className="w-full max-w-3xl border-b border-gray-800 p-4">
        <h1 className="text-2xl font-bold text-blue-400">ExplainMe AI</h1>
        <p className="text-gray-400 text-sm">
          AI yang menjelaskan hal rumit menjadi sederhana
        </p>
        {quotaMessage && (
          <div className="mt-2 p-3 rounded-md bg-yellow-600 text-black text-sm flex justify-between items-center">
            <div>{quotaMessage}</div>
            <button onClick={() => setQuotaMessage(null)} className="ml-4 text-xs underline">Tutup</button>
          </div>
        )}
        {apiError && (
          <div className="mt-2 p-3 rounded-md bg-red-600 text-white text-sm flex justify-between items-center">
            <div>{apiError}</div>
            <button onClick={() => setApiError(null)} className="ml-4 text-xs underline">Tutup</button>
          </div>
        )}
      </header>

      {/* CHAT AREA (Cukup kendalikan jarak lewat space-y-10) */}
      <main className="flex-1 w-full max-w-3xl overflow-y-auto p-4 space-y-10">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-3 rounded-2xl max-w-[80%] whitespace-pre-wrap leading-relaxed ${
                msg.sender === "user"
                  ? "bg-blue-600 text-sky-200"
                  : "bg-gray-800 text-white"
              }`}
            >
              {msg.sender === "user" ? formatUserText(msg.text) : msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-gray-400 text-sm animate-pulse">
            ExplainMe AI sedang mengetik...
          </div>
        )}

        <div ref={chatEndRef} />
      </main>

      {/* INPUT STYLE ALA CHAT GPT */}
      <footer className="w-full flex flex-col items-center p-4 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
        <div className="w-full max-w-3xl relative bg-gray-800 border border-gray-700 rounded-3xl p-4 flex flex-col focus-within:border-gray-600 transition">
          <textarea
            ref={textareaRef}
            rows="1"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Tanyakan sesuatu..."
            className="w-full bg-transparent text-white resize-none outline-none text-[15px] leading-relaxed max-h-[200px] pr-24 pb-10 overflow-y-auto"
          />

          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              onClick={clearChat}
              className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition"
            >
              Clear
            </button>
            <button
              onClick={sendMessage}
              disabled={!message.trim() || loading}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium transition ${
                message.trim() && !loading
                  ? "bg-blue-600 text-white hover:bg-blue-500"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              Kirim
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Tekan Enter untuk mengirim, Shift + Enter untuk baris baru.
        </p>
      </footer>
    </div>
  );
}

export default App;