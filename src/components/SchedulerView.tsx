import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Clock, Sparkles, AlertTriangle, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { Task, UserProfile } from "../types";
import confetti from "canvas-confetti";

interface SchedulerViewProps {
  tasks: Task[];
  profile: UserProfile;
  onRefreshSchedule: () => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  theme?: "dark" | "light";
}

export default function SchedulerView({ tasks, profile, onRefreshSchedule, onUpdateTask, theme = "light" }: SchedulerViewProps) {
  const [viewType, setViewType] = useState<"Weekly" | "Daily">("Weekly");
  const [generating, setGenerating] = useState(false);
  const [activeDayOffset, setActiveDayOffset] = useState(0);

  const isDark = theme === "dark";
  const cardBg = isDark ? "bg-zinc-900/80 border-white/5" : "bg-white border-zinc-200/80 shadow-sm";
  const barBg = isDark ? "bg-zinc-900/60 border-white/5" : "bg-white border-zinc-200 shadow-sm";
  const labelColor = isDark ? "text-zinc-400" : "text-zinc-500";
  const textColor = isDark ? "text-white" : "text-zinc-900";
  const subCardBg = isDark ? "bg-black/40 border-white/5" : "bg-zinc-50 border-zinc-250";
  const itemCardBg = isDark ? "bg-black/50 border-white/5 hover:border-purple-500/20" : "bg-zinc-50/90 border-zinc-200 hover:border-purple-300 shadow-xs";

  // Helper to generate next 7 days list starting today (2026-06-25)
  const baseDate = new Date("2026-06-25T09:00:00");
  const getDaysArray = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate.getTime() + 86400000 * i);
      days.push({
        dateStr: d.toISOString().split("T")[0],
        dayName: d.toLocaleDateString([], { weekday: "short" }),
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString([], { month: "short" })
      });
    }
    return days;
  };

  const days = getDaysArray();

  const handleGenerateSchedule = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.uid })
      });
      if (res.ok) {
        await onRefreshSchedule();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.7 },
          colors: ["#3b82f6", "#a855f7"]
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  // Get scheduled items for each day
  const getScheduledItemsForDay = (dateStr: string) => {
    const items: { task: Task; slot: { timeStart: string; timeEnd: string; date: string } }[] = [];
    tasks.forEach(t => {
      if (t.scheduleSlots) {
        t.scheduleSlots.forEach(slot => {
          if (slot.date === dateStr) {
            items.push({ task: t, slot });
          }
        });
      }
    });
    // Sort by starting time
    return items.sort((a, b) => a.slot.timeStart.localeCompare(b.slot.timeStart));
  };

  const handleMoveSlotForward = async (task: Task, slotIndex: number) => {
    if (!task.scheduleSlots) return;
    const updatedSlots = [...task.scheduleSlots];
    const currentSlot = updatedSlots[slotIndex];
    
    // Push the slot date forward by 1 day
    const d = new Date(currentSlot.date + "T00:00:00");
    const nextDayStr = new Date(d.getTime() + 86400000).toISOString().split("T")[0];
    
    updatedSlots[slotIndex] = {
      ...currentSlot,
      date: nextDayStr
    };

    await onUpdateTask(task.id, { scheduleSlots: updatedSlots, userId: profile.uid });
    confetti({
      particleCount: 20,
      spread: 20,
      origin: { y: 0.8 }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* 3 Questions Orientation Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
            AI Calendar Blockout
          </div>
          <h1 className={`text-2xl font-extrabold tracking-tight mt-1 ${textColor}`}>
            AI Smart Scheduler
          </h1>
          <p className={`${labelColor} text-xs mt-0.5`}>
            Preview dynamically generated time-blocks based on your Biological Peak productivity hours: <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">{profile.workingHoursStart} - {profile.workingHoursEnd}</span>.
          </p>
        </div>

        {/* Action Suggestion Card - Answers "What should I do next?" */}
        <div className={`p-3 rounded-xl border flex gap-3 items-start max-w-sm text-xs ${cardBg}`}>
          <HelpCircle className="h-4.5 w-4.5 text-purple-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-purple-600 dark:text-purple-400 block text-[10px] uppercase font-mono">GUIDANCE:</span>
            <p className={labelColor}>Click <span className="font-bold">"Re-Schedule with AI"</span> below whenever you append new tasks to recalculate peak time slots.</p>
          </div>
        </div>
      </div>

      {/* Smart Control Bar */}
      <div className={`flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-4 rounded-xl border transition-all ${barBg}`}>
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-xl border flex ${subCardBg}`}>
            <button
              onClick={() => setViewType("Weekly")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewType === "Weekly" ? "bg-purple-600 text-white shadow-sm" : isDark ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-950"}`}
            >
              Weekly Grid
            </button>
            <button
              onClick={() => setViewType("Daily")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewType === "Daily" ? "bg-purple-600 text-white shadow-sm" : isDark ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-950"}`}
            >
              Daily Blocks
            </button>
          </div>
        </div>

        <button
          onClick={handleGenerateSchedule}
          disabled={generating}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="h-4 w-4 text-yellow-300" />
          {generating ? "Mapping Optimal Slots..." : "Re-Schedule with AI"}
        </button>
      </div>

      {/* Main Calendar Viewport */}
      {viewType === "Weekly" ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {days.map((day) => {
            const items = getScheduledItemsForDay(day.dateStr);
            return (
              <div 
                key={day.dateStr} 
                className={`rounded-2xl border p-4 space-y-4 shadow-xs min-h-[350px] flex flex-col transition-all ${isDark ? "bg-zinc-900/40 border-white/5" : "bg-white border-zinc-200"}`}
              >
                {/* Day title */}
                <div className={`text-center pb-2 border-b ${isDark ? "border-white/5" : "border-zinc-150"}`}>
                  <div className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-mono font-bold tracking-wider">{day.dayName}</div>
                  <div className={`text-2xl font-extrabold mt-0.5 ${textColor}`}>{day.dayNum}</div>
                  <div className={`text-[9px] font-medium uppercase ${labelColor}`}>{day.monthName}</div>
                </div>

                {/* Day Tasks List */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] scrollbar-none">
                  {items.length > 0 ? (
                    items.map(({ task, slot }, idx) => (
                      <div 
                        key={`${task.id}_${idx}`} 
                        className={`p-3 rounded-xl border text-left space-y-2 transition-all hover:shadow-xs relative ${itemCardBg}`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className={`text-[8px] px-1.5 py-0.2 rounded font-mono font-bold uppercase truncate ${isDark ? "bg-purple-500/10 text-purple-300" : "bg-purple-100 text-purple-800"}`}>
                            {task.category}
                          </span>
                          {task.riskLevel === "Red" && (
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" title="Choked timeframe warning" />
                          )}
                        </div>
                        <h4 className={`text-xs font-bold leading-tight ${task.completed ? "line-through text-zinc-400 dark:text-zinc-500" : textColor}`}>
                          {task.title}
                        </h4>
                        
                        <div className={`flex items-center gap-1 text-[10px] font-mono ${labelColor}`}>
                          <Clock className="h-3 w-3 text-purple-500" />
                          <span>{slot.timeStart} - {slot.timeEnd}</span>
                        </div>

                        {/* Click-to-Move Button for scheduler manipulation */}
                        {!task.completed && (
                          <button
                            onClick={() => handleMoveSlotForward(task, idx)}
                            className={`w-full text-center py-1.5 rounded-lg text-[9px] font-mono transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                              isDark 
                                ? "bg-purple-950/20 hover:bg-purple-950/50 border-purple-500/10 text-purple-300 hover:text-white"
                                : "bg-purple-50 hover:bg-purple-100 border-purple-150 text-purple-700"
                            }`}
                          >
                            <span>Defer 1 day</span>
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className={`text-center py-12 text-xs italic flex flex-col items-center justify-center h-full ${labelColor}`}>
                      Free
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Daily Block Timeline view */
        <div className={`rounded-2xl border p-6 shadow-sm space-y-6 ${cardBg}`}>
          <div className={`flex justify-between items-center pb-4 border-b ${isDark ? "border-white/5" : "border-zinc-200"}`}>
            <button 
              onClick={() => setActiveDayOffset(prev => Math.max(0, prev - 1))}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${isDark ? "hover:bg-white/5 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500 border border-zinc-200/60 shadow-xs"}`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono font-bold uppercase tracking-wider">Active Timeline Scope</span>
              <h3 className={`text-xl font-extrabold ${textColor}`}>
                {days[activeDayOffset]?.dayName}, {days[activeDayOffset]?.monthName} {days[activeDayOffset]?.dayNum}
              </h3>
            </div>
            <button 
              onClick={() => setActiveDayOffset(prev => Math.min(6, prev + 1))}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${isDark ? "hover:bg-white/5 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500 border border-zinc-200/60 shadow-xs"}`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3">
            {getScheduledItemsForDay(days[activeDayOffset]?.dateStr).length > 0 ? (
              getScheduledItemsForDay(days[activeDayOffset]?.dateStr).map(({ task, slot }, index) => (
                <div 
                  key={`${task.id}_${index}`}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${isDark ? "bg-black/30 border-white/5" : "bg-zinc-50 border-zinc-200 shadow-xs hover:border-purple-200"}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`px-4 py-2.5 rounded-xl text-center border shrink-0 font-mono ${
                      isDark ? "bg-purple-500/10 text-purple-400 border-purple-500/10" : "bg-purple-100 border-purple-200 text-purple-800"
                    }`}>
                      <div className="text-[8px] font-bold text-zinc-500">START</div>
                      <div className="text-sm font-black mt-0.5">{slot.timeStart}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isDark ? "bg-white/10 text-gray-300" : "bg-zinc-100 text-zinc-600 border border-zinc-200/60"}`}>{task.category}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border ${
                          task.priority === "Critical" 
                            ? "bg-red-500/10 text-red-500 border-red-500/10 font-bold" 
                            : isDark ? "bg-zinc-800 text-zinc-400 border-white/5" : "bg-zinc-100 text-zinc-600 border-zinc-200"
                        }`}>{task.priority} Priority</span>
                      </div>
                      <h4 className={`text-sm font-bold ${task.completed ? "line-through text-zinc-400 dark:text-zinc-500" : textColor}`}>{task.title}</h4>
                      <p className={`text-xs mt-0.5 ${labelColor}`}>Deadline: {new Date(task.deadline).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-black/5 dark:border-white/5">
                    <div className={`text-right font-mono text-xs ${labelColor}`}>
                      Estimated: {task.estimatedHours} Hours
                    </div>
                    {!task.completed && (
                      <button
                        onClick={() => handleMoveSlotForward(task, index)}
                        className={`p-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-1 border cursor-pointer transition-all ${
                          isDark 
                            ? "bg-purple-950/20 hover:bg-purple-900/40 border-purple-500/10 text-purple-300" 
                            : "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 hover:shadow-xs"
                        }`}
                      >
                        Push Block <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className={`text-center py-16 text-sm italic border border-dashed rounded-2xl ${labelColor}`}>
                💤 Free scope. No active focus blocks scheduled for this day. Perfect window for habit building or resting!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
