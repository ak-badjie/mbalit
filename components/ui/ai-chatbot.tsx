'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageCircle,
    Send,
    X,
    Loader2,
    Sparkles,
    Leaf,
    Recycle,
    Bot,
    User,
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const SYSTEM_PROMPT = `You are MBALit AI, a friendly and knowledgeable assistant for the MBALit waste management and recycling app in The Gambia. Your role is to:

1. Help users understand best recycling practices
2. Explain how to properly sort and dispose of different waste types
3. Provide tips on reducing waste and living more sustainably
4. Answer questions about The Gambia's waste management
5. Guide users on how to use the MBALit app for waste pickup scheduling

Be concise, friendly, and encouraging. Use emojis occasionally to make responses engaging. Focus on practical, actionable advice. Keep responses short (2-3 sentences) unless the user asks for detailed information.

Available waste types in MBALit:
- Household waste (general garbage)
- Organic waste (food scraps, garden waste)
- Recyclables (plastic, paper, glass, metal)
- Electronic waste (phones, computers, appliances)
- Construction waste (debris, concrete, wood)
- Hazardous waste (batteries, chemicals, paint)`;

export const AIChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize with welcome message
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: "Hi there! 👋 I'm MBALit AI, your recycling and waste management assistant. Ask me anything about recycling best practices, waste disposal, or how to use MBALit!",
                timestamp: new Date(),
            }]);
        }
    }, [messages.length]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Use Gemini API key (falls back to Google Maps key for backwards compatibility)
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
                throw new Error('Gemini API key not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local');
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            // Build conversation history
            const history = messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }],
            }));

            const chat = model.startChat({
                history: [
                    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
                    { role: 'model', parts: [{ text: 'I understand. I am MBALit AI, ready to help with recycling and waste management questions!' }] },
                    ...history,
                ],
            });

            const result = await chat.sendMessage(userMessage.content);
            const response = await result.response;
            const text = response.text();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: text,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Sorry, I'm having trouble connecting right now. Please try again in a moment! 🔄",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Quick suggestions
    const suggestions = [
        "How do I recycle plastic?",
        "What goes in organic waste?",
        "Tips for reducing waste",
    ];

    return (
        <>
            {/* Chat Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg flex items-center justify-center text-white ${isOpen ? 'hidden' : ''}`}
            >
                <MessageCircle className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                </span>
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-md h-[500px] bg-white  rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 "
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <Recycle className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">MBALit AI</h3>
                                    <p className="text-xs text-white/80">Recycling Assistant</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((message) => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {message.role === 'assistant' && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                                            <Bot className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[80%] px-4 py-2 rounded-2xl ${message.role === 'user'
                                            ? 'bg-emerald-500 text-white rounded-br-md'
                                            : 'bg-gray-100  text-gray-900  rounded-bl-md'
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                    {message.role === 'user' && (
                                        <div className="w-8 h-8 rounded-full bg-gray-200  flex items-center justify-center flex-shrink-0">
                                            <User className="w-4 h-4 text-gray-600 " />
                                        </div>
                                    )}
                                </motion.div>
                            ))}

                            {isLoading && (
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="bg-gray-100  px-4 py-3 rounded-2xl rounded-bl-md">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Suggestions */}
                        {messages.length <= 1 && (
                            <div className="px-4 pb-2">
                                <p className="text-xs text-gray-500 mb-2">Try asking:</p>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => {
                                                setInput(suggestion);
                                                setTimeout(() => sendMessage(), 100);
                                            }}
                                            className="px-3 py-1.5 text-xs bg-gray-100  text-gray-700  rounded-full hover:bg-gray-200  transition-colors"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-4 border-t border-gray-200 ">
                            <div className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask about recycling..."
                                    className="flex-1 px-4 py-2 bg-gray-100  rounded-full text-gray-900  placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!input.trim() || isLoading}
                                    className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5 text-white" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AIChatbot;
