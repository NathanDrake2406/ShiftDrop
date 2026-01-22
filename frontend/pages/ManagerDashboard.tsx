import React, { useEffect, useState } from 'react';
import { api } from '../services/mockApi';
import { Pool } from '../types';
import { Layout } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Users, Plus } from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  const handleCreatePool = async () => {
    const name = prompt("Enter pool name (e.g., 'Bar Staff')");
    if (name) {
      setLoading(true);
      await api.manager.createPool(name);
      const data = await api.manager.getPools();
      setPools(data);
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
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-transform cursor-pointer flex justify-between items-center group"
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
          onClick={handleCreatePool}
        >
          <div className="flex flex-col items-center gap-2">
            <Plus className="w-6 h-6" />
            <span>Create New Pool</span>
          </div>
        </Button>
      </div>
    </Layout>
  );
};
