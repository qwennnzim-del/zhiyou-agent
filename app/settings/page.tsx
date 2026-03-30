'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Globe, Check, Trash2, AlertTriangle, LogOut, Crown, Star, Zap } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { auth } from '../lib/firebase';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [toastMessage, setToastMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);
  const router = useRouter();

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePlanClick = (planName: string) => {
    showToast(`Fitur pembayaran untuk paket ${planName} sedang dalam tahap pengembangan.`, 'info');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

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

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center sticky top-0 z-10">
        <Link href="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 ml-2">{t('settings')}</h1>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-20">
        
        {/* Subscription Plans */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Berlangganan Zhiyou AI</h2>
              <p className="text-sm text-gray-600">Tingkatkan limit kredit dan buka fitur eksklusif.</p>
            </div>
          </div>

          <div className="p-4 sm:p-6 grid gap-4 sm:grid-cols-3">
            {/* Standar Plan */}
            <div className="border border-gray-200 rounded-2xl p-4 flex flex-col hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Star className="w-12 h-12 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Standar</h3>
              <div className="text-2xl font-black text-blue-600 mb-4">Rp 49k<span className="text-sm font-medium text-gray-500">/bln</span></div>
              <ul className="text-sm text-gray-600 space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 500 Kredit/bulan</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Resolusi HD</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Prioritas Standar</li>
              </ul>
              <button onClick={() => handlePlanClick('Standar')} className="w-full py-2 bg-blue-50 text-blue-600 font-semibold rounded-xl hover:bg-blue-100 transition-colors">Pilih Standar</button>
            </div>

            {/* Pro Plan */}
            <div className="border-2 border-amber-400 rounded-2xl p-4 flex flex-col shadow-lg relative overflow-hidden group transform sm:-translate-y-2 bg-gradient-to-b from-white to-amber-50/30">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Crown className="w-12 h-12 text-amber-500" />
              </div>
              <div className="absolute top-3 right-3 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Populer</div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Pro</h3>
              <div className="text-2xl font-black text-amber-600 mb-4">Rp 99k<span className="text-sm font-medium text-gray-500">/bln</span></div>
              <ul className="text-sm text-gray-600 space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 1500 Kredit/bulan</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Resolusi 4K Ultra HD</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Prioritas Tinggi</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Akses Model Terbaru</li>
              </ul>
              <button onClick={() => handlePlanClick('Pro')} className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-md">Pilih Pro</button>
            </div>

            {/* Ultra Plan */}
            <div className="border border-gray-200 rounded-2xl p-4 flex flex-col hover:border-purple-300 hover:shadow-md transition-all cursor-pointer bg-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="w-12 h-12 text-purple-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Ultra</h3>
              <div className="text-2xl font-black text-purple-600 mb-4">Rp 199k<span className="text-sm font-medium text-gray-500">/bln</span></div>
              <ul className="text-sm text-gray-600 space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Kredit Unlimited*</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Resolusi Maksimal</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Prioritas Tertinggi</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Dukungan VIP 24/7</li>
              </ul>
              <button onClick={() => handlePlanClick('Ultra')} className="w-full py-2 bg-purple-50 text-purple-600 font-semibold rounded-xl hover:bg-purple-100 transition-colors">Pilih Ultra</button>
            </div>
          </div>
          <div className="px-6 pb-4 text-xs text-center text-gray-400">
            *Fitur VIP sedang dalam tahap pengembangan bertahap. Pembayaran belum tersedia saat ini.
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
          transition={{ delay: 0.2 }}
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

        {/* Logout Section */}
        {user && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Akun</h2>
                <p className="text-sm text-gray-500">Keluar dari akun Anda saat ini.</p>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {!showLogoutConfirm ? (
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar / Logout
                </button>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-4">
                  <p className="text-sm text-gray-800 font-medium text-center">
                    Apakah Anda yakin ingin keluar dari akun ini?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all text-sm font-medium"
                    >
                      Batal
                    </button>
                    <button
                      onClick={confirmLogout}
                      className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 active:scale-[0.98] transition-all text-sm font-medium"
                    >
                      Ya, Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>

      {/* Toast Notification */}
      {/* @ts-ignore */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-2xl shadow-2xl"
          >
            {toastMessage.type === 'success' && <Check className="w-5 h-5 text-green-400" />}
            {toastMessage.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400" />}
            {toastMessage.type === 'info' && <div className="w-2 h-2 rounded-full bg-blue-400" />}
            <span className="text-sm font-medium">{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
