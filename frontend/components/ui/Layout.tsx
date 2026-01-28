import React, { useEffect, useState } from 'react';
import { Moon, Sun, ArrowLeft } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, showBack, onBack, actions }) => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedTheme = window.localStorage.getItem('theme');
        return storedTheme === 'dark' ||
          (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      } catch {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      try {
        window.localStorage.setItem('theme', 'dark');
      } catch {
        // Ignore storage errors (e.g., private browsing)
      }
    } else {
      root.classList.remove('dark');
      try {
        window.localStorage.setItem('theme', 'light');
      } catch {
        // Ignore storage errors (e.g., private browsing)
      }
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col max-w-md mx-auto shadow-2xl shadow-slate-200 dark:shadow-black overflow-hidden relative border-x border-slate-100 dark:border-slate-800 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 h-16 flex items-center justify-between sticky top-0 z-10 shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-3">
          {showBack && (
            <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {!showBack && (
            <img src="/logo.webp" alt="ShiftDrop" className="h-8 w-auto" />
          )}
          {title && <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">{title}</h1>}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {actions}
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        {children}
      </main>
    </div>
  );
};
