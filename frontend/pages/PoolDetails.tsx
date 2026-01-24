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
  const toDateInput = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const toTimeInput = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const parseDateTimeInput = (dateValue: string, timeValue: string) => {
    const [yearValue, monthValue, dayValue] = dateValue.split('-').map(Number);
    const [hoursValue, minutesValue] = timeValue.split(':').map(Number);

    if (
      [yearValue, monthValue, dayValue, hoursValue, minutesValue].some((value) => Number.isNaN(value))
    ) {
      return null;
    }

    if (
      monthValue < 1 ||
      monthValue > 12 ||
      dayValue < 1 ||
      dayValue > 31 ||
      hoursValue < 0 ||
      hoursValue > 23 ||
      minutesValue < 0 ||
      minutesValue > 59
    ) {
      return null;
    }

    const parsed = new Date(yearValue, monthValue - 1, dayValue, hoursValue, minutesValue, 0, 0);
    if (
      parsed.getFullYear() !== yearValue ||
      parsed.getMonth() !== monthValue - 1 ||
      parsed.getDate() !== dayValue ||
      parsed.getHours() !== hoursValue ||
      parsed.getMinutes() !== minutesValue
    ) {
      return null;
    }

    return parsed;
  };

  const buildDefaultShiftForm = () => {
    const start = new Date();
    start.setSeconds(0, 0);
    start.setMinutes(0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setHours(start.getHours() + 4);

    return {
      startDate: toDateInput(start),
      startTime: toTimeInput(start),
      endDate: toDateInput(end),
      endTime: toTimeInput(end),
      spotsNeeded: 1
    };
  };

  const [isCreating, setIsCreating] = useState(false);
  const [isAddingCasual, setIsAddingCasual] = useState(false);
  const [isSavingCasual, setIsSavingCasual] = useState(false);
  const [casualForm, setCasualForm] = useState({ name: '', phone: '' });
  const [casualErrors, setCasualErrors] = useState<{ name?: string; phone?: string }>({});
  const [confirmAction, setConfirmAction] = useState<null | {
    type: 'cancelShift' | 'removeCasual' | 'releaseClaim';
    shiftId?: string;
    casualId?: string;
    claimId?: string;
  }>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);

  const [shiftForm, setShiftForm] = useState<{
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    spotsNeeded: number;
  }>(buildDefaultShiftForm());

  const loadData = async () => {
    if (!id) {
      setPool(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await api.manager.getPoolDetails(id);
    setPool(data ?? null);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePostShift = async () => {
    if (!id) return;
    
    if (!shiftForm.startDate || !shiftForm.startTime || !shiftForm.endDate || !shiftForm.endTime) {
        alert("Please select start and end dates and times.");
        return;
    }

    const startDate = parseDateTimeInput(shiftForm.startDate, shiftForm.startTime);
    const endDate = parseDateTimeInput(shiftForm.endDate, shiftForm.endTime);
    if (!startDate || !endDate) {
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
    if (!Number.isFinite(shiftForm.spotsNeeded) || !Number.isInteger(shiftForm.spotsNeeded) || shiftForm.spotsNeeded <= 0) {
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
    setConfirmAction({ type: 'cancelShift', shiftId });
  };

  const validateCasualForm = (nameInput: string, phoneInput: string) => {
     const errors: { name?: string; phone?: string } = {};
     const name = nameInput.trim();
     if (name.length < 2 || name.length > 50 || !/[A-Za-z]/.test(name)) {
         errors.name = 'Name must be 2-50 characters and include a letter.';
     }

     const phone = phoneInput.trim();
     const digitsOnly = phone.replace(/\D/g, '');
     if (!phone) {
         errors.phone = 'Phone number is required.';
     } else if (!/^[0-9+()\s-]+$/.test(phone) || digitsOnly.length < 7 || digitsOnly.length > 15) {
         errors.phone = 'Enter a valid phone number.';
     }

     return { errors, name, phone };
  };

  const openAddCasual = () => {
     setCasualForm({ name: '', phone: '' });
     setCasualErrors({});
     setIsAddingCasual(true);
  };

  const closeAddCasual = () => {
     setIsAddingCasual(false);
     setCasualErrors({});
     setCasualForm({ name: '', phone: '' });
  };

  const handleAddCasual = async () => {
     if (!id) return;

     const { errors, name, phone } = validateCasualForm(casualForm.name, casualForm.phone);
     setCasualErrors(errors);
     if (errors.name || errors.phone) {
         return;
     }

     setIsSavingCasual(true);
     try {
         await api.manager.addCasual(id, name, phone);
         closeAddCasual();
         loadData();
     } finally {
         setIsSavingCasual(false);
     }
  }

  const handleRemoveCasual = async (casualId: string) => {
      setConfirmAction({ type: 'removeCasual', casualId });
  }

  const handleReleaseClaim = async (shiftId: string, claimId: string) => {
      setConfirmAction({ type: 'releaseClaim', shiftId, claimId });
  }

  const confirmActionCopy = (() => {
    if (!confirmAction) return null;
    switch (confirmAction.type) {
      case 'cancelShift':
        return {
          title: 'Cancel Shift',
          message: 'Cancel this shift? It will be removed for everyone.',
          confirmLabel: 'Cancel Shift'
        };
      case 'removeCasual':
        return {
          title: 'Remove Casual',
          message: 'Remove this casual from the pool?',
          confirmLabel: 'Remove Casual'
        };
      case 'releaseClaim':
        return {
          title: 'Remove Worker',
          message: 'Remove this worker from the shift?',
          confirmLabel: 'Remove Worker'
        };
      default:
        return null;
    }
  })();

  const handleConfirmAction = async () => {
    if (!id || !confirmAction) return;
    setIsConfirmingAction(true);
    try {
      if (confirmAction.type === 'cancelShift' && confirmAction.shiftId) {
        await api.manager.cancelShift(id, confirmAction.shiftId);
      }
      if (confirmAction.type === 'removeCasual' && confirmAction.casualId) {
        await api.manager.removeCasual(id, confirmAction.casualId);
      }
      if (confirmAction.type === 'releaseClaim' && confirmAction.shiftId && confirmAction.claimId) {
        await api.manager.releaseClaim(id, confirmAction.shiftId, confirmAction.claimId);
      }
      await loadData();
    } finally {
      setIsConfirmingAction(false);
      setConfirmAction(null);
    }
  };

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
          {pool.shifts.filter((shift) => shift.status !== 'Cancelled').length === 0 && (
             <div className="text-center py-10 text-slate-400">No shifts yet. Post one!</div>
          )}
          {pool.shifts
            .filter((shift) => shift.status !== 'Cancelled')
            .reverse()
            .map(shift => (
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
            <Button variant="secondary" onClick={openAddCasual} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Casual
            </Button>
            {pool.casuals.map(casual => (
                <div key={casual.id} className="ui-surface p-4 rounded-xl flex justify-between items-center">
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
        <div className="ui-modal-backdrop">
          <div className="ui-modal-panel max-w-md animate-in slide-in-from-bottom-10 fade-in duration-200">
             <div className="ui-modal-header">
                 <h2 className="ui-modal-title">New Shift</h2>
                 <button onClick={() => setIsCreating(false)} className="ui-icon-button"><X className="w-4 h-4" /></button>
             </div>

             <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Start</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date</label>
                          <div className="ui-input-shell">
                            <input 
                                type="date" 
                                className="ui-input-field"
                                value={shiftForm.startDate}
                                onChange={(e) => setShiftForm({...shiftForm, startDate: e.target.value})}
                            />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Time</label>
                          <div className="ui-input-shell">
                            <input 
                                type="time" 
                                step="60"
                                className="ui-input-field"
                                value={shiftForm.startTime}
                                onChange={(e) => setShiftForm({...shiftForm, startTime: e.target.value})}
                            />
                          </div>
                      </div>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">End</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date</label>
                          <div className="ui-input-shell">
                            <input 
                                type="date" 
                                className="ui-input-field"
                                value={shiftForm.endDate}
                                onChange={(e) => setShiftForm({...shiftForm, endDate: e.target.value})}
                            />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Time</label>
                          <div className="ui-input-shell">
                            <input 
                                type="time" 
                                step="60"
                                className="ui-input-field"
                                value={shiftForm.endTime}
                                onChange={(e) => setShiftForm({...shiftForm, endTime: e.target.value})}
                            />
                          </div>
                      </div>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Spots Needed</label>
                    <div className="ui-input-shell">
                      <input 
                          type="number" 
                          min="1"
                          step="1"
                          className="ui-input-field"
                          value={Number.isFinite(shiftForm.spotsNeeded) ? shiftForm.spotsNeeded : ''}
                          onChange={(e) => {
                            const rawValue = e.target.value;
                            const parsed = rawValue === '' ? Number.NaN : Number(rawValue);
                            setShiftForm({ ...shiftForm, spotsNeeded: parsed });
                          }}
                      />
                    </div>
                </div>
                <Button className="w-full mt-2" onClick={handlePostShift}>
                    Post Shift
                </Button>
             </div>
          </div>
        </div>
      )}

      {/* Add Casual Modal/Drawer */}
      {isAddingCasual && (
        <div className="ui-modal-backdrop">
          <div className="ui-modal-panel max-w-md animate-in slide-in-from-bottom-10 fade-in duration-200">
             <div className="ui-modal-header">
                 <h2 className="ui-modal-title">Add Casual</h2>
                 <button onClick={closeAddCasual} className="ui-icon-button"><X className="w-4 h-4" /></button>
             </div>

             <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddCasual();
                }}
             >
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Casual Name</label>
                    <input 
                        type="text"
                        className={`ui-input ${casualErrors.name ? 'ui-input-error' : ''}`}
                        value={casualForm.name}
                        onChange={(e) => {
                          setCasualForm({ ...casualForm, name: e.target.value });
                          if (casualErrors.name) {
                            setCasualErrors((prev) => ({ ...prev, name: undefined }));
                          }
                        }}
                    />
                    {casualErrors.name && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{casualErrors.name}</p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                    <input 
                        type="tel"
                        className={`ui-input ${casualErrors.phone ? 'ui-input-error' : ''}`}
                        value={casualForm.phone}
                        onChange={(e) => {
                          setCasualForm({ ...casualForm, phone: e.target.value });
                          if (casualErrors.phone) {
                            setCasualErrors((prev) => ({ ...prev, phone: undefined }));
                          }
                        }}
                    />
                    {casualErrors.phone && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{casualErrors.phone}</p>
                    )}
                </div>
                <div className="flex gap-3">
                    <Button type="button" variant="secondary" className="flex-1" onClick={closeAddCasual}>
                        Cancel
                    </Button>
                    <Button type="submit" className="flex-1" isLoading={isSavingCasual}>
                        Add Casual
                    </Button>
                </div>
             </form>
          </div>
        </div>
      )}

      {confirmAction && confirmActionCopy && (
        <div className="ui-modal-backdrop">
          <div className="ui-modal-panel max-w-md animate-in slide-in-from-bottom-10 fade-in duration-200">
            <div className="ui-modal-header">
              <h2 className="ui-modal-title">{confirmActionCopy.title}</h2>
              <button
                onClick={() => setConfirmAction(null)}
                className="ui-icon-button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">{confirmActionCopy.message}</p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmAction(null)}
                disabled={isConfirmingAction}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleConfirmAction} isLoading={isConfirmingAction}>
                {confirmActionCopy.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
