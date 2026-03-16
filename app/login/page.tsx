'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';

const ZhiyouLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="z-grad-login" x1="5" y1="7" x2="27" y2="25" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4ade80" />
        <stop offset="1" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <path 
      d="M 11 7 L 27 7 L 23 13 L 21 13 L 17 19 L 25 19 L 21 25 L 5 25 L 9 19 L 11 19 L 15 13 L 7 13 Z" 
      fill="url(#z-grad-login)" 
      stroke="url(#z-grad-login)" 
      strokeWidth="1.5" 
      strokeLinejoin="round" 
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/');
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/');
    } catch (error) {
      console.error("Error signing in with Google:", error);
      alert(t('loginError'));
    }
  };

  if (isLoading) {
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
    <div className="flex min-h-screen bg-gray-50 items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100"
      >
        <div className="p-8 sm:p-10 flex flex-col">
          {/* Logo */}
          <div className="mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
              <ZhiyouLogo className="w-8 h-8" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
            {t('signIn')}
          </h1>
          <p className="text-sm text-gray-600 mb-8">
            {t('newUser')} <a href="#" className="font-semibold text-gray-900 hover:underline">{t('createAccount')}</a>
          </p>

          {/* Form Fields */}
          <div className="space-y-4 mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="email" 
                placeholder={t('emailAddress')} 
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder={t('password')} 
                className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="mb-8">
            <a href="#" className="text-sm text-gray-600 font-medium hover:text-gray-900 transition-colors">
              {t('forgotPassword')}
            </a>
          </div>

          <button 
            onClick={() => alert(t('emailLoginNotImplemented'))}
            className="w-full py-4 bg-black text-white font-semibold rounded-full hover:bg-gray-800 active:scale-[0.98] transition-all mb-8"
          >
            {t('login')}
          </button>
          
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-xs text-gray-400 font-medium uppercase">or</span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>

          {/* Social Logins */}
          <div className="space-y-3 mb-8">
            <button 
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-full active:scale-[0.98] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="text-sm">{t('continueWithGoogle')}</span>
            </button>
          </div>

          <div className="text-[10px] text-gray-400 text-center leading-relaxed px-4">
            {t('termsAndPrivacy')}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
