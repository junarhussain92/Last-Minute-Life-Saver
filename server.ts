import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import DBStore from "./server/dbStore";
import { Task, Priority, Category, Goal, GoalType, Habit, Notification, UserProfile, ChatMessage } from "./src/types";

// Initialize Gemini SDK safely with lazy configuration
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI features will fallback to smart rule-based mock generators.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Define some helpers for default/guest users
  const GUEST_UID = "guest-user-123";
  const CURRENT_TIME = "2026-06-25T09:12:00-07:00"; // Based on context

  // In-memory cache for AI reminders to prevent quota exhaustion
  const remindersCache: Record<string, { reminders: string[]; expiresAt: number }> = {};
  const clearRemindersCache = () => {
    for (const key in remindersCache) {
      delete remindersCache[key];
    }
    console.log("[Cache] Cleared all reminders cache due to workspace update.");
  };

  // Intercept write operations to clear cache automatically
  const originalSaveUser = DBStore.saveUser;
  DBStore.saveUser = function(user) {
    clearRemindersCache();
    return originalSaveUser.call(DBStore, user);
  };

  const originalSaveTask = DBStore.saveTask;
  DBStore.saveTask = function(task) {
    clearRemindersCache();
    return originalSaveTask.call(DBStore, task);
  };

  const originalDeleteTask = DBStore.deleteTask;
  DBStore.deleteTask = function(taskId) {
    clearRemindersCache();
    return originalDeleteTask.call(DBStore, taskId);
  };

  const originalSaveGoal = DBStore.saveGoal;
  DBStore.saveGoal = function(goal) {
    clearRemindersCache();
    return originalSaveGoal.call(DBStore, goal);
  };

  const originalDeleteGoal = DBStore.deleteGoal;
  DBStore.deleteGoal = function(goalId) {
    clearRemindersCache();
    return originalDeleteGoal.call(DBStore, goalId);
  };

  const originalSaveHabit = DBStore.saveHabit;
  DBStore.saveHabit = function(habit) {
    clearRemindersCache();
    return originalSaveHabit.call(DBStore, habit);
  };

  const originalDeleteHabit = DBStore.deleteHabit;
  DBStore.deleteHabit = function(habitId) {
    clearRemindersCache();
    return originalDeleteHabit.call(DBStore, habitId);
  };

  const originalSyncFromFirestore = DBStore.syncFromFirestore;
  DBStore.syncFromFirestore = async function(userId) {
    clearRemindersCache();
    return originalSyncFromFirestore.call(DBStore, userId);
  };

  // Helper to get or create profile
  function ensureUserProfile(uid: string, email: string = "guest@example.com"): UserProfile {
    let profile = DBStore.getUser(uid);
    if (!profile) {
      profile = {
        uid,
        email,
        name: "Productivity Champion",
        occupation: "Student & Entrepreneur",
        productivityGoal: "Avoid last-minute deadline stress by planning at least 3 days in advance.",
        workingHoursStart: "09:00",
        workingHoursEnd: "21:00",
        points: 100,
        badges: ["Focus Champion"]
      };
      DBStore.saveUser(profile);
    }
    return profile;
  }

  // Helper to trigger inside-app notification
  function addNotification(userId: string, title: string, message: string, type: "info" | "warning" | "success" | "critical") {
    const notification: Notification = {
      id: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date(CURRENT_TIME).toISOString()
    };
    DBStore.saveNotification(notification);
  }

  // --- API Routes ---

  // 1. Profile Endpoints
  app.get("/api/profile", async (req, res) => {
    const userId = (req.query.userId as string) || GUEST_UID;
    const email = (req.query.email as string) || "guest@example.com";
    await DBStore.syncFromFirestore(userId);
    const profile = ensureUserProfile(userId, email);
    res.json(profile);
  });

  app.post("/api/profile", (req, res) => {
    const { uid, email, name, occupation, productivityGoal, workingHoursStart, workingHoursEnd, points, badges } = req.body;
    if (!uid) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }
    const currentProfile = ensureUserProfile(uid, email || "guest@example.com");
    const updated: UserProfile = {
      uid,
      email: email || currentProfile.email,
      name: name || currentProfile.name,
      occupation: occupation || currentProfile.occupation,
      productivityGoal: productivityGoal || currentProfile.productivityGoal,
      workingHoursStart: workingHoursStart || currentProfile.workingHoursStart,
      workingHoursEnd: workingHoursEnd || currentProfile.workingHoursEnd,
      points: points !== undefined ? points : currentProfile.points,
      badges: badges || currentProfile.badges
    };
    DBStore.saveUser(updated);
    res.json(updated);
  });

  // 2. Task Management Endpoints
  app.get("/api/tasks", (req, res) => {
    const userId = (req.query.userId as string) || GUEST_UID;
    const tasks = DBStore.getTasks(userId);
    res.json(tasks);
  });

  app.post("/api/tasks", (req, res) => {
    const { userId, title, description, deadline, priority, estimatedHours, category } = req.body;
    if (!title || !userId) {
      res.status(400).json({ error: "Missing title or userId" });
      return;
    }

    const newTask: Task = {
      id: "task_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      userId,
      title,
      description: description || "",
      deadline: deadline || new Date(Date.now() + 86400000 * 2).toISOString(), // Default: 2 days from now
      priority: priority || Priority.MEDIUM,
      estimatedHours: estimatedHours || 2,
      category: category || Category.OTHER,
      completed: false,
      subtasks: [],
      createdAt: new Date(CURRENT_TIME).toISOString()
    };

    DBStore.saveTask(newTask);

    // Calculate initial risk
    calculateTaskRisk(newTask);
    DBStore.saveTask(newTask);

    addNotification(userId, "Task Created", `Successfully created task "${title}".`, "info");

    res.json(newTask);
  });

  app.put("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const userId = updates.userId || GUEST_UID;

    const tasks = DBStore.getTasks(userId);
    const existing = tasks.find(t => t.id === id);

    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const wasCompleted = existing.completed;

    const updatedTask: Task = {
      ...existing,
      ...updates,
      id // keep original id
    };

    // If marked completed, handle gamification points and notification
    if (updatedTask.completed && !wasCompleted) {
      updatedTask.completedAt = new Date(CURRENT_TIME).toISOString();
      const profile = ensureUserProfile(userId);
      profile.points += 50; // 50 points per task
      
      // Update badges
      const currentCompletedCount = DBStore.getTasks(userId).filter(t => t.completed).length + 1;
      if (currentCompletedCount >= 10 && !profile.badges.includes("Productivity Master")) {
        profile.badges.push("Productivity Master");
        addNotification(userId, "Badge Earned!", "You've unlocked the 'Productivity Master' badge for completing 10 tasks!", "success");
      }
      if (updatedTask.priority === Priority.CRITICAL && !profile.badges.includes("Deadline Destroyer")) {
        profile.badges.push("Deadline Destroyer");
        addNotification(userId, "Badge Earned!", "You've unlocked the 'Deadline Destroyer' badge for completing a critical priority task!", "success");
      }
      DBStore.saveUser(profile);
      addNotification(userId, "Task Completed!", `Outstanding! You completed "${updatedTask.title}" and earned +50 points.`, "success");
    } else if (!updatedTask.completed && wasCompleted) {
      const profile = ensureUserProfile(userId);
      profile.points = Math.max(0, profile.points - 50);
      DBStore.saveUser(profile);
    }

    calculateTaskRisk(updatedTask);
    DBStore.saveTask(updatedTask);
    res.json(updatedTask);
  });

  app.delete("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    const success = DBStore.deleteTask(id);
    if (success) {
      res.json({ message: "Task deleted successfully" });
    } else {
      res.status(404).json({ error: "Task not found" });
    }
  });

  // Helper to calculate Risk Score and Level offline/synchronously (also updated with AI)
  function calculateTaskRisk(task: Task) {
    const now = new Date(CURRENT_TIME).getTime();
    const deadlineTime = new Date(task.deadline).getTime();
    const hoursRemaining = Math.max(0.1, (deadlineTime - now) / (1000 * 60 * 60));

    // Calculate work ratio: estimatedHours / hoursRemaining
    const ratio = task.estimatedHours / hoursRemaining;
    let riskPercentage = Math.round(Math.min(100, ratio * 100));

    if (task.completed) {
      task.riskScore = 0;
      task.riskLevel = "Green";
      task.riskAnalysis = "Task complete! Risk is non-existent.";
      return;
    }

    let riskLevel: "Green" | "Yellow" | "Red" = "Green";
    if (riskPercentage > 60 || hoursRemaining < 12) {
      riskLevel = "Red";
    } else if (riskPercentage > 30 || hoursRemaining < 36) {
      riskLevel = "Yellow";
    }

    // Scale risk score with respect to priority
    if (task.priority === Priority.CRITICAL) {
      riskPercentage = Math.min(100, riskPercentage + 20);
    } else if (task.priority === Priority.HIGH) {
      riskPercentage = Math.min(100, riskPercentage + 10);
    }

    if (riskPercentage > 75) {
      riskLevel = "Red";
    } else if (riskPercentage > 40) {
      riskLevel = "Yellow";
    }

    task.riskScore = riskPercentage;
    task.riskLevel = riskLevel;
    
    // Default analysis
    if (riskLevel === "Red") {
      task.riskAnalysis = `Critical Risk: You need approximately ${task.estimatedHours} hours of work but only have ${Math.round(hoursRemaining)} hours remaining before the deadline. Action is required immediately!`;
    } else if (riskLevel === "Yellow") {
      task.riskAnalysis = `Moderate Risk: Planning is highly advised. ${task.estimatedHours} hours of work with ${Math.round(hoursRemaining)} hours remaining. Plan a dedicated block today.`;
    } else {
      task.riskAnalysis = `Safe: You have plenty of time (${Math.round(hoursRemaining)} hours) to complete this task. Stay consistent.`;
    }
  }

  // 3. AI Task Breakdown Endpoint using Gemini API
  app.post("/api/tasks/:id/breakdown", async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    
    const tasks = DBStore.getTasks(userId || GUEST_UID);
    const task = tasks.find(t => t.id === id);

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    try {
      if (process.env.GEMINI_API_KEY) {
        const client = getGeminiClient();
        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `You are an expert project planner. Break down the following task into a structured checklist of 4-6 sequential, highly detailed actionable subtasks.
Task Title: "${task.title}"
Description: "${task.description || 'No description provided'}"
Deadline: ${task.deadline}
Current Date: ${CURRENT_TIME}

Each subtask should include a short title, an estimated time in minutes (total sum should roughly approximate ${task.estimatedHours * 60} minutes), and a recommended completion date (YYYY-MM-DD) which falls between today and the deadline.

Respond strictly in valid JSON format matching this schema:
[
  {
    "title": "Subtask Name",
    "estimatedMinutes": 45,
    "suggestedDate": "YYYY-MM-DD"
  }
]`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  estimatedMinutes: { type: Type.INTEGER },
                  suggestedDate: { type: Type.STRING }
                },
                required: ["title", "estimatedMinutes", "suggestedDate"]
              }
            }
          }
        });

        const text = response.text || "[]";
        const subtasksData = JSON.parse(text);

        task.subtasks = subtasksData.map((s: any, idx: number) => ({
          id: `sub_${id}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
          title: s.title,
          estimatedMinutes: s.estimatedMinutes || 30,
          completed: false,
          suggestedDate: s.suggestedDate
        }));

        DBStore.saveTask(task);
        res.json(task);
        return;
      }
    } catch (err) {
      console.error("Gemini Task Breakdown failed, falling back to smart rules:", err);
    }

    // Rule-based breakdown fallback (extremely smart and reliable)
    const baseSubtasks = [
      { title: "Research & Preparation", weight: 0.2 },
      { title: "Initial Draft & Setup", weight: 0.3 },
      { title: "Core Execution & Development", weight: 0.3 },
      { title: "Testing, Review & Refinement", weight: 0.2 }
    ];

    const totalMinutes = task.estimatedHours * 60;
    const taskDeadline = new Date(task.deadline).getTime();
    const nowTime = new Date(CURRENT_TIME).getTime();
    const interval = (taskDeadline - nowTime) / baseSubtasks.length;

    task.subtasks = baseSubtasks.map((b, idx) => {
      const suggestTime = new Date(nowTime + interval * (idx + 1));
      return {
        id: `sub_${id}_${idx}_fallback`,
        title: `${b.title} (${task.title})`,
        estimatedMinutes: Math.round((totalMinutes * b.weight)),
        completed: false,
        suggestedDate: suggestTime.toISOString().split("T")[0]
      };
    });

    DBStore.saveTask(task);
    res.json(task);
  });

  // 4. AI Smart Scheduler Endpoint
  app.post("/api/schedule/generate", async (req, res) => {
    const { userId } = req.body;
    const tasks = DBStore.getTasks(userId || GUEST_UID);
    const profile = ensureUserProfile(userId || GUEST_UID);

    const pendingTasks = tasks.filter(t => !t.completed);

    if (pendingTasks.length === 0) {
      res.json({ message: "No pending tasks to schedule. Create some tasks first!" });
      return;
    }

    try {
      if (process.env.GEMINI_API_KEY) {
        const client = getGeminiClient();
        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `You are an AI Smart Scheduler. Distribute the following list of tasks/subtasks into a balanced daily schedule.
User's Preferred Working Hours: ${profile.workingHoursStart} to ${profile.workingHoursEnd}
Current Date: ${CURRENT_TIME}

Tasks & Deadlines:
${JSON.stringify(pendingTasks.map(t => ({
  id: t.id,
  title: t.title,
  estimatedHours: t.estimatedHours,
  deadline: t.deadline,
  priority: t.priority,
  subtasks: t.subtasks
})), null, 2)}

Create scheduled blocks for the next 7 days. Give each scheduled slot a date (YYYY-MM-DD), start time (HH:MM), and end time (HH:MM) during the user's preferred working hours. Prioritize critical and high tasks first.

Respond strictly with valid JSON format matching this schema:
[
  {
    "taskId": "task_id_here",
    "taskTitle": "Task or Subtask name",
    "date": "YYYY-MM-DD",
    "timeStart": "HH:MM",
    "timeEnd": "HH:MM"
  }
]`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.STRING },
                  taskTitle: { type: Type.STRING },
                  date: { type: Type.STRING },
                  timeStart: { type: Type.STRING },
                  timeEnd: { type: Type.STRING }
                },
                required: ["taskId", "taskTitle", "date", "timeStart", "timeEnd"]
              }
            }
          }
        });

        const text = response.text || "[]";
        const slots = JSON.parse(text);

        // Map slots back to tasks
        const updatedTasks = [...tasks];
        // Reset old schedules
        updatedTasks.forEach(t => t.scheduleSlots = []);

        slots.forEach((slot: any) => {
          const task = updatedTasks.find(t => t.id === slot.taskId);
          if (task) {
            if (!task.scheduleSlots) task.scheduleSlots = [];
            task.scheduleSlots.push({
              date: slot.date,
              timeStart: slot.timeStart,
              timeEnd: slot.timeEnd
            });
          }
        });

        // Save all updated tasks
        updatedTasks.forEach(t => DBStore.saveTask(t));
        addNotification(userId || GUEST_UID, "Schedule Re-Generated", "AI Smart Scheduler has balanced your upcoming week's timeline.", "success");
        res.json(updatedTasks);
        return;
      }
    } catch (e) {
      console.error("AI Smart Scheduler failed, falling back to heuristic scheduling:", e);
    }

    // Heuristic Smart Scheduler (Assign tasks starting tomorrow sequentially in working hours)
    const updatedTasks = [...tasks];
    let scheduleOffsetDays = 1;
    let workHoursCount = 0;

    updatedTasks.forEach(t => {
      if (t.completed) {
        t.scheduleSlots = [];
        return;
      }
      const assignDate = new Date(new Date(CURRENT_TIME).getTime() + 86400000 * scheduleOffsetDays);
      const assignDateStr = assignDate.toISOString().split("T")[0];

      // Divide task estimatedHours into blocks
      const startHour = 18 + workHoursCount; // default evening blocks
      const endHour = startHour + Math.min(2, Math.ceil(t.estimatedHours));
      
      t.scheduleSlots = [{
        date: assignDateStr,
        timeStart: `${startHour.toString().padStart(2, "0")}:00`,
        timeEnd: `${endHour.toString().padStart(2, "0")}:00`
      }];

      workHoursCount += Math.ceil(t.estimatedHours);
      if (workHoursCount >= 3) {
        workHoursCount = 0;
        scheduleOffsetDays++;
      }
      DBStore.saveTask(t);
    });

    addNotification(userId || GUEST_UID, "Schedule Generated (Heuristic)", "Your tasks have been distributed sequentially across working blocks.", "info");
    res.json(updatedTasks);
  });

  // 5. Context-Aware AI Reminders API
  app.post("/api/reminders/generate", async (req, res) => {
    const { userId } = req.body;
    const uId = userId || GUEST_UID;

    // Check memory cache first to protect the model quota
    const now = Date.now();
    if (remindersCache[uId] && remindersCache[uId].expiresAt > now) {
      console.log(`[Cache] Serving cached reminders for user: ${uId}`);
      res.json({ reminders: remindersCache[uId].reminders });
      return;
    }

    const tasks = DBStore.getTasks(uId);
    const profile = ensureUserProfile(uId);

    const activeTasks = tasks.filter(t => !t.completed);

    if (activeTasks.length === 0) {
      const defaultReminders = [
        "Outstanding! You have no pending deadlines. This is the perfect time to build healthy habits or study ahead.",
        "Keep maintaining your streak! Try setting up a new monthly goal to keep your productivity momentum going."
      ];
      res.json({ reminders: defaultReminders });
      return;
    }

    try {
      if (process.env.GEMINI_API_KEY) {
        const client = getGeminiClient();
        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `You are an empathetic, action-oriented productivity coach. Analyze the following user's task status and workload:
Occupation: ${profile.occupation}
Productivity Goal: ${profile.productivityGoal}
Working Hours: ${profile.workingHoursStart} to ${profile.workingHoursEnd}
Current Date: ${CURRENT_TIME}

Tasks:
${JSON.stringify(activeTasks.map(t => ({
  title: t.title,
  deadline: t.deadline,
  estimatedHours: t.estimatedHours,
  priority: t.priority,
  completedSubtasks: t.subtasks.filter(s => s.completed).length,
  totalSubtasks: t.subtasks.length
})), null, 2)}

Generate 3 context-aware, highly personalized, motivational smart reminder messages instead of generic "Task is due" notifications. Use specific numbers or details if possible (e.g. "Starting the 'Research' subtask tonight at 7 PM leaves you plenty of breathing room for tomorrow's deadline!").

Respond strictly with valid JSON array of strings:
["Reminder 1...", "Reminder 2...", "Reminder 3..."]`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        });

        const text = response.text || "[]";
        const reminders = JSON.parse(text);

        // Cache the successful generation for 5 minutes
        remindersCache[uId] = {
          reminders,
          expiresAt: Date.now() + 5 * 60 * 1000
        };

        res.json({ reminders });
        return;
      }
    } catch (e) {
      console.error("AI Reminder generation failed:", e);
    }

    // Heuristic reminders
    const reminders = activeTasks.map(t => {
      const remainingTime = new Date(t.deadline).getTime() - new Date(CURRENT_TIME).getTime();
      const remainingDays = Math.max(1, Math.round(remainingTime / (1000 * 60 * 60 * 24)));
      return `⏰ You have "${t.title}" due in ${remainingDays} days. Starting your ${t.estimatedHours} hours of planned work today will reduce deadline pressure!`;
    });

    const finalReminders = reminders.slice(0, 3);

    // Cache fallback reminders for 1 minute so rapid re-renders don't keep hitting the error block
    remindersCache[uId] = {
      reminders: finalReminders,
      expiresAt: Date.now() + 60 * 1000
    };

    res.json({ reminders: finalReminders });
  });

  // 6. AI Productivity Coach Chatbot with Workspace memory
  app.post("/api/coach/chat", async (req, res) => {
    const { userId, message, history } = req.body;
    const uId = userId || GUEST_UID;

    const tasks = DBStore.getTasks(uId);
    const goals = DBStore.getGoals(uId);
    const habits = DBStore.getHabits(uId);
    const profile = ensureUserProfile(uId);

    // Save user chat history
    const savedHistory: ChatMessage[] = history || [];
    const userMsg: ChatMessage = {
      id: "msg_" + Date.now() + "_user",
      role: "user",
      text: message,
      timestamp: new Date().toISOString()
    };
    savedHistory.push(userMsg);

    try {
      if (process.env.GEMINI_API_KEY) {
        const client = getGeminiClient();
        
        // Provide rich user workspace context as part of the prompt
        const systemInstruction = `You are "Saviour", an ultra-personalized, expert AI Productivity Coach for the "Last-Minute Life Saver" application.
You are helping:
Name: ${profile.name} (Occupation: ${profile.occupation})
Points: ${profile.points} | Badges: ${profile.badges.join(", ")}
Productivity Goal: "${profile.productivityGoal}"
Current Time: ${CURRENT_TIME}

User's Real-time Task Workspace:
Tasks: ${JSON.stringify(tasks.map(t => ({ title: t.title, completed: t.completed, deadline: t.deadline, priority: t.priority, riskLevel: t.riskLevel })), null, 2)}
Goals: ${JSON.stringify(goals.map(g => ({ title: g.title, type: g.type, progress: `${g.currentCount}/${g.targetCount}` })), null, 2)}
Habits: ${JSON.stringify(habits.map(h => ({ title: h.title, streak: h.streak })), null, 2)}

Your style is: empathetic, motivational, friendly, structured, and action-driven. Give specific task-related advice based on their list! Reference their real tasks and goals to keep them accountable. Offer time-blocking advice, deadline risk management, and smart scheduling tips. Keep answers concise, highly scannable (using bullet points and bold key terms), and professional. Avoid generic AI introductory fluff.`;

        // Format conversations for chat
        const formattedMessages = savedHistory.slice(-10).map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

        // Use generateContent for a clean completion with full conversation context
        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: formattedMessages,
          config: {
            systemInstruction
          }
        });

        const replyText = response.text || "I'm right here to help you destroy those deadlines. What specific task can we focus on breaking down today?";
        
        const coachMsg: ChatMessage = {
          id: "msg_" + Date.now() + "_coach",
          role: "model",
          text: replyText,
          timestamp: new Date().toISOString()
        };
        savedHistory.push(coachMsg);
        DBStore.saveChatHistory(uId, savedHistory);

        res.json({ reply: replyText, history: savedHistory });
        return;
      }
    } catch (err) {
      console.error("AI Coach Chat failed:", err);
    }

    // Heuristic response
    let replyText = "I'm always ready to help! Keep in mind that completing your pending tasks is the best way to earn points and badges. ";
    if (tasks.some(t => !t.completed && t.riskLevel === "Red")) {
      const redTasks = tasks.filter(t => !t.completed && t.riskLevel === "Red").map(t => `"${t.title}"`).join(", ");
      replyText += `I noticed that you have high-risk tasks like ${redTasks} with imminent deadlines. I highly recommend using the AI Smart Breakdown on those immediately to start making progress chunk-by-chunk!`;
    } else {
      replyText += "You are currently in a secure state with your deadlines. Let's maintain this momentum! Would you like help setting a new daily or weekly goal?";
    }

    const coachMsg: ChatMessage = {
      id: "msg_" + Date.now() + "_coach",
      role: "model",
      text: replyText,
      timestamp: new Date().toISOString()
    };
    savedHistory.push(coachMsg);
    DBStore.saveChatHistory(uId, savedHistory);

    res.json({ reply: replyText, history: savedHistory });
  });

  // 7. Voice Assistant Parsing Endpoint
  app.post("/api/voice/command", async (req, res) => {
    const { message, userId } = req.body;
    const uId = userId || GUEST_UID;

    if (!message) {
      res.status(400).json({ error: "No voice text provided" });
      return;
    }

    try {
      if (process.env.GEMINI_API_KEY) {
        const client = getGeminiClient();
        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `You are an NLP processor for a voice assistant in a productivity app. Parse the following transcription of a user command:
Transcription: "${message}"
Current Date: ${CURRENT_TIME}

Categorize and extract parameters. Supported actions are:
1. "add_task": Create a task. Extract "title", "deadline" (YYYY-MM-DD or ISO string, relative to current date 2026-06-25, e.g. "tomorrow" means "2026-06-26"), and optionally "category" and "priority" if mentioned.
2. "complete_task": Mark a task complete. Extract "title" of task user wants to complete.
3. "show_schedule": Show current plans/calendar.
4. "check_deadlines": Query upcoming tasks and risks.

Respond strictly with valid JSON format matching this schema:
{
  "action": "add_task" | "complete_task" | "show_schedule" | "check_deadlines",
  "taskTitle": "Extracted task name or title",
  "deadline": "YYYY-MM-DD",
  "priority": "Low" | "Medium" | "High" | "Critical",
  "category": "Study" | "Work" | "Personal" | "Health" | "Finance" | "Other"
}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                action: { type: Type.STRING },
                taskTitle: { type: Type.STRING },
                deadline: { type: Type.STRING },
                priority: { type: Type.STRING },
                category: { type: Type.STRING }
              },
              required: ["action"]
            }
          }
        });

        const parsed = JSON.parse(response.text || "{}");
        res.json({ success: true, parsed });
        return;
      }
    } catch (e) {
      console.error("Voice parsing failed:", e);
    }

    // Heuristic simple parsing
    const text = message.toLowerCase();
    let parsed: any = { action: "check_deadlines" };

    if (text.includes("add task") || text.includes("create task")) {
      const taskTitle = text.replace("add task", "").replace("create task", "").trim();
      parsed = {
        action: "add_task",
        taskTitle: taskTitle || "New Voice Task",
        deadline: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
        priority: Priority.MEDIUM,
        category: Category.OTHER
      };
    } else if (text.includes("complete") || text.includes("finish")) {
      const taskTitle = text.replace("complete", "").replace("finish", "").replace("task", "").trim();
      parsed = {
        action: "complete_task",
        taskTitle
      };
    } else if (text.includes("schedule") || text.includes("plan") || text.includes("calendar")) {
      parsed = { action: "show_schedule" };
    }

    res.json({ success: true, parsed });
  });

  // 8. Goals CRUD Endpoints
  app.get("/api/goals", (req, res) => {
    const userId = (req.query.userId as string) || GUEST_UID;
    const goals = DBStore.getGoals(userId);
    res.json(goals);
  });

  app.post("/api/goals", (req, res) => {
    const { userId, title, type, targetCount, deadline } = req.body;
    if (!title || !userId) {
      res.status(400).json({ error: "Missing title or userId" });
      return;
    }

    const newGoal: Goal = {
      id: "goal_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      userId,
      title,
      type: type || GoalType.DAILY,
      targetCount: targetCount || 1,
      currentCount: 0,
      deadline: deadline || new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
      completed: false,
      createdAt: new Date(CURRENT_TIME).toISOString()
    };

    DBStore.saveGoal(newGoal);
    addNotification(userId, "Goal Set!", `Successfully set new ${type.toLowerCase()} goal: "${title}".`, "info");
    res.json(newGoal);
  });

  app.put("/api/goals/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const userId = updates.userId || GUEST_UID;

    const goals = DBStore.getGoals(userId);
    const existing = goals.find(g => g.id === id);

    if (!existing) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }

    const wasCompleted = existing.completed;

    const updatedGoal: Goal = {
      ...existing,
      ...updates,
      id
    };

    if (updatedGoal.currentCount >= updatedGoal.targetCount) {
      updatedGoal.completed = true;
    }

    if (updatedGoal.completed && !wasCompleted) {
      const profile = ensureUserProfile(userId);
      profile.points += 100; // Goals are 100 points!
      if (!profile.badges.includes("Consistency King")) {
        profile.badges.push("Consistency King");
        addNotification(userId, "Badge Earned!", "You've unlocked the 'Consistency King' badge for meeting a goal!", "success");
      }
      DBStore.saveUser(profile);
      addNotification(userId, "Goal Met!", `Fantastic! You achieved your goal "${updatedGoal.title}" and earned +100 points.`, "success");
    }

    DBStore.saveGoal(updatedGoal);
    res.json(updatedGoal);
  });

  app.delete("/api/goals/:id", (req, res) => {
    const { id } = req.params;
    const success = DBStore.deleteGoal(id);
    if (success) {
      res.json({ message: "Goal deleted successfully" });
    } else {
      res.status(404).json({ error: "Goal not found" });
    }
  });

  // 9. Habits CRUD Endpoints
  app.get("/api/habits", (req, res) => {
    const userId = (req.query.userId as string) || GUEST_UID;
    const habits = DBStore.getHabits(userId);
    res.json(habits);
  });

  app.post("/api/habits", (req, res) => {
    const { userId, title, frequency } = req.body;
    if (!title || !userId) {
      res.status(400).json({ error: "Missing title or userId" });
      return;
    }

    const newHabit: Habit = {
      id: "habit_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      userId,
      title,
      frequency: frequency || "Daily",
      streak: 0,
      bestStreak: 0,
      logs: [],
      createdAt: new Date(CURRENT_TIME).toISOString()
    };

    DBStore.saveHabit(newHabit);
    addNotification(userId, "Habit Added", `Started tracking the habit "${title}". Consistency is key!`, "info");
    res.json(newHabit);
  });

  app.put("/api/habits/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const userId = updates.userId || GUEST_UID;

    const habits = DBStore.getHabits(userId);
    const existing = habits.find(h => h.id === id);

    if (!existing) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    const updatedHabit: Habit = {
      ...existing,
      ...updates,
      id
    };

    // Calculate streaks based on logs
    const completedCount = updatedHabit.logs.filter(l => l.completed).length;
    updatedHabit.streak = completedCount; // simplified streak representation
    if (updatedHabit.streak > updatedHabit.bestStreak) {
      updatedHabit.bestStreak = updatedHabit.streak;
    }

    // Reward points for ticking off a habit
    if (updatedHabit.logs.length > existing.logs.length) {
      const profile = ensureUserProfile(userId);
      profile.points += 20; // 20 points per habit check-in
      DBStore.saveUser(profile);
      addNotification(userId, "Habit Logged", `Nice work! You checked off "${updatedHabit.title}" and gained +20 points.`, "success");
    }

    DBStore.saveHabit(updatedHabit);
    res.json(updatedHabit);
  });

  app.delete("/api/habits/:id", (req, res) => {
    const { id } = req.params;
    const success = DBStore.deleteHabit(id);
    if (success) {
      res.json({ message: "Habit deleted successfully" });
    } else {
      res.status(404).json({ error: "Habit not found" });
    }
  });

  // 10. Notifications Endpoints
  app.get("/api/notifications", (req, res) => {
    const userId = (req.query.userId as string) || GUEST_UID;
    const notifs = DBStore.getNotifications(userId);
    res.json(notifs);
  });

  app.post("/api/notifications/read", (req, res) => {
    const { userId } = req.body;
    DBStore.markNotificationsRead(userId || GUEST_UID);
    res.json({ success: true });
  });

  // 11. Initial Seed Data endpoint for first launch
  app.post("/api/seed", async (req, res) => {
    const { userId } = req.body;
    const uid = userId || GUEST_UID;

    await DBStore.syncFromFirestore(uid);

    // Seed tasks if empty
    const tasks = DBStore.getTasks(uid);
    if (tasks.length === 0) {
      const seedTasks = [
        {
          title: "Complete JavaScript Assignment",
          description: "Write code for React client and Node server. Needs clean formatting and testing.",
          deadline: new Date(new Date(CURRENT_TIME).getTime() + 86400000 * 2.5).toISOString(),
          priority: Priority.HIGH,
          estimatedHours: 4,
          category: Category.STUDY
        },
        {
          title: "Prep Pitch Deck",
          description: "Organize market research, financial model projections and product features layout.",
          deadline: new Date(new Date(CURRENT_TIME).getTime() + 86400000 * 5).toISOString(),
          priority: Priority.CRITICAL,
          estimatedHours: 6,
          category: Category.WORK
        },
        {
          title: "Sign Gym Membership Renewal",
          description: "Visit physical desk and renew the premium group fitness classes pass.",
          deadline: new Date(new Date(CURRENT_TIME).getTime() + 86400000 * 1).toISOString(),
          priority: Priority.LOW,
          estimatedHours: 1,
          category: Category.HEALTH
        }
      ];

      seedTasks.forEach(st => {
        const t: Task = {
          id: "task_seed_" + Math.random().toString(36).substr(2, 5),
          userId: uid,
          title: st.title,
          description: st.description,
          deadline: st.deadline,
          priority: st.priority,
          estimatedHours: st.estimatedHours,
          category: st.category,
          completed: false,
          subtasks: [
            { id: "sub_1", title: "Review requirements checklist", estimatedMinutes: 30, completed: true, suggestedDate: "2026-06-25" },
            { id: "sub_2", title: "Setup core file structures", estimatedMinutes: 60, completed: false, suggestedDate: "2026-06-26" }
          ],
          createdAt: new Date(CURRENT_TIME).toISOString()
        };
        calculateTaskRisk(t);
        DBStore.saveTask(t);
      });
    }

    // Seed goals if empty
    const goals = DBStore.getGoals(uid);
    if (goals.length === 0) {
      const seedGoals = [
        { title: "Complete 5 Tasks", type: GoalType.WEEKLY, targetCount: 5, deadline: "2026-06-30" },
        { title: "Maintain 3 Daily Habits", type: GoalType.DAILY, targetCount: 3, deadline: "2026-06-26" }
      ];
      seedGoals.forEach(sg => {
        const g: Goal = {
          id: "goal_seed_" + Math.random().toString(36).substr(2, 5),
          userId: uid,
          title: sg.title,
          type: sg.type,
          targetCount: sg.targetCount,
          currentCount: 1,
          deadline: sg.deadline,
          completed: false,
          createdAt: new Date(CURRENT_TIME).toISOString()
        };
        DBStore.saveGoal(g);
      });
    }

    // Seed habits if empty
    const habits = DBStore.getHabits(uid);
    if (habits.length === 0) {
      const seedHabits = [
        { title: "Coding Practice", frequency: "Daily" as const },
        { title: "Study 2 Hours", frequency: "Daily" as const },
        { title: "Cardio Exercise", frequency: "Weekly" as const }
      ];
      seedHabits.forEach(sh => {
        const h: Habit = {
          id: "habit_seed_" + Math.random().toString(36).substr(2, 5),
          userId: uid,
          title: sh.title,
          frequency: sh.frequency,
          streak: 2,
          bestStreak: 4,
          logs: [
            { date: "2026-06-23", completed: true },
            { date: "2026-06-24", completed: true }
          ],
          createdAt: new Date(CURRENT_TIME).toISOString()
        };
        DBStore.saveHabit(h);
      });
    }

    // Ensure Profile
    ensureUserProfile(uid);

    res.json({ success: true, message: "Workspace successfully seeded with premium initial templates!" });
  });

  // Vite development vs production asset handling
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Last-Minute Life Saver] Server running on port ${PORT}`);
  });
}

startServer();
