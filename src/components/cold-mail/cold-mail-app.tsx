"use client";

import { useEffect, useRef, useState } from "react";
import { useColdMailStore } from "@/lib/store";
import * as api from "@/lib/api";
import type { HrContact } from "@/lib/types";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Icons
import {
  Send,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  Zap,
  Eye,
  RotateCcw,
  Plus,
  Upload,
  FileText,
  Play,
  Pause,
  Trash2,
  Terminal,
  Mail,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Download,
  MoreHorizontal,
  LayoutDashboard,
  Cog,
  Bot,
  UserPlus,
  RefreshCw,
  Edit,
  Sparkles,
  Check,
  Building,
  Sun,
  Moon,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
} from "recharts";

const ROWS_PER_PAGE = 10;

function OutreachIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="100" cy="100" r="80" className="fill-primary/5 dark:fill-primary/10" />
      <circle cx="100" cy="100" r="60" className="fill-primary/5 dark:fill-primary/5 animate-pulse" />
      
      {/* Head */}
      <circle cx="100" cy="70" r="16" className="fill-slate-300 dark:fill-slate-600" />
      
      {/* Torso */}
      <path
        d="M70 140 C70 110 82 96 100 96 C118 96 130 110 130 140 Z"
        className="fill-primary/45 dark:fill-primary/30"
      />
      {/* Suit/Jacket */}
      <path
        d="M72 140 C72 115 80 102 96 100 L90 140 Z"
        className="fill-primary"
      />
      <path
        d="M128 140 C128 115 120 102 104 100 L110 140 Z"
        className="fill-primary/80"
      />
      
      {/* Laptop */}
      <path
        d="M75 142 H125 V146 H75 Z"
        className="fill-slate-400 dark:fill-slate-500"
      />
      <path
        d="M80 142 L88 120 H112 L120 142 Z"
        className="fill-slate-300 dark:fill-slate-400"
        opacity="0.9"
      />
      <rect x="92" y="125" width="16" height="12" rx="1" className="fill-primary/10" />
      <path d="M96 132 L100 128 L104 132" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Floating Envelopes */}
      <g className="animate-bounce" style={{ animationDuration: '3s' }}>
        <rect x="35" y="48" width="28" height="18" rx="2" className="fill-emerald-500/80 dark:fill-emerald-500/60" />
        <path d="M35 48 L49 58 L63 48" className="stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
      </g>
      
      <g className="animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
        <rect x="135" y="65" width="30" height="20" rx="2" className="fill-primary dark:fill-primary/70" />
        <path d="M135 65 L150 76 L165 65" className="stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
      </g>
      
      <g className="animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
        <rect x="120" y="30" width="24" height="16" rx="2" className="fill-amber-500/80 dark:fill-amber-500/60" />
        <path d="M120 30 L132 39 L144 30" className="stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
      </g>
      
      {/* Sparkles */}
      <path d="M25 105 L27 98 L34 96 L27 94 L25 87 L23 94 L16 96 L23 98 Z" className="fill-amber-400" />
      <path d="M165 115 L167 110 L172 109 L167 108 L165 103 L163 108 L158 109 L163 110 Z" className="fill-primary animate-pulse" />
    </svg>
  );
}

