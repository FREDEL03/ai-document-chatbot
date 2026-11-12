export type Message = {
  id: number;
  text: string;
  sender: "user" | "ai";
  timestamp?: string;
  cached?: boolean;
  sources?: { d: string; p: number | null }[]; // document id + page the answer drew from
};

export type UploadedDoc = {
  id: string;
  name: string;
  url?: string | null;
  size?: number;
};

export type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
  documents: UploadedDoc[];
};

export const MAX_DOCS = 5;
