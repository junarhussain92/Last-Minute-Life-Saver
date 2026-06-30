import React from "react";
import { motion } from "motion/react";
import { Award, Trophy, Star, Zap, ShieldCheck, Heart, Crown, Lock, HelpCircle } from "lucide-react";
import { UserProfile } from "../types";

interface LeaderboardViewProps {
  profile: UserProfile;
  theme?: "dark" | "light";
}

export default function LeaderboardView({ profile, theme = "light" }: LeaderboardViewProps) {
  const isDark = theme === "dark";
  const cardBg = isDark ? "bg-zinc-900/80 border-white/5" : "bg-white border-zinc-200/80 shadow-sm";
  const labelColor = isDark ? "text-zinc-400" : "text-zinc-500";
  const textColor = isDark ? "text-white" : "text-zinc-900";
  const subCardBg = isDark ? "bg-black/40 border-white/5" : "bg-zinc-50 border-zinc-150";
  
  const badgeCardBg = (isUnlocked: boolean) => {
    if (isUnlocked) {
      return isDark 
        ? "bg-purple-950/10 border-purple-500/20 shadow-md" 
        : "bg-purple-50/50 border-purple-200 shadow-xs";
    }
    return isDark 
      ? "bg-zinc-950/40 border-white/5 opacity-50" 
      : "bg-zinc-100/40 border-zinc-150 opacity-60";
  };

  // Badges catalog
  const BADGES = [
    {
      id: "Focus Champion",
      name: "Focus Champion",
      description: "Successfully joined the Last-Minute Life Saver companion.",
      icon: ShieldCheck,
      color: "from-blue-600 to-indigo-600",
      textClass: "text-blue-500 dark:text-blue-400"
    },
    {
      id: "Productivity Master",
      name: "Productivity Master",
      description: "Successfully marked 10 tasks complete.",
      icon: Crown,
      color: "from-purple-600 to-pink-600",
      textClass: "text-purple-500 dark:text-purple-400"
    },
    {
      id: "Deadline Destroyer",
      name: "Deadline Destroyer",
      description: "Completed a Critical priority task prior to deadline.",
      icon: Trophy,
      color: "from-red-600 to-pink-600",
      textClass: "text-red-500 dark:text-red-400"
    },
    {
      id: "Consistency King",
      name: "Consistency King",
      description: "Logged progress on goals to establish an unbreakable streak.",
      icon: Star,
      color: "from-yellow-600 to-amber-600",
      textClass: "text-yellow-600 dark:text-amber-400"
    }
  ];

  // Mock users for active leaderboard
  const LEADERBOARD = [
    { name: "Siddharth Sharma", occupation: "Engineering Student", points: 2850, isCurrent: false },
    { name: "Fatima Al-Sayed", occupation: "Startup Founder", points: 2400, isCurrent: false },
    { name: "Oliver Bennett", occupation: "Digital Architect", points: 1950, isCurrent: false },
    { name: profile.name, occupation: profile.occupation, points: profile.points, isCurrent: true },
    { name: "Clara Dubois", occupation: "Research Analyst", points: 900, isCurrent: false }
  ].sort((a, b) => b.points - a.points);

  const currentRankIndex = LEADERBOARD.findIndex(u => u.isCurrent);
  const currentRank = currentRankIndex >= 0 ? currentRankIndex + 1 : 4;

  return (
    <div className="space-y-6">
      
      {/* 3 Questions Orientation Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
            Social & Badges Area
          </div>
          <h1 className={`text-2xl font-extrabold tracking-tight mt-1 ${textColor}`}>
            Achievements & Leaderboard
          </h1>
          <p className={`${labelColor} text-xs mt-0.5`}>
            Track collectible profile medals, unlock career milestone achievements, and pit your focus metrics against other high-stress achievers.
          </p>
        </div>

        {/* Action Suggestion Card - Answers "What should I do next?" */}
        <div className={`p-3 rounded-xl border flex gap-3 items-start max-w-sm text-xs ${cardBg}`}>
          <HelpCircle className="h-4.5 w-4.5 text-purple-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-purple-600 dark:text-purple-400 block text-[10px] uppercase font-mono">YOUR STATUS:</span>
            <p className={labelColor}>You are currently ranked <span className="font-bold text-purple-600 dark:text-purple-400">#{currentRank}</span> on the board. Log more completed tasks to climb to #1!</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="leaderboard-view-container">
        
        {/* Badges Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`p-6 rounded-2xl border shadow-xs transition-colors ${cardBg}`}>
            <h2 className={`text-sm font-bold mb-1 flex items-center gap-2 ${textColor}`}>
              <Award className="h-4.5 w-4.5 text-purple-500" />
              Collectable Focus Badges
            </h2>
            <p className={`text-xs mb-6 ${labelColor}`}>Unlock unique badges by ticking off tasks, establishing streaks, and completing atomic habits.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BADGES.map((badge) => {
                const isUnlocked = profile.badges.includes(badge.id);
                const IconComp = badge.icon;
                return (
                  <div 
                    key={badge.id}
                    className={`p-4 rounded-xl border flex gap-4 items-center transition-all ${badgeCardBg(isUnlocked)}`}
                  >
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${
                      isUnlocked ? badge.color + " text-white" : isDark ? "from-zinc-800 to-zinc-900 text-zinc-600" : "from-zinc-200 to-zinc-300 text-zinc-400"
                    }`}>
                      {isUnlocked ? <IconComp className="h-5.5 w-5.5" /> : <Lock className="h-4.5 w-4.5" />}
                    </div>

                    <div className="space-y-0.5">
                      <h4 className={`text-xs font-bold ${isUnlocked ? textColor : "text-zinc-400 dark:text-zinc-500"}`}>{badge.name}</h4>
                      <p className={`text-[11px] leading-tight ${labelColor}`}>{badge.description}</p>
                      <span className={`text-[9px] font-mono block uppercase mt-1 ${isUnlocked ? badge.textClass + " font-bold" : "text-zinc-400 dark:text-zinc-600"}`}>
                        {isUnlocked ? "✦ UNLOCKED" : "🔒 LOCKED"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Leaderboard Column */}
        <div className={`p-6 rounded-2xl border shadow-xs transition-colors ${cardBg}`}>
          <h2 className={`text-sm font-bold mb-1 flex items-center gap-2 ${textColor}`}>
            <Crown className="h-4.5 w-4.5 text-yellow-500 animate-pulse" />
            Global Leaderboard
          </h2>
          <p className={`text-xs mb-6 ${labelColor}`}>Battle against other high achievers to conquer procrastination!</p>

          <div className="space-y-3">
            {LEADERBOARD.map((user, idx) => {
              const isFirst = idx === 0;
              return (
                <div 
                  key={idx} 
                  className={`p-3.5 rounded-xl border flex justify-between items-center transition-all ${
                    user.isCurrent 
                      ? "bg-purple-600/10 dark:bg-purple-950/25 border-purple-500/30 shadow-md font-bold" 
                      : isDark ? "bg-black/25 border-white/5" : "bg-zinc-50 border-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-mono font-bold h-6.5 w-6.5 rounded-lg flex items-center justify-center ${
                      isFirst ? "bg-yellow-500 text-black font-black" : isDark ? "bg-zinc-800 text-gray-400" : "bg-zinc-200 text-zinc-600"
                    }`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className={`text-xs font-bold leading-tight ${user.isCurrent ? "text-purple-600 dark:text-purple-300" : textColor}`}>
                        {user.name} {user.isCurrent && " (You)"}
                      </h4>
                      <span className={`text-[10px] ${labelColor}`}>{user.occupation}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 font-mono text-xs font-black text-yellow-600 dark:text-yellow-400 shrink-0">
                    <Zap className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />
                    <span>{user.points} XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
