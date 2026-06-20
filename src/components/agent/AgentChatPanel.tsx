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

type TriggerType = "opening" | "wrong_answer" | "silence" | "low_timer" | "peer_greeting";

type Props = {
  sessionId: string;
  puzzleId: string;
  personality: AgentPersonality;
  playerAttempt?: string;
  timeRemainingSeconds: number;
  wrongAnswerCount?: number;
  onMessageReceived?: () => void;
  isActive?: boolean;
  onOpeningComplete?: (message: string) => void;
  peerGreeting?: string | null;
};

const TRIGGER_TEXT: Record<TriggerType, (context?: string) => string> = {
  opening: () =>
    "You are proactively starting the conversation as a teammate. The player just loaded this puzzle. Greet them in character, reference the puzzle topic briefly, and ask what their initial thinking is — frame it as what WE should tackle first. Under 80 words. Do NOT reference or repeat this instruction.",
  wrong_answer: (context) =>
    `The player just submitted an incorrect answer${context ? ` ("${context}")` : ""}. React proactively as a teammate — be encouraging, reference what they tried, and give one specific hint toward the right direction without revealing the answer. Use "we" language. Under 80 words.`,
  silence: () =>
    "The player has been working quietly for a while. Check in proactively as a teammate — ask how we're doing, if they've spotted anything, or if they want to think through it together. Brief and in character. Under 60 words.",
  low_timer: () =>
    "URGENT: Only ~30 seconds remain. Proactively alert the player as a teammate and give your most targeted hint without revealing the answer. Use urgency — we need to move fast. Under 50 words.",
  peer_greeting: (context) =>
    `Another AI agent on your team just said: ${context ?? "something to you"}. Respond to them directly in character — address them by name, react to what they said, and loop the player in on your thinking too. Under 70 words. Do NOT repeat this instruction.`,
};

