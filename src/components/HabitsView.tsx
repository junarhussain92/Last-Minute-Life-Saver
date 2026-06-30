import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Plus, Trash2, Calendar, Zap, CheckCircle2, Activity, Flame, HelpCircle } from "lucide-react";
import { Habit, HabitLog } from "../types";
import confetti from "canvas-confetti";

interface HabitsViewProps {
  habits: Habit[];
  profileUid: string;
  onAddHabit: (habitData: { title: string; frequency: "Daily" | "Weekly" }) => Promise<void>;
  onUpdateHabit: (habitId: string, updates: Partial<Habit>) => Promise<void>;
  onDeleteHabit: (habitId: string) => Promise<void>;
  theme?: "dark" | "light";
}

export default function HabitsView({ habits, profileUid, onAddHabit, onUpdateHabit, onDeleteHabit, theme = "light" }: HabitsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<"Daily" | "Weekly">("Daily");
  const [saving, setSaving] = useState(false);

  const isDark = theme === "dark";
  const cardBg = isDark ? "bg-zinc-900/80 border-white/5" : "bg-white border-zinc-200/80 shadow-sm";
  const barBg = isDark ? "bg-zinc-900/60 border-white/5" : "bg-white border-zinc-200 shadow-sm";
  const inputBg = isDark ? "bg-black/50 border-white/10 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900";
  const labelColor = isDark ? "text-zinc-400" : "text-zinc-500";
  const textColor = isDark ? "text-white" : "text-zinc-900";
  const subCardBg = isDark ? "bg-black/40 border-white/5" : "bg-zinc-50 border-zinc-150";
  const borderLight = isDark ? "border-white/5" : "border-zinc-150";

  // Helper to get previous 5 days strings to show as a quick log grid (including today 2026-06-25)
  const getLogDates = () => {
    const dates = [];
    const base = new Date("2026-06-25T09:00:00");
    for (let i = 4; i >= 0; i--) {
      const d = new Date(base.getTime() - 86400000 * i);
      dates.push({
        dateStr: d.toISOString().split("T")[0],
        dayLabel: d.toLocaleDateString([], { weekday: "narrow" }),
        dayNum: d.getDate()
      });
    }
    return dates;
  };

  const logDates = getLogDates();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      await onAddHabit({ title, frequency });
      setTitle("");
      setShowForm(false);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLog = async (habit: Habit, dateStr: string) => {
    const logIndex = habit.logs.findIndex(l => l.date === dateStr);
    let updatedLogs: HabitLog[] = [...habit.logs];

    let isAdding = false;
    if (logIndex >= 0) {
      updatedLogs[logIndex] = { ...updatedLogs[logIndex], completed: !updatedLogs[logIndex].completed };
    } else {
      updatedLogs.push({ date: dateStr, completed: true });
      isAdding = true;
    }

    updatedLogs = updatedLogs.filter(l => l.completed);

    await onUpdateHabit(habit.id, { 
      logs: updatedLogs,
      userId: profileUid
    });

    if (isAdding) {
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.8 },
        colors: ["#3b82f6", "#10b981"]
      });
    }
  };

  const isCompletedOn = (habit: Habit, dateStr: string) => {
    const log = habit.logs.find(l => l.date === dateStr);
    return log ? log.completed : false;
  };

  return (
    <div className="space-y-6">
      
      {/* 3 Questions Orientation Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
            Consistency Builder
          </div>
          <h1 className={`text-2xl font-extrabold tracking-tight mt-1 ${textColor}`}>
            Atomic Habits
          </h1>
          <p className={`${labelColor} text-xs mt-0.5`}>
            Re-wire your mental discipline through small routines. Check-in daily, review best streaks, and unlock focus medals.
          </p>
        </div>

        {/* Dynamic advice card - Answers "What should I do next?" */}
        <div className={`p-3 rounded-xl border flex gap-3 items-start max-w-sm text-xs ${cardBg}`}>
          <HelpCircle className="h-4.5 w-4.5 text-purple-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-purple-600 dark:text-purple-400 block text-[10px] uppercase font-mono">NEXT ACTION:</span>
            <p className={labelColor}>Complete your daily checklist for <span className="font-bold">today</span> by checking the matching date bubble. Check-ins award +20 XP!</p>
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${cardBg} p-5 rounded-2xl border flex items-center justify-between shadow-xs transition-colors`}>
          <div className="space-y-1">
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono font-bold uppercase">Reward Engine</span>
            <h3 className={`text-xl font-extrabold ${textColor}`}>Consistency Bonus</h3>
            <p className={`text-xs ${labelColor}`}>Each individual check-in rewards +20 XP instantly.</p>
          </div>
          <Activity className="h-10 w-10 text-purple-500 animate-pulse" />
        </div>

        <div className={`${cardBg} p-5 rounded-2xl border flex items-center justify-between shadow-xs transition-colors`}>
          <div className="space-y-1">
            <span className="text-[10px] text-pink-600 dark:text-pink-400 font-mono font-bold uppercase">Streak System</span>
            <h3 className={`text-xl font-extrabold ${textColor}`}>Keep Streaks Hot</h3>
            <p className={`text-xs ${labelColor}`}>Maintain high streaks to secure badges on the Leaderboard.</p>
          </div>
          <Flame className="h-10 w-10 text-pink-500 animate-pulse" />
        </div>
      </div>

      {/* Controller header */}
      <div className={`flex justify-between items-center p-4 rounded-xl border transition-all ${barBg}`}>
        <h3 className={`text-xs font-bold flex items-center gap-2 uppercase tracking-wider ${textColor}`}>
          <Flame className="h-4.5 w-4.5 text-orange-500" />
          Your Atomic Habits
        </h3>
        
        <button
          onClick={() => setShowForm(!showForm)}
          className={`font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
            showForm ? "bg-zinc-200 text-zinc-800 hover:bg-zinc-300" : "bg-purple-600 hover:bg-purple-500 text-white"
          }`}
        >
          {showForm ? "Hide Form" : "Create Habit"}
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Collapsible Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-5 rounded-2xl border ${isDark ? "bg-zinc-900/80 border-purple-500/20 shadow-lg" : "bg-white border-purple-200 shadow-md"}`}
          >
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1 md:col-span-2">
                <label className={`text-[10px] font-mono font-bold uppercase ${labelColor}`}>Habit Description / Action</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Study 2 Hours, Drink water, Code 1 hour..."
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 ${inputBg}`}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-mono font-bold uppercase ${labelColor}`}>Frequency Interval</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as "Daily" | "Weekly")}
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 ${inputBg}`}
                >
                  <option value="Daily" className={isDark ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"}>Daily</option>
                  <option value="Weekly" className={isDark ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"}>Weekly</option>
                </select>
              </div>

              <div className="md:col-span-3 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${isDark ? "hover:bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  {saving ? "Adding..." : "Add Atomic Habit"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Habits List */}
      <div className="space-y-3">
        {habits.length > 0 ? (
          habits.map((habit) => (
            <motion.div
              layout
              key={habit.id}
              className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs transition-colors ${cardBg}`}
            >
              {/* Left Column: Title and Streak */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase ${isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-100 text-purple-800"}`}>
                    {habit.frequency}
                  </span>
                  <span className={`text-sm font-bold ${textColor}`}>{habit.title}</span>
                </div>
                
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1 text-orange-500 font-mono font-bold">
                    <Flame className="h-4.5 w-4.5 text-orange-500 fill-orange-500/20 animate-pulse" />
                    <span>Streak: {habit.streak} Days</span>
                  </div>
                  <div className={labelColor}>
                    Best: <span className={`font-mono font-bold ${textColor}`}>{habit.bestStreak} days</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Grid Logging and Delete */}
              <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-zinc-100 dark:border-white/5">
                
                {/* 5 Days Grid */}
                <div className="flex items-center gap-1.5">
                  {logDates.map((date) => {
                    const done = isCompletedOn(habit, date.dateStr);
                    const isToday = date.dateStr === "2026-06-25";
                    return (
                      <button
                        key={date.dateStr}
                        onClick={() => handleToggleLog(habit, date.dateStr)}
                        className={`h-11 w-11 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                          done 
                            ? "bg-purple-600 border-purple-500 text-white shadow-xs" 
                            : isToday 
                            ? isDark 
                              ? "bg-purple-950/20 border-purple-500/35 text-purple-300 hover:border-purple-400" 
                              : "bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                            : isDark
                            ? "bg-black/30 border-white/5 text-zinc-500 hover:border-white/10"
                            : "bg-zinc-100 border-zinc-200 text-zinc-500 hover:bg-zinc-200"
                        }`}
                        title={done ? `Completed on ${date.dateStr}` : `Log habit for ${date.dateStr}`}
                      >
                        <span className="text-[8px] font-bold font-mono tracking-tighter uppercase">{date.dayLabel}</span>
                        <span className="text-xs font-black">{date.dayNum}</span>
                      </button>
                    );
                  })}
                </div>

                <div className={`h-8 w-[1px] ${isDark ? "bg-white/5" : "bg-zinc-200"} hidden sm:block`} />

                <button
                  onClick={() => {
                    if(confirm("Remove this habit permanently?")) {
                      onDeleteHabit(habit.id);
                    }
                  }}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    isDark ? "hover:bg-red-500/10 text-zinc-500 hover:text-red-400" : "hover:bg-red-50 text-zinc-400 hover:text-red-600 border border-zinc-200/60 shadow-xs"
                  }`}
                  title="Remove habit"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className={`text-center py-12 rounded-2xl border border-dashed ${isDark ? "bg-zinc-900/30 border-white/5" : "bg-zinc-100/50 border-zinc-200"}`}>
            <Flame className={`h-10 w-10 mx-auto mb-2 text-zinc-400`} />
            <p className={`font-bold text-sm ${textColor}`}>No habits active</p>
            <p className={`text-xs mt-1 ${labelColor}`}>Setup atomic habits like Reading or Coding to maintain consistency and score multipliers!</p>
          </div>
        )}
      </div>
    </div>
  );
}
