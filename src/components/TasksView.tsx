import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Trash2, Check, Sparkles, AlertTriangle, Clock, 
  ChevronDown, ChevronUp, Calendar, Tag, Filter, CheckCircle2, ClipboardList, Info, HelpCircle
} from "lucide-react";
import { Task, Priority, Category, SubTask } from "../types";
import confetti from "canvas-confetti";

interface TasksViewProps {
  tasks: Task[];
  profileUid: string;
  onAddTask: (taskData: {
    title: string;
    description: string;
    deadline: string;
    priority: Priority;
    estimatedHours: number;
    category: Category;
  }) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  theme?: "dark" | "light";
}

export default function TasksView({ tasks, profileUid, onAddTask, onUpdateTask, onDeleteTask, theme = "light" }: TasksViewProps) {
  const isDark = theme === "dark";
  const cardBg = isDark ? "bg-zinc-900/80 border-white/5" : "bg-white border-zinc-200/80 shadow-sm";
  const barBg = isDark ? "bg-zinc-900/40 border-white/5" : "bg-white border-zinc-200 shadow-sm";
  const inputBg = isDark ? "bg-black/50 border-white/10 text-white focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/30" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/30";
  const labelColor = isDark ? "text-zinc-400" : "text-zinc-500";
  const textColor = isDark ? "text-white" : "text-zinc-900";
  const subtaskBg = isDark ? "bg-black/20 border-white/5" : "bg-zinc-50 border-zinc-150";
  const borderLight = isDark ? "border-white/5" : "border-zinc-200";
  
  const categoryBtnClass = (active: boolean) => active 
    ? "bg-purple-600 text-white shadow-sm" 
    : isDark 
      ? "bg-zinc-800/60 text-zinc-400 hover:text-white" 
      : "bg-zinc-100 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/80";

  // Task form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [estimatedHours, setEstimatedHours] = useState(2);
  const [category, setCategory] = useState<Category>(Category.OTHER);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter and Accordion states
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("All");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [breakdownLoadingMap, setBreakdownLoadingMap] = useState<Record<string, boolean>>({});

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      // Setup simple default deadline if empty (2 days out)
      const finalDeadline = deadline || new Date(Date.now() + 86400000 * 2).toISOString();
      await onAddTask({
        title,
        description,
        deadline: finalDeadline,
        priority,
        estimatedHours: Number(estimatedHours),
        category
      });
      // Reset form
      setTitle("");
      setDescription("");
      setDeadline("");
      setPriority(Priority.MEDIUM);
      setEstimatedHours(2);
      setCategory(Category.OTHER);
      setShowAddForm(false);
      
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTaskCompletion = async (task: Task) => {
    const nextCompleted = !task.completed;
    if (nextCompleted) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#a855f7", "#ec4899", "#3b82f6"]
      });
    }
    await onUpdateTask(task.id, { completed: nextCompleted, userId: profileUid });
  };

  // AI Breakdown trigger
  const handleTriggerBreakdown = async (taskId: string) => {
    setBreakdownLoadingMap(prev => ({ ...prev, [taskId]: true }));
    try {
      const res = await fetch(`/api/tasks/${taskId}/breakdown`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileUid })
      });
      const updatedTask = await res.json();
      if (updatedTask && updatedTask.subtasks) {
        await onUpdateTask(taskId, { subtasks: updatedTask.subtasks });
        setExpandedTaskId(taskId); // expand the view to see the new subtasks
        
        confetti({
          particleCount: 50,
          spread: 40,
          origin: { y: 0.7 },
          colors: ["#a855f7", "#ec4899"]
        });
      }
    } catch (e) {
      console.error("Failed to breakdown task:", e);
    } finally {
      setBreakdownLoadingMap(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const handleToggleSubtask = async (task: Task, subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map(sub => {
      if (sub.id === subtaskId) {
        return { ...sub, completed: !sub.completed };
      }
      return sub;
    });

    const allDone = updatedSubtasks.every(s => s.completed);
    
    await onUpdateTask(task.id, { 
      subtasks: updatedSubtasks,
      completed: allDone ? true : task.completed,
      userId: profileUid
    });

    if (allDone && !task.completed) {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 }
      });
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (activeCategoryFilter === "All") return true;
    return t.category === activeCategoryFilter;
  });

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL: return "bg-red-500/10 text-red-500 border-red-500/20 font-bold";
      case Priority.HIGH: return "bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold";
      case Priority.MEDIUM: return "bg-blue-500/10 text-blue-500 border-blue-500/20 font-medium";
      case Priority.LOW: return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  const getCategoryEmoji = (cat: Category) => {
    switch (cat) {
      case Category.STUDY: return "📚";
      case Category.WORK: return "💼";
      case Category.PERSONAL: return "🏡";
      case Category.HEALTH: return "💪";
      case Category.FINANCE: return "💰";
      default: return "📌";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 3 Questions Orientation Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
            Objectives Stage
          </div>
          <h1 className={`text-2xl font-extrabold tracking-tight mt-1 ${textColor}`}>
            Smart Task Manager
          </h1>
          <p className={`${labelColor} text-xs mt-0.5`}>
            Deconstruct complex work scopes into bite-sized actionable lists, filter targets, and complete AI break downs.
          </p>
        </div>

        {/* Dynamic tips banner - Answers "What should I do next?" */}
        <div className={`p-3 rounded-xl border flex gap-3 items-start max-w-sm text-xs ${cardBg}`}>
          <HelpCircle className="h-4.5 w-4.5 text-purple-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-purple-600 dark:text-purple-400 block text-[10px] uppercase font-mono">PRO TIP:</span>
            <p className={labelColor}>Expand any task and press <span className="font-bold">"AI Breakdown"</span> to slice major workloads into sequential micro-steps automatically.</p>
          </div>
        </div>
      </div>

      {/* Filter Category Toolbar & Create Trigger */}
      <div className={`flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 p-3.5 rounded-xl border transition-all ${barBg}`}>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          <button
            onClick={() => setActiveCategoryFilter("All")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${categoryBtnClass(activeCategoryFilter === "All")}`}
          >
            All Tasks ({tasks.length})
          </button>
          {Object.values(Category).map((cat) => {
            const count = tasks.filter(t => t.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${categoryBtnClass(activeCategoryFilter === cat)}`}
              >
                <span>{getCategoryEmoji(cat)}</span>
                <span>{cat}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        <button
          id="add-task-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className={`font-bold text-xs px-4.5 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
            showAddForm 
              ? "bg-zinc-200 hover:bg-zinc-300 text-zinc-800" 
              : "bg-purple-600 hover:bg-purple-500 text-white"
          }`}
        >
          {showAddForm ? "Hide Form" : "Create Task"}
          <Plus className={`h-4 w-4 transition-transform duration-200 ${showAddForm ? "rotate-45" : ""}`} />
        </button>
      </div>

      {/* Form Area with validation feedback */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-6 rounded-2xl border shadow-lg ${isDark ? "bg-zinc-900/80 border-purple-500/20" : "bg-white border-purple-200"}`}
          >
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60 dark:border-white/5">
                <h3 className={`text-xs font-bold flex items-center gap-2 uppercase tracking-wider ${textColor}`}>
                  <Sparkles className="h-4.5 w-4.5 text-purple-500" />
                  Define Smart Objective
                </h3>
                <span className="text-[10px] text-zinc-400 font-mono">* fields required</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={`text-[10px] font-mono font-bold uppercase ${labelColor}`}>Task Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Complete JavaScript final assignment"
                    className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none ${inputBg}`}
                    required
                  />
                  {title.trim().length > 0 && title.trim().length < 4 && (
                    <p className="text-[9px] text-amber-500 font-medium">Keep it descriptive for ideal AI breakdown outcomes.</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className={`text-[10px] font-mono font-bold uppercase ${labelColor}`}>Due Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none ${inputBg}`}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-mono font-bold uppercase ${labelColor}`}>Goal Context / Instructions</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide supporting notes or rubrics. This data feeds into the AI Coach to advise on priority slots..."
                  className={`w-full border rounded-xl px-4 py-2 text-xs focus:outline-none h-16 ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className={`text-[10px] font-mono font-bold uppercase ${labelColor}`}>Priority Weight</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none ${inputBg}`}
                  >
                    {Object.values(Priority).map(p => (
                      <option key={p} value={p} className={isDark ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={`text-[10px] font-mono font-bold uppercase ${labelColor}`}>Workspace Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none ${inputBg}`}
                  >
                    {Object.values(Category).map(c => (
                      <option key={c} value={c} className={isDark ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={`text-[10px] font-mono font-bold uppercase ${labelColor}`}>Estimated Work Hours</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none ${inputBg}`}
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200/60 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    isDark ? "hover:bg-zinc-800 text-zinc-400" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs px-6 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  {isSubmitting ? "Generating..." : "Save & Analyze Target"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Stack */}
      <div className="space-y-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const isExpanded = expandedTaskId === task.id;
            const hasSubtasks = task.subtasks && task.subtasks.length > 0;
            const completedSubtasksCount = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;
            
            return (
              <motion.div
                layout
                key={task.id}
                className={`rounded-2xl border transition-all ${
                  task.completed 
                    ? isDark 
                      ? "bg-zinc-950/20 border-white/5 opacity-60" 
                      : "bg-zinc-100/50 border-zinc-200/50 opacity-65"
                    : isExpanded 
                    ? isDark 
                      ? "bg-zinc-900/80 border-purple-500/20 shadow-lg" 
                      : "bg-white border-purple-200 shadow-md"
                    : isDark 
                    ? "bg-zinc-900/50 border-white/5 shadow-sm hover:border-white/10"
                    : "bg-white border-zinc-200/80 shadow-sm hover:border-purple-200/60"
                }`}
              >
                {/* Main Row */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleTaskCompletion(task)}
                      className={`h-5.5 w-5.5 rounded-lg border flex items-center justify-center transition-all shrink-0 mt-0.5 cursor-pointer ${
                        task.completed 
                          ? "bg-emerald-500 border-emerald-500 text-black" 
                          : isDark 
                          ? "border-white/20 hover:border-purple-500"
                          : "border-zinc-300 hover:border-purple-500 bg-white shadow-xs"
                      }`}
                      title={task.completed ? "Mark as pending" : "Mark as complete"}
                    >
                      {task.completed && <Check className="h-3.5 w-3.5 stroke-[4]" />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-sm font-bold ${task.completed ? "line-through text-zinc-400 dark:text-zinc-500" : textColor}`}>
                          {task.title}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${isDark ? "bg-white/5 text-gray-300" : "bg-zinc-100 text-zinc-600 border border-zinc-200/60"}`}>
                          {getCategoryEmoji(task.category)} {task.category}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.riskLevel === "Red" && !task.completed && (
                          <span className="text-[9px] bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono font-bold animate-pulse">
                            <AlertTriangle className="h-3 w-3" /> CRITICAL CHOKEPOINT
                          </span>
                        )}
                      </div>

                      <div className={`flex items-center gap-4 text-xs font-mono mt-1 ${labelColor}`}>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                          Due: {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-zinc-400" />
                          Work Block: {task.estimatedHours}h
                        </span>
                        {hasSubtasks && (
                          <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {completedSubtasksCount}/{task.subtasks.length} subtasks
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-white/5">
                    {/* Ask AI Subtask Breakdown */}
                    {!task.completed && !hasSubtasks && (
                      <button
                        onClick={() => handleTriggerBreakdown(task.id)}
                        disabled={breakdownLoadingMap[task.id]}
                        className={`font-bold text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer border ${isDark ? "bg-purple-950/40 hover:bg-purple-900/60 border-purple-500/20 text-purple-300 hover:text-white" : "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 hover:text-purple-900"}`}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-purple-500 animate-pulse" />
                        {breakdownLoadingMap[task.id] ? "Analyzing..." : "AI Breakdown"}
                      </button>
                    )}

                    <button
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 border border-zinc-200/40 shadow-xs"}`}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    <button
                      onClick={() => {
                        if(confirm("Delete this objective permanently?")) {
                          onDeleteTask(task.id);
                        }
                      }}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? "hover:bg-red-500/10 text-zinc-500 hover:text-red-400" : "hover:bg-red-50 text-zinc-400 hover:text-red-600 border border-zinc-200/40 shadow-xs"}`}
                      title="Delete target"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Collapsible Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className={`px-4 pb-4 pt-3 overflow-hidden border-t ${borderLight}`}
                    >
                      {task.description && (
                        <div className="space-y-1 mb-3">
                          <span className={`text-[9px] font-mono font-bold uppercase ${labelColor}`}>Goal Context Notes:</span>
                          <p className={`text-xs p-3 rounded-xl border ${subtaskBg} ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                            {task.description}
                          </p>
                        </div>
                      )}

                      {/* Display Risk predictor analysis inside task card */}
                      {!task.completed && task.riskAnalysis && (
                        <div className={`p-3 rounded-xl mt-3 border text-xs flex gap-2 ${
                          task.riskLevel === "Red" 
                            ? isDark ? "bg-red-950/20 border-red-500/10 text-red-300" : "bg-red-50 border-red-200 text-red-800"
                            : task.riskLevel === "Yellow" 
                            ? isDark ? "bg-amber-950/20 border-amber-500/10 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
                            : isDark ? "bg-emerald-950/10 border-emerald-500/10 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                        }`}>
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold uppercase tracking-wider block mb-0.5 text-[9px] font-mono">AI Risk Advisory:</span>
                            {task.riskAnalysis}
                          </div>
                        </div>
                      )}

                      {/* Subtask Checklists */}
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className={`text-[10px] font-bold font-mono uppercase tracking-wider ${labelColor}`}>Deconstructed Checklist</h4>
                          {hasSubtasks && (
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono font-bold">
                              {Math.round((completedSubtasksCount / task.subtasks.length) * 100)}% Complete
                            </span>
                          )}
                        </div>

                        {hasSubtasks ? (
                          <div className="space-y-2">
                            {task.subtasks.map((sub) => (
                              <div 
                                key={sub.id}
                                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${subtaskBg} ${
                                  sub.completed ? "opacity-60" : ""
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <button
                                    onClick={() => handleToggleSubtask(task, sub.id)}
                                    className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                      sub.completed 
                                        ? "bg-purple-600 border-purple-600 text-white" 
                                        : isDark ? "border-white/20 hover:border-purple-400" : "border-zinc-300 hover:border-purple-400 bg-white"
                                    }`}
                                  >
                                    {sub.completed && <Check className="h-3 w-3 stroke-[3]" />}
                                  </button>
                                  <span className={`truncate ${sub.completed ? "line-through text-zinc-400 dark:text-zinc-500" : isDark ? "text-zinc-300" : "text-zinc-800"}`}>
                                    {sub.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                                  <span>⏱️ {sub.estimatedMinutes}m</span>
                                  {sub.suggestedDate && (
                                    <span className={`px-2 py-0.5 rounded ${isDark ? "bg-white/5 text-gray-400" : "bg-zinc-200/60 text-zinc-600"}`}>📅 {sub.suggestedDate}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={`text-center py-6 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 ${isDark ? "bg-black/10 border-white/10" : "bg-zinc-100/50 border-zinc-200"}`}>
                            <p className="text-xs text-zinc-500">No subtasks sequenced yet.</p>
                            <button
                              onClick={() => handleTriggerBreakdown(task.id)}
                              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-500 flex items-center gap-1 font-bold mt-1"
                            >
                              <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Sequence task into subtasks
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        ) : (
          <div className={`text-center py-12 rounded-2xl border border-dashed ${isDark ? "bg-zinc-900/30 border-white/5" : "bg-zinc-100/50 border-zinc-200"}`}>
            <ClipboardList className="h-10 w-10 text-zinc-400 mx-auto mb-2" />
            <p className="text-zinc-500 font-bold text-sm">No tasks found</p>
            <p className="text-zinc-400 text-xs mt-1">Use the "Create Task" button above to register your first co-pilot target!</p>
          </div>
        )}
      </div>
    </div>
  );
}
