/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  onAuthStateChangedListener, 
  loginWithGoogle, 
  signOutUser,
  isRealFirebase 
} from "./firebase";
import { 
  Task, Goal, Habit, Notification, UserProfile, DashboardStats, 
  Priority, Category, GoalType 
} from "./types";

// Import Views
import DashboardView from "./components/DashboardView";
import TasksView from "./components/TasksView";
import SchedulerView from "./components/SchedulerView";
import GoalsView from "./components/GoalsView";
import HabitsView from "./components/HabitsView";
import CoachView from "./components/CoachView";
import LeaderboardView from "./components/LeaderboardView";

// Icons
import { 
  Clock, ShieldAlert, CheckCircle, Calendar, Trophy, Bot, Mic, 
  Bell, User, LogOut, Sun, Moon, Shield, Award, ClipboardList, Flame, Sparkles
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Core workspace state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Authentication Setup & Initial Seeding
  useEffect(() => {
    const unsub = onAuthStateChangedListener(async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadUserData(user.uid, user.email || "guest@example.com");
      } else {
        setCurrentUser(null);
        setProfile(null);
        setTasks([]);
        setGoals([]);
        setHabits([]);
        setNotifications([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const loadUserData = async (uid: string, email: string) => {
    try {
      // Trigger Seed data check
      await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid })
      });

      // Load Profile
      const pRes = await fetch(`/api/profile?userId=${uid}&email=${email}`);
      const pData = await pRes.json();
      setProfile(pData);

      // Load Tasks, Goals, Habits, Notifications
      await refreshWorkspace(uid);
    } catch (e) {
      console.error("Failed loading full workspace data:", e);
    } finally {
      setLoading(false);
    }
  };

  const refreshWorkspace = async (uid: string) => {
    try {
      const [tRes, gRes, hRes, nRes] = await Promise.all([
        fetch(`/api/tasks?userId=${uid}`),
        fetch(`/api/goals?userId=${uid}`),
        fetch(`/api/habits?userId=${uid}`),
        fetch(`/api/notifications?userId=${uid}`)
      ]);

      const [tData, gData, hData, nData] = await Promise.all([
        tRes.json(),
        gRes.json(),
        hRes.json(),
        nRes.json()
      ]);

      setTasks(tData);
      setGoals(gData);
      setHabits(hData);
      setNotifications(nData.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)));
    } catch (err) {
      console.error("Workspace refresh failed:", err);
    }
  };

  // --- Dynamic Stats Calculations ---
  const calculateDashboardStats = (): DashboardStats => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    
    // Upcoming deadlines count (due in next 48h)
    const now = Date.now();
    const upcomingDeadlinesCount = tasks.filter(t => {
      if (t.completed) return false;
      const tTime = new Date(t.deadline).getTime();
      return tTime > now && tTime - now < 86400000 * 2;
    }).length;

    // Productivity Score: derived from completion rates and habit streaks
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const habitScore = habits.length > 0 ? Math.min(100, habits.reduce((acc, h) => acc + h.streak * 10, 0)) : 0;
    
    let score = completionRate;
    if (habits.length > 0) {
      score = Math.round((completionRate * 0.7) + (habitScore * 0.3));
    }

    return {
      totalTasks: total,
      completedTasks: completed,
      pendingTasks: pending,
      upcomingDeadlinesCount,
      productivityScore: score || 0,
      points: profile?.points || 0,
      streakDays: habits.reduce((acc, h) => Math.max(acc, h.streak), 0)
    };
  };

  // --- Workspace Actions ---

  const handleAddTask = async (taskData: {
    title: string;
    description: string;
    deadline: string;
    priority: Priority;
    estimatedHours: number;
    category: Category;
  }) => {
    if (!currentUser) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.uid,
        ...taskData
      })
    });
    if (res.ok) {
      await refreshWorkspace(currentUser.uid);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!currentUser) return;
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.uid,
        ...updates
      })
    });
    if (res.ok) {
      // Re-fetch Profile too as they might have earned points / badges
      const pRes = await fetch(`/api/profile?userId=${currentUser.uid}`);
      const pData = await pRes.json();
      setProfile(pData);
      
      await refreshWorkspace(currentUser.uid);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!currentUser) return;
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "DELETE"
    });
    if (res.ok) {
      await refreshWorkspace(currentUser.uid);
    }
  };

  const handleAddGoal = async (goalData: { title: string; type: GoalType; targetCount: number; deadline: string }) => {
    if (!currentUser) return;
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.uid,
        ...goalData
      })
    });
    if (res.ok) {
      await refreshWorkspace(currentUser.uid);
    }
  };

  const handleUpdateGoal = async (goalId: string, updates: Partial<Goal>) => {
    if (!currentUser) return;
    const res = await fetch(`/api/goals/${goalId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.uid,
        ...updates
      })
    });
    if (res.ok) {
      const pRes = await fetch(`/api/profile?userId=${currentUser.uid}`);
      const pData = await pRes.json();
      setProfile(pData);
      await refreshWorkspace(currentUser.uid);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!currentUser) return;
    const res = await fetch(`/api/goals/${goalId}`, {
      method: "DELETE"
    });
    if (res.ok) {
      await refreshWorkspace(currentUser.uid);
    }
  };

  const handleAddHabit = async (habitData: { title: string; frequency: "Daily" | "Weekly" }) => {
    if (!currentUser) return;
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.uid,
        ...habitData
      })
    });
    if (res.ok) {
      await refreshWorkspace(currentUser.uid);
    }
  };

  const handleUpdateHabit = async (habitId: string, updates: Partial<Habit>) => {
    if (!currentUser) return;
    const res = await fetch(`/api/habits/${habitId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.uid,
        ...updates
      })
    });
    if (res.ok) {
      const pRes = await fetch(`/api/profile?userId=${currentUser.uid}`);
      const pData = await pRes.json();
      setProfile(pData);
      await refreshWorkspace(currentUser.uid);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!currentUser) return;
    const res = await fetch(`/api/habits/${habitId}`, {
      method: "DELETE"
    });
    if (res.ok) {
      await refreshWorkspace(currentUser.uid);
    }
  };

  const handleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      setCurrentUser(user);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    setCurrentUser(null);
  };

  const stats = calculateDashboardStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white space-y-4">
        <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-mono tracking-wider animate-pulse text-gray-400">LOADING LIFE SAVER WORKSPACE...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-250 ${theme === "dark" ? "bg-black text-white" : "bg-zinc-50 text-zinc-900"}`}>
      {/* Dynamic Background elements for ultra-premium design */}
      {theme === "dark" ? (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-900/10 rounded-full blur-[120px]" />
        </div>
      ) : (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-500/5 rounded-full blur-[120px]" />
        </div>
      )}

      {/* Navigation Topbar */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b py-4 px-6 flex justify-between items-center transition-colors duration-250 ${theme === "dark" ? "bg-zinc-950/85 border-white/5" : "bg-white/85 border-zinc-200"}`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h1 className={`text-md font-black tracking-tight ${theme === "dark" ? "bg-gradient-to-r from-white via-purple-300 to-pink-300 bg-clip-text text-transparent" : "text-zinc-900"}`}>
              LAST-MINUTE LIFE SAVER
            </h1>
            <span className="text-[10px] font-mono text-purple-600 dark:text-pink-400 block tracking-widest leading-none font-bold">AI PRODUCTIVITY CO-PILOT</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme switcher */}
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`p-2.5 rounded-xl transition-all ${theme === "dark" ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-zinc-200 shadow-sm"}`}
          >
            {theme === "dark" ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-indigo-600" />}
          </button>

          {currentUser && profile ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className={`text-xs font-bold ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>{profile.name}</div>
                <div className="text-[10px] font-mono text-purple-600 dark:text-purple-400 uppercase font-black">{profile.points} XP</div>
              </div>
              <button
                onClick={handleLogout}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${theme === "dark" ? "hover:bg-red-500/10 text-zinc-500 hover:text-red-400" : "hover:bg-red-100 border border-zinc-200 text-zinc-500 hover:text-red-600 shadow-sm"}`}
                title="Log Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Log In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      {!currentUser || !profile ? (
        <div className="max-w-4xl mx-auto px-6 py-16 z-10 relative flex flex-col items-center justify-center min-h-[75vh]">
          <div className={`w-full max-w-2xl p-8 rounded-3xl border shadow-xl backdrop-blur-md transition-all duration-300 ${theme === "dark" ? "bg-zinc-900/70 border-white/5 shadow-purple-950/15" : "bg-white border-zinc-200/80 shadow-lg"}`}>
            <div className="text-center space-y-3 mb-10">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
                <Clock className="h-7 w-7" />
              </div>
              <h2 className={`text-2xl font-extrabold tracking-tight ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
                Last-Minute Life Saver
              </h2>
              <p className={`text-sm leading-relaxed max-w-md mx-auto ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>
                Your intelligent co-pilot designed to defeat procrastination, align focus blocks with your peak productivity biological hours, and secure high-stress project goals.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              <div className={`p-4.5 rounded-2xl border transition-colors ${theme === "dark" ? "bg-black/40 border-white/5" : "bg-zinc-50 border-zinc-200/60"}`}>
                <h4 className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400 uppercase mb-1 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> AI Peak Scheduler
                </h4>
                <p className={`text-[11px] leading-normal ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>Maps and schedules study/task blocks according to your customized daily biological energy hours.</p>
              </div>
              <div className={`p-4.5 rounded-2xl border transition-colors ${theme === "dark" ? "bg-black/40 border-white/5" : "bg-zinc-50 border-zinc-200/60"}`}>
                <h4 className="text-xs font-bold font-mono text-pink-600 dark:text-pink-400 uppercase mb-1 flex items-center gap-1.5">
                  <Mic className="h-4 w-4" /> Voice Command Deck
                </h4>
                <p className={`text-[11px] leading-normal ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>Speak naturally or click suggestions to append tasks, complete logs, or update your schedule instantly.</p>
              </div>
              <div className={`p-4.5 rounded-2xl border transition-colors ${theme === "dark" ? "bg-black/40 border-white/5" : "bg-zinc-50 border-zinc-200/60"}`}>
                <h4 className="text-xs font-bold font-mono text-yellow-600 dark:text-yellow-500 uppercase mb-1 flex items-center gap-1.5">
                  <Trophy className="h-4 w-4" /> Gamified Milestones
                </h4>
                <p className={`text-[11px] leading-normal ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>Earn points and level up! Log daily achievements to unlock collectible status badges.</p>
              </div>
              <div className={`p-4.5 rounded-2xl border transition-colors ${theme === "dark" ? "bg-black/40 border-white/5" : "bg-zinc-50 border-zinc-200/60"}`}>
                <h4 className="text-xs font-bold font-mono text-blue-600 dark:text-blue-500 uppercase mb-1 flex items-center gap-1.5">
                  <Bot className="h-4 w-4" /> AI Saviour Coach
                </h4>
                <p className={`text-[11px] leading-normal ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>Engage with our supportive, non-judgmental AI coach to deconstruct complex work rubrics into actionable tasks.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Sparkles className="h-4 w-4" />
                <span>Enter Workspace (Google / Guest Login)</span>
              </button>
              <div className="text-center font-mono text-[9px] text-zinc-500">
                {isRealFirebase ? "🔒 Secure Cloud Database Active" : "✨ Sandbox Simulation Mode Active"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 relative">
          {/* Navigation Rail / Sidebar */}
          <nav className="lg:col-span-3 space-y-2">
            {[
              { id: "Dashboard", label: "Dashboard", icon: Trophy },
              { id: "Tasks", label: "Smart Tasks", icon: ClipboardList },
              { id: "Scheduler", label: "AI Scheduler", icon: Calendar },
              { id: "Goals", label: "Goals Tracker", icon: Award },
              { id: "Habits", label: "Atomic Habits", icon: Flame },
              { id: "Coach", label: "AI Saviour Coach", icon: Bot },
              { id: "Leaderboard", label: "Leaderboard & Badges", icon: Trophy }
            ].map((item) => {
              const IconComp = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all text-left ${
                    active 
                      ? theme === "dark"
                        ? "bg-gradient-to-r from-purple-950/40 to-pink-950/20 border border-purple-500/40 text-white font-extrabold shadow-md"
                        : "bg-purple-100/80 border border-purple-200 text-purple-900 font-extrabold shadow-sm"
                      : theme === "dark"
                        ? "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent"
                  }`}
                >
                  <IconComp className={`h-4.5 w-4.5 ${active ? "text-purple-600" : ""}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Dynamic Workspace Workspace Stage */}
          <main className="lg:col-span-9 min-h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "Dashboard" && profile && (
                  <DashboardView 
                    tasks={tasks} 
                    profile={profile} 
                    notifications={notifications} 
                    stats={stats} 
                    onSwitchTab={setActiveTab}
                    theme={theme}
                  />
                )}

                {activeTab === "Tasks" && profile && (
                  <TasksView 
                    tasks={tasks} 
                    profileUid={profile.uid}
                    onAddTask={handleAddTask} 
                    onUpdateTask={handleUpdateTask} 
                    onDeleteTask={handleDeleteTask} 
                    theme={theme}
                  />
                )}

                {activeTab === "Scheduler" && profile && (
                  <SchedulerView 
                    tasks={tasks} 
                    profile={profile} 
                    onRefreshSchedule={async () => await refreshWorkspace(profile.uid)} 
                    onUpdateTask={handleUpdateTask} 
                    theme={theme}
                  />
                )}

                {activeTab === "Goals" && profile && (
                  <GoalsView 
                    goals={goals} 
                    profileUid={profile.uid}
                    onAddGoal={handleAddGoal} 
                    onUpdateGoal={handleUpdateGoal} 
                    onDeleteGoal={handleDeleteGoal} 
                    theme={theme}
                  />
                )}

                {activeTab === "Habits" && profile && (
                  <HabitsView 
                    habits={habits} 
                    profileUid={profile.uid}
                    onAddHabit={handleAddHabit} 
                    onUpdateHabit={handleUpdateHabit} 
                    onDeleteHabit={handleDeleteHabit} 
                    theme={theme}
                  />
                )}

                {activeTab === "Coach" && profile && (
                  <CoachView 
                    tasks={tasks} 
                    profile={profile} 
                    activeTab={activeTab} 
                    onSetTab={setActiveTab} 
                    onAddTask={handleAddTask} 
                    onUpdateTask={handleUpdateTask} 
                    onRefreshData={async () => await refreshWorkspace(profile.uid)} 
                    theme={theme}
                  />
                )}

                {activeTab === "Leaderboard" && profile && (
                  <LeaderboardView profile={profile} theme={theme} />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      )}

      {/* Humble aesthetic credits footer */}
      <footer className={`py-8 text-center border-t mt-12 font-mono text-[10px] text-gray-500 transition-colors duration-250 ${theme === "dark" ? "border-white/5 bg-zinc-950/20" : "border-zinc-200 bg-zinc-100"}`}>
        <p>Last-Minute Life Saver • Made with 💜 in AI Studio Build</p>
      </footer>
    </div>
  );
}
