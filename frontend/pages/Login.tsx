import React, { useState } from 'react';
import { api } from '../services/mockApi';
import { Casual } from '../types';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/ui/Layout';

interface LoginProps {
  onCasualLogin: (casual: Casual) => void;
}

export const Login: React.FC<LoginProps> = ({ onCasualLogin }) => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('555-0101'); // Default for demo
  const [loading, setLoading] = useState(false);

  const handleCasualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const casual = await api.casual.login(phoneNumber);
      if (casual) {
        onCasualLogin(casual);
      } else {
        alert("Phone number not found in any pool.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 px-4">
        <div className="text-center">
            <h1 className="text-4xl font-extrabold text-blue-600 dark:text-blue-500 tracking-tight mb-2">ShiftDrop</h1>
            <p className="text-slate-500 dark:text-slate-400">Fast shift filling for busy teams.</p>
        </div>

        <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 space-y-6">
            
            {/* Casual Login Flow */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">I'm a Casual Worker</h2>
                <form onSubmit={handleCasualLogin} className="space-y-3">
                    <input 
                        type="tel" 
                        placeholder="Phone Number (e.g. 555-0101)"
                        className="w-full border dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-700 dark:text-white focus:bg-white dark:focus:bg-slate-600 transition-colors"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                    <Button type="submit" className="w-full bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600" isLoading={loading}>
                        Sign In with Phone
                    </Button>
                </form>
                <p className="text-xs text-center mt-3 text-slate-400 dark:text-slate-500">
                    Use <span className="font-mono">555-0101</span> for demo.
                </p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700"></div>

            {/* Manager Entry */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">I'm a Manager</h2>
                <Button 
                    variant="primary" 
                    className="w-full"
                    onClick={() => navigate('/manager')}
                >
                    Open Manager Dashboard
                </Button>
            </div>
        </div>
      </div>
    </Layout>
  );
};