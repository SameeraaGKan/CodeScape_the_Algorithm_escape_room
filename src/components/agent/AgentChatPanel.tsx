"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { AGENT_CONFIGS } from "@/lib/ai/personalities";
import type { AgentPersonality } from "@/types";
import { Send, Loader2 } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Props = {
  sessionId: string;
  puzzleId: string;
  personality: AgentPersonality;
  playerAttempt?: string;
  timeRemainingSeconds: number;
  onMessageReceived?: () => void;
};

export function AgentChatPanel({
  sessionId,
  puzzleId,
  personality,
  playerAttempt,
  timeRemainingSeconds,
  onMessageReceived,
}: Props) {
  const agent = AGENT_CONFIGS[personality];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset messages when personality changes
  useEffect(() => {
    setMessages([]);
  }, [personality]);

  const sendMessage = useCallback(async () => {
    const userText = input.trim();
    if (!userText || isLoading) return;

    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();

    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: userText },
    ]);
    setIsLoading(true);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Build messages array to send
    const historyForApi = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: userText },
    ];

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          sessionId,
          puzzleId,
          agentPersonality: personality,
          playerAttempt: playerAttempt ?? "",
          timeRemainingSeconds,
          messages: historyForApi,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to get agent response");
      }

      // Add empty assistant message that we'll fill as tokens arrive
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const text = accumulated;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: text } : m
          )
        );
      }

      onMessageReceived?.();
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "⚠️ Could not reach the agent. Check your connection." }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, sessionId, puzzleId, personality, playerAttempt, timeRemainingSeconds, onMessageReceived]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--dark-card)] border border-[var(--dark-border)] rounded overflow-hidden">
      {/* Agent header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-[var(--dark-border)]"
        style={{ borderBottomColor: `${agent.color}30` }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm border"
          style={{
            backgroundColor: `${agent.color}20`,
            borderColor: `${agent.color}50`,
          }}
        >
          {agent.emoji}
        </div>
        <div>
          <div
            className="font-[family-name:var(--font-orbitron)] text-xs font-bold"
            style={{ color: agent.color }}
          >
            {agent.name}
          </div>
          <div className="text-xs text-gray-600">{agent.tagline}</div>
        </div>
        {isLoading && (
          <Loader2 className="w-3 h-3 ml-auto animate-spin text-gray-500" />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">{agent.emoji}</div>
            <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto italic">
              {agent.exampleQuote}
            </p>
            <p className="text-xs text-gray-700 mt-3">
              Ask {agent.name} for help with this puzzle.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {msg.role === "assistant" && (
              <div
                className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs border mt-0.5"
                style={{
                  backgroundColor: `${agent.color}20`,
                  borderColor: `${agent.color}40`,
                }}
              >
                {agent.emoji}
              </div>
            )}
            <div
              className={`max-w-[80%] px-3 py-2 rounded text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/20 text-gray-200 rounded-tr-none"
                  : "bg-black border border-[var(--dark-border)] text-gray-300 rounded-tl-none"
              }`}
            >
              {msg.content || (
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-pulse"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t border-[var(--dark-border)]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder={`Ask ${agent.name} for help…`}
          className="flex-1 px-3 py-2 bg-black border border-[var(--dark-border)] rounded text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[var(--neon-cyan)]/40 transition-colors disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="p-2 rounded border border-[var(--dark-border)] text-gray-400 hover:text-white hover:border-gray-600 disabled:opacity-30 transition-all"
          style={
            input.trim()
              ? { borderColor: `${agent.color}50`, color: agent.color }
              : {}
          }
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
