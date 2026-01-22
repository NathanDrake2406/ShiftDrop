import React, { useEffect, useState } from 'react';
import { api } from '../services/mockApi';
import { Pool } from '../types';
import { Layout } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, X } from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [isCreatingPool, setIsCreatingPool] = useState(false);
  const [poolName, setPoolName] = useState('');
  const [poolError, setPoolError] = useState<string | null>(null);
  const [isSavingPool, setIsSavingPool] = useState(false);

  useEffect(() => {
    const fetchPools = async () => {
      try {
        const data = await api.manager.getPools();
        setPools(data);
      } finally {
        setLoading(false);
      }
    };
    fetchPools();
  }, []);

  const openCreatePool = () => {
    setPoolName('');
    setPoolError(null);
    setIsCreatingPool(true);
  };

  const closeCreatePool = () => {
    setIsCreatingPool(false);
    setPoolName('');
    setPoolError(null);
  };

  const handleCreatePool = async () => {
    const trimmedName = poolName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      setPoolError('Pool name must be 2-60 characters.');
      return;
    }

    setIsSavingPool(true);
    setLoading(true);
    try {
      await api.manager.createPool(trimmedName);
      const data = await api.manager.getPools();
      setPools(data);
      closeCreatePool();
    } finally {
      setIsSavingPool(false);
      setLoading(false);
    }
  };

  return (
    <Layout 
      title="My Pools" 
      actions={<Button size="sm" variant="ghost" onClick={() => navigate('/')}>Log Out</Button>}
    >
      <div className="space-y-4">
        {loading && <div className="text-center p-4 text-slate-400">Loading pools...</div>}
        
        {!loading && pools.map(pool => (
          <div 
            key={pool.id} 
            onClick={() => navigate(`/manager/pool/${pool.id}`)}
            className="ui-surface p-5 rounded-2xl shadow-sm active:scale-95 transition-transform cursor-pointer flex justify-between items-center group"
          >
            <div>
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">{pool.name}</h3>
              <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
                <Users className="w-4 h-4" />
                <span>{pool.casuals.length} casuals</span>
                <span className="text-slate-300">•</span>
                <span>{pool.shifts.filter(s => s.status === 'Open').length} open shifts</span>
              </div>
            </div>
            <div className="text-slate-300">
               <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
        ))}

        <Button 
          variant="secondary" 
          className="w-full border-dashed border-2 py-8 text-slate-400 hover:text-blue-600 hover:border-blue-200"
          onClick={openCreatePool}
        >
          <div className="flex flex-col items-center gap-2">
            <Plus className="w-6 h-6" />
            <span>Create New Pool</span>
          </div>
        </Button>
      </div>

      {isCreatingPool && (
        <div className="ui-modal-backdrop items-end sm:items-center">
          <div className="ui-modal-panel max-w-md animate-in slide-in-from-bottom-10 fade-in duration-200">
             <div className="ui-modal-header">
                 <h2 className="ui-modal-title">Create Pool</h2>
                 <button onClick={closeCreatePool} className="ui-icon-button"><X className="w-4 h-4" /></button>
             </div>

             <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreatePool();
                }}
             >
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pool Name</label>
                    <input 
                        type="text"
                        placeholder="e.g. Bar Staff"
                        className={`ui-input ${poolError ? 'ui-input-error' : ''}`}
                        value={poolName}
                        onChange={(e) => {
                          setPoolName(e.target.value);
                          if (poolError) setPoolError(null);
                        }}
                    />
                    {poolError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{poolError}</p>}
                </div>
                <div className="flex gap-3">
                    <Button type="button" variant="secondary" className="flex-1" onClick={closeCreatePool}>
                        Cancel
                    </Button>
                    <Button type="submit" className="flex-1" isLoading={isSavingPool}>
                        Create Pool
                    </Button>
                </div>
             </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
