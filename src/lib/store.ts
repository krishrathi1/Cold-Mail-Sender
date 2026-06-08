import { create } from "zustand";
import type { HrContact, AppConfig, LogEntry, TabType } from "./types";

interface ColdMailState {
  // Data
  contacts: HrContact[];
  config: AppConfig | null;
  resumeExists: boolean;
  
  // UI State
  activeTab: TabType;
  isLoading: boolean;
  isAgentRunning: boolean;
  logs: LogEntry[];
  
  // Email preview
  previewContact: HrContact | null;
  previewSubject: string;
  previewBody: string;
  isPreviewOpen: boolean;
  isGenerating: boolean;
  isSending: boolean;
  
  // Search & filter
  searchQuery: string;
  statusFilter: string;
  currentPage: number;
  
  // Actions
  setContacts: (contacts: HrContact[]) => void;
  setConfig: (config: AppConfig) => void;
  setResumeExists: (exists: boolean) => void;
  setActiveTab: (tab: TabType) => void;
  setIsLoading: (loading: boolean) => void;
  setIsAgentRunning: (running: boolean) => void;
  addLog: (message: string, type: LogEntry["type"]) => void;
  clearLogs: () => void;
  openPreview: (contact: HrContact, subject: string, body: string) => void;
  closePreview: () => void;
  setPreviewSubject: (subject: string) => void;
  setPreviewBody: (body: string) => void;
  setIsGenerating: (generating: boolean) => void;
  setIsSending: (sending: boolean) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: string) => void;
  setCurrentPage: (page: number) => void;
}

export const useColdMailStore = create<ColdMailState>((set) => ({
  contacts: [],
  config: null,
  resumeExists: false,
  activeTab: "dashboard",
  isLoading: false,
  isAgentRunning: false,
  logs: [
    {
      id: "init",
      timestamp: new Date().toLocaleTimeString(),
      message: "System initialized. Ready to process HR contacts.",
      type: "system",
    },
  ],
  previewContact: null,
  previewSubject: "",
  previewBody: "",
  isPreviewOpen: false,
  isGenerating: false,
  isSending: false,
  searchQuery: "",
  statusFilter: "all",
  currentPage: 1,

  setContacts: (contacts) => set({ contacts }),
  setConfig: (config) => set({ config }),
  setResumeExists: (exists) => set({ resumeExists: exists }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsAgentRunning: (isAgentRunning) => set({ isAgentRunning }),
  addLog: (message, type) =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toLocaleTimeString(),
          message,
          type,
        },
      ],
    })),
  clearLogs: () =>
    set({
      logs: [
        {
          id: "clear",
          timestamp: new Date().toLocaleTimeString(),
          message: "Console logs cleared.",
          type: "system" as const,
        },
      ],
    }),
  openPreview: (contact, subject, body) =>
    set({
      previewContact: contact,
      previewSubject: subject,
      previewBody: body,
      isPreviewOpen: true,
    }),
  closePreview: () =>
    set({
      previewContact: null,
      previewSubject: "",
      previewBody: "",
      isPreviewOpen: false,
      isGenerating: false,
      isSending: false,
    }),
  setPreviewSubject: (previewSubject) => set({ previewSubject }),
  setPreviewBody: (previewBody) => set({ previewBody }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setIsSending: (isSending) => set({ isSending }),
  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, currentPage: 1 }),
  setCurrentPage: (currentPage) => set({ currentPage }),
}));
