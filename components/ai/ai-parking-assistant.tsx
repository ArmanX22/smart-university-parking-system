"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, MessageSquare, Send, X, Bot, User, Clock, MapPin, Bus, ShieldCheck } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  provider?: string;
}

interface AIParkingAssistantProps {
  currentRole?: string;
  availableSlots?: { name: string; category: string; area: string }[];
  activeReservation?: { slotName: string; expiresAt: string; minutesRemaining?: number } | null;
}

const PRESET_PROMPTS = [
  { label: "15-Min Cancellation Rule", prompt: "How does the 15-minute reservation timer and auto-cancellation work?" },
  { label: "Motorcycle Side A & B", prompt: "Explain the two-sided motorcycle parking layout (Side A, Side B, Central Road)." },
  { label: "Fulbaria Bus Schedule", prompt: "What are the Fulbaria route bus timings and designated bays?" },
  { label: "Recommend Free Slot", prompt: "Recommend the best currently available parking slot for my vehicle." },
];

export function AIParkingAssistant({ currentRole = "DRIVER", availableSlots = [], activeReservation }: AIParkingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your **Smart Campus AI Parking Advisor**, powered by **Google AI Studio (Gemini)**. " +
        "I can answer questions regarding the **15-minute pre-arrival reservation policy**, Two-Sided Motorcycle bays, " +
        "Fulbaria transit buses, or recommend an open parking slot for you. How can I help you today?",
      provider: "Google AI Studio",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (userPrompt?: string) => {
    const textToSend = userPrompt || input.trim();
    if (!textToSend || isLoading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: textToSend }];
    setMessages(newMessages);
    if (!userPrompt) setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          context: {
            currentRole,
            availableSlots: availableSlots.map((s) => ({ name: s.name, category: s.category, area: s.area })),
            activeReservation,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages([...newMessages, { role: "assistant", content: data.reply, provider: data.provider }]);
      } else {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: "I apologize, but I could not connect to Google AI Studio at the moment. Please ensure your network is reachable and try again.",
          },
        ]);
      }
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Network error while connecting to the AI Parking Advisor. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-emerald-500/30 hover:scale-105 transition-all duration-200 border-2 border-emerald-400/40 font-medium text-sm group"
            aria-label="Open AI Parking Advisor"
          >
            <div className="p-1 rounded-full bg-white/20 group-hover:rotate-12 transition-transform">
              <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
            </div>
            <span>Ask AI Advisor</span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
              Google AI Studio
            </span>
          </button>
        )}
      </div>

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[460px] h-[600px] max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">Campus AI Parking Advisor</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                    <Sparkles className="w-2.5 h-2.5" /> Gemini
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Powered by Google AI Studio API</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/60 text-sm">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 leading-relaxed ${
                    m.role === "user"
                      ? "bg-emerald-600 text-white rounded-tr-none shadow-md"
                      : "bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none shadow"
                  }`}
                >
                  <div className="whitespace-pre-line text-[13px]">{m.content}</div>
                  {m.provider && (
                    <div className="mt-1.5 pt-1 border-t border-slate-700/50 flex items-center gap-1 text-[10px] text-slate-400">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>{m.provider}</span>
                    </div>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2.5 items-center text-slate-400 text-xs py-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center animate-pulse">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/50">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="ml-1 text-[11px] text-slate-300">Consulting Google AI Studio...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Preset Buttons */}
          <div className="px-3 py-2 bg-slate-900 border-t border-slate-800/80 overflow-x-auto flex gap-1.5 scrollbar-thin">
            {PRESET_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p.prompt)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {idx === 0 && <Clock className="w-3 h-3 text-amber-400" />}
                {idx === 1 && <MapPin className="w-3 h-3 text-cyan-400" />}
                {idx === 2 && <Bus className="w-3 h-3 text-indigo-400" />}
                {idx === 3 && <Sparkles className="w-3 h-3 text-emerald-400" />}
                {p.label}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about 15-min booking rule, bays, slots..."
              disabled={isLoading}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-900/50"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
