import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

// Empty by default so requests go through Vite proxy (`/graph`, `/query`).
const API_BASE = import.meta.env.VITE_API_BASE || "";

function formatSystemError(err) {
  const resp = err?.response?.data;
  if (resp?.error) return resp.error;
  if (typeof resp === "string") return resp;
  return err?.message || "Request failed.";
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "system",
      content: "Ask about orders, deliveries, invoices, payments, or journal entries (example: “Find journal entry for billing document 91150187”)."
    }
  ]);
  const [sending, setSending] = useState(false);

  const history = useMemo(() => messages, [messages]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const q = String(input || "").trim();
    if (!q || sending) return;

    console.log("Chat submit question:", q);

    // Optimistic UI update.
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setSending(true);

    try {
      const res = await axios.post(`${API_BASE}/query`, { question: q });
      const answer =
        res?.data?.answer ??
        res?.data?.error ??
        // Fallback if backend returns unexpected payload shape.
        JSON.stringify(res.data, null, 2);

      setMessages((prev) => [...prev, { role: "system", content: String(answer) }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "system", content: formatSystemError(err) }]);
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      await handleSend();
    },
    [handleSend]
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div className="chatMessages">
        {history.map((m, idx) => (
          <div
            key={`${m.role}-${idx}`}
            className={m.role === "user" ? "msg msgUser" : "msg msgSystem"}
          >
            <div className="msgRole">{m.role === "user" ? "You" : "System"}</div>
            <div className="messageContent">{m.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="chatComposer" onSubmit={onSubmit}>
        <input
          className="chatInput"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the dataset…"
          disabled={sending}
        />
        <button className="chatSend" type="submit" disabled={sending || !input.trim()}>
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}

