export enum Priority {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  CRITICAL = "Critical"
}

export enum Category {
  STUDY = "Study",
  WORK = "Work",
  PERSONAL = "Personal",
  HEALTH = "Health",
  FINANCE = "Finance",
  OTHER = "Other"
}

export interface SubTask {
  id: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
  suggestedDate?: string; // YYYY-MM-DD
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  deadline: string; // ISO DateTime or YYYY-MM-DD
  priority: Priority;
  estimatedHours: number;
  category: Category;
  completed: boolean;
  subtasks: SubTask[];
  riskScore?: number; // 0-100
  riskLevel?: "Green" | "Yellow" | "Red";
  riskAnalysis?: string;
  scheduleSlots?: {
    date: string; // YYYY-MM-DD
    timeStart: string; // HH:MM
    timeEnd: string; // HH:MM
  }[];
  createdAt: string;
  completedAt?: string;
}

export enum GoalType {
  DAILY = "Daily",
  WEEKLY = "Weekly",
  MONTHLY = "Monthly"
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  type: GoalType;
  targetCount: number;
  currentCount: number;
  deadline: string; // YYYY-MM-DD
  completed: boolean;
  createdAt: string;
}

export interface HabitLog {
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  streak: number;
  bestStreak: number;
  frequency: "Daily" | "Weekly";
  logs: HabitLog[]; // track completed dates
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "critical";
  read: boolean;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  occupation: string;
  productivityGoal: string;
  workingHoursStart: string; // e.g. "09:00"
  workingHoursEnd: string;   // e.g. "17:00"
  points: number;
  badges: string[]; // e.g. ["Productivity Master", "Consistency King", "Deadline Destroyer", "Focus Champion"]
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  upcomingDeadlinesCount: number;
  productivityScore: number; // 0 to 100 based on completion rate and streaks
  points: number;
  streakDays: number;
}
