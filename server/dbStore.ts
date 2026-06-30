import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { UserProfile, Task, Goal, Habit, Notification, ChatMessage } from "../src/types";

const DB_PATH = path.join(process.cwd(), "data", "store.json");
const CONFIG_PATH = path.join(process.cwd(), "firebase-applet-config.json");

interface DBStructure {
  users: Record<string, UserProfile>;
  tasks: Record<string, Task>;
  goals: Record<string, Goal>;
  habits: Record<string, Habit>;
  notifications: Record<string, Notification>;
  chats: Record<string, ChatMessage[]>;
}

const DEFAULT_DB: DBStructure = {
  users: {},
  tasks: {},
  goals: {},
  habits: {},
  notifications: {},
  chats: {}
};

// Initialize Firebase dynamically if configuration exists
let db: any = null;
let isFirestoreEnabled = false;

if (fs.existsSync(CONFIG_PATH)) {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    if (config && config.apiKey) {
      const app = initializeApp(config);
      // Pass the firestoreDatabaseId to connect to the custom database if provisioned, fallback to (default)
      db = getFirestore(app, config.firestoreDatabaseId || "(default)");
      isFirestoreEnabled = true;
      console.log(`[Server DBStore] Firestore client initialized successfully on database: ${config.firestoreDatabaseId || "(default)"}`);
    }
  } catch (e) {
    console.error("[Server DBStore] Error parsing or initializing Firestore:", e);
  }
}

export class DBStore {
  private static ensureDir() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private static read(): DBStructure {
    this.ensureDir();
    try {
      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, "utf8");
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Failed to read JSON DB, resetting to default:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }

