import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/mockApi';
import { Pool } from '../types';
import { Layout } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { ShiftCard } from '../components/ShiftCard';
import { Plus, X, Trash2 } from 'lucide-react';

export const PoolDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shifts' | 'casuals'>('shifts');
  
  // Create Shift State
  const toLocalInput = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const buildDefaultShiftForm = () => {
    const start = new Date();
    start.setSeconds(0, 0);
    start.setMinutes(0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setHours(start.getHours() + 4);

    return {
      startsAt: toLocalInput(start),
      endsAt: toLocalInput(end),
      spotsNeeded: 1
    };
  };

  const [isCreating, setIsCreating] = useState(false);

  const [shiftForm, setShiftForm] = useState<{
    startsAt: string;
    endsAt: string;
    spotsNeeded: number;
  }>(buildDefaultShiftForm());

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const data = await api.manager.getPoolDetails(id);
    if (data) setPool(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePostShift = async () => {
    if (!id) return;
    
    if (!shiftForm.startsAt || !shiftForm.endsAt) {
        alert("Please select start and end times.");
        return;
    }

    const startDate = new Date(shiftForm.startsAt);
    const endDate = new Date(shiftForm.endsAt);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      alert("Invalid dates. Please choose valid start and end times.");
      return;
    }

    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    if (durationHours <= 0) {
      alert("End time must be after the start time.");
      return;
    }
    if (durationHours > 15) {
      alert("Shift duration cannot exceed 15 hours.");
      return;
    }
    if (shiftForm.spotsNeeded <= 0) {
      alert("Spots needed must be at least 1.");
      return;
    }

    await api.manager.postShift(id, {
      startsAt: startDate.toISOString(),
      endsAt: endDate.toISOString(),
      spotsNeeded: shiftForm.spotsNeeded
    });
    
    setIsCreating(false);
    // Reset form
    setShiftForm(buildDefaultShiftForm());
    loadData();
  };

  const handleCancelShift = async (shiftId: string) => {
    if (!id) return;
    if (window.confirm('Cancel this shift?')) {
      await api.manager.cancelShift(id, shiftId);
      loadData();
    }
  };

  const handleAddCasual = async () => {
     const name = prompt("Casual Name:");
     const phone = prompt("Phone Number:");
     if (name && phone && id) {
         await api.manager.addCasual(id, name, phone);
         loadData();
     }
  }

  const handleRemoveCasual = async (casualId: string) => {
      if (!id) return;
      if (window.confirm("Remove this casual from the pool?")) {
          await api.manager.removeCasual(id, casualId);
          loadData();
      }
  }

  const handleReleaseClaim = async (shiftId: string, claimId: string) => {
      if (!id) return;
      if (window.confirm("Remove this worker from the shift?")) {
          await api.manager.releaseClaim(id, shiftId, claimId);
          loadData();
      }
  }

  if (loading) return <Layout><div className="p-4 text-center dark:text-slate-400">Loading...</div></Layout>;
  if (!pool) return <Layout><div className="p-4 text-center dark:text-slate-400">Pool not found</div></Layout>;

  return (
    <Layout title={pool.name} showBack onBack={() => navigate('/manager')}>
      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
        <button 
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'shifts' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
          onClick={() => setActiveTab('shifts')}
        >
          Shifts
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'casuals' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
          onClick={() => setActiveTab('casuals')}
        >
          Casuals ({pool.casuals.length})
        </button>
      </div>

      {activeTab === 'shifts' && (
        <div className="space-y-4 pb-20">
          {pool.shifts.length === 0 && (
             <div className="text-center py-10 text-slate-400">No shifts yet. Post one!</div>
          )}
          {[...pool.shifts].reverse().map(shift => (
            <ShiftCard 
              key={shift.id} 
              shift={shift} 
              userType="manager" 
              onCancel={handleCancelShift} 
              onReleaseClaim={handleReleaseClaim}
            />
          ))}
        </div>
      )}

      {activeTab === 'casuals' && (
        <div className="space-y-3">
            <Button variant="secondary" onClick={handleAddCasual} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Casual
            </Button>
            {pool.casuals.map(casual => (
                <div key={casual.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{casual.name}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{casual.phoneNumber}</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${casual.inviteStatus === 'Accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                            {casual.inviteStatus}
                        </span>
                        <button 
                            onClick={() => handleRemoveCasual(casual.id)}
                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Floating Action Button for Create */}
      {activeTab === 'shifts' && !isCreating && (
        <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-20">
          <Button 
            className="shadow-xl rounded-full px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            onClick={() => {
              setShiftForm(buildDefaultShiftForm());
              setIsCreating(true);
            }}
          >
            <Plus className="w-5 h-5" /> Post Shift
          </Button>
        </div>
      )}

      {/* Create Shift Modal/Drawer */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-200">
             <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold dark:text-white">New Shift</h2>
                 <button onClick={() => setIsCreating(false)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full dark:text-slate-300"><X className="w-4 h-4" /></button>
             </div>

             <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                    <input 
                        type="datetime-local" 
                        className="w-full border dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 dark:text-white"
                        value={shiftForm.startsAt}
                        onChange={(e) => setShiftForm({...shiftForm, startsAt: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                    <input 
                        type="datetime-local" 
                        className="w-full border dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 dark:text-white"
                        value={shiftForm.endsAt}
                        onChange={(e) => setShiftForm({...shiftForm, endsAt: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Spots Needed</label>
                    <input 
                        type="number" 
                        min="1"
                        className="w-full border dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700 dark:text-white"
                        value={shiftForm.spotsNeeded}
                        onChange={(e) => setShiftForm({...shiftForm, spotsNeeded: parseInt(e.target.value)})}
                    />
                </div>
                <Button className="w-full mt-2" onClick={handlePostShift}>
                    Post Shift
                </Button>
             </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
