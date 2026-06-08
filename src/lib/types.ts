export interface HrContact {
  id: string;
  name: string;
  email: string;
  title: string;
  company: string;
  status: "pending" | "generating" | "generated" | "sending" | "sent" | "failed";
  subject?: string | null;
  body?: string | null;
  sentAt?: string | null;
  error?: string | null;
  messageId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppConfig {
  id: string;
  emailUser: string;
  emailPass: string;
  geminiApiKey: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateLinkedin: string;
  candidateGithub: string;
  candidateCollege: string;
  candidateDegree: string;
  candidateSkills: string;
  candidateHighlights: string;
  updatedAt: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: "system" | "success" | "error" | "warning" | "info";
}

export type TabType = "dashboard" | "automation" | "settings";
