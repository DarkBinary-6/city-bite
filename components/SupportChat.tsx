
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: number;
}

export const SupportChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: "Hi there! 👋 I'm CityBot. How can I help you today?", sender: 'bot', timestamp: Date.now() }
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user', timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // Mock Bot Response
        setTimeout(() => {
            let replyText = "I'm not sure about that. Please contact support@citybite.com for urgent issues.";
            const lowerInput = userMsg.text.toLowerCase();

            if (lowerInput.includes('refund') || lowerInput.includes('money')) {
                replyText = "Refunds are processed within 24-48 hours for cancelled orders. Check your 'Orders' page for status.";
            } else if (lowerInput.includes('late') || lowerInput.includes('where')) {
                replyText = "I apologize for the delay. You can track your rider's live location on the Order Tracking page.";
            } else if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
                replyText = "Hello! Ready to order something delicious?";
            } else if (lowerInput.includes('coupon') || lowerInput.includes('offer')) {
                replyText = "Check the home page banners for the latest exciting offers!";
            }

            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: replyText, sender: 'bot', timestamp: Date.now() }]);
        }, 1000);
    };

    return (
        <>
            {/* Floating Button */}
            <button 
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 z-50 bg-black text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 ${isOpen ? 'hidden' : 'flex'}`}
            >
                <MessageSquare size={24} />
            </button>

            {/* Chat Window */}
            <div className={`fixed bottom-6 right-6 z-50 w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100 h-[500px]' : 'scale-0 opacity-0 h-0 w-0'}`}>
                {/* Header */}
                <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold">CityBot Support</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                <span className="text-xs opacity-90">Online</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20}/></button>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${msg.sender === 'user' ? 'bg-brand-500 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                    <input 
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-black"
                        placeholder="Type your query..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button type="submit" disabled={!input.trim()} className="bg-black text-white p-2 rounded-full hover:bg-gray-800 disabled:opacity-50">
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </>
    );
};
