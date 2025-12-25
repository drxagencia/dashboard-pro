import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chat } from "@google/genai";
import { GeminiModel, Message, Role } from './types';
import { createChatSession, sendMessageStream, fileToGenerativePart } from './services/gemini';
import { 
  SendIcon, 
  PhotoIcon, 
  SparklesIcon, 
  XMarkIcon, 
  TrashIcon,
  FlashIcon,
  BrainIcon
} from './components/Icons';

export default function App() {
  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: Role.MODEL,
      text: "Hi there! I'm your Gemini 3.0 powered assistant. I can see images and chat about almost anything. How can I help you today?",
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>(GeminiModel.FLASH);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Refs
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Chat
  useEffect(() => {
    startNewChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel]);

  const startNewChat = useCallback(() => {
    chatSessionRef.current = createChatSession(selectedModel);
    // Keep the welcome message if it's the only one, otherwise reset
    // But for a true "reset", let's clear everything except a fresh welcome.
    // However, if we are just switching models, maybe we want to keep history?
    // For simplicity in this demo, switching models resets the session context 
    // effectively because the new object is created, but we keep UI messages for reference 
    // unless the user explicitly hits "Clear".
    // For this implementation: Model switch = new session logic, but visual history persists until cleared.
  }, [selectedModel]);

  const handleClearChat = () => {
    setMessages([
      {
        id: crypto.randomUUID(),
        role: Role.MODEL,
        text: "Clean slate! Ready when you are.",
        timestamp: Date.now()
      }
    ]);
    chatSessionRef.current = createChatSession(selectedModel);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Image Handling
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      setSelectedImage(file);
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Sending Messages
  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !selectedImage) || isLoading) return;

    const userMessageId = crypto.randomUUID();
    const currentText = inputValue;
    const currentImage = selectedImage;
    const currentPreview = imagePreview; // Store purely for UI
    
    // Convert image to base64 if exists
    let imageBase64: string | undefined;
    if (currentImage) {
      try {
        imageBase64 = await fileToGenerativePart(currentImage);
      } catch (error) {
        console.error("Failed to process image", error);
        return;
      }
    }

    // Add User Message to UI
    const newUserMessage: Message = {
      id: userMessageId,
      role: Role.USER,
      text: currentText,
      image: currentPreview || undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    clearImage();
    setIsLoading(true);

    // Prepare Model Message Placeholder
    const modelMessageId = crypto.randomUUID();
    setMessages(prev => [
      ...prev,
      {
        id: modelMessageId,
        role: Role.MODEL,
        text: '', // Empty initially, will stream in
        timestamp: Date.now()
      }
    ]);

    try {
      if (!chatSessionRef.current) {
        startNewChat();
      }

      // We force non-null assertion because startNewChat ensures it exists, 
      // but to be safe for TS:
      const chat = chatSessionRef.current!;

      const stream = sendMessageStream(
        chat, 
        currentText || (currentImage ? "What is in this image?" : "Hello"), // Fallback text if only image sent
        imageBase64,
        currentImage?.type
      );

      let fullResponse = "";

      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => 
          prev.map(msg => 
            msg.id === modelMessageId 
              ? { ...msg, text: fullResponse } 
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Chat Error", error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === modelMessageId 
            ? { ...msg, text: "Sorry, something went wrong. Please check your connection or API key.", isError: true } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 overflow-hidden">
      {/* Header */}
      <header className="flex-none p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Gemini 3.0 Omni-Chat</h1>
              <p className="text-xs text-slate-400 font-medium">Powered by Google DeepMind</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
             <div className="bg-slate-800 p-1 rounded-lg flex space-x-1 border border-slate-700">
               <button
                 onClick={() => setSelectedModel(GeminiModel.FLASH)}
                 className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                   selectedModel === GeminiModel.FLASH 
                     ? 'bg-slate-700 text-white shadow-sm' 
                     : 'text-slate-400 hover:text-slate-200'
                 }`}
               >
                 <FlashIcon className="w-4 h-4" />
                 <span>Flash</span>
               </button>
               <button
                 onClick={() => setSelectedModel(GeminiModel.PRO)}
                 className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                   selectedModel === GeminiModel.PRO 
                     ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20' 
                     : 'text-slate-400 hover:text-slate-200'
                 }`}
               >
                 <BrainIcon className="w-4 h-4" />
                 <span>Pro</span>
               </button>
             </div>
             
             <button 
               onClick={handleClearChat}
               className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
               title="Clear Chat"
             >
               <TrashIcon className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="max-w-3xl mx-auto flex flex-col space-y-6 pb-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex w-full ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`flex max-w-[85%] sm:max-w-[75%] ${
                  msg.role === Role.USER ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                } items-start space-x-3`}
              >
                {/* Avatar */}
                <div className={`flex-none w-8 h-8 rounded-full flex items-center justify-center mt-1 shadow-md ${
                  msg.role === Role.USER 
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-500' 
                    : 'bg-gradient-to-br from-emerald-500 to-teal-500'
                }`}>
                  {msg.role === Role.USER ? (
                    <span className="text-xs font-bold text-white">U</span>
                  ) : (
                    <SparklesIcon className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`flex flex-col space-y-2 ${msg.role === Role.USER ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`rounded-2xl px-5 py-3 shadow-lg ${
                      msg.role === Role.USER 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                    } ${msg.isError ? 'border-red-500/50 bg-red-900/20 text-red-200' : ''}`}
                  >
                    {msg.image && (
                      <div className="mb-3 rounded-lg overflow-hidden border border-white/10">
                         <img src={msg.image} alt="User upload" className="max-w-full max-h-64 object-cover" />
                      </div>
                    )}
                    <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
                      {msg.text || (isLoading && msg.role === Role.MODEL && <span className="animate-pulse">Thinking...</span>)}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="flex-none p-4 bg-slate-900 border-t border-slate-800">
        <div className="max-w-3xl mx-auto">
          {imagePreview && (
            <div className="mb-3 flex items-start">
              <div className="relative group">
                 <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded-lg border border-slate-600 shadow-md" />
                 <button 
                   onClick={clearImage}
                   className="absolute -top-2 -right-2 bg-slate-800 rounded-full p-1 text-slate-400 hover:text-white border border-slate-600 shadow-sm"
                 >
                   <XMarkIcon className="w-4 h-4" />
                 </button>
              </div>
            </div>
          )}
          
          <div className="relative flex items-end space-x-2 bg-slate-800/50 p-2 rounded-xl border border-slate-700 shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all">
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-indigo-400 hover:bg-slate-700/50 rounded-lg transition-colors flex-none"
              title="Upload Image"
            >
              <PhotoIcon className="w-6 h-6" />
            </button>

            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 border-none focus:ring-0 resize-none py-3 max-h-32 min-h-[48px]"
              rows={1}
              style={{ height: 'auto', minHeight: '44px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
              }}
            />

            <button 
              onClick={handleSendMessage}
              disabled={isLoading || (!inputValue.trim() && !selectedImage)}
              className={`p-3 rounded-lg flex-none transition-all duration-200 ${
                isLoading || (!inputValue.trim() && !selectedImage)
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo