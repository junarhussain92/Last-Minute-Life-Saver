import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, CartesianGrid, Cell, PieChart, Pie
} from "recharts";
import { 
  Clock, ShieldAlert, CheckCircle, AlertTriangle, Sparkles, 
  TrendingUp, Award, Bell, Zap, Calendar, ClipboardList, HelpCircle, ArrowRight
} from "lucide-react";
import { Task, DashboardStats, UserProfile, Notification } from "../types";

interface DashboardViewProps {
  tasks: Task[];
  profile: UserProfile;
  notifications: Notification[];
  stats: DashboardStats;
  onSwitchTab: (tab: string) => void;
  theme?: "dark" | "light";
}

export default function DashboardView({ tasks, profile, notifications, stats, onSwitchTab, theme = "light" }: DashboardViewProps) {
  const [aiReminders, setAiReminders] = useState<string[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const isDark = theme === "dark";
  const cardBg = isDark ? "bg-zinc-900/80 border-white/5" : "bg-white border-zinc-200/80 shadow-sm";
  const bannerBg = isDark ? "bg-gradient-to-tr from-purple-950/20 via-zinc-900 to-zinc-950 border-purple-500/10" : "bg-gradient-to-tr from-purple-50/70 via-pink-50/50 to-white border-purple-100";
  const subCardBg = isDark ? "bg-black/40 border-white/5" : "bg-zinc-50 border-zinc-150";
  const textMuted = isDark ? "text-zinc-400" : "text-zinc-500";
  const textWhite = isDark ? "text-white" : "text-zinc-900";
  const borderLight = isDark ? "border-white/5" : "border-zinc-200/80";

  // Fetch context-aware AI reminders
  const fetchAiReminders = async () => {
    setLoadingReminders(true);
    try {
      const res = await fetch("/api/reminders/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.uid })
      });
      const data = await res.json();
      if (data.reminders) {
        setAiReminders(data.reminders);
      }
    } catch (e) {
      console.error("Failed to fetch reminders:", e);
    } finally {
      setLoadingReminders(false);
    }
  };

  useEffect(() => {
    fetchAiReminders();
  }, []);

  // Map tasks into Recharts data
  const weeklyData = [
    { name: "Mon", Completed: 1, Target: 2 },
    { name: "Tue", Completed: 2, Target: 3 },
    { name: "Wed", Completed: 1, Target: 2 },
    { name: "Thu", Completed: 3, Target: 4 },
    { name: "Fri", Completed: 0, Target: 2 },
    { name: "Sat", Completed: 2, Target: 2 },
    { name: "Sun", Completed: 1, Target: 1 }
  ];

  // Adjust active week completions with actual task items
  tasks.forEach(t => {
    if (t.completed && t.completedAt) {
      const day = new Date(t.completedAt).getDay(); // 0 is Sun, 1 is Mon...
      const weekdayIndices = [6, 0, 1, 2, 3, 4, 5]; // maps standard getDay() to our array indices
      const idx = weekdayIndices[day];
      if (idx !== undefined && weeklyData[idx]) {
        weeklyData[idx].Completed += 1;
      }
    }
  });

  const categoryDistribution = Object.values(tasks).reduce((acc: any[], task) => {
    const existing = acc.find(item => item.name === task.category);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: task.category, value: 1 });
    }
    return acc;
  }, []);

  const COLORS = ["#a855f7", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#6b7280"];

  // Find critical risk tasks
  const riskTasks = tasks
    .filter(t => !t.completed)
    .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
    .slice(0, 2);

  // Dynamic next step advisor based on user state
  const getNextStepAdvice = () => {
    const pendingHighRisk = tasks.filter(t => !t.completed && t.riskLevel === "Red");
    const totalPending = tasks.filter(t => !t.completed).length;

    if (totalPending === 0) {
      return {
        message: "You have completed all pending targets! Outstanding work.",
        actionLabel: "Create new task",
        tab: "Tasks",
        badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      };
    }
    if (pendingHighRisk.length > 0) {
      return {
        message: `You have ${pendingHighRisk.length} high-risk target${pendingHighRisk.length > 1 ? "s" : ""} close to their deadlines. Prevent failure now!`,
        actionLabel: "View high risk tasks",
        tab: "Tasks",
        badgeColor: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
      };
    }
    return {
      message: `You have ${totalPending} pending objective${totalPending > 1 ? "s" : ""} on your radar. Let AI map out your perfect focus schedule.`,
      actionLabel: "Open AI Scheduler",
      tab: "Scheduler",
      badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
    };
  };

  const advice = getNextStepAdvice();

  return (
    <div className="space-y-6" id="dashboard-container">
      
      {/* Visual orientation header: "Where am I? What can I do here?" */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
            Productivity Hub
          </div>
          <h1 className={`text-2xl font-extrabold tracking-tight mt-1 ${textWhite}`}>
            Control Dashboard
          </h1>
          <p className={`${textMuted} text-xs mt-0.5`}>
            Track your gamified study metrics, monitor deadline safety scores, and receive real-time AI warnings.
          </p>
        </div>

        {/* Dynamic Next Step Advisor Card: "What should I do next?" */}
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center justify-between gap-4 p-3 px-4 rounded-xl border max-w-md ${cardBg}`}
        >
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase block">RECOMMENDED NEXT STEP:</span>
            <p className={`text-xs ${textWhite} truncate font-medium mt-0.5`}>{advice.message}</p>
          </div>
          <button 
            onClick={() => onSwitchTab(advice.tab)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <span>{advice.actionLabel}</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </motion.div>
      </div>

      {/* Profile Welcome Banner */}
      <div className={`p-6 rounded-2xl border transition-all duration-300 ${bannerBg}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h2 className={`text-xl font-bold ${textWhite}`}>
              Welcome back, {profile.name}!
            </h2>
            <p className={`${textMuted} text-xs`}>
              Designation: <span className="text-purple-600 dark:text-purple-300 font-semibold">{profile.occupation}</span> 
              <span className="mx-2 text-zinc-300 dark:text-zinc-700">|</span> 
              Peak Target: <span className="italic">"{profile.productivityGoal}"</span>
            </p>
          </div>

          <div className={`flex items-center gap-4 px-4 py-2.5 rounded-xl border ${subCardBg}`}>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500 animate-pulse fill-yellow-500/20" />
              <div>
                <div className={`text-[9px] font-mono ${textMuted} uppercase`}>Lifetime XP</div>
                <div className="text-sm font-extrabold text-yellow-500">{profile.points} XP</div>
              </div>
            </div>
            <div className={`h-8 w-[1px] ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-pink-500" />
              <div>
                <div className={`text-[9px] font-mono ${textMuted} uppercase`}>Badges</div>
                <div className="text-xs font-bold text-pink-500">{profile.badges.length} Unlocked</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Tasks", val: stats.totalTasks, desc: "Objectives logged", icon: ClipboardList, color: "text-purple-500", bg: "bg-purple-500/10" },
          { title: "Completed", val: stats.completedTasks, desc: "Successfully resolved", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { title: "Pending Focus", val: stats.pendingTasks, desc: "Awaiting action", icon: Clock, color: "text-pink-500", bg: "bg-pink-500/10" },
          { title: "Productivity Score", val: `${stats.productivityScore}%`, desc: "Weekly efficiency rate", icon: TrendingUp, color: "text-indigo-500", bg: "bg-indigo-500/10" }
        ].map((item, idx) => (
          <motion.div 
            key={idx}
            whileHover={{ y: -2 }}
            className={`${cardBg} p-4.5 rounded-2xl flex items-center gap-4 border transition-all`}
          >
            <div className={`p-3 rounded-xl ${item.bg}`}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <div>
              <div className={`text-xs ${textMuted}`}>{item.title}</div>
              <div className={`text-xl font-black ${textWhite}`}>{item.val}</div>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500">{item.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Inner Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: AI Assistant Warnings & Reminders */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Reminders Card */}
          <div className={`${cardBg} p-5 rounded-2xl border shadow-sm`}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className={`text-sm font-bold ${textWhite} flex items-center gap-2`}>
                  <Sparkles className="h-4.5 w-4.5 text-purple-500" />
                  Context-Aware AI Reminders
                </h3>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Instant action items suggested by your AI co-pilot.</p>
              </div>
              <button 
                onClick={fetchAiReminders}
                className="text-[11px] text-purple-600 dark:text-purple-400 hover:text-purple-500 font-semibold transition-colors cursor-pointer"
                disabled={loadingReminders}
              >
                {loadingReminders ? "Re-generating..." : "🔄 Refresh"}
              </button>
            </div>

            <div className="space-y-2.5">
              {loadingReminders ? (
                <div className={`py-10 text-center ${textMuted} text-xs flex flex-col items-center justify-center gap-2`}>
                  <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  Synthesizing tasks and evaluating scheduling risks...
                </div>
              ) : aiReminders.length > 0 ? (
                aiReminders.map((reminder, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={idx} 
                    className={`p-3.5 rounded-xl border text-xs transition-all ${
                      isDark 
                        ? "bg-purple-950/10 border-purple-500/10 text-purple-200" 
                        : "bg-purple-50/40 border-purple-100 text-purple-950"
                    }`}
                  >
                    <div className="flex gap-2 items-start">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                      <span>{reminder}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-10 border border-dashed rounded-xl border-zinc-200 dark:border-white/10">
                  <p className={`text-xs ${textMuted}`}>No context alerts currently generated.</p>
                  <button 
                    onClick={() => onSwitchTab("Tasks")} 
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-1.5 hover:underline inline-flex items-center gap-1"
                  >
                    Create new high priority task <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AI Deadline Risk Predictor */}
          <div className={`${cardBg} p-5 rounded-2xl border shadow-sm`}>
            <div>
              <h3 className={`text-sm font-bold ${textWhite} flex items-center gap-2`}>
                <ShieldAlert className="h-4.5 w-4.5 text-pink-500" />
                AI Deadline Risk Predictor
              </h3>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">AI analyzes your hours versus remaining time to forecast project choke points.</p>
            </div>
            
            <div className="space-y-3 mt-4">
              {riskTasks.length > 0 ? (
                riskTasks.map((task) => {
                  const isRed = task.riskLevel === "Red";
                  const isYellow = task.riskLevel === "Yellow";
                  return (
                    <div 
                      key={task.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        isRed 
                          ? isDark ? "bg-red-950/10 border-red-500/15 text-red-200" : "bg-red-50/50 border-red-150 text-red-900"
                          : isYellow 
                          ? isDark ? "bg-amber-950/10 border-amber-500/15 text-amber-200" : "bg-amber-50/50 border-amber-150 text-amber-900"
                          : isDark ? "bg-emerald-950/10 border-emerald-500/15 text-emerald-200" : "bg-emerald-50/50 border-emerald-150 text-emerald-900"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`h-2 w-2 rounded-full ${isRed ? "bg-red-500 animate-pulse" : isYellow ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                          <span className={`font-bold text-xs ${isDark ? "text-white" : "text-zinc-950"}`}>{task.title}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${isDark ? "bg-white/10 text-gray-300" : "bg-zinc-200/60 text-zinc-700"}`}>{task.priority} Priority</span>
                        </div>
                        <p className={`text-xs leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                          {task.riskAnalysis || `Requires ~${task.estimatedHours} focused hours before the upcoming deadline.`}
                        </p>
                      </div>
                      <div className="flex sm:flex-col items-start sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-black/5 dark:border-white/5 shrink-0">
                        <span className="text-[9px] font-mono uppercase text-zinc-500">Risk Severity</span>
                        <span className={`text-sm font-black ${isRed ? "text-red-500" : isYellow ? "text-amber-500" : "text-emerald-500"}`}>
                          {task.riskScore || 0}%
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 border border-dashed rounded-xl border-zinc-200 dark:border-white/10">
                  <p className={`text-xs ${textMuted}`}>🟢 Zero deadline warning signals. Your current plan is safe!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Breakdown & Notification Stream */}
        <div className="space-y-6">
          
          {/* Category Breakdown Pie Chart */}
          <div className={`${cardBg} p-5 rounded-2xl border shadow-sm`}>
            <h3 className={`text-sm font-bold ${textWhite} flex items-center gap-2 mb-2`}>
              <TrendingUp className="h-4.5 w-4.5 text-indigo-500" />
              Category Load
            </h3>
            <div className="h-[180px] w-full flex items-center justify-center relative">
              {categoryDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "11px", backgroundColor: isDark ? "#18181b" : "#ffffff", borderColor: isDark ? "#27272a" : "#e4e4e7" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className={`text-xs ${textMuted} text-center`}>No category data yet</div>
              )}
            </div>

            {/* Simple Visual Legend */}
            <div className="grid grid-cols-2 gap-1.5 mt-2 max-h-[80px] overflow-y-auto scrollbar-none pr-1">
              {categoryDistribution.map((item, index) => (
                <div key={item.name} className={`flex items-center gap-1.5 text-[10px] ${textMuted}`}>
                  <span className="h-2 w-2 rounded-full block shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="truncate">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Direct Notifications stream */}
          <div className={`${cardBg} p-5 rounded-2xl border shadow-sm flex flex-col justify-between max-h-[350px]`}>
            <div>
              <h3 className={`text-sm font-bold ${textWhite} mb-3 flex items-center gap-2`}>
                <Bell className="h-4.5 w-4.5 text-pink-500" />
                Notification Stream
              </h3>
              <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1 scrollbar-thin">
                {notifications.slice(0, 4).map((notif) => (
                  <div key={notif.id} className={`p-3 rounded-xl border text-xs ${isDark ? "bg-black/30 border-white/5" : "bg-zinc-50 border-zinc-150"}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-bold ${textWhite}`}>{notif.title}</span>
                      <span className={`text-[9px] ${textMuted}`}>{new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className={`${textMuted} leading-normal`}>{notif.message}</p>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className={`text-center py-10 text-xs ${textMuted}`}>
                    No recent warnings or logs.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Progress bar Chart */}
      <div className={`${cardBg} p-5 rounded-2xl border shadow-sm`}>
        <h3 className={`text-sm font-bold ${textWhite} mb-4 flex items-center gap-2`}>
          <Calendar className="h-4.5 w-4.5 text-purple-500" />
          Weekly Productivity Progress
        </h3>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#27272a" : "#e4e4e7"} vertical={false} />
              <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "11px", backgroundColor: isDark ? "#18181b" : "#ffffff", borderColor: isDark ? "#27272a" : "#e4e4e7" }} />
              <Bar dataKey="Completed" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Target" fill={isDark ? "#27272a" : "#e4e4e7"} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