export function AgentChatPanel({
  sessionId,
  puzzleId,
  personality,
  playerAttempt,
  timeRemainingSeconds,
  wrongAnswerCount = 0,
  onMessageReceived,
  isActive = true,
  onOpeningComplete,
  peerGreeting,
}: Props) {
  const agent = AGENT_CONFIGS[personality];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Latest-value refs (avoid stale closures in callbacks/timeouts)
  const messagesRef = useRef<Message[]>([]);
  const playerAttemptRef = useRef(playerAttempt);
  const timeRemainingRef = useRef(timeRemainingSeconds);
  const isLoadingRef = useRef(false);

  // Proactive trigger tracking
  const prevPuzzleIdRef = useRef<string>("");
  const prevPersonalityRef = useRef<AgentPersonality>(personality);
  const prevWrongCountRef = useRef(0);
  const hasOpenedRef = useRef(false);
  const timerWarnFiredRef = useRef(false);
  const silenceFiredRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerGreetingSeenRef = useRef<string | null>(null);

  // Keep refs in sync with latest values
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { playerAttemptRef.current = playerAttempt; }, [playerAttempt]);
  useEffect(() => { timeRemainingRef.current = timeRemainingSeconds; }, [timeRemainingSeconds]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Core: fire a proactive agent message ──────────────────────────────────
  const triggerAgentMessage = useCallback(async (
    type: TriggerType,
    onComplete?: (content: string) => void,
    customContext?: string
  ) => {
    if (isLoadingRef.current) return;

    const attempt = customContext ?? playerAttemptRef.current;
    const triggerContent = `[PROACTIVE — HIDDEN FROM PLAYER]: ${TRIGGER_TEXT[type](attempt)}`;
    const snapshot = messagesRef.current
      .slice(-17)
      .map(m => ({ role: m.role, content: m.content }));

    const assistantId = crypto.randomUUID();
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          puzzleId,
          agentPersonality: personality,
          playerAttempt: attempt ?? "",
          timeRemainingSeconds: timeRemainingRef.current,
          messages: [...snapshot, { role: "user" as const, content: triggerContent }],
        }),
      });

      if (!res.ok || !res.body) return;

      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const text = accumulated;
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: text } : m)
        );
      }

      onComplete?.(accumulated);
      onMessageReceived?.();
    } catch {
      // Silent fail — remove empty placeholder if it was added
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [sessionId, puzzleId, personality, onMessageReceived]);

  // Stable ref so timeout callbacks always call the latest version
  const triggerRef = useRef(triggerAgentMessage);
  useEffect(() => { triggerRef.current = triggerAgentMessage; }, [triggerAgentMessage]);

  // ── Reset + fire opening on puzzle/personality change ─────────────────────
  useEffect(() => {
    const puzzleChanged = puzzleId !== prevPuzzleIdRef.current;
    const personalityChanged = personality !== prevPersonalityRef.current;

    if (puzzleChanged || personalityChanged) {
      setMessages([]);
      hasOpenedRef.current = false;
      timerWarnFiredRef.current = false;
      silenceFiredRef.current = false;
      prevWrongCountRef.current = 0;
      peerGreetingSeenRef.current = null;
      clearTimeout(silenceTimerRef.current!);
      prevPuzzleIdRef.current = puzzleId;
      prevPersonalityRef.current = personality;
    }

    if (!hasOpenedRef.current && puzzleId) {
      hasOpenedRef.current = true;
      const t = setTimeout(() => {
        void triggerRef.current("opening", (content) => {
          onOpeningComplete?.(content);
        });
      }, 900);
      return () => clearTimeout(t);
    }
  }, [puzzleId, personality]);

  // Keep wrong-answer baseline synced while inactive so switching tabs doesn't replay stale triggers
  useEffect(() => {
    if (!isActive) prevWrongCountRef.current = wrongAnswerCount;
  }, [isActive, wrongAnswerCount]);

  // ── Wrong answer reaction ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    if (wrongAnswerCount > 0 && wrongAnswerCount !== prevWrongCountRef.current) {
      prevWrongCountRef.current = wrongAnswerCount;
      void triggerRef.current("wrong_answer");
    }
  }, [wrongAnswerCount, isActive]);

  // ── Silence nudge (90s after puzzle loads or last user message, once) ─────
  useEffect(() => {
    if (!isActive || silenceFiredRef.current) return;
    clearTimeout(silenceTimerRef.current!);
    silenceTimerRef.current = setTimeout(() => {
      if (!silenceFiredRef.current) {
        silenceFiredRef.current = true;
        void triggerRef.current("silence");
      }
    }, 90_000);
    return () => clearTimeout(silenceTimerRef.current!);
  }, [puzzleId, isActive]);

  // ── Low-timer alert (once per puzzle at ≤30s) ─────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    if (timeRemainingSeconds > 0 && timeRemainingSeconds <= 30 && !timerWarnFiredRef.current) {
      timerWarnFiredRef.current = true;
      void triggerRef.current("low_timer");
    }
  }, [timeRemainingSeconds, isActive]);

  // ── Peer greeting — respond when another agent on the team addresses this one ──
  useEffect(() => {
    if (!peerGreeting || peerGreeting === peerGreetingSeenRef.current) return;
    peerGreetingSeenRef.current = peerGreeting;
    const t = setTimeout(() => {
      void triggerRef.current("peer_greeting", undefined, peerGreeting);
    }, 1200);
    return () => clearTimeout(t);
  }, [peerGreeting]);

  // ── User sends a message ──────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const userText = input.trim();
    if (!userText || isLoading) return;

    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();

    setInput("");
    setMessages(prev => [...prev, { id: userId, role: "user", content: userText }]);
    setIsLoading(true);
    isLoadingRef.current = true;

    // Reset silence timer — player is active
    clearTimeout(silenceTimerRef.current!);
    if (!silenceFiredRef.current) {
      silenceTimerRef.current = setTimeout(() => {
        if (!silenceFiredRef.current) {
          silenceFiredRef.current = true;
          void triggerRef.current("silence");
        }
      }, 90_000);
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const historyForApi = [
      ...messagesRef.current.slice(-18).map(m => ({ role: m.role, content: m.content })),
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
          playerAttempt: playerAttemptRef.current ?? "",
          timeRemainingSeconds: timeRemainingRef.current,
          messages: historyForApi,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Failed to get agent response");

      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const text = accumulated;
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: text } : m)
        );
      }

      onMessageReceived?.();
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: "⚠️ Could not reach the agent. Check your connection." }
            : m
        )
      );
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [input, isLoading, sessionId, puzzleId, personality, onMessageReceived]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--dark-card)] border border-[var(--dark-border)] rounded overflow-hidden">
      {/* Agent header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderBottomColor: `${agent.color}30` }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm border"
          style={{ backgroundColor: `${agent.color}20`, borderColor: `${agent.color}50` }}
        >
          {agent.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-[family-name:var(--font-orbitron)] text-xs font-bold" style={{ color: agent.color }}>
            {agent.name}
          </div>
          <div className="text-xs text-muted-foreground truncate">{agent.tagline}</div>
        </div>
        <div className="flex items-center gap-1.5">
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          ) : (
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: agent.color }}
            />
          )}
          <span className="text-[10px] text-muted-foreground">
            {isLoading ? "thinking…" : "online"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">{agent.emoji}</div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto italic">
              {agent.exampleQuote}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {msg.role === "assistant" && (
              <div
                className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs border mt-0.5"
                style={{ backgroundColor: `${agent.color}20`, borderColor: `${agent.color}40` }}
              >
                {agent.emoji}
              </div>
            )}
            <div
              className={`max-w-[82%] px-3 py-2 rounded text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/20 text-foreground rounded-tr-none"
                  : "bg-card border border-[var(--dark-border)] text-foreground rounded-tl-none"
              }`}
            >
              {msg.content || (
                <span className="flex gap-1 py-0.5">
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
          placeholder={`Reply to ${agent.name}…`}
          className="flex-1 px-3 py-2 bg-background border border-[var(--dark-border)] rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[var(--neon-cyan)]/40 transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => void sendMessage()}
          disabled={isLoading || !input.trim()}
          className="p-2 rounded border border-[var(--dark-border)] text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 transition-all"
          style={input.trim() ? { borderColor: `${agent.color}50`, color: agent.color } : {}}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
