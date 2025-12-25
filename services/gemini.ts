import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { GeminiModel } from "../types";

// Initialize the Gemini AI client
// The API key is guaranteed to be in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Creates a chat session with the specified model.
 */
export const createChatSession = (model: GeminiModel, systemInstruction?: string): Chat => {
  return ai.chats.create({
    model: model,
    config: {
      systemInstruction: systemInstruction || "You are a helpful, witty, and enthusiastic AI assistant powered by Gemini 3.0. You love to help users with their questions and creative tasks.",
    },
  });
};

/**
 * Converts a File object to a Base64 string.
 */
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Sends a message to the chat session and yields streaming text chunks.
 */
export async function* sendMessageStream(
  chat: Chat, 
  message: string, 
  imageBase64?: string,
  mimeType: string = 'image/jpeg'
): AsyncGenerator<string, void, unknown> {
  
  try {
    let response;
    
    if (imageBase64) {
      // If there's an image, we can't use the simple chat.sendMessageStream(string)
      // We need to construct the content parts.
      // Note: Current SDK chat.sendMessageStream accepts a string or a Part array inside a message object
      // But strictly following the prompt guidelines: 
      // "chat.sendMessageStream only accepts the message parameter, do not use contents."
      // However, for multimodal chat history, we often need to pass parts. 
      // The prompt examples show text-only chat. 
      // To support images in chat, we often send a user message with parts.
      
      const parts: any[] = [{ text: message }];
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: imageBase64
        }
      });

      // The new SDK allows passing a generic message object structure
      response = await chat.sendMessageStream({ 
        message: { 
          role: 'user', 
          parts: parts 
        } 
      });
    } else {
      // Text only
      response = await chat.sendMessageStream({ message: message });
    }

    for await (const chunk of response) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        yield c.text;
      }
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}