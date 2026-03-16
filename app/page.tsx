'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Menu, Plus, Wand2, ArrowUp, ChevronDown, X, Settings, HelpCircle, LogIn, Image as ImageIcon, Video, FileText, Paperclip, ArrowLeft, BookOpen, Search, Trash2, Globe, ThumbsUp, Copy, Check, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenAI } from '@google/genai';
import Link from 'next/link';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useLanguage } from './contexts/LanguageContext';
import { addTask } from './lib/imageQueue';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

type Attachment = {
  file: File;
  base64: string;
  mimeType: string;
  name: string;
  size: string;
  previewUrl?: string;
};

type Source = {
  title: string;
  uri: string;
};

type Message = {
  role: 'user' | 'model';
  text: string;
  attachments?: Attachment[];
  sources?: Source[];
  imageResults?: string[];
};

type Chat = {
  id: string;
  messages?: Message[];
  title?: string;
  updatedAt?: any;
};

const ZhiyouLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="z-grad" x1="5" y1="7" x2="27" y2="25" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4ade80" />
        <stop offset="1" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <path 
      d="M 11 7 L 27 7 L 23 13 L 21 13 L 17 19 L 25 19 L 21 25 L 5 25 L 9 19 L 11 19 L 15 13 L 7 13 Z" 
      fill="url(#z-grad)" 
      stroke="url(#z-grad)" 
      strokeWidth="1.5" 
      strokeLinejoin="round" 
    />
  </svg>
);