  private static write(data: DBStructure) {
    this.ensureDir();
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.error("Failed to write to JSON DB:", e);
    }
  }

  // --- Dynamic sync from Firestore ---
  static async syncFromFirestore(userId: string): Promise<void> {
    if (!isFirestoreEnabled || !db) return;
    try {
      console.log(`[Server DBStore] Syncing data from Firestore for user: ${userId}`);
      
      const currentDb = this.read();

      // 1. Get user profile
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        currentDb.users[userId] = userDoc.data() as UserProfile;
      }

      // 2. Get tasks
      const tasksQuery = query(collection(db, "tasks"), where("userId", "==", userId));
      const tasksSnap = await getDocs(tasksQuery);
      tasksSnap.forEach((d) => {
        currentDb.tasks[d.id] = d.data() as Task;
      });

      // 3. Get goals
      const goalsQuery = query(collection(db, "goals"), where("userId", "==", userId));
      const goalsSnap = await getDocs(goalsQuery);
      goalsSnap.forEach((d) => {
        currentDb.goals[d.id] = d.data() as Goal;
      });

      // 4. Get habits
      const habitsQuery = query(collection(db, "habits"), where("userId", "==", userId));
      const habitsSnap = await getDocs(habitsQuery);
      habitsSnap.forEach((d) => {
        currentDb.habits[d.id] = d.data() as Habit;
      });

      // 5. Get notifications
      const notifsQuery = query(collection(db, "notifications"), where("userId", "==", userId));
      const notifsSnap = await getDocs(notifsQuery);
      notifsSnap.forEach((d) => {
        currentDb.notifications[d.id] = d.data() as Notification;
      });

      // 6. Get chat history
      const chatDocRef = doc(db, "chats", userId);
      const chatDoc = await getDoc(chatDocRef);
      if (chatDoc.exists()) {
        currentDb.chats[userId] = (chatDoc.data() as { history: ChatMessage[] }).history || [];
      }

      this.write(currentDb);
      console.log(`[Server DBStore] Sync completed successfully for user: ${userId}`);
    } catch (error) {
      console.error(`[Server DBStore] Error syncing from Firestore for user ${userId}:`, error);
    }
  }

  // --- Users Operations ---
  static getUser(uid: string): UserProfile | null {
    const db_struct = this.read();
    return db_struct.users[uid] || null;
  }

  static saveUser(user: UserProfile): UserProfile {
    const db_struct = this.read();
    db_struct.users[user.uid] = user;
    this.write(db_struct);

    if (isFirestoreEnabled && db) {
      setDoc(doc(db, "users", user.uid), user)
        .then(() => console.log(`[Firestore] User ${user.uid} saved successfully.`))
        .catch((err) => console.error(`[Firestore] Error saving user ${user.uid}:`, err));
    }
    return user;
  }

  // --- Tasks Operations ---
  static getTasks(userId: string): Task[] {
    const db_struct = this.read();
    return Object.values(db_struct.tasks).filter(t => t.userId === userId);
  }

  static saveTask(task: Task): Task {
    const db_struct = this.read();
    db_struct.tasks[task.id] = task;
    this.write(db_struct);

    if (isFirestoreEnabled && db) {
      setDoc(doc(db, "tasks", task.id), task)
        .then(() => console.log(`[Firestore] Task ${task.id} saved.`))
        .catch((err) => console.error(`[Firestore] Error saving task ${task.id}:`, err));
    }
    return task;
  }

  static deleteTask(taskId: string): boolean {
    const db_struct = this.read();
    if (db_struct.tasks[taskId]) {
      delete db_struct.tasks[taskId];
      this.write(db_struct);

      if (isFirestoreEnabled && db) {
        deleteDoc(doc(db, "tasks", taskId))
          .then(() => console.log(`[Firestore] Task ${taskId} deleted.`))
          .catch((err) => console.error(`[Firestore] Error deleting task ${taskId}:`, err));
      }
      return true;
    }
    return false;
  }

  // --- Goals Operations ---
  static getGoals(userId: string): Goal[] {
    const db_struct = this.read();
    return Object.values(db_struct.goals).filter(g => g.userId === userId);
  }

  static saveGoal(goal: Goal): Goal {
    const db_struct = this.read();
    db_struct.goals[goal.id] = goal;
    this.write(db_struct);

    if (isFirestoreEnabled && db) {
      setDoc(doc(db, "goals", goal.id), goal)
        .then(() => console.log(`[Firestore] Goal ${goal.id} saved.`))
        .catch((err) => console.error(`[Firestore] Error saving goal ${goal.id}:`, err));
    }
    return goal;
  }

  static deleteGoal(goalId: string): boolean {
    const db_struct = this.read();
    if (db_struct.goals[goalId]) {
      delete db_struct.goals[goalId];
      this.write(db_struct);

      if (isFirestoreEnabled && db) {
        deleteDoc(doc(db, "goals", goalId))
          .then(() => console.log(`[Firestore] Goal ${goalId} deleted.`))
          .catch((err) => console.error(`[Firestore] Error deleting goal ${goalId}:`, err));
      }
      return true;
    }
    return false;
  }

  // --- Habits Operations ---
  static getHabits(userId: string): Habit[] {
    const db_struct = this.read();
    return Object.values(db_struct.habits).filter(h => h.userId === userId);
  }

  static saveHabit(habit: Habit): Habit {
    const db_struct = this.read();
    db_struct.habits[habit.id] = habit;
    this.write(db_struct);

    if (isFirestoreEnabled && db) {
      setDoc(doc(db, "habits", habit.id), habit)
        .then(() => console.log(`[Firestore] Habit ${habit.id} saved.`))
        .catch((err) => console.error(`[Firestore] Error saving habit ${habit.id}:`, err));
    }
    return habit;
  }

  static deleteHabit(habitId: string): boolean {
    const db_struct = this.read();
    if (db_struct.habits[habitId]) {
      delete db_struct.habits[habitId];
      this.write(db_struct);

      if (isFirestoreEnabled && db) {
        deleteDoc(doc(db, "habits", habitId))
          .then(() => console.log(`[Firestore] Habit ${habitId} deleted.`))
          .catch((err) => console.error(`[Firestore] Error deleting habit ${habitId}:`, err));
      }
      return true;
    }
    return false;
  }

  // --- Notifications Operations ---
  static getNotifications(userId: string): Notification[] {
    const db_struct = this.read();
    return Object.values(db_struct.notifications).filter(n => n.userId === userId);
  }

  static saveNotification(notification: Notification): Notification {
    const db_struct = this.read();
    db_struct.notifications[notification.id] = notification;
    this.write(db_struct);

    if (isFirestoreEnabled && db) {
      setDoc(doc(db, "notifications", notification.id), notification)
        .then(() => console.log(`[Firestore] Notification ${notification.id} saved.`))
        .catch((err) => console.error(`[Firestore] Error saving notification ${notification.id}:`, err));
    }
    return notification;
  }

  static markNotificationsRead(userId: string): void {
    const db_struct = this.read();
    Object.values(db_struct.notifications).forEach(n => {
      if (n.userId === userId) {
        n.read = true;
      }
    });
    this.write(db_struct);

    if (isFirestoreEnabled && db) {
      const userNotifs = Object.values(db_struct.notifications).filter(n => n.userId === userId);
      userNotifs.forEach(n => {
        setDoc(doc(db, "notifications", n.id), { ...n, read: true })
          .catch((err) => console.error(`[Firestore] Error marking notification ${n.id} read:`, err));
      });
    }
  }

  // --- Chat Operations ---
  static getChatHistory(userId: string): ChatMessage[] {
    const db_struct = this.read();
    return db_struct.chats[userId] || [];
  }

  static saveChatHistory(userId: string, history: ChatMessage[]): void {
    const db_struct = this.read();
    db_struct.chats[userId] = history;
    this.write(db_struct);

    if (isFirestoreEnabled && db) {
      setDoc(doc(db, "chats", userId), { history })
        .then(() => console.log(`[Firestore] Chat history for user ${userId} saved.`))
        .catch((err) => console.error(`[Firestore] Error saving chat history for ${userId}:`, err));
    }
  }
}
export default DBStore;
