'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Globe, Check, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';

const languages = [
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'zh', name: '中文 (Simplified Chinese)' },
];

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetData = () => {
    // Clear local storage and session storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Unregister service workers if any
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
        }
      });
    }

    // Reload the page to clear memory cache
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center sticky top-0 z-10">
        <Link href="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 ml-2">{t('settings')}</h1>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t('language')}</h2>
              <p className="text-sm text-gray-500">{t('selectLanguage')}</p>
            </div>
          </div>

          <div className="p-2 max-h-[60vh] overflow-y-auto">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code as any)}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all active:scale-[0.98] ${
                  language === lang.code 
                    ? 'bg-blue-50 border border-blue-100' 
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${language === lang.code ? 'font-semibold text-blue-700' : 'font-medium text-gray-700'}`}>
                    {lang.name}
                  </span>
                </div>
                {language === lang.code && (
                  <Check className="w-5 h-5 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Reset Data & Cache</h2>
              <p className="text-sm text-gray-500">Hapus cache lokal jika aplikasi mengalami error.</p>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 active:scale-[0.98] transition-all font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Cache & Reset Aplikasi
              </button>
            ) : (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col gap-4">
                <p className="text-sm text-red-800 font-medium text-center">
                  Apakah Anda yakin? Ini akan menghapus semua cache lokal dan memuat ulang aplikasi.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all text-sm font-medium"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleResetData}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-[0.98] transition-all text-sm font-medium"
                  >
                    Ya, Reset Sekarang
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