export default function ZhiyouApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isFeatureMenuOpen, setIsFeatureMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [featureMode, setFeatureMode] = useState<'chat' | 'image' | 'research' | 'learning' | 'imageSearch'>('chat');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [showSourcesFor, setShowSourcesFor] = useState<Source[] | null>(null);
  const [showImagesFor, setShowImagesFor] = useState<string[] | null>(null);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [likedMessageIndex, setLikedMessageIndex] = useState<number | null>(null);
  const [sharedMessageIndex, setSharedMessageIndex] = useState<number | null>(null);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const { t, language } = useLanguage();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const featureMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const thinkingTexts = ["thinking...", "processing...", "analyzing..."];
  const searchingTexts = ["searching...", "browsing the web...", "finding sources..."];

  useEffect(() => {
    if (isThinking) {
      const interval = setInterval(() => {
        setLoadingTextIndex(prev => (prev + 1) % 3);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isThinking]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageIndex(index);
    setTimeout(() => setCopiedMessageIndex(null), 2000);
  };

  const handleLike = (index: number) => {
    setLikedMessageIndex(index);
    setTimeout(() => setLikedMessageIndex(null), 2000);
  };

  const handleShare = async (text: string, index: number) => {
    setSharedMessageIndex(index);
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Zhiyou AI Response',
          text: text,
        });
      } else {
        navigator.clipboard.writeText(text);
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
    setTimeout(() => setSharedMessageIndex(null), 2000);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setIsAttachmentMenuOpen(false);
      }
      if (featureMenuRef.current && !featureMenuRef.current.contains(event.target as Node)) {
        setIsFeatureMenuOpen(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    
    const chatsRef = collection(db, 'users', user.uid, 'chats');
    const q = query(chatsRef, orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      setChatHistory(history);
      
      if (!chatId && history.length > 0 && messages.length === 0) {
        setChatId(history[0].id);
        setMessages(history[0].messages || []);
      }
    });
    
    return () => unsubscribe();
  }, [user, chatId, messages.length]);

  const loadChat = async (id: string) => {
    if (!user) return;
    setChatId(id);
    setIsSidebarOpen(false);
    
    try {
      const chatDoc = await getDoc(doc(db, 'users', user.uid, 'chats', id));
      if (chatDoc.exists()) {
        setMessages(chatDoc.data().messages || []);
      }
    } catch (error) {
      console.error("Error loading chat:", error);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const confirmDeleteChat = async () => {
    if (!user || !chatToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'chats', chatToDelete));
      if (chatId === chatToDelete) {
        setChatId(null);
        setMessages([]);
      }
      setChatToDelete(null);
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const truncateName = (name: string) => {
    if (name.length <= 15) return name;
    const extIndex = name.lastIndexOf('.');
    if (extIndex !== -1 && name.length - extIndex <= 5) {
      const ext = name.substring(extIndex);
      const base = name.substring(0, extIndex);
      return base.substring(0, 10) + '...' + ext;
    }
    return name.substring(0, 12) + '...';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await fileToBase64(file);
      newAttachments.push({
        file,
        base64,
        mimeType: file.type,
        name: file.name,
        size: formatSize(file.size),
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      });
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    setIsAttachmentMenuOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileInput = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  useEffect(() => {
    let systemInstruction = t('systemPromptBase') + '\n\n' + t('systemPromptLang');
    
    if (selectedModel === 'zhiyou-3') {
      systemInstruction += '\n\n[MODE PENALARAN TINGGI AKTIF]: ' + t('systemPromptReasoning');
    }

    chatRef.current = ai.chats.create({
      model: 'gemini-2.5-flash', // Always use 2.5 flash under the hood
      config: {
        systemInstruction: systemInstruction,
      }
    });
  }, [selectedModel, language, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Typing animation logic
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 500);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    
    const userText = input.trim();
    const currentAttachments = [...attachments];
    
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    setMessages(prev => [...prev, { role: 'user', text: userText, attachments: currentAttachments }]);
    setIsLoading(true);
    setIsThinking(true);
    setLoadingTextIndex(0);
    
    // Add empty model message immediately so loader shows up
    setMessages(prev => [...prev, { role: 'model', text: '', sources: [] }]);
    
    try {
      const messageParts: any[] = [];
      if (userText) messageParts.push({ text: userText });
      currentAttachments.forEach(att => {
        messageParts.push({
          inlineData: {
            data: att.base64,
            mimeType: att.mimeType
          }
        });
      });

      // Build contents from history
      const contents: any[] = [];
      messages.forEach(m => {
        const parts: any[] = [];
        if (m.text) parts.push({ text: m.text });
        if (m.attachments) {
          m.attachments.forEach(att => {
            parts.push({
              inlineData: {
                data: att.base64,
                mimeType: att.mimeType
              }
            });
          });
        }
        if (parts.length > 0) {
          // Ensure alternating roles
          if (contents.length > 0 && contents[contents.length - 1].role === m.role) {
            contents[contents.length - 1].parts.push(...parts);
          } else {
            contents.push({ role: m.role, parts });
          }
        }
      });
      
      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        contents[contents.length - 1].parts.push(...messageParts);
      } else {
        contents.push({ role: 'user', parts: messageParts });
      }

      let systemInstruction = t('systemPromptBase') + '\n\n' + t('systemPromptLang');
      const config: any = {
        systemInstruction: systemInstruction,
      };

      if (selectedModel === 'zhiyou-3') {
        config.systemInstruction += '\n\n[MODE PENALARAN TINGGI AKTIF]: ' + t('systemPromptReasoning') + '\n\nAnda diinstruksikan untuk bertindak sebagai model dengan kemampuan penalaran tingkat tinggi (Pro). Analisis setiap masalah secara mendalam, berpikir selangkah demi selangkah (step-by-step), dan berikan jawaban yang sangat komprehensif, akurat, logis, dan terstruktur dengan baik.';
        config.temperature = 0.2; // Lower temperature for more focused, analytical reasoning
        config.topP = 0.95;
      } else {
        config.temperature = 0.7; // Standard temperature for normal chat
      }

      if (isSearchEnabled) {
        config.tools = [{ googleSearch: {} }];
      }

      let fullText = '';
      let sources: Source[] = [];

      if (featureMode === 'image') {
        if (!user) {
          setIsThinking(false);
          setMessages(prev => [...prev, { role: 'model', text: "Silakan login untuk membuat gambar.", sources: [] }]);
          return;
        }
        
        const taskId = await addTask(user.uid, userText, aspectRatio);
        
        setIsThinking(false);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = "Gambar sedang diproses... (ID Tugas: " + taskId + ")";
          return newMessages;
        });
        
        // Poll for completion
        const pollInterval = setInterval(async () => {
          const taskDoc = await getDoc(doc(db, 'image_tasks', taskId));
          if (taskDoc.exists()) {
            const taskData = taskDoc.data();
            if (taskData.status === 'completed') {
              clearInterval(pollInterval);
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].text = `![Generated Image](${taskData.resultUrl})`;
                return newMessages;
              });
            } else if (taskData.status === 'failed') {
              clearInterval(pollInterval);
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].text = "Maaf, gagal membuat gambar: " + taskData.error;
                return newMessages;
              });
            }
          }
        }, 3000);
      } else if (featureMode === 'imageSearch') {
        try {
          const response = await fetch('/api/search-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: userText })
          });
          
          const data = await response.json();
          setIsThinking(false);

          if (!response.ok) {
            throw new Error(data.error || 'Gagal mencari gambar');
          }

          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = data.images && data.images.length > 0 
              ? `Berikut adalah beberapa gambar yang saya temukan untuk "${userText}":`
              : `Maaf, saya tidak dapat menemukan gambar untuk "${userText}".`;
            newMessages[newMessages.length - 1].imageResults = data.images || [];
            return newMessages;
          });
        } catch (error: any) {
          setIsThinking(false);
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = "Maaf, terjadi kesalahan saat mencari gambar: " + error.message;
            return newMessages;
          });
        }
      } else {
        const responseStream = await ai.models.generateContentStream({
          model: 'gemini-2.5-flash', // Use gemini-2.5-flash for both to avoid quota limits
          contents: contents,
          config: config
        });
        
        let firstChunk = true;
        
        for await (const chunk of responseStream) {
          if (firstChunk) {
            setIsThinking(false);
            firstChunk = false;
          }
          
          const c = chunk as any;
          if (c.text) {
            fullText += c.text;
          }
          
          const chunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks) {
            chunks.forEach((gc: any) => {
              if (gc.web?.uri && gc.web?.title) {
                // Avoid duplicates
                if (!sources.find(s => s.uri === gc.web.uri)) {
                  sources.push({ uri: gc.web.uri, title: gc.web.title });
                }
              }
            });
          }

          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = fullText;
            newMessages[newMessages.length - 1].sources = sources;
            return newMessages;
          });
        }
      }

      if (user) {
        try {
          const chatRef = chatId 
            ? doc(db, 'users', user.uid, 'chats', chatId)
            : doc(collection(db, 'users', user.uid, 'chats'));
            
          if (!chatId) setChatId(chatRef.id);
          
          setMessages(prev => {
            const msgsToSave = prev.map(m => ({
              role: m.role,
              text: m.text,
              attachments: m.attachments?.map(a => ({
                base64: a.base64,
                mimeType: a.mimeType,
                name: a.name,
                size: a.size
              })) || [],
              sources: m.sources || [],
              imageResults: m.imageResults || []
            }));
            
            setDoc(chatRef, {
              messages: msgsToSave,
              updatedAt: serverTimestamp(),
              title: msgsToSave[0]?.text?.substring(0, 30) || 'Chat Baru'
            }, { merge: true }).catch(err => console.error("Firestore save error:", err));
            
            return prev;
          });
        } catch (dbError) {
          console.error("Error saving to Firestore:", dbError);
        }
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      setIsThinking(false);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].text = "Maaf, terjadi kesalahan: " + (error?.message || error?.toString() || "Unknown error");
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-3xl bg-white border border-gray-100 flex items-center justify-center shadow-xl shadow-blue-500/20 mb-4"
        >
          <ZhiyouLogo className="w-10 h-10" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs font-semibold text-gray-400 tracking-widest uppercase"
        >
          Zhiyou AI
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-white text-gray-900 font-sans overflow-hidden">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className={`fixed md:static inset-y-0 left-0 w-72 bg-[#f9f9f9] border-r border-gray-200 z-50 flex flex-col ${isSidebarOpen ? 'block' : 'hidden md:flex'}`}
          >
            <div className="p-4 flex items-center justify-between">
              <button onClick={() => { setMessages([]); setChatId(null); setIsSidebarOpen(false); }} className="flex items-center gap-2 hover:bg-gray-200 active:scale-95 px-3 py-2 rounded-lg transition-all w-full">
                <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <ZhiyouLogo className="w-4 h-4" />
                </div>
                <span className="font-medium">{t('newChat')}</span>
              </button>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-gray-200 active:scale-90 rounded-full transition-all">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder={t('searchHistory')} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3">
              <div className="text-xs font-semibold text-gray-500 mb-2 px-3">{t('chatHistory')}</div>
              {chatHistory.filter(chat => chat.title?.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                chatHistory.filter(chat => chat.title?.toLowerCase().includes(searchQuery.toLowerCase())).map((chat, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.2 }}
                    key={chat.id} 
                    className={`group relative w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${chatId === chat.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-200 text-gray-700'}`}
                  >
                    <button 
                      onClick={() => loadChat(chat.id)}
                      className="flex-1 text-left truncate pr-6 active:scale-[0.98] transition-transform"
                    >
                      {chat.title}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setChatToDelete(chat.id); }}
                      className="absolute right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-90 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                      title={t('delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 py-2 text-sm text-gray-400 italic">
                  {searchQuery ? t('noResult') : t('noHistory')}
                </motion.div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 space-y-1">
              <Link href="/settings" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all text-sm text-gray-700">
                <Settings className="w-4 h-4" /> {t('settings')}
              </Link>
              <Link href="/about" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all text-sm text-gray-700">
                <BookOpen className="w-4 h-4" /> Tentang
              </Link>
              <Link href="/help" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all text-sm text-gray-700">
                <HelpCircle className="w-4 h-4" /> {t('help')}
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        {/* Top Bar */}
        <header className="flex-shrink-0 flex items-center justify-between p-3 sm:p-4 bg-white/80 backdrop-blur-md z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-gray-100 active:scale-90 rounded-full transition-all md:hidden">
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          
          <div className="flex-1 flex justify-center md:justify-start md:ml-4 relative" ref={modelMenuRef}>
            <button 
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-50 hover:bg-gray-100 active:scale-95 rounded-full text-sm font-medium transition-all border border-gray-200"
            >
              <div className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                <ZhiyouLogo className="w-3.5 h-3.5" />
              </div>
              {selectedModel === 'gemini-2.5-flash' ? t('modelZhiyou25') : t('modelZhiyou3')}
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {isModelMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 flex flex-col gap-0.5 z-50 min-w-[220px]"
                >
                  <button 
                    onClick={() => { setSelectedModel('gemini-2.5-flash'); setIsModelMenuOpen(false); }}
                    className={`flex flex-col px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-left transition-all ${selectedModel === 'gemini-2.5-flash' ? 'bg-blue-50/50' : ''}`}
                  >
                    <span className="text-sm font-semibold text-gray-900">{t('modelZhiyou25')}</span>
                  </button>
                  <button 
                    onClick={() => { setSelectedModel('zhiyou-3'); setIsModelMenuOpen(false); }}
                    className={`flex flex-col px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-left transition-all ${selectedModel === 'zhiyou-3' ? 'bg-blue-50/50' : ''}`}
                  >
                    <span className="text-sm font-semibold text-gray-900">{t('modelZhiyou3')}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-gray-900">{user.displayName || 'User'}</span>
              </div>
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200 hover:scale-105 transition-transform cursor-pointer" />
              <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 active:scale-90 rounded-full transition-all" title="Logout">
                <LogIn className="w-5 h-5 rotate-180" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-sm font-medium text-gray-900 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 hover:opacity-90 active:scale-95 transition-all">
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
                <span className="text-[12px] font-bold text-blue-600">G</span>
              </div>
              Login
            </Link>
          )}
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 -mt-10">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
                className="w-16 h-16 rounded-3xl bg-white border border-gray-100 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/10"
              >
                <ZhiyouLogo className="w-10 h-10" />
              </motion.div>
              
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-4xl sm:text-5xl font-semibold mb-4 text-center tracking-tight"
              >
                {t('welcome')}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">{user?.displayName?.split(' ')[0] || 'User'}</span>
              </motion.h1>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-gray-500 text-lg sm:text-xl text-center max-w-md mb-8"
              >
                {t('howCanIHelp')}
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl"
              >
                <button 
                  onClick={() => setFeatureMode('imageSearch')}
                  className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Search className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{t('featureSearchImage')}</div>
                    <div className="text-xs text-gray-500">Cari gambar referensi di web</div>
                  </div>
                </button>
                <button 
                  onClick={() => setFeatureMode('image')}
                  className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl hover:border-pink-200 hover:bg-pink-50/30 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-5 h-5 text-pink-500" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{t('featureGenerateImage')}</div>
                    <div className="text-xs text-gray-500">Buat gambar AI dari teks</div>
                  </div>
                </button>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-8">
              {messages.map((msg, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'model' && (
                    <div className="relative w-8 h-8 flex-shrink-0 mt-1 flex items-center justify-center">
                      <div className="relative w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                        <div 
                          className={`absolute inset-0 rounded-full animate-border-spin transition-opacity duration-700 ${(isThinking && idx === messages.length - 1) ? 'opacity-100' : 'opacity-0'}`}
                          style={{ backgroundImage: 'conic-gradient(from var(--angle), transparent 60%, #3b82f6, #8b5cf6, #ec4899)' }}
                        ></div>
                        <div 
                          className={`absolute inset-0 rounded-full animate-border-spin transition-opacity duration-700 ${(isThinking && idx === messages.length - 1) ? 'opacity-0' : 'opacity-100'}`}
                          style={{ backgroundImage: 'conic-gradient(from var(--angle), #3b82f6, #8b5cf6, #ec4899, #f43f5e, #f59e0b, #3b82f6)' }}
                        ></div>
                        <div className="absolute inset-[2px] bg-white rounded-full z-10 flex items-center justify-center">
                          <AnimatePresence>
                            {!(isThinking && idx === messages.length - 1) && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                              >
                                <ZhiyouLogo className="w-5 h-5" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-[#f4f4f5] px-5 py-3 rounded-3xl rounded-tr-sm' : ''}`}>
                    {msg.role === 'user' ? (
                      <div className="flex flex-col gap-2">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {msg.attachments.map((att, i) => (
                              <div key={i} className="flex items-center gap-2 bg-white/60 border border-gray-200/60 rounded-xl p-2 shadow-sm">
                                {att.previewUrl ? (
                                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                    <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    {att.mimeType.startsWith('video/') ? <Video className="w-5 h-5 text-blue-500" /> : <FileText className="w-5 h-5 text-blue-500" />}
                                  </div>
                                )}
                                <div className="flex flex-col min-w-0 pr-2">
                                  <span className="text-xs font-medium text-gray-700 truncate">{truncateName(att.name)}</span>
                                  <span className="text-[10px] text-gray-500">{att.size}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {msg.text && <p className="text-gray-800 whitespace-pre-wrap">{msg.text}</p>}
                      </div>
                    ) : (
                      <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-gray-50 prose-pre:text-gray-800 prose-pre:border prose-pre:border-gray-200 prose-a:text-blue-600">
                        {msg.imageResults && msg.imageResults.length > 0 && (
                          <div 
                            onClick={() => setShowImagesFor(msg.imageResults!)}
                            className="mb-4 grid grid-cols-2 gap-1 rounded-2xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity border border-gray-100 shadow-sm"
                          >
                            {msg.imageResults.slice(0, 4).map((img, i) => (
                              <div key={i} className={`relative aspect-square bg-gray-100 ${msg.imageResults!.length === 1 ? 'col-span-2 aspect-video' : ''}`}>
                                <img src={img} alt="Search result" className="w-full h-full object-cover" />
                                {i === 3 && msg.imageResults!.length > 4 && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-xl backdrop-blur-[2px]">
                                    +{msg.imageResults!.length - 4}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {isThinking && idx === messages.length - 1 && !msg.text ? (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="relative overflow-hidden rounded-full px-4 py-1.5 bg-gray-100/80 border border-gray-200/50 shadow-sm">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer-rtl"></div>
                              {isSearchEnabled ? (
                                <span className="relative z-10 font-medium text-sm tracking-wide bg-google-gradient drop-shadow-sm">
                                  {searchingTexts[loadingTextIndex]}
                                </span>
                              ) : (
                                <span className="relative z-10 font-medium text-sm tracking-wide text-gray-600 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                                  {thinkingTexts[loadingTextIndex]}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.text || '...'}
                            </ReactMarkdown>
                            
                            {/* Sources Pill */}
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button 
                                  onClick={() => setShowSourcesFor(msg.sources!)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium text-gray-700 transition-colors border border-gray-200"
                                >
                                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                                  {new URL(msg.sources[0].uri).hostname.replace('www.', '')}
                                  {msg.sources.length > 1 && ` +${msg.sources.length - 1} lainnya`}
                                </button>
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            {!isThinking && msg.text && (
                              <div className="flex items-center gap-2 mt-4 text-gray-400">
                                <button 
                                  onClick={() => handleLike(idx)}
                                  className={`p-1.5 rounded-md transition-colors ${likedMessageIndex === idx ? 'text-blue-500 bg-blue-50' : 'hover:text-gray-600 hover:bg-gray-100'}`}
                                  title="Like"
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleCopy(msg.text, idx)}
                                  className={`p-1.5 rounded-md transition-colors ${copiedMessageIndex === idx ? 'text-green-500 bg-green-50' : 'hover:text-gray-600 hover:bg-gray-100'}`}
                                  title="Copy"
                                >
                                  {copiedMessageIndex === idx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <button 
                                  onClick={() => handleShare(msg.text, idx)}
                                  className={`p-1.5 rounded-md transition-colors ${sharedMessageIndex === idx ? 'text-orange-500 bg-orange-50' : 'hover:text-gray-600 hover:bg-gray-100'}`}
                                  title="Share"
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input Area */}
        <div className="flex-shrink-0 bg-white px-4 pb-4 pt-2 w-full">
          <div className="max-w-3xl mx-auto w-full">
            <div className="relative group rounded-3xl z-10">
              {/* Glow Effect */}
              <div 
                className={`absolute -inset-[2px] rounded-3xl blur-xl z-0 transition-all duration-300 ${isTyping ? 'animate-border-spin-fast opacity-80 scale-105' : 'animate-border-spin opacity-50 group-focus-within:opacity-100'}`}
                style={{ backgroundImage: 'conic-gradient(from var(--angle), transparent 0%, transparent 40%, #3b82f6 50%, #8b5cf6 65%, #ec4899 80%, #f43f5e 100%)' }}
              ></div>
              
              {/* Border Effect */}
              <div 
                className={`absolute -inset-[2px] rounded-3xl z-0 transition-all duration-300 ${isTyping ? 'animate-border-spin-fast opacity-100' : 'animate-border-spin opacity-100'}`}
                style={{ backgroundImage: 'conic-gradient(from var(--angle), transparent 0%, transparent 40%, #3b82f6 50%, #8b5cf6 65%, #ec4899 80%, #f43f5e 100%)' }}
              ></div>

              {/* Inner Content */}
              <div className={`relative bg-[#f4f4f5] rounded-3xl p-3 sm:p-4 z-10 flex flex-col shadow-sm transition-all duration-300 ${(input.trim().length > 0 || attachments.length > 0) ? 'ring-2 ring-blue-100 shadow-md shadow-blue-500/10' : ''}`}>
                
                {/* Attachment Preview Area */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="relative flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-2 pr-8 shadow-sm group">
                        {att.previewUrl ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            {att.mimeType.startsWith('video/') ? <Video className="w-5 h-5 text-blue-500" /> : <FileText className="w-5 h-5 text-blue-500" />}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-gray-700 truncate">{truncateName(att.name)}</span>
                          <span className="text-[10px] text-gray-500">{att.size}</span>
                        </div>
                        <button 
                          onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 bg-gray-100 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-gray-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {featureMode !== 'chat' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">
                      {featureMode === 'image' && <ImageIcon className="w-3.5 h-3.5" />}
                      {featureMode === 'imageSearch' && <Search className="w-3.5 h-3.5" />}
                      {featureMode === 'research' && <Search className="w-3.5 h-3.5" />}
                      {featureMode === 'learning' && <BookOpen className="w-3.5 h-3.5" />}
                      <span>
                        {featureMode === 'image' && t('featureGenerateImage')}
                        {featureMode === 'imageSearch' && t('featureSearchImage')}
                        {featureMode === 'research' && t('featureDeepResearch')}
                        {featureMode === 'learning' && t('featureGuidedLearning')}
                      </span>
                      <button onClick={() => setFeatureMode('chat')} className="ml-1 p-0.5 hover:bg-blue-200 rounded-full transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {featureMode === 'image' && (
                      <select 
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="text-xs font-medium bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-gray-700 outline-none focus:border-blue-300"
                      >
                        <option value="1:1">1:1 Square</option>
                        <option value="16:9">16:9 Landscape</option>
                        <option value="9:16">9:16 Portrait</option>
                        <option value="4:3">4:3 Standard</option>
                        <option value="3:4">3:4 Vertical</option>
                      </select>
                    )}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={featureMode === 'image' ? t('describeImage') : featureMode === 'imageSearch' ? t('describeSearchImage') : t('askAnything')}
                  className={`w-full bg-transparent resize-none outline-none max-h-48 min-h-[40px] text-gray-800 placeholder:text-gray-500 text-base transition-opacity duration-300 ${input.length > 0 ? 'opacity-100' : 'opacity-70'}`}
                  rows={1}
                />
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 relative" ref={attachmentMenuRef}>
                    <button 
                      onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                      className={`p-2 rounded-full transition-all active:scale-90 ${isAttachmentMenuOpen ? 'bg-gray-200 text-gray-800' : 'hover:bg-gray-200/80 text-gray-500'}`} 
                      title={t('addFile')}
                    >
                      <Plus className={`w-5 h-5 transition-transform duration-300 ${isAttachmentMenuOpen ? 'rotate-45' : ''}`} />
                    </button>
                    
                    <button 
                      onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                      className={`p-2 rounded-full transition-all active:scale-90 ${isSearchEnabled ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200/80 text-gray-500'}`} 
                      title={t('searchWeb')}
                    >
                      <Globe className="w-5 h-5" />
                    </button>
                    
                    {/* Attachment Menu Popup */}
                    <AnimatePresence>
                      {isAttachmentMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 flex flex-col gap-0.5 z-50 min-w-[160px]"
                        >
                          <button onClick={() => triggerFileInput('image/*')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-sm font-medium text-gray-700 transition-all text-left">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-blue-500" />
                            </div>
                            {t('addImage')}
                          </button>
                          <button onClick={() => triggerFileInput('video/*')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-sm font-medium text-gray-700 transition-all text-left">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                              <Video className="w-4 h-4 text-purple-500" />
                            </div>
                            {t('addVideo')}
                          </button>
                          <button onClick={() => triggerFileInput('*/*')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-sm font-medium text-gray-700 transition-all text-left">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                              <FileText className="w-4 h-4 text-orange-500" />
                            </div>
                            {t('addDoc')}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative" ref={featureMenuRef}>
                      <button 
                        onClick={() => setIsFeatureMenuOpen(!isFeatureMenuOpen)}
                        className={`p-2 rounded-full transition-all active:scale-90 ${isFeatureMenuOpen ? 'bg-gray-200 text-gray-800' : 'hover:bg-gray-200/80 text-gray-500'}`} 
                        title={t('magicTool')}
                      >
                        <Wand2 className="w-5 h-5" />
                      </button>

                      <AnimatePresence>
                        {isFeatureMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 flex flex-col gap-0.5 z-50 min-w-[200px]"
                          >
                            <button onClick={() => { setFeatureMode('image'); setIsFeatureMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-sm font-medium text-gray-700 transition-all text-left">
                              <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-pink-500" />
                              </div>
                              {t('featureGenerateImage')}
                            </button>
                            <button onClick={() => { setFeatureMode('imageSearch'); setIsFeatureMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-sm font-medium text-gray-700 transition-all text-left">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Search className="w-4 h-4 text-blue-500" />
                              </div>
                              {t('featureSearchImage')}
                            </button>
                            <button onClick={() => { alert(t('featureComingSoon')); setIsFeatureMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-sm font-medium text-gray-700 transition-all text-left">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <Search className="w-4 h-4 text-indigo-500" />
                              </div>
                              {t('featureDeepResearch')}
                            </button>
                            <button onClick={() => { alert(t('featureComingSoon')); setIsFeatureMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-sm font-medium text-gray-700 transition-all text-left">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-emerald-500" />
                              </div>
                              {t('featureGuidedLearning')}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleSend}
                    disabled={(!input.trim() && attachments.length === 0) || isLoading}
                    className="p-2 bg-gray-200 hover:bg-gray-300 active:scale-90 disabled:opacity-50 disabled:hover:bg-gray-200 disabled:active:scale-100 rounded-full transition-all text-gray-700"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              multiple 
            />
            <p className="text-center text-xs text-gray-400 mt-4 hidden sm:block relative z-10">
              {t('disclaimer')}<br/>
              &copy;2026 Zhiyou AI | Zent Inc.
            </p>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('logoutConfirmTitle')}</h3>
              <p className="text-gray-500 text-sm mb-6">{t('logoutConfirmDesc')}</p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={confirmLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                >
                  {t('yesLogout')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Chat Confirmation Dialog */}
      <AnimatePresence>
        {chatToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('deleteChatTitle')}</h3>
              <p className="text-gray-500 text-sm mb-6">{t('deleteChatDesc')}</p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setChatToDelete(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={confirmDeleteChat}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                >
                  {t('delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sources Slidebar */}
      <AnimatePresence>
        {showSourcesFor && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSourcesFor(null)}
              className="fixed inset-0 bg-black/20 z-[100] backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[101] max-h-[80vh] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  Sumber Penelusuran
                </h3>
                <button onClick={() => setShowSourcesFor(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-3">
                {showSourcesFor.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
                  >
                    <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {source.title}
                    </span>
                    <span className="text-xs text-gray-500 mt-1 truncate">
                      {source.uri}
                    </span>
                  </a>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Image Gallery Slidebar */}
      <AnimatePresence>
        {showImagesFor && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowImagesFor(null)}
              className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-md"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[101] max-h-[90vh] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.2)]"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-500" />
                  Galeri Gambar
                </h3>
                <button onClick={() => setShowImagesFor(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="overflow-y-auto p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {showImagesFor.map((img, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-sm group"
                    >
                      <img src={img} alt={`Result ${idx}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <a 
                          href={img} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <ImageIcon className="w-4 h-4 text-gray-700" />
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