export default function ColdMailApp() {
  const { toast } = useToast();
  const store = useColdMailStore();
  const { theme, setTheme } = useTheme();
  const agentIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [batchSize, setBatchSize] = useState("10");
  const [intervalMinutes, setIntervalMinutes] = useState("5");
  const [addForm, setAddForm] = useState({ name: "", email: "", title: "", company: "" });
  const [editForm, setEditForm] = useState({ id: "", name: "", email: "", title: "", company: "" });

  // Bulk actions state
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // AI refinement state
  const [aiFeedback, setAiFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  // SSR protection for Recharts
  const [mounted, setMounted] = useState(false);

  // Load configuration and contacts
  const loadData = async () => {
    store.setIsLoading(true);
    try {
      const [config, contacts, resume] = await Promise.all([
        api.fetchConfig(),
        api.fetchContacts(),
        api.checkResumeStatus(),
      ]);
      store.setConfig(config);
      store.setContacts(contacts);
      store.setResumeExists(resume.exists);
      store.addLog("Configuration and contacts loaded.", "system");
      if (resume.exists) {
        store.addLog("Resume PDF found and verified.", "success");
      } else {
        store.addLog("Warning: Resume PDF not uploaded yet.", "warning");
      }
    } catch (e: any) {
      store.addLog(`Error loading data: ${e.message}`, "error");
    } finally {
      store.setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  // Filtered contacts
  const filteredContacts = store.contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(store.searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(store.searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(store.searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(store.searchQuery.toLowerCase());
    const matchesStatus = store.statusFilter === "all" || c.status === store.statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / ROWS_PER_PAGE));
  const safeCurrentPage = Math.min(store.currentPage, totalPages);
  const paginatedContacts = filteredContacts.slice(
    (safeCurrentPage - 1) * ROWS_PER_PAGE,
    safeCurrentPage * ROWS_PER_PAGE
  );

  // Stats calculation
  const totalContacts = store.contacts.length;
  const sentCount = store.contacts.filter((c) => c.status === "sent").length;
  const failedCount = store.contacts.filter((c) => c.status === "failed").length;
  const pendingCount = store.contacts.filter((c) => c.status === "pending").length;
  const generatingCount = store.contacts.filter((c) => c.status === "generating").length;
  const successRate = totalContacts > 0 ? Math.round((sentCount / (sentCount + failedCount || 1)) * 100) : 0;

  // Recharts Pie Chart Data (Theme-aware distribution chart)
  const chartData = [
    { name: "Sent", value: sentCount, color: "#10b981" },
    { name: "Pending", value: pendingCount, color: "#f59e0b" },
    { name: "Failed", value: failedCount, color: "#ef4444" },
    { name: "Generating", value: generatingCount, color: "#3b82f6" },
  ].filter(item => item.value > 0);

  // Recharts Bar Chart Data: top 5 companies by contact count
  const companyCountsMap = store.contacts.reduce((acc, c) => {
    if (c.company) {
      acc[c.company] = (acc[c.company] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const companyBarData = Object.entries(companyCountsMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Selection handlers
  const handleSelectContact = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const handleSelectAll = () => {
    const paginatedIds = paginatedContacts.map((c) => c.id);
    const allSelectedOnPage = paginatedIds.every((id) => selectedContacts.includes(id));

    if (allSelectedOnPage) {
      setSelectedContacts((prev) => prev.filter((id) => !paginatedIds.includes(id)));
    } else {
      setSelectedContacts((prev) => [...new Set([...prev, ...paginatedIds])]);
    }
  };

  // Preview email
  const handlePreviewEmail = async (contact: HrContact) => {
    setAiFeedback(""); // Reset refinement input
    store.openPreview(contact, "Generating...", "AI is crafting a personalized cold email... Please wait.");
    store.setIsGenerating(true);
    store.addLog(`Generating email draft for ${contact.name} at ${contact.company}...`, "info");

    try {
      const email = await api.generateEmail(contact.id);
      store.setPreviewSubject(email.subject);
      store.setPreviewBody(email.body);
      store.setIsGenerating(false);
      store.addLog(`Draft generated successfully for ${contact.name}.`, "success");
    } catch (e: any) {
      store.setPreviewSubject("Error");
      store.setPreviewBody(e.message);
      store.setIsGenerating(false);
      store.addLog(`Failed to generate draft: ${e.message}`, "error");
    }
  };

  // Refine Email with feedback
  const handleRefineEmail = async () => {
    if (!store.previewContact || !aiFeedback.trim()) return;
    setIsRefining(true);
    store.setIsGenerating(true);
    store.addLog(`Refining email draft for ${store.previewContact.name} with instructions: "${aiFeedback}"...`, "info");

    try {
      const email = await api.generateEmail(store.previewContact.id, aiFeedback);
      store.setPreviewSubject(email.subject);
      store.setPreviewBody(email.body);
      setAiFeedback("");
      store.addLog(`Draft refined successfully based on your feedback.`, "success");
      toast({ title: "Draft refined", description: "AI updated the email according to your instructions." });
    } catch (e: any) {
      store.addLog(`Failed to refine draft: ${e.message}`, "error");
      toast({ title: "Refinement failed", description: e.message, variant: "destructive" });
    } finally {
      setIsRefining(false);
      store.setIsGenerating(false);
    }
  };

  // Send email
  const handleSendEmail = async () => {
    if (!store.previewContact) return;
    const contactName = store.previewContact.name;
    store.setIsSending(true);
    store.addLog(`Sending email to ${store.previewContact.name} (${store.previewContact.email})...`, "info");

    try {
      await api.sendEmail(
        store.previewContact.id,
        store.previewSubject,
        store.previewBody
      );
      store.addLog(`Email sent to ${contactName}!`, "success");
      store.closePreview();
      await refreshContacts();
      toast({ title: "Email sent successfully!", description: `Email delivered to ${contactName}` });
    } catch (e: any) {
      store.addLog(`Failed to send email: ${e.message}`, "error");
      toast({ title: "Failed to send email", description: e.message, variant: "destructive" });
    } finally {
      store.setIsSending(false);
    }
  };

  // Reset status
  const handleResetStatus = async (contact: HrContact) => {
    try {
      await api.resetStatus(contact.id);
      store.addLog(`Status reset for ${contact.email}.`, "info");
      await refreshContacts();
      toast({ title: "Status reset", description: `${contact.name} is now pending.` });
    } catch (e: any) {
      store.addLog(`Reset failed: ${e.message}`, "error");
    }
  };

  // Delete contact
  const handleDeleteContact = async (contact: HrContact) => {
    try {
      await api.deleteContact(contact.id);
      setSelectedContacts((prev) => prev.filter((id) => id !== contact.id));
      store.addLog(`Deleted contact: ${contact.name} (${contact.email}).`, "info");
      await refreshContacts();
      toast({ title: "Contact deleted", description: `${contact.name} removed from list.` });
    } catch (e: any) {
      store.addLog(`Delete failed: ${e.message}`, "error");
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    }
  };

  // Add contact
  const handleAddContact = async () => {
    if (!addForm.name || !addForm.email) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    try {
      await api.addContact(addForm);
      store.addLog(`Added contact: ${addForm.name} (${addForm.email}).`, "success");
      setAddDialogOpen(false);
      setAddForm({ name: "", email: "", title: "", company: "" });
      await refreshContacts();
      toast({ title: "Contact added", description: `${addForm.name} added to the list.` });
    } catch (e: any) {
      store.addLog(`Failed to add contact: ${e.message}`, "error");
      toast({ title: "Failed to add contact", description: e.message, variant: "destructive" });
    }
  };

  // Open edit contact dialog
  const openEditDialog = (contact: HrContact) => {
    setEditForm({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      title: contact.title || "",
      company: contact.company || "",
    });
    setEditDialogOpen(true);
  };

  // Save edited contact
  const handleEditContact = async () => {
    if (!editForm.name || !editForm.email) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    try {
      await api.updateContact(editForm.id, {
        name: editForm.name,
        email: editForm.email,
        title: editForm.title,
        company: editForm.company,
      });
      store.addLog(`Updated contact: ${editForm.name} (${editForm.email}).`, "success");
      setEditDialogOpen(false);
      await refreshContacts();
      toast({ title: "Contact updated", description: `${editForm.name} updated successfully.` });
    } catch (e: any) {
      store.addLog(`Failed to update contact: ${e.message}`, "error");
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    }
  };

  // Upload CSV/Excel
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const fileType = isExcel ? "Spreadsheet" : "CSV";
    try {
      const result = await api.uploadCsv(file);
      store.addLog(`${fileType} uploaded: ${result.added} contacts added out of ${result.total} total rows.`, "success");
      await refreshContacts();
      toast({ title: `${fileType} uploaded`, description: `${result.added} contacts added successfully.` });
    } catch (e: any) {
      store.addLog(`${fileType} upload failed: ${e.message}`, "error");
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
    e.target.value = "";
  };

  // Upload resume
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await api.uploadResume(file);
      store.setResumeExists(true);
      store.addLog("Resume PDF uploaded successfully.", "success");
      toast({ title: "Resume uploaded", description: "Your resume is now attached to outgoing emails." });
    } catch (e: any) {
      store.addLog(`Resume upload failed: ${e.message}`, "error");
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
    e.target.value = "";
  };

  // Save settings
  const handleSaveSettings = async () => {
    if (!store.config) return;
    setSettingsSaving(true);
    try {
      const saved = await api.saveConfig(store.config);
      store.setConfig(saved);
      store.addLog("Settings saved successfully.", "success");
      toast({ title: "Settings saved", description: "Your configuration has been updated." });
    } catch (e: any) {
      store.addLog(`Failed to save settings: ${e.message}`, "error");
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSettingsSaving(false);
    }
  };

  // Automation
  const startAgent = () => {
    if (!store.config?.emailUser || !store.config?.emailPass) {
      store.addLog("Error: Gmail SMTP credentials are missing. Please configure settings first.", "error");
      toast({ title: "Missing credentials", description: "Please configure Gmail settings first.", variant: "destructive" });
      return;
    }

    store.setIsAgentRunning(true);
    const intervalMs = parseInt(intervalMinutes) * 60 * 1000;
    store.addLog(`Automation started. Batch: ${batchSize}, Interval: ${intervalMinutes} min.`, "success");

    runAgentBatch();
    agentIntervalRef.current = setInterval(runAgentBatch, intervalMs);
  };

  const stopAgent = () => {
    store.setIsAgentRunning(false);
    if (agentIntervalRef.current) {
      clearInterval(agentIntervalRef.current);
      agentIntervalRef.current = null;
    }
    store.addLog("Automation paused.", "warning");
  };

  const runAgentBatch = async () => {
    if (!useColdMailStore.getState().isAgentRunning) return;
    store.addLog("--- Automation batch triggered ---", "system");

    const currentContacts = useColdMailStore.getState().contacts;
    const pending = currentContacts.filter((c) => c.status === "pending");
    if (pending.length === 0) {
      store.addLog("No pending contacts left. Pausing automation.", "success");
      stopAgent();
      return;
    }

    const batch = pending.slice(0, parseInt(batchSize));
    store.addLog(`Processing batch of ${batch.length} contacts...`, "info");

    for (let i = 0; i < batch.length; i++) {
      if (!useColdMailStore.getState().isAgentRunning) break;
      const contact = batch[i];
      store.addLog(`[${i + 1}/${batch.length}] Processing ${contact.name} @ ${contact.company}...`, "info");

      try {
        const email = await api.generateEmail(contact.id);
        await new Promise((r) => setTimeout(r, 1500));
        await api.sendEmail(contact.id, email.subject, email.body);
        store.addLog(`[Success] Email sent to ${contact.name} (${contact.email})`, "success");
      } catch (e: any) {
        store.addLog(`[Failed] Error processing ${contact.name}: ${e.message}`, "error");
      }

      await refreshContacts();
      await new Promise((r) => setTimeout(r, 8000));
    }

    store.addLog("Batch processing complete. Waiting for next interval.", "system");
  };

  // Bulk execution handlers
  const handleBulkSend = async () => {
    const pendingToProcess = store.contacts.filter(
      (c) => selectedContacts.includes(c.id) && c.status === "pending"
    );

    if (pendingToProcess.length === 0) {
      toast({
        title: "No pending contacts",
        description: "None of the selected contacts are in 'pending' status.",
        variant: "destructive",
      });
      return;
    }

    if (!store.config?.emailUser || !store.config?.emailPass) {
      toast({
        title: "Missing SMTP Credentials",
        description: "Please configure your Gmail SMTP settings first.",
        variant: "destructive",
      });
      return;
    }

    setIsBulkProcessing(true);
    store.setIsAgentRunning(true);
    store.setActiveTab("automation");
    store.addLog(`--- Starting Bulk Outreach for ${pendingToProcess.length} contacts ---`, "system");
    setSelectedContacts([]); // Reset selections

    for (let i = 0; i < pendingToProcess.length; i++) {
      const contact = pendingToProcess[i];
      store.addLog(`[Bulk Outreach ${i + 1}/${pendingToProcess.length}] Generating draft for ${contact.name} (${contact.company})...`, "info");

      try {
        const email = await api.generateEmail(contact.id);
        await new Promise((r) => setTimeout(r, 1000));
        store.addLog(`[Bulk Outreach ${i + 1}/${pendingToProcess.length}] Delivering email to ${contact.email}...`, "info");
        await api.sendEmail(contact.id, email.subject, email.body);
        store.addLog(`[Success] Emailed ${contact.name} at ${contact.company}`, "success");
      } catch (e: any) {
        store.addLog(`[Failed] Could not process ${contact.name}: ${e.message}`, "error");
      }

      await refreshContacts();
      if (i < pendingToProcess.length - 1) {
        store.addLog("Pausing for 6 seconds to avoid SMTP throttling...", "system");
        await new Promise((r) => setTimeout(r, 6000));
      }
    }

    store.addLog(`--- Bulk outreach completed ---`, "success");
    setIsBulkProcessing(false);
    store.setIsAgentRunning(false);
    toast({
      title: "Bulk outreach finished",
      description: `Completed processing ${pendingToProcess.length} contacts. See console for details.`,
    });
  };

  const handleBulkReset = async () => {
    if (selectedContacts.length === 0) return;
    try {
      let count = 0;
      for (const id of selectedContacts) {
        await api.resetStatus(id);
        count++;
      }
      setSelectedContacts([]);
      await refreshContacts();
      store.addLog(`Bulk reset completed. ${count} contacts reset to pending.`, "info");
      toast({ title: "Bulk status reset", description: `Successfully reset ${count} contacts.` });
    } catch (e: any) {
      store.addLog(`Bulk reset failed: ${e.message}`, "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedContacts.length} selected contacts?`)) return;

    try {
      let count = 0;
      for (const id of selectedContacts) {
        await api.deleteContact(id);
        count++;
      }
      setSelectedContacts([]);
      await refreshContacts();
      store.addLog(`Bulk delete completed. ${count} contacts removed.`, "warning");
      toast({ title: "Bulk delete success", description: `Removed ${count} contacts.` });
    } catch (e: any) {
      store.addLog(`Bulk delete failed: ${e.message}`, "error");
    }
  };

  const refreshContacts = async () => {
    try {
      const contacts = await api.fetchContacts();
      store.setContacts(contacts);
    } catch {}
  };

  // Status badge renderer
  const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      pending: { className: "border-amber-500/20 text-amber-600 dark:text-amber-400 bg-amber-500/5", icon: <Clock className="w-3 h-3 mr-1" /> },
      generating: { className: "border-blue-500/20 text-blue-500 dark:text-blue-400 bg-blue-500/5", icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" /> },
      generated: { className: "border-violet-500/20 text-violet-600 dark:text-violet-400 bg-violet-500/5", icon: <FileText className="w-3 h-3 mr-1" /> },
      sending: { className: "border-cyan-500/20 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5", icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" /> },
      sent: { className: "border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 glow-emerald", icon: <CheckCircle2 className="w-3 h-3 mr-1" /> },
      failed: { className: "border-red-500/20 text-red-650 dark:text-red-400 bg-red-500/5", icon: <XCircle className="w-3 h-3 mr-1" /> },
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant="outline" className={`px-2.5 py-0.5 rounded-full font-medium flex items-center w-fit border ${config.className}`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/60 backdrop-blur-md border-b border-border/80 shadow-md shadow-black/5 dark:shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  ColdFlow <span className="text-[10px] uppercase font-bold tracking-widest bg-primary px-1.5 py-0.5 rounded text-white border border-primary/20">AGENT</span>
                </h1>
                <p className="text-[10px] text-muted-foreground">Autonomous Job Application Pipeline</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Theme Toggle Button */}
              {mounted && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-secondary rounded-full w-8 h-8 p-0"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  aria-label="Toggle Theme"
                >
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4 text-amber-500 animate-pulse" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-600" />
                  )}
                </Button>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 border border-border text-xs text-foreground">
                <Bot className={`w-3.5 h-3.5 ${store.isAgentRunning ? "text-emerald-400 animate-spin" : "text-slate-400"}`} />
                <span className="font-semibold text-slate-700 dark:text-slate-200">{store.isAgentRunning ? "Agent Engine Active" : "Agent Engine Idle"}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-secondary rounded-full w-8 h-8 p-0"
                onClick={loadData}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={store.activeTab} onValueChange={(v) => store.setActiveTab(v as any)} className="space-y-6">
          <TabsList className="bg-secondary/40 backdrop-blur-md shadow-inner border border-border rounded-xl p-1 h-auto flex w-fit gap-1">
            <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white px-5 py-2 text-xs font-semibold gap-2 transition-all">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="automation" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white px-5 py-2 text-xs font-semibold gap-2 transition-all">
              <Terminal className="w-4 h-4" />
              Agent Console
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white px-5 py-2 text-xs font-semibold gap-2 transition-all">
              <Cog className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* ============ DASHBOARD TAB ============ */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Onboarding Welcome Panel if empty */}
            {totalContacts === 0 && (
              <Card className="glass-panel overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent shadow-sm">
                <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                  <div className="space-y-4 text-center md:text-left max-w-lg">
                    <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-3 py-1 font-bold">
                      🚀 Get Started
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                      Supercharge Your Outreach
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      Start your automated cold email campaign by uploading a spreadsheet of HR contacts. The autonomous agent will research their companies and draft highly personalized outreach templates using Gemini AI.
                    </p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                      <Button
                        className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25"
                        onClick={() => csvInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Import CSV / Excel
                      </Button>
                      <Button
                        variant="outline"
                        className="border-border hover:bg-secondary text-slate-650 dark:text-slate-350 font-bold rounded-xl"
                        onClick={() => setAddDialogOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Manually
                      </Button>
                    </div>
                  </div>
                  <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 shrink-0 flex items-center justify-center">
                    <OutreachIllustration className="w-full h-full" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <motion.div whileHover={{ y: -3 }} className="h-full">
                <Card className="glass-panel glass-panel-hover overflow-hidden h-full flex flex-col justify-between">
                  <div className="h-0.5 bg-blue-500 w-full" />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Targets</p>
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 dark:text-blue-400 border border-blue-500/20">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{totalContacts}</h2>
                    <p className="text-[9px] text-muted-foreground mt-1">Contacts in pipeline</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ y: -3 }} className="h-full">
                <Card className="glass-panel glass-panel-hover overflow-hidden h-full flex flex-col justify-between">
                  <div className="h-0.5 bg-emerald-500 w-full" />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Emails Sent</p>
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{sentCount}</h2>
                    <p className="text-[9px] text-emerald-600/80 dark:text-emerald-400 mt-1">Successfully delivered</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ y: -3 }} className="h-full">
                <Card className="glass-panel glass-panel-hover overflow-hidden h-full flex flex-col justify-between">
                  <div className="h-0.5 bg-amber-500 w-full" />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pending</p>
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">{pendingCount}</h2>
                    <p className="text-[9px] text-amber-600/80 dark:text-amber-400 mt-1">Awaiting dispatch</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ y: -3 }} className="h-full">
                <Card className="glass-panel glass-panel-hover overflow-hidden h-full flex flex-col justify-between">
                  <div className="h-0.5 bg-red-500 w-full" />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Failed</p>
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 dark:text-red-400 border border-red-500/20">
                        <XCircle className="w-4 h-4" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-extrabold text-red-650 dark:text-red-400 mt-2">{failedCount}</h2>
                    <p className="text-[9px] text-red-650/80 dark:text-red-400 mt-1">Errors encountered</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ y: -3 }} className="h-full">
                <Card className="glass-panel glass-panel-hover overflow-hidden h-full flex flex-col justify-between">
                  <div className="h-0.5 bg-primary w-full" />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Success Rate</p>
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                        <Send className="w-4 h-4" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-extrabold text-primary mt-2">{successRate}%</h2>
                    <p className="text-[9px] text-primary/80 mt-1">Delivery ratio</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Campaign Visual Analytics */}
            {mounted && totalContacts > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats charts */}
                <Card className="glass-panel shadow-sm col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">Company outreach volumes</CardTitle>
                    <CardDescription className="text-muted-foreground">Top companies targeted by target contacts count</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64">
                    {companyBarData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={companyBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                          <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} allowDecimals={false} />
                          <RechartsTooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={35}>
                            {companyBarData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? "var(--primary)" : "oklch(from var(--primary) l c h / 0.75)"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        No company data available. Import contacts first.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pie Chart distribution */}
                <Card className="glass-panel shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">Outreach Distribution</CardTitle>
                    <CardDescription className="text-muted-foreground">Breakdown of target statuses</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 flex flex-col justify-center items-center relative">
                    {chartData.length > 0 ? (
                      <div className="w-full h-44 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={52}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip formatter={(value) => [`${value} contacts`, "Count"]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-black text-slate-800 dark:text-white">{sentCount}</span>
                          <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold uppercase tracking-wider">Sent</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-44 flex items-center justify-center text-slate-550 text-xs">
                        No data available
                      </div>
                    )}
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-xs">
                      {chartData.map((d) => (
                        <div key={d.name} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-slate-650 dark:text-slate-400 font-medium text-[11px]">{d.name} ({d.value})</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Contacts Table View */}
            <Card className="glass-panel shadow-md">
              <CardHeader className="pb-4 border-b border-border/80">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-white font-bold">
                      <Building className="w-5 h-5 text-primary" />
                      HR Outreach Directory
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">Select individual or multiple contacts to trigger outreach campaigns</CardDescription>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border hover:bg-secondary text-slate-700 dark:text-slate-205 font-semibold"
                      onClick={() => setAddDialogOpen(true)}
                    >
                      <UserPlus className="w-4 h-4 mr-1.5" />
                      Add Contact
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border hover:bg-secondary text-slate-700 dark:text-slate-205 font-semibold"
                      onClick={() => csvInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-1.5" />
                      Import CSV / Excel
                    </Button>
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Search & Filter bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="Search by name, company, title or email..."
                      value={store.searchQuery}
                      onChange={(e) => store.setSearchQuery(e.target.value)}
                      className="pl-10 border-border focus:border-primary/50 focus:ring-primary/20 bg-secondary/35 text-slate-850 dark:text-slate-200"
                    />
                  </div>
                  <Select value={store.statusFilter} onValueChange={store.setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48 border-border bg-secondary/35 text-slate-700 dark:text-slate-202">
                      <Filter className="w-4 h-4 mr-2 text-slate-500" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All Contacts</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="generating">Generating</SelectItem>
                      <SelectItem value="generated">Generated Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Table details */}
                <div className="rounded-xl border border-border/80 overflow-hidden shadow-sm bg-secondary/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/20 hover:bg-secondary/20 border-b border-border/80">
                        <TableHead className="w-12 text-center">
                          <Checkbox
                            checked={
                              paginatedContacts.length > 0 &&
                              paginatedContacts.every((c) => selectedContacts.includes(c.id))
                            }
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead className="w-12 text-center text-xs font-bold text-slate-500 dark:text-slate-400">#</TableHead>
                        <TableHead className="text-xs font-bold text-slate-500 dark:text-slate-400">Name</TableHead>
                        <TableHead className="hidden md:table-cell text-xs font-bold text-slate-500 dark:text-slate-400">Company</TableHead>
                        <TableHead className="hidden lg:table-cell text-xs font-bold text-slate-500 dark:text-slate-400">Title</TableHead>
                        <TableHead className="text-xs font-bold text-slate-500 dark:text-slate-400">Status</TableHead>
                        <TableHead className="text-right text-xs font-bold text-slate-500 dark:text-slate-400 pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {store.isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                            <p className="text-xs text-slate-500 mt-2 font-medium">Syncing database data...</p>
                          </TableCell>
                        </TableRow>
                      ) : paginatedContacts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-16">
                            <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                              <OutreachIllustration className="w-full h-full text-slate-400" />
                            </div>
                            <p className="text-sm font-bold text-slate-750 dark:text-slate-300">
                              {store.searchQuery || store.statusFilter !== "all"
                                ? "No matching contacts found"
                                : "Your directory is empty"}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed font-medium">
                              {store.searchQuery || store.statusFilter !== "all"
                                ? "Try refining your search text or clearing the filters to see all contacts."
                                : "Import a CSV or Excel file containing your HR target list, or add one manually to start."}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedContacts.map((contact, index) => (
                          <TableRow
                            key={contact.id}
                            className={`hover:bg-secondary/20 transition-colors border-b border-border/80 ${
                              selectedContacts.includes(contact.id) ? "bg-primary/5" : ""
                            }`}
                          >
                            <TableCell className="text-center">
                              <Checkbox
                                checked={selectedContacts.includes(contact.id)}
                                onCheckedChange={() => handleSelectContact(contact.id)}
                                aria-label={`Select ${contact.name}`}
                              />
                            </TableCell>
                            <TableCell className="text-center text-slate-400 dark:text-slate-500 font-mono text-xs">
                              {(safeCurrentPage - 1) * ROWS_PER_PAGE + index + 1}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{contact.name}</p>
                                <p className="text-xs text-slate-500 font-mono">{contact.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-slate-700 dark:text-slate-300 font-medium text-sm">
                              {contact.company}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-slate-600 dark:text-slate-400 text-xs font-semibold">
                              {contact.title}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={contact.status} />
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex items-center justify-end gap-1">
                                {contact.status === "pending" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-primary hover:text-primary-foreground hover:bg-primary h-8 font-semibold text-xs rounded-lg"
                                    onClick={() => handlePreviewEmail(contact)}
                                  >
                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                    <span>Preview</span>
                                  </Button>
                                )}
                                {(contact.status === "generated") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-primary hover:text-primary-foreground hover:bg-primary h-8 font-semibold text-xs rounded-lg"
                                    onClick={() => {
                                      // Load generated draft into store and open
                                      store.openPreview(contact, contact.subject || "", contact.body || "");
                                    }}
                                  >
                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                    <span>Review</span>
                                  </Button>
                                )}
                                {(contact.status === "sent" || contact.status === "failed") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-amber-600 hover:text-white hover:bg-amber-600 h-8 font-semibold text-xs rounded-lg"
                                    onClick={() => handleResetStatus(contact)}
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                    <span>Reset</span>
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-secondary text-slate-500 hover:text-slate-800 dark:hover:text-white">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44 bg-card border-border">
                                    <DropdownMenuItem onClick={() => openEditDialog(contact)} className="hover:bg-secondary text-foreground">
                                      <Edit className="w-4 h-4 mr-2 text-slate-400" />
                                      Edit Contact
                                    </DropdownMenuItem>
                                    {contact.status !== "pending" && (
                                      <DropdownMenuItem onClick={() => handleResetStatus(contact)} className="hover:bg-secondary text-foreground">
                                        <RotateCcw className="w-4 h-4 mr-2 text-slate-400" />
                                        Reset Status
                                      </DropdownMenuItem>
                                    )}
                                    {contact.status === "pending" && (
                                      <DropdownMenuItem onClick={() => handlePreviewEmail(contact)} className="hover:bg-secondary text-foreground">
                                        <Sparkles className="w-4 h-4 mr-2 text-primary" />
                                        AI Generate
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      className="text-red-500 hover:bg-red-500/10 focus:text-red-500 focus:bg-red-500/10"
                                      onClick={() => handleDeleteContact(contact)}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Contact
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination links */}
                {filteredContacts.length > ROWS_PER_PAGE && (
                  <div className="flex items-center justify-between mt-4 border-t border-border/80 pt-3">
                    <p className="text-xs text-slate-550 font-medium">
                      Showing {(safeCurrentPage - 1) * ROWS_PER_PAGE + 1}–
                      {Math.min(safeCurrentPage * ROWS_PER_PAGE, filteredContacts.length)} of{" "}
                      {filteredContacts.length} contacts
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={safeCurrentPage <= 1}
                        onClick={() => store.setCurrentPage(safeCurrentPage - 1)}
                        className="border-border h-8 px-2 hover:bg-secondary text-slate-600 dark:text-slate-300"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                        {safeCurrentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() => store.setCurrentPage(safeCurrentPage + 1)}
                        className="border-border h-8 px-2 hover:bg-secondary text-slate-600 dark:text-slate-300"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Floating Selected Actions Bar */}
            <AnimatePresence>
              {selectedContacts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/90 border border-border shadow-2xl rounded-2xl px-6 py-4 flex items-center justify-between gap-8 backdrop-blur-md max-w-lg w-[calc(100%-2rem)] text-foreground"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold text-white shadow-md shadow-primary/20">
                      {selectedContacts.length}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Selected HR Contacts</p>
                      <p className="text-[10px] text-slate-500">Perform actions on selections</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 px-3.5"
                      onClick={handleBulkSend}
                      disabled={isBulkProcessing}
                    >
                      {isBulkProcessing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Send Campaign
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-secondary text-slate-700 dark:text-slate-300 font-semibold text-xs h-9 px-2"
                      onClick={handleBulkReset}
                      disabled={isBulkProcessing}
                    >
                      Reset
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-red-500/10 hover:text-red-400 text-slate-500 dark:text-slate-400 font-semibold text-xs h-9 px-2"
                      onClick={handleBulkDelete}
                      disabled={isBulkProcessing}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ============ AUTOMATION TAB ============ */}
          <TabsContent value="automation" className="space-y-6">
            {/* Automation config */}
            <Card className="glass-panel shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-white font-bold">
                  <Zap className="w-5 h-5 text-primary" />
                  Agent Auto-Scheduler
                </CardTitle>
                <CardDescription className="text-muted-foreground">Configure auto-throttled sending schedules for queueing email operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-end">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Batch Size limit</Label>
                    <Select value={batchSize} onValueChange={setBatchSize}>
                      <SelectTrigger className="w-40 border-border bg-secondary/35 text-slate-700 dark:text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="5">5 emails / batch</SelectItem>
                        <SelectItem value="10">10 emails / batch</SelectItem>
                        <SelectItem value="20">20 emails / batch</SelectItem>
                        <SelectItem value="50">50 emails / batch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sleep Interval</Label>
                    <Select value={intervalMinutes} onValueChange={setIntervalMinutes}>
                      <SelectTrigger className="w-40 border-border bg-secondary/35 text-slate-700 dark:text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="1">1 minute</SelectItem>
                        <SelectItem value="3">3 minutes</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {!store.isAgentRunning ? (
                      <Button
                        className="bg-primary hover:bg-primary/95 text-white font-bold shadow-md shadow-primary/20 flex-1 sm:flex-none"
                        onClick={startAgent}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Activate Agent
                      </Button>
                    ) : (
                      <Button
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md flex-1 sm:flex-none"
                        onClick={stopAgent}
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Pause Scheduler
                      </Button>
                    )}
                  </div>
                </div>

                {store.isAgentRunning && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-5 p-4 bg-primary/5 border border-primary/25 rounded-xl flex items-center gap-3.5"
                  >
                    <div className="relative flex h-3.5 w-3.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-405 opacity-75 animate-pulse-ring"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-550 shadow-inner shadow-black/20"></span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Outreach Agent Engine active</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Running campaign queries in batches of {batchSize} every {intervalMinutes} minutes.
                      </p>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Console Log outputs */}
            <Card className="glass-panel shadow-md">
              <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-white font-bold">
                    <Terminal className="w-5 h-5 text-primary" />
                    Agent Console Log
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">Real-time execution details of background API actions</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-secondary font-semibold"
                  onClick={store.clearLogs}
                >
                  Clear Logs
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="terminal-log bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-border">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-900/60 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                      <span className="ml-2 text-xs text-slate-400 font-mono font-bold">outreach_console.log</span>
                    </div>
                    <Badge variant="outline" className="border-primary/25 text-primary bg-primary/5 text-[9px] uppercase font-bold py-0.5 tracking-wider">
                      Live Stream
                    </Badge>
                  </div>
                  <ScrollArea className="h-96">
                    <div className="p-5 font-mono text-xs leading-relaxed select-text bg-slate-950/20">
                      {store.logs.map((log) => (
                        <div
                          key={log.id}
                          className={`mb-2 font-medium break-all border-l-2 pl-3 ${
                            log.type === "system"
                              ? "text-blue-400 border-blue-500/50"
                              : log.type === "success"
                              ? "text-emerald-400 border-emerald-500/50"
                              : log.type === "error"
                              ? "text-red-400 border-red-500/50"
                              : log.type === "warning"
                              ? "text-amber-400 border-amber-500/50"
                              : "text-slate-300 border-slate-500/20"
                          }`}
                        >
                          <span className="text-slate-600 font-semibold">[{log.timestamp}]</span> {log.message}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ SETTINGS TAB ============ */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Credentials details */}
              <Card className="glass-panel shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-white font-bold">
                    <Mail className="w-5 h-5 text-primary" />
                    Credentials & API Keys
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">Configure SMTP settings and Gemini API token credentials</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailUser" className="text-xs font-bold text-slate-500 dark:text-slate-400">Gmail Address</Label>
                    <Input
                      id="emailUser"
                      type="email"
                      placeholder="address@gmail.com"
                      value={store.config?.emailUser || ""}
                      onChange={(e) =>
                        store.config &&
                        store.setConfig({ ...store.config, emailUser: e.target.value })
                      }
                      className="border-border focus:border-primary/50 focus:ring-primary/20 bg-secondary/35 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailPass" className="text-xs font-bold text-slate-500 dark:text-slate-400">Gmail App Password</Label>
                    <Input
                      id="emailPass"
                      type="password"
                      placeholder="16-character google app key"
                      value={store.config?.emailPass || ""}
                      onChange={(e) =>
                        store.config &&
                        store.setConfig({ ...store.config, emailPass: e.target.value })
                      }
                      className="border-border focus:border-primary/50 focus:ring-primary/20 bg-secondary/35 text-slate-800 dark:text-slate-200"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal bg-secondary/30 p-2.5 rounded-lg border border-border/80">
                      <strong className="text-slate-650 dark:text-slate-305">Security tip:</strong> Set up an App Password under your Google Account Security settings. Do not type your normal password.
                    </p>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <Label htmlFor="geminiApiKey" className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      Gemini API Key
                    </Label>
                    <Input
                      id="geminiApiKey"
                      type="password"
                      placeholder="AIzaSy..."
                      value={store.config?.geminiApiKey || ""}
                      onChange={(e) =>
                        store.config &&
                        store.setConfig({ ...store.config, geminiApiKey: e.target.value })
                      }
                      className="border-border focus:border-primary/50 focus:ring-primary/20 bg-secondary/35 text-slate-800 dark:text-slate-200"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal bg-secondary/30 p-2.5 rounded-lg border border-border/80">
                      <strong className="text-slate-650 dark:text-slate-305">Note:</strong> Uses <code>gemini-3-flash-preview</code>. If left blank, it will automatically fall back to the key defined in your root <code>config.json</code> file.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Resume attachment */}
              <Card className="glass-panel shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-white font-bold">
                    <FileText className="w-5 h-5 text-primary" />
                    Resume PDF Attachment
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">Upload your primary PDF resume attached to outgoing emails</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 bg-secondary/30 p-4 border border-border/85 rounded-xl">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                        store.resumeExists
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-650 dark:text-emerald-400 glow-emerald"
                          : "bg-red-500/10 border-red-500/25 text-red-500 dark:text-red-400"
                      }`}
                    >
                      {store.resumeExists ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <AlertTriangle className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {store.resumeExists ? "resume.pdf uploaded" : "No Resume Uploaded"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {store.resumeExists
                          ? "Automatically appended to outreach emails"
                          : "Required for sending cold applications"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border hover:bg-secondary text-slate-600 dark:text-slate-350 shrink-0 font-bold"
                      onClick={() => resumeInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-1.5" />
                      Upload
                    </Button>
                    <input
                      ref={resumeInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleResumeUpload}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Candidate Info profile */}
              <Card className="glass-panel shadow-md lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-white font-bold">
                    <Users className="w-5 h-5 text-primary" />
                    Candidate Context Profile
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">Primary data attributes compiled by AI for cold templates personalization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1">
                      <Label htmlFor="candidateName" className="text-xs font-bold text-slate-500 dark:text-slate-400">Full Name</Label>
                      <Input
                        id="candidateName"
                        placeholder="John Doe"
                        value={store.config?.candidateName || ""}
                        onChange={(e) =>
                          store.config &&
                          store.setConfig({ ...store.config, candidateName: e.target.value })
                        }
                        className="border-border bg-secondary/35 text-slate-850 dark:text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="candidateEmail" className="text-xs font-bold text-slate-500 dark:text-slate-400">Contact Email</Label>
                      <Input
                        id="candidateEmail"
                        type="email"
                        placeholder="john@example.com"
                        value={store.config?.candidateEmail || ""}
                        onChange={(e) =>
                          store.config &&
                          store.setConfig({ ...store.config, candidateEmail: e.target.value })
                        }
                        className="border-border bg-secondary/35 text-slate-855 dark:text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="candidatePhone" className="text-xs font-bold text-slate-500 dark:text-slate-400">Phone number</Label>
                      <Input
                        id="candidatePhone"
                        placeholder="+91 99999 99999"
                        value={store.config?.candidatePhone || ""}
                        onChange={(e) =>
                          store.config &&
                          store.setConfig({ ...store.config, candidatePhone: e.target.value })
                        }
                        className="border-border bg-secondary/35 text-slate-850 dark:text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="candidateCollege" className="text-xs font-bold text-slate-500 dark:text-slate-400">College Name</Label>
                      <Input
                        id="candidateCollege"
                        placeholder="Harvard University"
                        value={store.config?.candidateCollege || ""}
                        onChange={(e) =>
                          store.config &&
                          store.setConfig({ ...store.config, candidateCollege: e.target.value })
                        }
                        className="border-border bg-secondary/35 text-slate-850 dark:text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="candidateDegree" className="text-xs font-bold text-slate-500 dark:text-slate-400">Degree & Year</Label>
                      <Input
                        id="candidateDegree"
                        placeholder="B.Tech CS (4th Year)"
                        value={store.config?.candidateDegree || ""}
                        onChange={(e) =>
                          store.config &&
                          store.setConfig({ ...store.config, candidateDegree: e.target.value })
                        }
                        className="border-border bg-secondary/35 text-slate-850 dark:text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="candidateLinkedin" className="text-xs font-bold text-slate-500 dark:text-slate-400">LinkedIn handle</Label>
                      <Input
                        id="candidateLinkedin"
                        placeholder="linkedin.com/in/username"
                        value={store.config?.candidateLinkedin || ""}
                        onChange={(e) =>
                          store.config &&
                          store.setConfig({ ...store.config, candidateLinkedin: e.target.value })
                        }
                        className="border-border bg-secondary/35 text-slate-850 dark:text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="candidateGithub" className="text-xs font-bold text-slate-500 dark:text-slate-400">GitHub handle</Label>
                      <Input
                        id="candidateGithub"
                        placeholder="github.com/username"
                        value={store.config?.candidateGithub || ""}
                        onChange={(e) =>
                          store.config &&
                          store.setConfig({ ...store.config, candidateGithub: e.target.value })
                        }
                        className="border-border bg-secondary/35 text-slate-850 dark:text-slate-200"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="candidateSkills" className="text-xs font-bold text-slate-500 dark:text-slate-400">Skills list (comma-separated)</Label>
                      <Input
                        id="candidateSkills"
                        placeholder="React, Next.js, Node.js, AI/ML, Postgres"
                        value={
                          store.config?.candidateSkills
                            ? (() => { try { return JSON.parse(store.config.candidateSkills).join(", "); } catch { return store.config.candidateSkills; } })()
                            : ""
                        }
                        onChange={(e) => {
                          const skills = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          if (store.config) {
                            store.setConfig({
                              ...store.config,
                              candidateSkills: JSON.stringify(skills),
                            });
                          }
                        }}
                        className="border-border bg-secondary/35 text-slate-850 dark:text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="candidateHighlights" className="text-xs font-bold text-slate-500 dark:text-slate-400">Achievement highlights (one per line)</Label>
                    <Textarea
                      id="candidateHighlights"
                      placeholder="Highlight 1: Details and statistics...&#10;Highlight 2: Achievements..."
                      rows={4}
                      value={
                        store.config?.candidateHighlights
                          ? (() => { try { return JSON.parse(store.config.candidateHighlights).join("\n"); } catch { return store.config.candidateHighlights; } })()
                          : ""
                      }
                      onChange={(e) => {
                        const highlights = e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        if (store.config) {
                          store.setConfig({
                            ...store.config,
                            candidateHighlights: JSON.stringify(highlights),
                          });
                        }
                      }}
                      className="border-border bg-secondary/35 text-slate-850 dark:text-slate-200"
                    />
                  </div>

                  {/* Custom System Prompt preference */}
                  <div className="space-y-1 pt-2">
                    <Label htmlFor="customInstructions" className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Custom AI Writing Preferences / Instructions
                    </Label>
                    <Textarea
                      id="customInstructions"
                      placeholder="E.g., 'Make the email extremely concise, under 80 words. Focus heavily on full-stack projects. Use a modern, relaxed tone but keep it highly professional. No sycophantic words.'"
                      rows={3}
                      value={store.config?.customInstructions || ""}
                      onChange={(e) =>
                        store.config &&
                        store.setConfig({ ...store.config, customInstructions: e.target.value })
                      }
                      className="border-border bg-secondary/35 focus:border-primary/50 focus:ring-primary/10 text-slate-850 dark:text-slate-200"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      These instructions will be appended to the AI email generator pipeline to dynamically customize cold templates.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Submit button */}
            <div className="flex justify-end pt-2">
              <Button
                className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-5 shadow-lg shadow-primary/20 rounded-xl"
                onClick={handleSaveSettings}
                disabled={settingsSaving}
              >
                {settingsSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving changes...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/80 bg-card/45 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">ColdFlow Engine v0.2.1 · Built for job seeking scaling</p>
          <p className="text-xs text-primary font-bold">
            {totalContacts} Outreach targets · {sentCount} Emailed targets
          </p>
        </div>
      </footer>

      {/* Email Preview Dialog */}
      <Dialog open={store.isPreviewOpen} onOpenChange={(open) => !open && store.closePreview()}>
        <DialogContent className="sm:max-w-3xl max-h-[95vh] overflow-y-auto rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-lg">
              <Mail className="w-5 h-5 text-primary" />
              {store.isGenerating ? "AI Generative Agent drafting..." : "Email Draft Review"}
            </DialogTitle>
            <DialogDescription className="font-semibold text-slate-450 dark:text-slate-400">
              {store.previewContact
                ? `Drafting for ${store.previewContact.name} (${store.previewContact.title}) at ${store.previewContact.company}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Subject</Label>
              <Input
                value={store.previewSubject}
                onChange={(e) => store.setPreviewSubject(e.target.value)}
                disabled={store.isGenerating || store.isSending}
                className="border-border bg-secondary/35 text-slate-800 dark:text-slate-200 focus:border-primary/50 focus:ring-primary/10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Email Body</Label>
              <Textarea
                value={store.previewBody}
                onChange={(e) => store.setPreviewBody(e.target.value)}
                disabled={store.isGenerating || store.isSending}
                rows={10}
                className="border-border bg-secondary/35 text-slate-800 dark:text-slate-200 focus:border-primary/50 focus:ring-primary/10 font-mono text-xs leading-relaxed"
              />
            </div>

            {/* AI Refinement Section */}
            {!store.isGenerating && !store.isSending && (
              <div className="mt-4 p-3.5 bg-primary/5 border border-primary/25 rounded-xl space-y-2">
                <Label className="text-xs font-bold text-primary flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Refine this email with AI feedback
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="E.g., 'Make it shorter', 'Focus on Rannlab experience', 'Add a softer CTA'..."
                    value={aiFeedback}
                    onChange={(e) => setAiFeedback(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRefineEmail()}
                    className="border-border bg-secondary/50 text-slate-850 dark:text-slate-200 focus:border-primary/50 focus:ring-primary/10 h-9 text-xs"
                  />
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white font-bold h-9 text-xs"
                    onClick={handleRefineEmail}
                    disabled={!aiFeedback.trim() || isRefining}
                  >
                    {isRefining ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Regenerate"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={store.closePreview}
              disabled={store.isSending}
              className="border-border hover:bg-secondary text-slate-600 dark:text-slate-300"
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white font-bold px-5"
              onClick={handleSendEmail}
              disabled={store.isGenerating || store.isSending}
            >
              {store.isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Sending email...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1.5" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-lg">
              <UserPlus className="w-5 h-5 text-primary" />
              Add Target Recipient
            </DialogTitle>
            <DialogDescription className="font-semibold text-slate-450 dark:text-slate-400">
              Input the contact details of the HR manager manually
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Full Name *</Label>
              <Input
                placeholder="Jane Smith"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="border-border bg-secondary/35 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Email Address *</Label>
              <Input
                type="email"
                placeholder="jane@company.com"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                className="border-border bg-secondary/35 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Corporate Title</Label>
              <Input
                placeholder="Talent Acquisition Partner"
                value={addForm.title}
                onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                className="border-border bg-secondary/35 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Company Name</Label>
              <Input
                placeholder="Acme Corp"
                value={addForm.company}
                onChange={(e) => setAddForm({ ...addForm, company: e.target.value })}
                className="border-border bg-secondary/35 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="border-border hover:bg-secondary text-slate-600 dark:text-slate-300">
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold" onClick={handleAddContact}>
              <Plus className="w-4 h-4 mr-1" />
              Save Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-lg">
              <Edit className="w-5 h-5 text-primary" />
              Edit HR Contact Details
            </DialogTitle>
            <DialogDescription className="font-semibold text-slate-450 dark:text-slate-400">
              Modify details for this specific outreach campaign target
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Full Name *</Label>
              <Input
                placeholder="Jane Smith"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="border-border bg-secondary/35 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Email Address *</Label>
              <Input
                type="email"
                placeholder="jane@company.com"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="border-border bg-secondary/35 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Corporate Title</Label>
              <Input
                placeholder="HR Manager"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="border-border bg-secondary/35 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Company Name</Label>
              <Input
                placeholder="Acme Corp"
                value={editForm.company}
                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                className="border-border bg-secondary/35 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-border hover:bg-secondary text-slate-600 dark:text-slate-300">
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold" onClick={handleEditContact}>
              <Check className="w-4 h-4 mr-1.5" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
