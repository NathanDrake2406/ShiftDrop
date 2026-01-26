import { useEffect, useState } from "react";
import { Layout } from "../components/ui/Layout";
import { Button } from "../components/ui/Button";
import { PoolCardSkeleton } from "../components/ui/Skeleton";
import { useNavigate } from "react-router-dom";
import { Plus, X, ChevronRight, Trash2 } from "lucide-react";
import { useAuth } from "../auth";
import { useDemo } from "../contexts/DemoContext";
import * as managerApi from "../services/managerApi";
import type { PoolResponse } from "../types/api";
import { ApiError } from "../types/api";

export const ManagerDashboard: React.FC = () => {
  const { getAccessToken, logout, user } = useAuth();
  const { demoMode, demoManagerSignedIn } = useDemo();
  const [pools, setPools] = useState<PoolResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [isCreatingPool, setIsCreatingPool] = useState(false);
  const [poolName, setPoolName] = useState("");
  const [poolError, setPoolError] = useState<string | null>(null);
  const [isSavingPool, setIsSavingPool] = useState(false);
  const [deletingPool, setDeletingPool] = useState<PoolResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchPools = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setError("Unable to authenticate. Please try logging in again.");
          setLoading(false);
          return;
        }
        const data = await managerApi.getPools(token);
        setPools(data);
        setError(null);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load pools");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPools();
  }, [getAccessToken]);

  const openCreatePool = () => {
    setPoolName("");
    setPoolError(null);
    setIsCreatingPool(true);
  };

  const closeCreatePool = () => {
    setIsCreatingPool(false);
    setPoolName("");
    setPoolError(null);
  };

  const handleCreatePool = async () => {
    const trimmedName = poolName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      setPoolError("Pool name must be 2-60 characters.");
      return;
    }

    setIsSavingPool(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      await managerApi.createPool(trimmedName, token);
      const data = await managerApi.getPools(token);
      setPools(data);
      closeCreatePool();
    } catch (err) {
      if (err instanceof ApiError) {
        setPoolError(err.message);
      } else {
        setPoolError("Failed to create pool");
      }
    } finally {
      setIsSavingPool(false);
    }
  };

  const handleDeletePool = async () => {
    if (!deletingPool) return;
    setIsDeleting(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      await managerApi.deletePool(deletingPool.id, token);
      setPools((prev) => prev.filter((p) => p.id !== deletingPool.id));
      setDeletingPool(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to delete pool");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout
      title="My Pools"
      actions={
        <div className="flex items-center gap-2">
          {(user?.name || (demoMode && demoManagerSignedIn)) && (
            <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">
              {user?.name ?? "Demo Manager"}
            </span>
          )}
          <Button size="sm" variant="ghost" onClick={logout}>
            Log Out
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {loading && (
          <div className="space-y-4">
            <PoolCardSkeleton />
            <PoolCardSkeleton />
            <PoolCardSkeleton />
          </div>
        )}

        {error && (
          <div className="text-center p-4 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          pools.map((pool) => (
            <div
              key={pool.id}
              className="ui-surface p-5 rounded-2xl shadow-sm transition-transform cursor-pointer flex justify-between items-center group"
            >
              <div className="flex-1" onClick={() => navigate(`/manager/pool/${pool.id}`)}>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">
                  {pool.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingPool(pool);
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                  title="Delete pool"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="text-slate-300" onClick={() => navigate(`/manager/pool/${pool.id}`)}>
                  <ChevronRight className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}

        {!loading && !error && pools.length === 0 && (
          <div className="text-center p-8 text-slate-400">No pools yet. Create your first pool to get started.</div>
        )}

        <Button
          variant="secondary"
          className="w-full border-dashed border-2 py-8 text-slate-400 hover:text-orange-500 hover:border-orange-200"
          onClick={openCreatePool}
        >
          <div className="flex flex-col items-center gap-2">
            <Plus className="w-6 h-6" />
            <span>Create New Pool</span>
          </div>
        </Button>
      </div>

      {isCreatingPool && (
        <div className="ui-modal-backdrop">
          <div className="ui-modal-panel max-w-md animate-in slide-in-from-bottom-10 fade-in duration-200">
            <div className="ui-modal-header">
              <h2 className="ui-modal-title">Create Pool</h2>
              <button onClick={closeCreatePool} className="ui-icon-button">
                <X className="w-4 h-4" />
              </button>
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
                  className={`ui-input ${poolError ? "ui-input-error" : ""}`}
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

      {deletingPool && (
        <div className="ui-modal-backdrop">
          <div className="ui-modal-panel max-w-md animate-in slide-in-from-bottom-10 fade-in duration-200">
            <div className="ui-modal-header">
              <h2 className="ui-modal-title text-red-600 dark:text-red-400">Delete Pool</h2>
              <button onClick={() => setDeletingPool(null)} className="ui-icon-button">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Are you sure you want to delete <span className="font-semibold">{deletingPool.name}</span>? This will
              permanently remove all casuals, shifts, and data associated with this pool.
            </p>

            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setDeletingPool(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1"
                isLoading={isDeleting}
                onClick={handleDeletePool}
              >
                Delete Pool
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
