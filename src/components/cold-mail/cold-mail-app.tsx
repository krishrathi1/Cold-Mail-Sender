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
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

const ROWS_PER_PAGE = 10;

export default function ColdMailApp() {
  const { toast } = useToast();
  const store = useColdMailStore();
  const agentIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [batchSize, setBatchSize] = useState("10");
  const [intervalMinutes, setIntervalMinutes] = useState("5");
  const [addForm, setAddForm] = useState({ name: "", email: "", title: "", company: "" });

  // Initial data loading
  useEffect(() => {
    loadData();
  }, []);

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

  // Stats
  const totalContacts = store.contacts.length;
  const sentCount = store.contacts.filter((c) => c.status === "sent").length;
  const failedCount = store.contacts.filter((c) => c.status === "failed").length;
  const pendingCount = store.contacts.filter((c) => c.status === "pending").length;
  const successRate = totalContacts > 0 ? Math.round((sentCount / totalContacts) * 100) : 0;

  // Preview email
  const handlePreviewEmail = async (contact: HrContact) => {
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

  // Upload CSV
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await api.uploadCsv(file);
      store.addLog(`CSV uploaded: ${result.added} contacts added out of ${result.total} total rows.`, "success");
      await refreshContacts();
      toast({ title: "CSV uploaded", description: `${result.added} contacts added successfully.` });
    } catch (e: any) {
      store.addLog(`CSV upload failed: ${e.message}`, "error");
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

  const refreshContacts = async () => {
    try {
      const contacts = await api.fetchContacts();
      store.setContacts(contacts);
    } catch {}
  };

  // Status badge renderer
  const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      pending: { className: "border-amber-300 text-amber-700 bg-amber-50", icon: <Clock className="w-3 h-3 mr-1" /> },
      generating: { className: "border-blue-300 text-blue-700 bg-blue-50", icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" /> },
      generated: { className: "border-blue-300 text-blue-700 bg-blue-50", icon: <FileText className="w-3 h-3 mr-1" /> },
      sending: { className: "border-blue-300 text-blue-700 bg-blue-50", icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" /> },
      sent: { className: "border-emerald-300 text-emerald-700 bg-emerald-50", icon: <CheckCircle2 className="w-3 h-3 mr-1" /> },
      failed: { className: "border-red-300 text-red-700 bg-red-50", icon: <XCircle className="w-3 h-3 mr-1" /> },
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant="outline" className={config.className}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg shadow-blue-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">ColdFlow</h1>
                <p className="text-[11px] text-blue-100 -mt-0.5">AI-Powered Cold Email Agent</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={`border-white/20 hover:bg-white/20 ${store.isAgentRunning ? "bg-emerald-500/30 text-white" : "bg-white/10 text-white/80"}`}>
                <Bot className="w-3 h-3 mr-1" />
                {store.isAgentRunning ? "Agent Active" : "Agent Idle"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
                onClick={loadData}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={store.activeTab} onValueChange={(v) => store.setActiveTab(v as any)} className="space-y-6">
          <TabsList className="bg-white shadow-sm border border-blue-100 rounded-xl p-1 h-auto">
            <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2 gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="automation" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2 gap-2">
              <Zap className="w-4 h-4" />
              Automation
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2 gap-2">
              <Cog className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* ============ DASHBOARD TAB ============ */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{totalContacts}</p>
                      <p className="text-xs text-gray-500 font-medium">Total Contacts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-700">{sentCount}</p>
                      <p className="text-xs text-gray-500 font-medium">Sent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{failedCount}</p>
                      <p className="text-xs text-gray-500 font-medium">Failed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
                      <p className="text-xs text-gray-500 font-medium">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Send className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-700">{successRate}%</p>
                      <p className="text-xs text-gray-500 font-medium">Success Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bar */}
            {totalContacts > 0 && (
              <Card className="border-blue-100 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">Campaign Progress</p>
                    <p className="text-sm text-gray-500">{sentCount} of {totalContacts} emails sent</p>
                  </div>
                  <Progress value={(sentCount / totalContacts) * 100} className="h-2" />
                </CardContent>
              </Card>
            )}

            {/* Contacts Table */}
            <Card className="border-blue-100 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      HR Contacts
                    </CardTitle>
                    <CardDescription>Manage and send personalized cold emails</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => setAddDialogOpen(true)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add Contact
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => csvInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Import CSV
                    </Button>
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCsvUpload}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name, company, title or email..."
                      value={store.searchQuery}
                      onChange={(e) => store.setSearchQuery(e.target.value)}
                      className="pl-10 border-blue-100 focus:border-blue-300"
                    />
                  </div>
                  <Select value={store.statusFilter} onValueChange={store.setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44 border-blue-100">
                      <Filter className="w-4 h-4 mr-2 text-gray-400" />
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Contacts</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Table */}
                <div className="rounded-lg border border-blue-100 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-50/50 hover:bg-blue-50/50">
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Company</TableHead>
                        <TableHead className="hidden lg:table-cell">Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {store.isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                            <p className="text-sm text-gray-500 mt-2">Loading contacts...</p>
                          </TableCell>
                        </TableRow>
                      ) : paginatedContacts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <Users className="w-10 h-10 mx-auto text-gray-300" />
                            <p className="text-sm text-gray-500 mt-2">
                              {store.searchQuery || store.statusFilter !== "all"
                                ? "No contacts match your filters."
                                : "No contacts yet. Add contacts or import a CSV to get started."}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedContacts.map((contact, index) => (
                          <TableRow key={contact.id} className="hover:bg-blue-50/30 transition-colors">
                            <TableCell className="text-gray-400 text-sm font-mono">
                              {(safeCurrentPage - 1) * ROWS_PER_PAGE + index + 1}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-gray-900">{contact.name}</p>
                                <p className="text-xs text-gray-500">{contact.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-gray-600">{contact.company}</TableCell>
                            <TableCell className="hidden lg:table-cell text-gray-600">{contact.title}</TableCell>
                            <TableCell>
                              <StatusBadge status={contact.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {contact.status === "pending" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                    onClick={() => handlePreviewEmail(contact)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    <span className="hidden sm:inline">Preview</span>
                                  </Button>
                                )}
                                {(contact.status === "sent" || contact.status === "failed") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                    onClick={() => handleResetStatus(contact)}
                                  >
                                    <RotateCcw className="w-4 h-4 mr-1" />
                                    <span className="hidden sm:inline">Reset</span>
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {contact.status !== "pending" && (
                                      <DropdownMenuItem onClick={() => handleResetStatus(contact)}>
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Reset Status
                                      </DropdownMenuItem>
                                    )}
                                    {contact.status === "pending" && (
                                      <DropdownMenuItem onClick={() => handlePreviewEmail(contact)}>
                                        <Eye className="w-4 h-4 mr-2" />
                                        Generate & Preview
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-700"
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

                {/* Pagination */}
                {filteredContacts.length > ROWS_PER_PAGE && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">
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
                        className="border-blue-100"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-gray-500 px-2">
                        {safeCurrentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() => store.setCurrentPage(safeCurrentPage + 1)}
                        className="border-blue-100"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ AUTOMATION TAB ============ */}
          <TabsContent value="automation" className="space-y-6">
            {/* Automation Controls */}
            <Card className="border-blue-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  Agent Automation Control
                </CardTitle>
                <CardDescription>Configure and run automated email campaigns in the background</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Size</Label>
                    <Select value={batchSize} onValueChange={setBatchSize}>
                      <SelectTrigger className="w-36 border-blue-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 emails</SelectItem>
                        <SelectItem value="10">10 emails</SelectItem>
                        <SelectItem value="20">20 emails</SelectItem>
                        <SelectItem value="50">50 emails</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Run Interval</Label>
                    <Select value={intervalMinutes} onValueChange={setIntervalMinutes}>
                      <SelectTrigger className="w-36 border-blue-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 minute</SelectItem>
                        <SelectItem value="3">3 minutes</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    {!store.isAgentRunning ? (
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        onClick={startAgent}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Automation
                      </Button>
                    ) : (
                      <Button
                        className="bg-red-500 hover:bg-red-600 text-white shadow-sm"
                        onClick={stopAgent}
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Pause Automation
                      </Button>
                    )}
                  </div>
                </div>

                {/* Agent Status */}
                {store.isAgentRunning && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Agent is running</p>
                      <p className="text-xs text-blue-600">
                        Processing {batchSize} contacts every {intervalMinutes} minute(s)
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Console Logs */}
            <Card className="border-blue-100 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-blue-600" />
                    Agent Console
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={store.clearLogs}
                  >
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="terminal-log bg-gray-900 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="ml-3 text-xs text-gray-400 font-mono">agent_console.log</span>
                  </div>
                  <ScrollArea className="h-64">
                    <div className="p-4 font-mono text-xs leading-relaxed">
                      {store.logs.map((log) => (
                        <div
                          key={log.id}
                          className={`mb-1 ${
                            log.type === "system"
                              ? "text-blue-400"
                              : log.type === "success"
                              ? "text-emerald-400"
                              : log.type === "error"
                              ? "text-red-400"
                              : log.type === "warning"
                              ? "text-yellow-400"
                              : "text-gray-400"
                          }`}
                        >
                          <span className="text-gray-600">[{log.timestamp}]</span> {log.message}
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
              {/* Email Credentials */}
              <Card className="border-blue-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    Email Credentials
                  </CardTitle>
                  <CardDescription>Gmail SMTP settings for sending emails</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailUser">Gmail Address</Label>
                    <Input
                      id="emailUser"
                      type="email"
                      placeholder="name@gmail.com"
                      value={store.config?.emailUser || ""}
                      onChange={(e) =>
                        store.config &&
                        store.setConfig({ ...store.config, emailUser: e.target.value })
                      }
                      className="border-blue-100 focus:border-blue-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailPass">Gmail App Password</Label>
                    <Input
                      id="emailPass"
                      type="password"
                      placeholder="16-character app password"
                      value={store.config?.emailPass || ""}
                      onChange={(e) =>
                        store.config &&
                        store.setConfig({ ...store.config, emailPass: e.target.value })
                      }
                      className="border-blue-100 focus:border-blue-300"
                    />
                    <p className="text-xs text-gray-500">
                      Create this in Google Account → Security → 2-Step Verification → App passwords
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Resume Upload */}
              <Card className="border-blue-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Resume Attachment
                  </CardTitle>
                  <CardDescription>Upload your resume to attach to outgoing emails</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        store.resumeExists
                          ? "bg-emerald-50 border border-emerald-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      {store.resumeExists ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {store.resumeExists ? "Resume Attached" : "No Resume Uploaded"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {store.resumeExists
                          ? "resume.pdf will be attached to all outgoing emails"
                          : "Upload a PDF to attach to your cold emails"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 shrink-0"
                      onClick={() => resumeInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-1" />
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

              {/* Candidate Profile */}
              <Card className="border-blue-100 shadow-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Candidate Profile
                  </CardTitle>
                  <CardDescription>Your profile details used to personalize cold emails</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="candidateName">Full Name</Label>
                      <Input
                        id="candidateName"
                        placeholder="John Doe"
                        value={store.config?.candidateName || ""}
                        onChange={(e) =>
                          store.config &&
                          store.setConfig({ ...store.config, candidateName: e.target.value })
                        }
                        className="border-blue-100 focus:border-blue-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="candidateEmail">Email</Label>
                      <Input
                        id="candidateEmail"
                        type="email"
                        placeholder="john@example.com"
                        value={store.config?.candidateEmail || ""}
                        onChange={(e) =>
                          store.config &&
                          store.setConfig({ ...store.config, candidateEmail: e.target.value })
                        }
                        className="border-blue-100 focus:border-blue-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="candidatePhone">Phone Number</Label>
                      <Input
                        id="candidatePhone"
                        placeholder="+1 (555) 000-0000"
                        value={store.config?.candidatePhone || ""}
                        onChange={(e) =>
                          store.config &&
                          store.setConfig({ ...store.config, candidatePhone: e.target.value })
                        }
                        className="border-blue-100 focus:border-blue-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="candidateCollege">College / University</Label>
                      <Input
                        id="candidateCollege"
                        placeholder="MIT"
                        value={store.config?.candidateCollege || ""}
                        onChange={(e) =>
                          store.config &&
                          store.setConfig({ ...store.config, candidateCollege: e.target.value })
                        }
                        className="border-blue-100 focus:border-blue-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="candidateDegree">Degree / Year</Label>
                      <Input
                        id="candidateDegree"
                        placeholder="B.Tech CS (4th Year)"
                        value={store.config?.candidateDegree || ""}
                        onChange={(e) =>
                          store.config &&
                          store.setConfig({ ...store.config, candidateDegree: e.target.value })
                        }
                        className="border-blue-100 focus:border-blue-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="candidateLinkedin">LinkedIn URL</Label>
                      <Input
                        id="candidateLinkedin"
                        placeholder="linkedin.com/in/username"
                        value={store.config?.candidateLinkedin || ""}
                        onChange={(e) =>
                          store.config &&
                          store.setConfig({ ...store.config, candidateLinkedin: e.target.value })
                        }
                        className="border-blue-100 focus:border-blue-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="candidateGithub">GitHub URL</Label>
                      <Input
                        id="candidateGithub"
                        placeholder="github.com/username"
                        value={store.config?.candidateGithub || ""}
                        onChange={(e) =>
                          store.config &&
                          store.setConfig({ ...store.config, candidateGithub: e.target.value })
                        }
                        className="border-blue-100 focus:border-blue-300"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="candidateSkills">Skills (comma-separated)</Label>
                      <Input
                        id="candidateSkills"
                        placeholder="React, Node.js, Python, AWS"
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
                        className="border-blue-100 focus:border-blue-300"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                      <Label htmlFor="candidateHighlights">Key Highlights (one per line)</Label>
                      <Textarea
                        id="candidateHighlights"
                        placeholder="List your key achievements, one per line..."
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
                        className="border-blue-100 focus:border-blue-300"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-8"
                onClick={handleSaveSettings}
                disabled={settingsSaving}
              >
                {settingsSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Save All Settings
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-blue-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">ColdFlow — AI-Powered Cold Email Agent</p>
          <div className="flex items-center gap-4">
            <p className="text-xs text-gray-400">
              {totalContacts} contacts · {sentCount} sent
            </p>
          </div>
        </div>
      </footer>

      {/* Email Preview Dialog */}
      <Dialog open={store.isPreviewOpen} onOpenChange={(open) => !open && store.closePreview()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              {store.isGenerating ? "Generating Email Draft..." : "Email Draft Preview"}
            </DialogTitle>
            <DialogDescription>
              {store.previewContact
                ? `For ${store.previewContact.name} at ${store.previewContact.company}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={store.previewSubject}
                onChange={(e) => store.setPreviewSubject(e.target.value)}
                disabled={store.isGenerating || store.isSending}
                className="border-blue-100 focus:border-blue-300"
              />
            </div>
            <div className="space-y-2">
              <Label>Email Body</Label>
              <Textarea
                value={store.previewBody}
                onChange={(e) => store.setPreviewBody(e.target.value)}
                disabled={store.isGenerating || store.isSending}
                rows={12}
                className="border-blue-100 focus:border-blue-300 font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={store.closePreview}
              disabled={store.isSending}
              className="border-blue-200"
            >
              Close
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSendEmail}
              disabled={store.isGenerating || store.isSending}
            >
              {store.isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Add HR Contact
            </DialogTitle>
            <DialogDescription>Add a new HR contact to your outreach list</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="Jane Smith"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="border-blue-100 focus:border-blue-300"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="jane@company.com"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                className="border-blue-100 focus:border-blue-300"
              />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="HR Manager"
                value={addForm.title}
                onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                className="border-blue-100 focus:border-blue-300"
              />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                placeholder="Acme Corp"
                value={addForm.company}
                onChange={(e) => setAddForm({ ...addForm, company: e.target.value })}
                className="border-blue-100 focus:border-blue-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="border-blue-200">
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddContact}>
              <Plus className="w-4 h-4 mr-1" />
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
