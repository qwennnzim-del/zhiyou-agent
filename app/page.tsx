'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Menu, Plus, PlusCircle, Wand2, ArrowUp, ChevronDown, X, Settings, HelpCircle, LogIn, Image as ImageIcon, Video, FileText, Paperclip, ArrowLeft, BookOpen, Search, Trash2, Globe, ThumbsUp, Copy, Check, Share2, MoreHorizontal, Download, Cloud, Brain, Zap, Crown, Maximize2, MoreVertical, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import Link from 'next/link';
import { auth, db, storage } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { useLanguage } from './contexts/LanguageContext';
import Image from 'next/image';

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
  reasoning?: string;
  isReasoningExpanded?: boolean;
  attachments?: Attachment[];
  sources?: Source[];
  imageResults?: string[];
  model?: string;
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
  const [proUses, setProUses] = useState<number | null>(null);
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isFeatureMenuOpen, setIsFeatureMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [clickedMessageIndex, setClickedMessageIndex] = useState<number | null>(null);
  const [editPromptValue, setEditPromptValue] = useState('');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [featureMode, setFeatureMode] = useState<'chat' | 'image' | 'research' | 'learning' | 'imageSearch'>('chat');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [showSourcesFor, setShowSourcesFor] = useState<Source[] | null>(null);
  const [showImagesFor, setShowImagesFor] = useState<string[] | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [likedMessageIndex, setLikedMessageIndex] = useState<number | null>(null);
  const [sharedMessageIndex, setSharedMessageIndex] = useState<number | null>(null);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isImageAnalysisMode, setIsImageAnalysisMode] = useState(false);
  const hasLoadedInitialChat = useRef(false);

  const handleModelOrFeatureChange = (model: string, feature: 'chat' | 'image' | 'research' | 'learning' | 'imageSearch') => {
    if (selectedModel !== model || featureMode !== feature) {
      setSelectedModel(model);
      setFeatureMode(feature);
      if (messages.length > 0) {
        createNewChat();
      }
    }
  };

  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [savingProgress, setSavingProgress] = useState('');
  const [toastMessage, setToastMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);
  const { t, language } = useLanguage();

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };
  
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
  const researchTexts = ["conducting research...", "analyzing sources...", "synthesizing data...", "writing report..."];
  const learningTexts = ["preparing lesson...", "gathering sources...", "structuring guide...", "simplifying concepts..."];

  const handleDownload = async (url: string) => {
    try {
      let blob: Blob;
      
      if (url.startsWith('data:')) {
        // Handle base64 data URL directly
        const [header, base64Data] = url.split(',');
        const mimeType = header.split(':')[1].split(';')[0];
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        
        blob = new Blob(byteArrays, { type: mimeType });
      } else if (url.startsWith('blob:')) {
        const response = await fetch(url);
        blob = await response.blob();
      } else {
        // Handle external URL via proxy
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Failed to fetch image");
        blob = await response.blob();
      }
      
      // Create image object to draw on canvas
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(blob);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });

      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Add Watermark
      const margin = canvas.width * 0.04;
      const fontSize = Math.max(18, Math.floor(canvas.width * 0.035));
      const logoSize = fontSize * 1.5;
      
      const watermarkText = "Zhiyou AI";
      ctx.font = `bold ${fontSize}px sans-serif`;
      const textMetrics = ctx.measureText(watermarkText);
      
      const totalWidth = logoSize + 10 + textMetrics.width;
      const startX = canvas.width - totalWidth - margin;
      const startY = canvas.height - logoSize - margin;

      // Draw glass background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(startX - 12, startY - 10, totalWidth + 24, logoSize + 20, 15);
      } else {
        ctx.rect(startX - 12, startY - 10, totalWidth + 24, logoSize + 20);
      }
      ctx.fill();

      // Draw Logo Circle
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(startX + logoSize/2, startY + logoSize/2, logoSize/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw 'Z' in logo
      ctx.fillStyle = '#3b82f6'; // Blue
      ctx.font = `bold ${Math.floor(fontSize * 1.1)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("Z", startX + logoSize/2, startY + logoSize/2 + 1);

      // Draw Name
      ctx.fillStyle = 'white';
      ctx.textAlign = 'left';
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillText(watermarkText, startX + logoSize + 10, startY + logoSize/2);

      // Convert back to blob and download with JPEG optimization (85% quality)
      canvas.toBlob((newBlob) => {
        if (!newBlob) return;
        const finalUrl = URL.createObjectURL(newBlob);
        const a = document.createElement('a');
        a.href = finalUrl;
        a.download = `zhiyou-art-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(finalUrl);
        URL.revokeObjectURL(objectUrl);
        showToast("Gambar berhasil diunduh!", 'success');
      }, 'image/jpeg', 0.85);

    } catch (error) {
      console.error("Error downloading image:", error);
      showToast("Gagal mengunduh gambar.", 'error');
    }
    setOpenMenuIndex(null);
  };

  const handleShareImage = async (url: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Zhiyou Art Image',
          url: url,
        });
      } else {
        navigator.clipboard.writeText(url);
        showToast("URL gambar disalin ke clipboard!", 'success');
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
    setOpenMenuIndex(null);
  };

  const startAnalysis = async (url: string) => {
    try {
      let blob: Blob;
      
      if (url.startsWith('data:')) {
        const [header, base64Data] = url.split(',');
        const mimeType = header.split(':')[1].split(';')[0];
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        
        blob = new Blob(byteArrays, { type: mimeType });
      } else if (url.startsWith('blob:')) {
        const response = await fetch(url);
        blob = await response.blob();
      } else {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        blob = await response.blob();
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        const newAttachment: Attachment = {
          file: new File([blob], `zhiyou-art-${Date.now()}.png`, { type: blob.type }),
          base64: base64,
          mimeType: blob.type,
          name: `zhiyou-art-${Date.now()}.png`,
          size: (blob.size / 1024).toFixed(1) + ' KB',
          previewUrl: reader.result as string
        };
        
        setAttachments(prev => [...prev, newAttachment]);
        setIsImageAnalysisMode(true);
        setShowImagesFor(null);
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Error selecting image:", error);
    }
  };

  const handleSaveToZhiyouFirebase = async (url: string) => {
    if (!user) {
      showToast("Silakan login untuk menyimpan.", 'error');
      return;
    }
    
    try {
      // Save to global image cache
      const imageCacheRef = doc(collection(db, 'image_cache'));
      await setDoc(imageCacheRef, {
        url: url,
        savedBy: user.uid,
        savedAt: serverTimestamp(),
        prompt: currentPrompt
      });
      
      // Also save to user's gallery
      const galleryRef = doc(collection(db, 'users', user.uid, 'gallery'));
      await setDoc(galleryRef, {
        url: url,
        savedAt: serverTimestamp(),
        prompt: currentPrompt
      });
      
      showToast("Gambar berhasil disimpan ke Zhiyou Firebase!", 'success');
    } catch (error) {
      console.error("Error saving to Firebase:", error);
      showToast("Gagal menyimpan gambar.", 'error');
    }
  };

  const handleSaveToCloud = async (url: string) => {
    if (!user) {
      showToast("Silakan login untuk menyimpan ke cloud.", 'error');
      return;
    }
    
    setIsSavingToCloud(true);
    setSavingProgress("Menyimpan gambar...");
    
    try {
      let blob: Blob;
      if (url.startsWith('data:')) {
        const [header, base64Data] = url.split(',');
        const mimeType = header.split(':')[1].split(';')[0];
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        blob = new Blob(byteArrays, { type: mimeType });
      } else if (url.startsWith('blob:')) {
        const response = await fetch(url);
        blob = await response.blob();
      } else {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Failed to fetch image");
        blob = await response.blob();
      }
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      await new Promise<void>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64data = reader.result as string;
            const fileName = `zhiyou-art-${Date.now()}.png`;
            const storageRef = ref(storage, `users/${user.uid}/images/${fileName}`);
            
            await uploadString(storageRef, base64data, 'data_url');
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = reject;
      });
      
      setIsSavingToCloud(false);
      showToast("Gambar berhasil disimpan ke Firebase Storage!", 'success');
    } catch (error) {
      console.error("Error saving to cloud:", error);
      setIsSavingToCloud(false);
      showToast("Gagal menyimpan gambar ke cloud.", 'error');
    }
    setOpenMenuIndex(null);
  };

  useEffect(() => {
    if (isThinking) {
      const interval = setInterval(() => {
        setLoadingTextIndex(prev => prev + 1);
      }, 1500);
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
    
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.proUses !== undefined) {
          setProUses(data.proUses);
        } else {
          // Initialize pro uses if not present
          await setDoc(userRef, { proUses: 5 }, { merge: true });
          setProUses(5);
        }
      } else {
        // Create user document with initial pro uses
        await setDoc(userRef, { proUses: 5, createdAt: serverTimestamp() });
        setProUses(5);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      hasLoadedInitialChat.current = false;
      return;
    }
    
    const chatsRef = collection(db, 'users', user.uid, 'chats');
    const q = query(chatsRef, orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      setChatHistory(history);
      
      if (!hasLoadedInitialChat.current && !chatId && history.length > 0 && messages.length === 0) {
        setChatId(history[0].id);
        setMessages(history[0].messages || []);
        hasLoadedInitialChat.current = true;
      }
    });
    
    return () => unsubscribe();
  }, [user, chatId, messages.length]);

  const createNewChat = () => {
    setMessages([]);
    setChatId(null);
    setIsSidebarOpen(false);
    setCurrentPrompt('');
    setAttachments([]);
    setIsImageAnalysisMode(false);
  };

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

  const fileToBase64 = (file: File, onProgress?: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      if (onProgress) {
        reader.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentLoaded = Math.round((event.loaded / event.total) * 100);
            onProgress(percentLoaded);
          }
        };
      }
      
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

    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    const ALLOWED_TYPES = [
      'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
      'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/mpeg',
      'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp',
      'text/plain', 'text/html', 'text/css', 'text/javascript', 'application/x-javascript', 'text/x-typescript', 'application/x-typescript', 'text/csv', 'text/markdown', 'text/x-python', 'application/x-python-code', 'application/json', 'text/xml', 'application/rtf', 'text/rtf',
      'application/pdf'
    ];

    const newAttachments: Attachment[] = [];

    setIsUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > MAX_FILE_SIZE) {
        showToast(`${t('fileTooLarge')} (${file.name})`, 'error');
        continue;
      }

      if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('text/')) {
        showToast(`${t('fileTypeNotSupported')} (${file.name})`, 'error');
        continue;
      }

      try {
        const base64 = await fileToBase64(file, (progress) => {
          // Calculate overall progress if multiple files
          const overallProgress = Math.round(((i * 100) + progress) / files.length);
          setUploadProgress(overallProgress);
        });
        newAttachments.push({
          file,
          base64,
          mimeType: file.type || 'text/plain',
          name: file.name,
          size: formatSize(file.size),
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
        });
      } catch (err) {
        console.error("Error reading file:", err);
        showToast(`${t('fileReadError')} (${file.name})`, 'error');
      }
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    
    setIsUploading(false);
    setUploadProgress(0);
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

  const toggleReasoning = (index: number) => {
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[index].isReasoningExpanded = !newMessages[index].isReasoningExpanded;
      return newMessages;
    });
  };

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

  const handleEditPrompt = (index: number) => {
    if (!editPromptValue.trim() || isLoading) return;
    
    const msgToEdit = messages[index];
    const newMessages = messages.slice(0, index);
    
    setEditingMessageIndex(null);
    handleSend(editPromptValue, msgToEdit.attachments || [], newMessages);
  };

  const handleSend = async (overrideText?: string, overrideAttachments?: Attachment[], overrideMessages?: Message[]) => {
    const textToSend = overrideText !== undefined ? overrideText : input;
    const attachmentsToSend = overrideAttachments !== undefined ? overrideAttachments : attachments;
    const currentMessages = overrideMessages !== undefined ? overrideMessages : messages;

    if ((!textToSend.trim() && attachmentsToSend.length === 0) || isLoading) return;
    
    const userText = textToSend.trim();
    const currentAttachments = [...attachmentsToSend];
    
    let finalPrompt = userText;
    const hasImageAttachments = currentAttachments.some(att => att.mimeType.startsWith('image/'));
    
    // Detect if user is asking a question (chatting) instead of prompting for a new image
    const isQuestion = userText.trim().endsWith('?') || 
                       /^(apa|siapa|dimana|kapan|mengapa|bagaimana|jelaskan|analisis|sebutkan|tunjukkan|berikan|ceritakan)/i.test(userText.trim());
    
    const isImageFeatureMode = (featureMode === 'image' || featureMode === 'imageSearch' || selectedModel === 'zhiyou-art' || selectedModel === 'zhiyou-art-2.0');

    setCurrentPrompt(userText);
    if (overrideText === undefined) setInput('');
    if (overrideAttachments === undefined) setAttachments([]);
    setIsImageAnalysisMode(false);
    if (textareaRef.current && overrideText === undefined) {
      textareaRef.current.style.height = 'auto';
    }
    
    const newMessagesList = [...currentMessages, { role: 'user' as const, text: userText, attachments: currentAttachments }];
    setMessages(newMessagesList);
    setIsLoading(true);
    setIsThinking(true);
    setLoadingTextIndex(0);
    
    // Add empty model message immediately so loader shows up
    setMessages([...newMessagesList, { role: 'model', text: '', sources: [], model: selectedModel }]);
    
    try {
      // If it's an image feature and no text but has image, generate prompt from image
      if (isImageFeatureMode && !isQuestion && !isImageAnalysisMode && !finalPrompt.trim() && hasImageAttachments) {
        try {
          const imageParts = currentAttachments
            .filter(att => att.mimeType.startsWith('image/'))
            .map(att => ({
              inlineData: {
                data: att.base64,
                mimeType: att.mimeType
              }
            }));
          
          if (imageParts.length > 0) {
            const result = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: [{
                role: 'user',
                parts: [
                  ...imageParts,
                  { text: "Describe this image in detail for an image generation prompt. Keep it concise but descriptive. Output ONLY the description." }
                ]
              }]
            });
            finalPrompt = result.text || "a beautiful image";
            setCurrentPrompt(finalPrompt);
          }
        } catch (e) {
          console.error("Error generating prompt from image:", e);
          finalPrompt = "similar image";
        }
      }

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
      
      // Helper to convert URL to base64 for Gemini
      const getUrlData = async (url: string) => {
        try {
          if (url.startsWith('data:')) {
            const [header, base64Data] = url.split(',');
            const mimeType = header.split(':')[1].split(';')[0];
            return { data: base64Data, mimeType };
          }
          
          const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
          const blob = await res.blob();
          return new Promise<{data: string, mimeType: string} | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve({ data: base64, mimeType: blob.type });
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          return null;
        }
      };

      for (const m of messages) {
        const parts: any[] = [];
        if (m.text) parts.push({ text: m.text });
        
        // Include attachments
        if (m.attachments) {
          for (const att of m.attachments) {
            parts.push({
              inlineData: {
                data: att.base64,
                mimeType: att.mimeType
              }
            });
          }
        }

        // Include previous image results so AI can "see" them
        if (m.imageResults && m.imageResults.length > 0) {
          // Only include the first image to save tokens/bandwidth
          const imgData = await getUrlData(m.imageResults[0]);
          if (imgData) {
            parts.push({
              inlineData: {
                data: imgData.data,
                mimeType: imgData.mimeType
              }
            });
          }
        }

        if (parts.length > 0) {
          if (contents.length > 0 && contents[contents.length - 1].role === m.role) {
            contents[contents.length - 1].parts.push(...parts);
          } else {
            contents.push({ role: m.role, parts });
          }
        }
      }
      
      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        contents[contents.length - 1].parts.push(...messageParts);
      } else {
        contents.push({ role: 'user', parts: messageParts });
      }

      let systemInstruction = t('systemPromptBase') + '\n\n' + t('systemPromptLang');
      
      if (featureMode === 'research') {
        systemInstruction += '\n\n[MODE RISET (DEEP RESEARCH) AKTIF]: ' + t('systemPromptResearch');
      } else if (featureMode === 'learning') {
        systemInstruction += '\n\n[MODE PEMBELAJARAN TERPANDU (GUIDED LEARNING) AKTIF]: ' + t('systemPromptLearning');
      } else if (selectedModel === 'zhiyou-3') {
        systemInstruction += '\n\n[MODE PENALARAN TINGGI AKTIF]: ' + t('systemPromptReasoning') + '\n\nAnda diinstruksikan untuk bertindak sebagai model dengan kemampuan penalaran tingkat tinggi (Pro). Analisis setiap masalah secara mendalam, berpikir selangkah demi selangkah (step-by-step), dan berikan jawaban yang sangat komprehensif, akurat, logis, dan terstruktur dengan baik.';
      } else if (selectedModel === 'zhiyou-art' || selectedModel === 'zhiyou-art-2.0') {
        systemInstruction += '\n\n[MODE ANALISIS SENI AKTIF]: Anda adalah Zhiyou AI dalam mode analisis gambar. Anda dapat melihat gambar yang dikirim pengguna atau gambar yang baru saja Anda buat. Berikan analisis artistik, teknis, atau jawab pertanyaan pengguna tentang gambar tersebut dengan gaya yang membantu dan kreatif.';
      }

      const config: any = {
        systemInstruction: systemInstruction,
      };

      if (selectedModel === 'zhiyou-3' || featureMode === 'research' || featureMode === 'learning') {
        if (featureMode === 'research') {
          config.temperature = 0.4; // Slightly higher than reasoning for more creative synthesis
        } else if (featureMode === 'learning') {
          config.temperature = 0.5; // Balanced temperature for tutoring and explanation
        } else {
          config.temperature = 0.2; // Lower temperature for more focused, analytical reasoning
        }
        config.topP = 0.95;
      } else {
        config.temperature = 0.7; // Standard temperature for normal chat
      }

      const getCurrentTime: FunctionDeclaration = {
        name: "getCurrentTime",
        description: "Get the current date and time in a specific timezone",
        parameters: {
          type: Type.OBJECT,
          properties: {
            timezone: {
              type: Type.STRING,
              description: "The timezone to get the time for, e.g. 'Asia/Jakarta', 'America/New_York', 'UTC'"
            }
          },
          required: ["timezone"]
        }
      };

      const calculateMath: FunctionDeclaration = {
        name: "calculateMath",
        description: "Evaluate a mathematical expression",
        parameters: {
          type: Type.OBJECT,
          properties: {
            expression: {
              type: Type.STRING,
              description: "The mathematical expression to evaluate, e.g. '2 + 2', '100 * 5 / 2'"
            }
          },
          required: ["expression"]
        }
      };

      config.tools = [
        { functionDeclarations: [getCurrentTime, calculateMath] }
      ];

      if (isSearchEnabled || featureMode === 'research' || featureMode === 'learning') {
        config.tools.push({ googleSearch: {} });
        config.toolConfig = { includeServerSideToolInvocations: true };
      }

      let fullText = '';
      let sources: Source[] = [];

      const isDeveloper = user?.email === 'cipaonly08@gmail.com';
      const isProFeature = selectedModel === 'zhiyou-3' || featureMode === 'image' || featureMode === 'imageSearch' || selectedModel === 'zhiyou-art' || selectedModel === 'zhiyou-art-2.0';
      
      if (isProFeature) {
        if (!user) {
          setIsThinking(false);
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = "Silakan login untuk menggunakan fitur pro ini.";
            return newMessages;
          });
          setIsLoading(false);
          return;
        }

        if (!isDeveloper && proUses !== null && proUses <= 0) {
          setIsThinking(false);
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = "Maaf, batas pemakaian fitur Pro Anda (5 kali) telah habis. Fitur ini mencakup model Zhiyou 3, pembuatan gambar, dan pencarian gambar.";
            return newMessages;
          });
          setIsLoading(false);
          return;
        }

        // Deduct pro use if not developer
        if (!isDeveloper && proUses !== null && proUses > 0) {
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, { proUses: proUses - 1 }, { merge: true });
        }
      }

      if (featureMode === 'image' || selectedModel === 'zhiyou-art-2.0') {
        if (!user) return;
        
        try {
          // Add a timeout promise to prevent hanging indefinitely
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Waktu pembuatan gambar habis (timeout). Silakan coba lagi dengan prompt yang lebih sederhana.')), 45000)
          );

          const generatePromise = ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                {
                  text: finalPrompt,
                },
              ],
            },
            config: {
              imageConfig: {
                aspectRatio: aspectRatio,
              },
            },
          });

          const response = await Promise.race([generatePromise, timeoutPromise]) as any;

          const imageResults: string[] = [];
          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              const base64EncodeString = part.inlineData.data;
              const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodeString}`;
              imageResults.push(imageUrl);
            }
          }

          if (imageResults.length === 0) {
            throw new Error('Gagal membuat gambar. Prompt mungkin melanggar kebijakan keamanan atau model sedang sibuk.');
          }
          
          setIsThinking(false);
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = t('imageGenSuccess');
            newMessages[newMessages.length - 1].imageResults = imageResults;
            newMessages[newMessages.length - 1].model = selectedModel;
            return newMessages;
          });
        } catch (error: any) {
          console.error("Image generation error:", error);
          setIsThinking(false);
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = `Maaf, terjadi kesalahan saat membuat gambar: ${error.message || 'Kesalahan tidak diketahui'}. Silakan coba lagi.`;
            return newMessages;
          });
        }
      } else if (featureMode === 'imageSearch' || selectedModel === 'zhiyou-art') {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Waktu pencarian gambar habis (timeout). Silakan coba lagi.')), 30000)
          );

          const fetchPromise = fetch('/api/search-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: finalPrompt })
          });

          const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
          
          const data = await response.json();
          
          setIsThinking(false);

          if (!response.ok) {
            throw new Error(data.error || 'Gagal mencari gambar');
          }

          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = data.images && data.images.length > 0 
              ? t('imageSearchSuccess')
              : `Maaf, saya tidak dapat menemukan gambar untuk "${finalPrompt}".`;
            newMessages[newMessages.length - 1].imageResults = data.images || [];
            newMessages[newMessages.length - 1].model = selectedModel;
            return newMessages;
          });
        } catch (error: any) {
          console.error("Image search error:", error);
          setIsThinking(false);
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = `Maaf, terjadi kesalahan saat mencari gambar: ${error.message || 'Kesalahan tidak diketahui'}. Silakan coba lagi.`;
            return newMessages;
          });
        }
      } else {
        let isDone = false;
        let currentContents = [...contents];
        
        while (!isDone) {
          const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash', // Always use 2.5 flash
            contents: currentContents,
            config: config
          });
          
          let firstChunk = true;
          let functionCallsToHandle: any[] = [];
          
          for await (const chunk of responseStream) {
            if (firstChunk) {
              setIsThinking(false);
              firstChunk = false;
            }
            
            const c = chunk as any;
            
            if (c.functionCalls && c.functionCalls.length > 0) {
              functionCallsToHandle.push(...c.functionCalls);
            }
            
            if (c.text) {
              fullText += c.text;
            }
            
            let displayText = fullText;
            let reasoningText = '';
            let isReasoningExpanded = true;
            
            if (selectedModel === 'zhiyou-3') {
              if (fullText.includes('<think>') && fullText.includes('</think>')) {
                const parts = fullText.split('</think>');
                if (parts.length > 1) {
                  reasoningText = parts[0].replace('<think>', '').trim();
                  displayText = parts[1].trim();
                  isReasoningExpanded = false; // Auto-collapse when thinking is done
                }
              } else if (fullText.includes('<think>')) {
                 reasoningText = fullText.replace('<think>', '').trim();
                 displayText = '';
                 isReasoningExpanded = true; // Keep expanded while thinking
              }
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
              newMessages[newMessages.length - 1].text = displayText;
              if (selectedModel === 'zhiyou-3' && reasoningText) {
                newMessages[newMessages.length - 1].reasoning = reasoningText;
                newMessages[newMessages.length - 1].isReasoningExpanded = isReasoningExpanded;
              }
              newMessages[newMessages.length - 1].sources = sources;
              return newMessages;
            });
          }
          
          if (functionCallsToHandle.length > 0) {
            // Append model's function call to history
            currentContents.push({
              role: 'model',
              parts: functionCallsToHandle.map(call => ({ functionCall: call }))
            });
            
            // Execute functions
            const functionResponses = functionCallsToHandle.map(call => {
              let result: any;
              if (call.name === 'getCurrentTime') {
                try {
                  const date = new Date();
                  result = { time: date.toLocaleString('en-US', { timeZone: call.args.timezone || 'UTC' }) };
                } catch (e) {
                  result = { error: 'Invalid timezone' };
                }
              } else if (call.name === 'calculateMath') {
                try {
                  // Safe math evaluation
                  const expr = call.args.expression.replace(/[^0-9+\-*/(). ]/g, '');
                  result = { result: new Function('return ' + expr)() };
                } catch (e) {
                  result = { error: 'Invalid expression' };
                }
              } else {
                result = { error: 'Unknown function' };
              }
              
              return {
                functionResponse: {
                  name: call.name,
                  response: result
                }
              };
            });
            
            // Append function responses to history
            currentContents.push({
              role: 'user',
              parts: functionResponses
            });
            
            // Loop continues to get the final response
          } else {
            isDone = true;
          }
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
              reasoning: m.reasoning || null,
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
      <aside
        className={`fixed md:static inset-y-0 left-0 w-72 md:w-80 bg-[#f9f9f9] border-r border-gray-200 z-50 flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-gray-100 mb-2">
              <ZhiyouLogo className="w-8 h-8" />
              <span className="text-xl font-bold tracking-tight text-gray-800 italic font-serif">Zhiyou AI</span>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden ml-auto p-2 hover:bg-gray-200 active:scale-90 rounded-full transition-all">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bolt-icon lucide-bolt w-4 h-4"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><circle cx="12" cy="12" r="4"/></svg> {t('settings')}
              </Link>
              <Link href="/about" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all text-sm text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info-icon lucide-info w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> Tentang
              </Link>
              <Link href="/help" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all text-sm text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-badge-question-mark-icon lucide-badge-question-mark w-4 h-4"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg> {t('help')}
              </Link>
            </div>
          </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        {/* Top Bar */}
        <header className="flex-shrink-0 flex items-center justify-between p-3 sm:p-4 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-1">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-gray-100 active:scale-90 rounded-full transition-all md:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-text-align-start-icon lucide-text-align-start w-6 h-6 text-gray-600"><path d="M21 5H3"/><path d="M15 12H3"/><path d="M17 19H3"/></svg>
            </button>
            <button 
              onClick={createNewChat} 
              className="p-2 hover:bg-gray-100 active:scale-90 rounded-full transition-all text-gray-600 hover:text-blue-600 group"
              title={t('newChat')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-fading-plus-icon lucide-circle-fading-plus w-6 h-6 group-hover:text-blue-500 transition-colors"><path d="M12 2a10 10 0 0 1 7.38 16.75"/><path d="M12 8v8"/><path d="M16 12H8"/><path d="M2.5 8.875a10 10 0 0 0-.5 3"/><path d="M2.83 16a10 10 0 0 0 2.43 3.4"/><path d="M4.636 5.235a10 10 0 0 1 .891-.857"/><path d="M8.644 21.42a10 10 0 0 0 7.631-.38"/></svg>
            </button>
          </div>
          
          <div className="flex-1 flex justify-center md:justify-start md:ml-4 relative" ref={modelMenuRef}>
            <button 
              onClick={() => setIsModelMenuOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-50 hover:bg-gray-100 active:scale-95 rounded-full text-sm font-medium transition-all border border-gray-200"
            >
              <div className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                <ZhiyouLogo className="w-3.5 h-3.5" />
              </div>
              {selectedModel === 'gemini-2.5-flash' ? t('modelZhiyou25') : selectedModel === 'zhiyou-3' ? t('modelZhiyou3') : selectedModel === 'zhiyou-art-2.0' ? 'Zhiyou Art 2.0' : 'Zhiyou Art'}
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                {user.email === 'cipaonly08@gmail.com' ? (
                  <div className="relative p-[2px] rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-orange-500 to-pink-500 animate-[spin_3s_linear_infinite]" />
                    <div className="bg-white rounded-full px-3 py-1 relative z-10 flex items-center gap-1.5">
                      <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
                        {user.displayName || 'Pro User'}
                      </span>
                      <Crown className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm font-medium text-gray-900">{user.displayName || 'User'}</span>
                )}
              </div>
              <Link href="/settings" className="group">
                {user.email === 'cipaonly08@gmail.com' ? (
                  <div className="relative p-[2.5px] rounded-full overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-orange-500 to-pink-500 animate-[spin_3s_linear_infinite]" />
                    <div className="bg-white rounded-full p-[3px] relative z-10">
                      <Image src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`} alt="Profile" width={32} height={32} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                ) : (
                  <Image src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`} alt="Profile" width={32} height={32} className="w-8 h-8 rounded-full border-2 border-gray-200 transition-transform cursor-pointer hover:scale-105" referrerPolicy="no-referrer" />
                )}
              </Link>
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
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white border border-gray-100 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/10"
              >
                <ZhiyouLogo className="w-10 h-10 sm:w-12 sm:h-12" />
              </motion.div>
              
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-4xl sm:text-5xl md:text-6xl font-semibold mb-4 text-center tracking-tight"
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
                  
                  <div 
                    className={`max-w-[85%] relative group ${msg.role === 'user' ? 'bg-[#f4f4f5] px-5 py-3 rounded-3xl rounded-tr-sm' : ''}`}
                    onClick={() => msg.role === 'user' && setClickedMessageIndex(clickedMessageIndex === idx ? null : idx)}
                  >
                    {msg.role === 'user' ? (
                      <div className="flex flex-col gap-2">
                        {editingMessageIndex === idx ? (
                          <div className="flex flex-col gap-2 w-full min-w-[200px] sm:min-w-[300px]">
                            <textarea
                              value={editPromptValue}
                              onChange={(e) => setEditPromptValue(e.target.value)}
                              className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              rows={3}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingMessageIndex(null); }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                Batal
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleEditPrompt(idx); }}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                              >
                                Kirim
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {msg.attachments.map((att, i) => (
                                  <div key={i} className="flex items-center gap-2 bg-white/60 border border-gray-200/60 rounded-xl p-2 shadow-sm">
                                    {att.previewUrl ? (
                                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                        <Image src={att.previewUrl} alt="preview" fill className="object-cover" referrerPolicy="no-referrer" />
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
                            <div className={`absolute -left-10 top-1/2 -translate-y-1/2 transition-opacity duration-200 ${clickedMessageIndex === idx ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingMessageIndex(idx);
                                  setEditPromptValue(msg.text || '');
                                  setClickedMessageIndex(null);
                                }}
                                className="p-1.5 bg-white border border-gray-200 text-gray-500 hover:text-blue-600 rounded-full shadow-sm hover:bg-gray-50 transition-all"
                                title="Edit prompt"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil-line-icon lucide-pencil-line w-4 h-4"><path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-gray-50 prose-pre:text-gray-800 prose-pre:border prose-pre:border-gray-200 prose-a:text-blue-600">
                        {msg.imageResults && msg.imageResults.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="mb-4"
                          >
                            <div className="flex items-center justify-between mb-2 px-1">
                              {(msg.model === 'zhiyou-art' || msg.model === 'zhiyou-art-2.0') && (
                                <div className="flex items-center gap-2">
                                  <Wand2 className={`w-4 h-4 ${msg.model === 'zhiyou-art-2.0' ? 'text-pink-500' : 'text-purple-500'}`} />
                                  <span className="text-sm font-semibold text-gray-900">
                                    {msg.model === 'zhiyou-art-2.0' ? 'Zhiyou Art 2.0' : 'Zhiyou Art'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className={`grid ${msg.imageResults.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                              {msg.imageResults.slice(0, 4).map((url, i) => {
                                const isLastAndMore = i === 3 && msg.imageResults!.length > 4;
                                return (
                                  <div 
                                    key={i} 
                                    className="relative group rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 aspect-square cursor-pointer"
                                    onClick={() => {
                                      setShowImagesFor(msg.imageResults!);
                                    }}
                                  >
                                    <Image 
                                      src={url || 'https://picsum.photos/seed/error/400/400'} 
                                      alt={`Result ${i+1}`} 
                                      fill
                                      className={`object-cover transition-transform duration-700 ${isLastAndMore ? 'blur-sm brightness-75' : 'group-hover:scale-110'}`} 
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (url && !target.src.includes('/api/proxy-image')) {
                                          target.src = `/api/proxy-image?url=${encodeURIComponent(url)}`;
                                        } else {
                                          target.src = `https://picsum.photos/seed/zhiyou-${i}/400/400`;
                                        }
                                      }}
                                    />
                                    {isLastAndMore && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <span className="text-white font-bold text-xl">+{msg.imageResults!.length - 4} contoh</span>
                                      </div>
                                    )}
                                    {!isLastAndMore && (
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    )}
                                    {!isLastAndMore && (
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <div className="p-3 bg-black/50 backdrop-blur-sm rounded-full text-white shadow-lg">
                                          <Maximize2 className="w-6 h-6" />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                        {isThinking && idx === messages.length - 1 && !msg.text ? (
                          (msg.model === 'zhiyou-art' || msg.model === 'zhiyou-art-2.0') ? (
                            <div className="mb-4 space-y-3">
                              <div className="flex items-center gap-2 px-1">
                                <Wand2 className={`w-4 h-4 ${msg.model === 'zhiyou-art-2.0' ? 'text-pink-500' : 'text-purple-500'} animate-pulse`} />
                                <span className="text-sm font-semibold text-gray-900 animate-pulse">
                                  {msg.model === 'zhiyou-art-2.0' ? 'Zhiyou Art 2.0 sedang membuat...' : 'Zhiyou sedang mencari...'}
                                </span>
                              </div>
                              
                              {(featureMode === 'imageSearch' || selectedModel === 'zhiyou-art') && (
                                <div className="relative overflow-hidden rounded-2xl px-5 py-4 bg-blue-50/50 border border-blue-100 shadow-sm group">
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer-rtl"></div>
                                  <div className="relative z-10 flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                                      {searchingTexts[loadingTextIndex % searchingTexts.length]}
                                    </span>
                                    <span className="font-bold text-base animate-shimmer-text italic">
                                      &quot;{currentPrompt || 'gambar yang relevan'}&quot;...
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className={`grid ${msg.model === 'zhiyou-art-2.0' ? 'grid-cols-1' : 'grid-cols-2'} gap-2 rounded-2xl overflow-hidden border border-gray-100 shadow-sm`}>
                                {[1, 2, 3, 4].slice(0, msg.model === 'zhiyou-art-2.0' ? 1 : 4).map((i) => (
                                  <div key={i} className="relative bg-gray-100 aspect-square overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer-rtl"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <ImageIcon className="w-8 h-8 text-gray-200" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="relative overflow-hidden rounded-full px-4 py-1.5 bg-gray-100/80 border border-gray-200/50 shadow-sm">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer-rtl"></div>
                                {featureMode === 'research' ? (
                                  <span className="relative z-10 font-medium text-sm tracking-wide text-indigo-600 drop-shadow-sm">
                                    {researchTexts[loadingTextIndex % researchTexts.length]}
                                  </span>
                                ) : featureMode === 'learning' ? (
                                  <span className="relative z-10 font-medium text-sm tracking-wide text-emerald-600 drop-shadow-sm">
                                    {learningTexts[loadingTextIndex % learningTexts.length]}
                                  </span>
                                ) : isSearchEnabled ? (
                                  <span className="relative z-10 font-medium text-sm tracking-wide bg-google-gradient drop-shadow-sm">
                                    {searchingTexts[loadingTextIndex % searchingTexts.length]}
                                  </span>
                                ) : (
                                  <span className="relative z-10 font-medium text-sm tracking-wide text-gray-600 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                                    {thinkingTexts[loadingTextIndex % thinkingTexts.length]}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        ) : (
                          <>
                            {/* Reasoning Text */}
                            {msg.reasoning && (
                              <div className="mb-4">
                                <button 
                                  onClick={() => toggleReasoning(idx)}
                                  className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200"
                                >
                                  <Brain className="w-3.5 h-3.5" />
                                  {t('reasoningProcess')}
                                  <ChevronDown className={`w-3 h-3 transition-transform ${msg.isReasoningExpanded ? 'rotate-180' : ''}`} />
                                </button>
                                
                                <AnimatePresence>
                                  {msg.isReasoningExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden mt-2"
                                    >
                                      <div className="p-4 bg-gray-50/80 rounded-xl border-l-4 border-l-gray-300 border-y border-r border-y-gray-100 border-r-gray-100 text-sm text-gray-500 italic leading-relaxed whitespace-pre-wrap">
                                        {msg.reasoning}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
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
                {(attachments.length > 0 || isUploading) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="relative flex items-center gap-2 bg-white border border-green-200 rounded-xl p-2 pr-8 shadow-sm group">
                        {att.previewUrl ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                            <Image src={att.previewUrl} alt="preview" fill className="object-cover" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-white drop-shadow-md" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 relative">
                            {att.mimeType.startsWith('video/') ? <Video className="w-5 h-5 text-green-500" /> : <FileText className="w-5 h-5 text-green-500" />}
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-gray-700 truncate">{truncateName(att.name)}</span>
                          <span className="text-[10px] text-green-600 font-medium">{t('done')} • {att.size}</span>
                        </div>
                        <button 
                          onClick={() => {
                            setAttachments(prev => {
                              const newAtts = prev.filter((_, i) => i !== idx);
                              if (newAtts.length === 0) setIsImageAnalysisMode(false);
                              return newAtts;
                            });
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 bg-gray-100 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-gray-600" />
                        </button>
                      </div>
                    ))}
                    
                    {isUploading && (
                      <div className="relative flex items-center gap-3 bg-white border border-blue-200 rounded-xl p-2 pr-4 shadow-sm min-w-[160px]">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-700">{t('uploading')}</span>
                            <span className="text-[10px] font-medium text-blue-600">{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out" 
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
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
                  placeholder={
                    isImageAnalysisMode 
                      ? "Apa yang ingin diketahui pada gambar ini?" 
                      : (featureMode === 'image' || featureMode === 'imageSearch' || selectedModel === 'zhiyou-art' || selectedModel === 'zhiyou-art-2.0') 
                        ? "Cari gambar atau upload gambar referensi" 
                        : featureMode === 'learning'
                          ? t('askLearning')
                          : t('askAnything')
                  }
                  className={`w-full bg-transparent resize-none outline-none max-h-48 min-h-[40px] text-gray-800 placeholder:text-gray-500 text-base transition-opacity duration-300 ${input.length > 0 ? 'opacity-100' : 'opacity-70'}`}
                  rows={1}
                />
                
                {/* Pro Uses Indicator */}
                {user && user.email !== 'cipaonly08@gmail.com' && proUses !== null && (selectedModel === 'zhiyou-3' || featureMode === 'image' || featureMode === 'imageSearch' || selectedModel === 'zhiyou-art' || selectedModel === 'zhiyou-art-2.0') && (
                  <div className="absolute top-2 right-2 flex items-center justify-center bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-full px-2 py-1 shadow-sm" title="Pro Uses Remaining">
                    <Zap className="w-3.5 h-3.5 text-purple-600 mr-1" />
                    <span className="text-xs font-bold text-purple-700">{proUses}</span>
                  </div>
                )}
                
                {/* Pro Uses Indicator */}
                {user && user.email !== 'cipaonly08@gmail.com' && proUses !== null && (selectedModel === 'zhiyou-3' || featureMode === 'image' || featureMode === 'imageSearch' || selectedModel === 'zhiyou-art' || selectedModel === 'zhiyou-art-2.0') && (
                  <div className="absolute top-2 right-2 flex items-center justify-center bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-full px-2 py-1 shadow-sm" title="Pro Uses Remaining">
                    <Zap className="w-3.5 h-3.5 text-purple-600 mr-1" />
                    <span className="text-xs font-bold text-purple-700">{proUses}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 relative" ref={attachmentMenuRef}>
                    <button 
                      onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                      className={`p-2 rounded-full transition-all active:scale-90 ${isAttachmentMenuOpen ? 'bg-gray-200 text-gray-800' : 'hover:bg-gray-200/80 text-gray-500'}`} 
                      title={t('addFile')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-paperclip-icon lucide-paperclip w-5 h-5 transition-transform duration-300 ${isAttachmentMenuOpen ? 'rotate-45' : ''}`}><path d="m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551"/></svg>
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
                          className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 flex flex-col gap-0.5 z-50 min-w-[160px] sm:min-w-[200px]"
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
                            className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 flex flex-col gap-0.5 z-50 min-w-[200px] sm:min-w-[240px]"
                          >
                            <button onClick={() => { handleModelOrFeatureChange('zhiyou-art-2.0', 'image'); setIsFeatureMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-sm font-medium text-gray-700 transition-all text-left">
                              <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center relative">
                                <ImageIcon className="w-4 h-4 text-pink-500" />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span>{t('featureGenerateImage')}</span>
                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[8px] font-bold rounded-full uppercase tracking-wider">FREE</span>
                                </div>
                              </div>
                            </button>
                            <button onClick={() => { handleModelOrFeatureChange('zhiyou-art', 'imageSearch'); setIsFeatureMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-sm font-medium text-gray-700 transition-all text-left">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center relative">
                                <Search className="w-4 h-4 text-blue-500" />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span>{t('featureSearchImage')}</span>
                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[8px] font-bold rounded-full uppercase tracking-wider">FREE</span>
                                </div>
                              </div>
                            </button>
                            <button onClick={() => { handleModelOrFeatureChange(selectedModel, 'research'); setIsSearchEnabled(true); setIsFeatureMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-sm font-medium text-gray-700 transition-all text-left">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <Search className="w-4 h-4 text-indigo-500" />
                              </div>
                              {t('featureDeepResearch')}
                            </button>
                            <button onClick={() => { handleModelOrFeatureChange(selectedModel, 'learning'); setIsSearchEnabled(true); setIsFeatureMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-sm font-medium text-gray-700 transition-all text-left">
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
                    onClick={() => handleSend()}
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
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowSourcesFor(null)}>
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl max-h-[80vh] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-2xl"
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
          </div>
        )}
      </AnimatePresence>

      {/* Image Gallery Bottom Sheet */}
      <AnimatePresence>
        {showImagesFor && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowImagesFor(null)}>
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-2xl rounded-t-[32px] md:rounded-[32px] p-6 shadow-2xl flex flex-col gap-6 max-h-[85vh]"
            >
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Semua Gambar</h3>
                    <p className="text-xs text-gray-500">{showImagesFor.length} hasil ditemukan</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowImagesFor(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-2 -mr-2 space-y-6">
                {showImagesFor.map((url, idx) => (
                  <div key={idx} className="flex flex-col gap-3">
                    <div className="w-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 relative min-h-[400px]">
                      <Image 
                        src={url} 
                        alt={`Result ${idx + 1}`} 
                        fill
                        className="object-contain max-h-[60vh]"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (url && !target.src.includes('/api/proxy-image')) {
                            target.src = `/api/proxy-image?url=${encodeURIComponent(url)}`;
                          }
                        }}
                      />
                    </div>
                    <div className="flex justify-end relative">
                      <button 
                        onClick={() => setOpenMenuIndex(openMenuIndex === idx ? null : idx)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>
                      
                      <AnimatePresence>
                        {openMenuIndex === idx && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 5 }}
                            className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-50 min-w-[180px]"
                          >
                            <button onClick={() => { startAnalysis(url); setOpenMenuIndex(null); setShowImagesFor(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition-colors">
                              <Brain className="w-4 h-4 text-blue-500" /> Analisis Gambar
                            </button>
                            <button onClick={() => { handleDownload(url); setOpenMenuIndex(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition-colors">
                              <Download className="w-4 h-4 text-gray-500" /> Unduh
                            </button>
                            <button onClick={() => { handleShareImage(url); setOpenMenuIndex(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition-colors">
                              <Share2 className="w-4 h-4 text-gray-500" /> Bagikan
                            </button>
                            <button onClick={() => { handleSaveToCloud(url); setOpenMenuIndex(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition-colors">
                              <Cloud className="w-4 h-4 text-gray-500" /> Simpan ke Cloud
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Model Selection Bottom Sheet */}
      <AnimatePresence>
        {isModelMenuOpen && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-md" onClick={() => setIsModelMenuOpen(false)}>
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 md:hidden" />
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Pilih Model</h2>
                <button onClick={() => setIsModelMenuOpen(false)} className="hidden md:block p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => { handleModelOrFeatureChange('gemini-2.5-flash', (featureMode === 'imageSearch' || featureMode === 'image') ? 'chat' : featureMode); setIsModelMenuOpen(false); }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${selectedModel === 'gemini-2.5-flash' ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{t('modelZhiyou25')}</h3>
                      <p className="text-sm text-gray-500">{t('modelZhiyou25Desc')}</p>
                    </div>
                  </div>
                  {selectedModel === 'gemini-2.5-flash' && <Check className="w-5 h-5 text-blue-600" />}
                </button>

                <button 
                  onClick={() => { handleModelOrFeatureChange('zhiyou-3', (featureMode === 'imageSearch' || featureMode === 'image') ? 'chat' : featureMode); setIsModelMenuOpen(false); }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${selectedModel === 'zhiyou-3' ? 'border-amber-500 bg-amber-50/30' : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 relative">
                      <Brain className="w-5 h-5" />
                      <Crown className="w-3 h-3 absolute -top-1 -right-1 text-amber-500" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{t('modelZhiyou3')}</h3>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider">VIP</span>
                      </div>
                      <p className="text-sm text-gray-500">{t('modelZhiyou3Desc')}</p>
                    </div>
                  </div>
                  {selectedModel === 'zhiyou-3' && <Check className="w-5 h-5 text-amber-600" />}
                </button>

                <button 
                  onClick={() => { handleModelOrFeatureChange('zhiyou-art', 'imageSearch'); setIsModelMenuOpen(false); }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${selectedModel === 'zhiyou-art' ? 'border-purple-500 bg-purple-50/30' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 relative">
                      <Search className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">Zhiyou Art</h3>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">FREE</span>
                      </div>
                      <p className="text-sm text-gray-500">Pencarian gambar cerdas</p>
                    </div>
                  </div>
                  {selectedModel === 'zhiyou-art' && <Check className="w-5 h-5 text-purple-600" />}
                </button>

                <button 
                  onClick={() => { handleModelOrFeatureChange('zhiyou-art-2.0', 'image'); setIsModelMenuOpen(false); }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${selectedModel === 'zhiyou-art-2.0' ? 'border-pink-500 bg-pink-50/30' : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 relative">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">Zhiyou Art 2.0</h3>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">FREE</span>
                      </div>
                      <p className="text-sm text-gray-500">Pembuatan gambar AI berkualitas tinggi</p>
                    </div>
                  </div>
                  {selectedModel === 'zhiyou-art-2.0' && <Check className="w-5 h-5 text-pink-600" />}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-lg flex items-center gap-3 z-[200] ${
              toastMessage.type === 'success' ? 'bg-emerald-600 text-white' :
              toastMessage.type === 'error' ? 'bg-red-600 text-white' :
              'bg-gray-900 text-white'
            }`}
          >
            {toastMessage.type === 'success' && <Check className="w-4 h-4" />}
            {toastMessage.type === 'error' && <X className="w-4 h-4" />}
            {toastMessage.type === 'info' && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <span className="text-sm font-medium">{toastMessage.text}</span>
          </motion.div>
        )}
        {isSavingToCloud && !toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 z-[200]"
          >
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-sm font-medium">{savingProgress}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
