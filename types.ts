export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  image?: string; // Base64 string
  timestamp: number;
  isError?: boolean;
}

export enum GeminiModel {
  FLASH = 'gemini-3-flash-preview',
  PRO = 'gemini-3-pro-preview',
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  model: GeminiModel;
}