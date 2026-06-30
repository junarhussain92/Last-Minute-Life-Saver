import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Plus, Trash2, CheckCircle2, Award, Zap, HelpCircle } from "lucide-react";
import { Goal, GoalType } from "../types";
import confetti from "canvas-confetti";

interface GoalsViewProps {
  goals: Goal[];
  profileUid: string;
  onAddGoal: (goalData: { title: string; type: GoalType; targetCount: number; deadline: string }) => Promise<void>;
  onUpdateGoal: (goalId: string, updates: Partial<Goal>) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  theme?: "dark" | "light";
}

export default function GoalsView({ goals, profileUid, onAddGoal, onUpdateGoal, onDeleteGoal, theme = "light" }: GoalsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<GoalType>(GoalType.DAILY);
  const [targetCount, setTargetCount] = useState(1);
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const isDark = theme === "dark";
  const cardBg = isDark ? "bg-zinc-900/80 border-white/5" : "bg-white border-zinc-200/80 shadow-sm";
  const barBg = isDark ? "bg-zinc-900/60 border-white/5" : "bg-white border-zinc-200 shadow-sm";
  const inputBg = isDark ? "bg-black/50 border-white/10 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900";
  const labelColor = isDark ? "text-zinc-400" : "text-zinc-500";
  const textColor = isDark ? "text-white" : "text-zinc-900";
  const subCardBg = isDark ? "bg-black/40 border-white/5" : "bg-zinc-50 border-zinc-150";
  const borderLight = isDark ? "border-white/5" : "border-zinc-150";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const finalDeadline = deadline || new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0];
      await onAddGoal({
        title,
        type,
        targetCount: Number(targetCount),
        deadline: finalDeadline
      });
      setTitle("");
      setTargetCount(1);
      setDeadline("");
      setShowForm(false);
      
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleIncrementGoal = async (goal: Goal) => {
    const nextCount = goal.currentCount + 1;
    await onUpdateGoal(goal.id, { 
      currentCount: nextCount,
      completed: nextCount >= goal.targetCount,
      userId: profileUid 
    });
    
    if (nextCount >= goal.targetCount) {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#ec4899", "#3b82f6"]
      });
    } else {
      confetti({
        particleCount: 20,
        spread: 20,
        origin: { y: 0.8 }
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 3 Questions Orientation Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
            Milestone Hub
          </div>
          <h1 className={`text-2xl font-extrabold tracking-tight mt-1 ${textColor}`}>
            Gamified Goals
          </h1>
          <p className={`${labelColor} text-xs mt-0.5`}>
            Deconstruct monthly, weekly, and daily study milestones, increment progress bars, and secure massive XP payouts.
          </p>
        </div>

        {/* Dynamic tips banner - Answers "What should I do next?" */}
        <div className={`p-3 rounded-xl border flex gap-3 items-start max-w-sm text-xs ${cardBg}`}>
          <HelpCircle className="h-4.5 w-4.5 text-purple-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-purple-600 dark:text-purple-400 block text-[10px] uppercase font-mono">NEXT ACTION:</span>
            <p className={labelColor}>Click <span className="font-bold">"Log Achievement"</span> on any goal to record a incremental step. Reaching 100% unlocks +100 XP instantly!</p>
          </div>
        </div>
      </div>

      {/* Target Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.values(GoalType).map((gType) => {
          const typeGoals = goals.filter(g => g.type === gType);
          const completedCount = typeGoals.filter(g => g.completed).length;
          const pct = typeGoals.length > 0 ? Math.round((completedCount / typeGoals.length) * 100) : 0;
          return (
            <div key={gType} className={`${cardBg} p-5 rounded-2xl border flex items-center justify-between shadow-xs transition-all`}>
              <div className="space-y-1">
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono font-bold uppercase">{gType} Milestones</span>
                <h3 className={`text-xl font-extrabold ${textColor}`}>{completedCount}/{typeGoals.length} Done</h3>
                <p className={`text-xs ${labelColor}`}>Success ratio metric</p>
              </div>
              <div className={`relative h-14 w-14 flex items-center justify-center rounded-full border ${subCardBg} font-black text-xs`}>
                <span>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Control Banner */}
      <div className={`flex justify-between items-center p-4 rounded-xl border transition-all ${barBg}`}>
        <h3 className={`text-xs font-bold flex items-center gap-2 uppercase tracking-wider ${textColor}`}>
          <Trophy className="h-4.5 w-4.5 text-yellow-500" />
          Milestones Roster
        </h3>
        
        <button
          onClick={() => setShowForm(!showForm)}
          className={`font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
            showForm ? "bg-zinc-200 text-zinc-800 hover:bg-zinc-300" : "bg-purple-600 hover:bg-purple-500 text-white"
          }`}
        >
          {showForm ? "Hide Form" : "Set New Goal"}
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Create form with validation helper */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-5 rounded-2xl border ${isDark ? "bg-zinc-900/80 border-purple-500/20 shadow-lg" : "bg-white border-purple-200 shadow-md"}`}
          >
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1 md:col-span-2">
                <label className={`text-[10px] font-mono font-bold uppercase ${labelColor}`}>Goal Description / Milestones</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Read 5 articles or resolve 4 project nodes"
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 ${inputBg}`}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-mono font-bold uppercase ${labelColor}`}>Frequency Interval</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as GoalType)}
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 ${inputBg}`}
                >
                  {Object.values(GoalType).map(t => (
                    <option key={t} value={t} className={isDark ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-mono font-bold uppercase ${labelColor}`}>Required Log Count</label>
                <input
                  type="number"
                  min="1"
                  value={targetCount}
                  onChange={(e) => setTargetCount(Number(e.target.value))}
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 ${inputBg}`}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-mono font-bold uppercase ${labelColor}`}>Target Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 ${inputBg}`}
                  required
                />
              </div>

              <div className="md:col-span-4 flex justify-end gap-3 pt-2">
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
                  {saving ? "Setting..." : "Lock Goal Target"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals Display List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {goals.length > 0 ? (
          goals.map((goal) => {
            const isCompleted = goal.completed;
            const pct = Math.round((goal.currentCount / goal.targetCount) * 100);
            return (
              <motion.div
                layout
                key={goal.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isCompleted 
                    ? isDark 
                      ? "bg-zinc-950/20 border-emerald-500/10 opacity-70" 
                      : "bg-emerald-50/40 border-emerald-150 opacity-85"
                    : isDark 
                    ? "bg-zinc-900/50 border-white/5 shadow-sm hover:border-white/10"
                    : "bg-white border-zinc-200/80 shadow-sm hover:border-purple-200"
                }`}
              >
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div>
                    <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase ${isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-100 text-purple-800"}`}>
                      {goal.type}
                    </span>
                    <h3 className={`text-sm font-bold mt-2 leading-snug ${isCompleted ? "line-through text-zinc-400 dark:text-zinc-500" : textColor}`}>
                      {goal.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => {
                      if(confirm("Permanently delete this milestone target?")) {
                        onDeleteGoal(goal.id);
                      }
                    }}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? "hover:bg-red-500/10 text-zinc-500 hover:text-red-400" : "hover:bg-red-50 text-zinc-400 hover:text-red-600 border border-zinc-200/40"}`}
                    title="Delete milestone"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-1.5 mt-4">
                  <div className={`flex justify-between text-xs font-mono ${labelColor}`}>
                    <span>Progress: {goal.currentCount}/{goal.targetCount} times</span>
                    <span className="font-bold">{pct}%</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${subCardBg}`}>
                    <motion.div 
                      className={`h-full rounded-full bg-gradient-to-r ${isCompleted ? "from-emerald-500 to-teal-500" : "from-purple-600 to-indigo-500"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>

                <div className={`flex justify-between items-center mt-5 pt-3.5 border-t ${borderLight}`}>
                  <span className={`text-[10px] font-mono ${labelColor}`}>
                    Target date: {new Date(goal.deadline).toLocaleDateString([], {month:"short", day:"numeric"})}
                  </span>
                  
                  {!isCompleted ? (
                    <button
                      onClick={() => handleIncrementGoal(goal)}
                      className={`font-semibold text-[10px] px-3.5 py-2 rounded-lg transition-all flex items-center gap-1 cursor-pointer border ${
                        isDark 
                          ? "bg-purple-950/40 hover:bg-purple-900/40 border-purple-500/20 text-purple-300" 
                          : "bg-purple-50 hover:bg-purple-100 border-purple-150 text-purple-700"
                      }`}
                    >
                      <Zap className="h-3 w-3 text-yellow-500 fill-yellow-500/25 animate-pulse" />
                      Log Achievement
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 uppercase">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Milestone complete (+100 XP)
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className={`col-span-1 lg:col-span-2 text-center py-12 rounded-2xl border border-dashed ${isDark ? "bg-zinc-900/30 border-white/5" : "bg-zinc-100/50 border-zinc-200"}`}>
            <Trophy className={`h-10 w-10 mx-auto mb-2 text-zinc-400`} />
            <p className={`font-bold text-sm ${textColor}`}>No goals configured</p>
            <p className={`text-xs mt-1 ${labelColor}`}>Establish Daily, Weekly, or Monthly milestones to earn bonus points and badges!</p>
          </div>
        )}
      </div>
    </div>
  );
}
