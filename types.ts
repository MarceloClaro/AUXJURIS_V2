import type { Content } from '@google/genai';

export enum MessageSender {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: Date;
  sources?: { uri: string; title: string }[];
}

export interface SwotAnalysis {
  forças?: string;
  fraquezas?: string;
  oportunidades?: string;
  ameaças?: string;
  [key: string]: string | undefined; // To allow dynamic assignment
}

export interface UploadedDocument {
  id: string;
  name: string;
  text: string;
  file: File;
  summary?: string;
  insights?: string;
  swot?: SwotAnalysis;
  processingAnalysis?: boolean;
  analysisError?: string | null;
}

export interface PredefinedBook {
  id: string;
  name: string;
  description: string;
  folderName: string;
  fileName: string; // e.g., 'content.txt' or 'structured_data.json'
}

export interface RagDataItem {
  documentName: string; // For user docs, it's file.name. For books, it's book.name.
  content: string;
  sourceType: 'user_document' | 'internal_book';
  bookId?: string; // id of the PredefinedBook if sourceType is 'internal_book'
  summary?: string; // Only applicable for user_document now
  insights?: string; // Only applicable for user_document now
  swot?: SwotAnalysis; // Only applicable for user_document now
}

export type RagData = RagDataItem[];

export type ComparisonSource = 'uploadedDoc' | 'lastAiResponse' | null;

export type GeminiHistoryPart = Content; // Content is { role: string, parts: Part[] }

export interface LegalAgent {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
}

// Type for the structured content of cf88_structured.json
export interface CF88Chunk {
  tipo: string;
  numero_romano?: string;
  numero?: string;
  caput?: string;
  texto?: string; // For sections or general text not in caput
  pagina: number;
  filhos?: CF88Chunk[];
  incisos?: CF88Chunk[]; // Assuming incisos can also have text
  paragrafos?: CF88Chunk[]; // Assuming paragrafos can also have text
  // Add other potential fields if necessary
}
