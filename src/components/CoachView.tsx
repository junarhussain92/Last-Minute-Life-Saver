import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Mic, Send, Sparkles, Trash2, ArrowRight, Zap, Play, HelpCircle, CornerDownLeft } from "lucide-react";
import { ChatMessage, Task, UserProfile } from "../types";
import confetti from "canvas-confetti"; // Wait, is it canvas-confetti? Yes! The import is canvas-confetti in package.json
import confettiActual from "canvas-confetti";

interface CoachViewProps {
  tasks: Task[];
  profile: UserProfile;
  activeTab: string;
  onSetTab: (tab: string) => void;
  onAddTask: (taskData: {
    title: string;
    description: string;
    deadline: string;
    priority: any;
    estimatedHours: number;
    category: any;
  }) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onRefreshData: () => Promise<void>;
  theme?: "dark" | "light";
}

export default function CoachView({ 
  tasks, 
  profile, 
  activeTab, 
  onSetTab, 
  onAddTask, 
  onUpdateTask,
  onRefreshData,
  theme = "light"
}: CoachViewProps) {
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const isDark = theme === "dark";
  const cardBg = isDark ? "bg-zinc-900/80 border-white/5" : "bg-white border-zinc-200/80 shadow-sm";
  const inputBg = isDark ? "bg-black/50 border-white/10 text-white focus:border-purple-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-purple-500";
  const labelColor = isDark ? "text-zinc-400" : "text-zinc-500";
  const textColor = isDark ? "text-white" : "text-zinc-900";
  const subCardBg = isDark ? "bg-black/40 border-white/5" : "bg-zinc-50 border-zinc-150";
  const listCardBg = isDark ? "bg-black/50 border-white/5" : "bg-zinc-100/60 border-zinc-200";
  const headerBg = isDark ? "bg-zinc-950/40 border-b border-white/5" : "bg-zinc-100/60 border-b border-zinc-200";

  // Voice Assistant states
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [parsedActionMsg, setParsedActionMsg] = useState<string | null>(null);
  const [recognitionObj, setRecognitionObj] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
        setVoiceTranscript("");
        setParsedActionMsg(null);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setSpeechError(`Microphone access is recommended, but you can also use suggestions below.`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onresult = async (event: any) => {
        const resultText = event.results[0][0].transcript;
        setVoiceTranscript(resultText);
        await handleVoiceCommand(resultText);
      };

      setRecognitionObj(recognition);
    } else {
      setSpeechError("Speech recognition is not supported in this browser. Try our quick suggestions below!");
    }
  }, []);

  // Fetch initial chat memory if empty
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const res = await fetch(`/api/coach/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: profile.uid, message: "Hello Saviour! Summarize my main active tasks and suggest what to focus on first today.", history: [] })
        });
        const data = await res.json();
        if (data.history) {
          setChatHistory(data.history);
        }
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    };
    if (chatHistory.length === 0) {
      loadChatHistory();
    }
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  // Send typed chat messages
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.uid,
          message: userText,
          history: chatHistory
        })
      });
      const data = await res.json();
      if (data.history) {
        setChatHistory(data.history);
      }
    } catch (e) {
      console.error("Coach Chat request failed:", e);
    } finally {
      setChatLoading(false);
    }
  };

  // Toggle speech recording
  const handleToggleRecord = () => {
    if (isRecording) {
      recognitionObj?.stop();
    } else {
      recognitionObj?.start();
    }
  };

  // Process voice transcription via NLP
  const handleVoiceCommand = async (transcript: string) => {
    try {
      const res = await fetch("/api/voice/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcript, userId: profile.uid })
      });
      const data = await res.json();
      
      if (data.success && data.parsed) {
        const { action, taskTitle, deadline, priority, category } = data.parsed;
        
        switch (action) {
          case "add_task":
            if (taskTitle) {
              await onAddTask({
                title: taskTitle,
                description: "Spoken task creation",
                deadline: deadline || new Date(Date.now() + 86400000 * 2).toISOString(),
                priority: priority || "Medium",
                estimatedHours: 2,
                category: category || "Other"
              });
              setParsedActionMsg(`Added task: "${taskTitle}"`);
              confettiActual({ particleCount: 60, spread: 40 });
              onRefreshData();
            }
            break;

          case "complete_task":
            if (taskTitle) {
              // Find matching task by title
              const match = tasks.find(t => t.title.toLowerCase().includes(taskTitle.toLowerCase()));
              if (match) {
                await onUpdateTask(match.id, { completed: true, userId: profile.uid });
                setParsedActionMsg(`Completed task: "${match.title}"`);
                confettiActual({ particleCount: 100, spread: 60, colors: ["#a855f7"] });
                onRefreshData();
              } else {
                setParsedActionMsg(`Could not find active task matching: "${taskTitle}"`);
              }
            }
            break;

          case "show_schedule":
            onSetTab("Scheduler");
            setParsedActionMsg("Switched view to AI Scheduler & Calendar.");
            break;

          case "check_deadlines":
            onSetTab("Dashboard");
            setParsedActionMsg("Opened Dashboard Risk Predictor panel.");
            break;

          default:
            setParsedActionMsg(`Command recognized but could not formulate action: "${transcript}"`);
        }
      }
    } catch (e) {
      console.error("Failed voice analysis:", e);
      setParsedActionMsg("Failed analyzing command semantics. Try saying: 'Add task [Title]'");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 3 Questions Orientation Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
            Co-Pilot Conversation
          </div>
          <h1 className={`text-2xl font-extrabold tracking-tight mt-1 ${textColor}`}>
            AI Saviour Coach & Voice Hub
          </h1>
          <p className={`${labelColor} text-xs mt-0.5`}>
            Interact with a supportive, non-judgmental coach to prioritize work-blocks, or use speech recognition to direct your workspace.
          </p>
        </div>

        {/* Action Suggestion Card - Answers "What should I do next?" */}
        <div className={`p-3 rounded-xl border flex gap-3 items-start max-w-sm text-xs ${cardBg}`}>
          <HelpCircle className="h-4.5 w-4.5 text-purple-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-purple-600 dark:text-purple-400 block text-[10px] uppercase font-mono">NEXT ACTION:</span>
            <p className={labelColor}>Ask Coach <span className="font-bold">"How can I plan my week?"</span> or click one of our click-to-run quick commands below!</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Chat Canvas */}
        <div className={`lg:col-span-2 flex flex-col h-[550px] rounded-2xl border shadow-sm overflow-hidden transition-colors ${cardBg}`}>
          {/* Chat Header */}
          <div className={`p-4 flex items-center justify-between ${headerBg}`}>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-500" />
              <div>
                <h3 className={`text-sm font-bold ${textColor}`}>Saviour AI Coach</h3>
                <span className={`text-[10px] font-mono ${labelColor}`}>WORKSPACE CONTEXT SECURED</span>
              </div>
            </div>
            <button 
              onClick={() => setChatHistory([])}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-950 border border-zinc-200/40"}`}
              title="Clear memory logs"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Chat History Panel */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {chatHistory.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <div 
                  key={msg.id || index} 
                  className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${isUser ? "bg-purple-600 text-white" : "bg-purple-100 dark:bg-zinc-800 text-purple-600 dark:text-purple-400"}`}>
                    {isUser ? "Me" : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-xs space-y-2 leading-relaxed border ${
                    isUser 
                      ? "bg-purple-950/20 border-purple-500/10 text-purple-900 dark:text-purple-100 rounded-tr-none" 
                      : "bg-zinc-50 dark:bg-black/30 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-gray-300 rounded-tl-none"
                  }`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              );
            })}
            {chatLoading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="h-8 w-8 rounded-xl bg-purple-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
                  <Bot className="h-4 w-4 animate-bounce" />
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 rounded-2xl text-xs text-gray-500 flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 bg-purple-500 rounded-full animate-bounce" />
                  <div className="h-1.5 w-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="h-1.5 w-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className={`p-4 border-t flex gap-2 ${isDark ? "bg-zinc-950/20 border-white/5" : "bg-zinc-50/50 border-zinc-200"}`}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask Saviour about deadline management or task prioritization..."
              className={`flex-1 border rounded-xl px-4 py-3 text-xs focus:outline-none ${inputBg}`}
            />
            <button
              type="submit"
              className="p-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white transition-all shadow-md shrink-0 cursor-pointer flex items-center justify-center"
            >
              <CornerDownLeft className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Right Column: Voice & Click-to-Run Quick Actions */}
        <div className={`flex flex-col h-[550px] rounded-2xl border shadow-sm p-5 justify-between transition-colors ${cardBg}`}>
          <div className="space-y-4">
            <div className={`flex items-center gap-2 pb-3 border-b ${isDark ? "border-white/5" : "border-zinc-200"}`}>
              <Mic className="h-5 w-5 text-pink-500 animate-pulse" />
              <h3 className={`text-sm font-bold ${textColor}`}>Voice Command Deck</h3>
            </div>

            <p className={`text-xs leading-relaxed ${labelColor}`}>
              Click suggestions below to <span className="font-bold">test NLP execution instantly</span> without speaking, or use your microphone!
            </p>

            {/* Suggestions list acts as fully functional Click-to-Run items */}
            <div className={`p-3.5 rounded-xl border space-y-2 ${listCardBg}`}>
              <h4 className="text-[10px] font-bold font-mono uppercase text-purple-600 dark:text-purple-400">Click to Run Suggestions:</h4>
              <div className="space-y-1.5">
                {[
                  "Add task study biology tomorrow",
                  "Complete task complete javascript",
                  "Show schedule",
                  "Check deadlines"
                ].map((phrase) => (
                  <button
                    key={phrase}
                    onClick={() => {
                      setVoiceTranscript(phrase);
                      handleVoiceCommand(phrase);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between border cursor-pointer ${
                      isDark 
                        ? "bg-purple-950/10 border-purple-500/10 text-purple-300 hover:bg-purple-950/40 hover:text-white" 
                        : "bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100/60"
                    }`}
                  >
                    <span>"{phrase}"</span>
                    <Play className="h-3 w-3 fill-current opacity-70" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mic Recorders Center with beautiful static/recording audio waveforms */}
          <div className="flex flex-col items-center justify-center space-y-3 my-2">
            <div className="relative">
              {isRecording && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute h-24 w-24 rounded-full border border-pink-500/30"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
                    />
                  ))}
                </div>
              )}
              <button
                onClick={handleToggleRecord}
                className={`h-16 w-16 rounded-full flex items-center justify-center transition-all shadow-lg cursor-pointer ${
                  isRecording 
                    ? "bg-pink-600 text-white animate-pulse" 
                    : isDark 
                    ? "bg-zinc-800 text-pink-400 border border-white/10 hover:bg-zinc-750"
                    : "bg-pink-50 text-pink-600 border border-pink-200 hover:bg-pink-100"
                }`}
              >
                <Mic className="h-6 w-6" />
              </button>
            </div>
            
            {/* Waveform indicator */}
            {isRecording ? (
              <div className="flex items-center gap-1 h-3">
                {[...Array(6)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="w-[3px] bg-pink-500 rounded-full block"
                    animate={{ height: [4, 12, 4] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </div>
            ) : (
              <span className={`text-[10px] font-mono tracking-wide ${labelColor}`}>
                {isRecording ? "Listening..." : "Tap to speak command"}
              </span>
            )}
          </div>

          {/* Action Logs */}
          <div className={`p-4.5 rounded-xl border min-h-[130px] flex flex-col justify-between font-mono ${subCardBg}`}>
            <div>
              <span className="text-[9px] text-pink-600 dark:text-pink-400 font-bold block mb-1">RECOGNITION TRANSCRIPT</span>
              <p className={`text-xs leading-normal font-medium ${textColor}`}>
                {voiceTranscript ? `"${voiceTranscript}"` : "Waiting for command trigger..."}
              </p>
            </div>

            {parsedActionMsg && (
              <div className={`mt-3 pt-3 border-t flex gap-1.5 items-start text-xs text-purple-600 dark:text-purple-300 ${isDark ? "border-white/5" : "border-zinc-200"}`}>
                <Sparkles className="h-4 w-4 text-purple-500 animate-spin shrink-0" />
                <div>
                  <span className="font-bold uppercase block text-[8px] tracking-wider text-zinc-400 dark:text-zinc-500">Workspace Synchronization</span>
                  {parsedActionMsg}
                </div>
              </div>
            )}

            {speechError && (
              <div className="text-[10px] text-zinc-400/80 leading-normal mt-2">
                {speechError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
