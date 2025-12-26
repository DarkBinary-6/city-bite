
import React, { useState, useEffect, useRef } from 'react';
import { Send, X, User, Bike } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatInterfaceProps {
    role: 'customer' | 'rider';
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    onClose: () => void;
    title: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ role, messages, onSendMessage, onClose, title }) => {
    const [inputText, setInputText] = useState('');
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;
        onSendMessage(inputText);
        setInputText('');
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="bg-white w-full sm:max-w-md h-[80vh] sm:h-[600px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="bg-brand-600 p-4 text-white flex justify-between items-center shadow-md shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full">
                            {role === 'customer' ? <Bike size={20} /> : <User size={20} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{title}</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                <span className="text-xs opacity-90">Online</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-400 mt-10">
                            <p className="text-sm">Start chatting with {title}...</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMe = msg.sender === role;
                            return (
                                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div 
                                        className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                                            isMe 
                                            ? 'bg-brand-500 text-white rounded-tr-none' 
                                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                        }`}
                                    >
                                        <p>{msg.text}</p>
                                        <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-brand-100' : 'text-gray-400'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={endRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0">
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a message..." 
                        className="flex-1 bg-white text-black border border-gray-200 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button 
                        type="submit" 
                        disabled={!inputText.trim()}
                        className="bg-brand-600 text-white p-3 rounded-full hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-brand-600/20"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};
