"use client";

import { useState, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/db/supabase";
import { Send, Users } from "lucide-react";

type ChatMessage = {
  userId: string;
  displayName: string;
  text: string;
  timestamp: number;
};

type Props = {
  roomCode: string;
  currentUserId: string;
  currentDisplayName: string;
};

export function TeamChatPanel({ roomCode, currentUserId, currentDisplayName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel(`room-chat:${roomCode}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "chat" }, ({ payload }: { payload: ChatMessage }) => {
        setMessages((prev) => [...prev, payload]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || !channelRef.current) return;
    setInput("");
    await channelRef.current.send({
      type: "broadcast",
      event: "chat",
      payload: {
        userId: currentUserId,
        displayName: currentDisplayName,
        text,
        timestamp: Date.now(),
      } satisfies ChatMessage,
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--dark-border)] bg-card shrink-0">
        <Users className="w-3.5 h-3.5 text-[var(--neon-cyan)]" />
        <span className="text-xs font-semibold tracking-widest text-[var(--neon-cyan)]">
          TEAM CHAT
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-8 leading-relaxed">
            No messages yet.
            <br />
            Say hi to your teammates!
          </p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.userId === currentUserId;
          return (
            <div
              key={i}
              className={`flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}
            >
              <span className="text-[10px] text-muted-foreground px-1">
                {isMe ? "You" : msg.displayName}
              </span>
              <div
                className={`max-w-[80%] px-3 py-2 rounded text-sm leading-snug ${
                  isMe
                    ? "bg-[var(--neon-cyan)]/15 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30"
                    : "bg-card border border-[var(--dark-border)] text-foreground"
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 px-3 py-3 border-t border-[var(--dark-border)]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Message your team…"
            maxLength={500}
            className="flex-1 bg-black border border-[var(--dark-border)] rounded px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--neon-cyan)]/50 transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="p-2 rounded bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/20 disabled:opacity-40 transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
