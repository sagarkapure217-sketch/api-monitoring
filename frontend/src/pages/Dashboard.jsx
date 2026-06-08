import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import client from '../api/client';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  // Edit mode state
  const [editingMonitor, setEditingMonitor] = useState(null); // holds the monitor object being edited, or null

  // Form states
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(1);
  const [isActive, setIsActive] = useState(true);
  
  // Messages
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch monitors
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['monitors'],
    queryFn: async () => {
      const response = await client.get('/monitors');
      return response.data; // returns { monitors: [...] }
    },
  });

  // Create Monitor Mutation
  const createMutation = useMutation({
    mutationFn: async (newMonitor) => {
      const response = await client.post('/monitors', newMonitor);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      resetForm();
      setFormSuccess('Monitor created successfully');
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      if (err.response && err.response.data && err.response.data.error) {
        setFormError(err.response.data.error);
      } else {
        setFormError('Failed to create monitor');
      }
    },
  });

  // Edit Monitor Mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, updatedData }) => {
      const response = await client.patch(`/monitors/${id}`, updatedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      resetForm();
      setFormSuccess('Monitor updated successfully');
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      if (err.response && err.response.data && err.response.data.error) {
        setFormError(err.response.data.error);
      } else {
        setFormError('Failed to update monitor');
      }
    },
  });

  // Delete Monitor Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await client.delete(`/monitors/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      setFormSuccess('Monitor deleted successfully');
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      if (err.response && err.response.data && err.response.data.error) {
        alert(err.response.data.error);
      } else {
        alert('Failed to delete monitor');
      }
    },
  });

  // Reset form states
  const resetForm = () => {
    setName('');
    setUrl('');
    setIntervalMinutes(1);
    setIsActive(true);
    setEditingMonitor(null);
    setFormError('');
  };

  // Set form into edit mode
  const startEdit = (monitor) => {
    setEditingMonitor(monitor);
    setName(monitor.name);
    setUrl(monitor.url); // Displayed as read-only
    setIntervalMinutes(monitor.interval_minutes);
    setIsActive(monitor.is_active);
    setFormError('');
    setFormSuccess('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!name.trim()) {
      setFormError('Name is required');
      return;
    }

    const intervalVal = parseInt(intervalMinutes, 10);
    if (isNaN(intervalVal) || intervalVal <= 0) {
      setFormError('Interval must be a positive number');
      return;
    }

    if (editingMonitor) {
      // Expose ONLY name, interval_minutes, is_active for PATCH
      editMutation.mutate({
        id: editingMonitor.id,
        updatedData: {
          name: name.trim(),
          interval_minutes: intervalVal,
          is_active: isActive,
        },
      });
    } else {
      if (!url.trim()) {
        setFormError('URL is required');
        return;
      }
      createMutation.mutate({
        name: name.trim(),
        url: url.trim(),
        interval_minutes: intervalVal,
      });
    }
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const monitors = data?.monitors || [];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] antialiased">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Column 1: Manage / Form */}
          <div className="md:col-span-1">
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-5 text-[#0f172a] tracking-tight">
                {editingMonitor ? 'Edit Monitor' : 'Create Monitor'}
              </h2>

              {formError && (
                <div className="bg-[#dc2626]/10 border border-[#dc2626]/20 text-[#dc2626] p-3 rounded-lg text-sm mb-4">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="bg-[#15803d]/10 border border-[#15803d]/20 text-[#15803d] p-3 rounded-lg text-sm mb-4">
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    placeholder="My Web Service"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    URL {editingMonitor && <span className="text-xs text-slate-400 font-normal lowercase">(read-only)</span>}
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={!!editingMonitor}
                    className="input disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    placeholder="https://example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Interval (Minutes)
                  </label>
                  <input
                    type="number"
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(e.target.value)}
                    min="1"
                    className="input"
                    required
                  />
                </div>

                {editingMonitor && (
                  <div className="flex items-center gap-2 py-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#1e40af] focus:ring-0 focus:ring-offset-0"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">
                      Active Status
                    </label>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || editMutation.isPending}
                    className="flex-1 btn-primary py-2 text-sm font-semibold"
                  >
                    {editingMonitor 
                      ? (editMutation.isPending ? 'Saving...' : 'Save') 
                      : (createMutation.isPending ? 'Creating...' : 'Create')}
                  </button>

                  {editingMonitor && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn-secondary px-4 py-2 text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Column 2 & 3: Monitor List */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-bold mb-5 text-[#0f172a] flex items-center justify-between tracking-tight">
              <span>Active Monitors</span>
              {isLoading && <span className="text-xs text-slate-450 font-normal">Loading...</span>}
            </h2>

            {isError && (
              <div className="bg-[#dc2626]/10 border border-[#dc2626]/20 text-[#dc2626] p-4 rounded-lg text-sm mb-6">
                Failed to load monitors: {error.message || 'Network error'}
              </div>
            )}

            {!isLoading && !isError && monitors.length === 0 && (
              <div className="bg-white border border-[#e2e8f0] rounded-xl p-8 text-center text-slate-400 text-sm shadow-sm">
                No monitors configured yet. Add one using the form.
              </div>
            )}

            <div className="space-y-4">
              {monitors.map((monitor) => (
                <div 
                  key={monitor.id}
                  className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-300 transition-all duration-150"
                >
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-[#0f172a] text-base tracking-tight">
                        {monitor.name}
                      </span>
                      <span 
                        className={monitor.is_active ? 'badge-active' : 'badge-inactive'}
                      >
                        {monitor.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono truncate max-w-sm sm:max-w-md">
                      {monitor.url}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <span>Check interval:</span>
                      <span className="font-medium text-slate-600">
                        {monitor.interval_minutes} {monitor.interval_minutes === 1 ? 'minute' : 'minutes'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link
                      to={`/monitors/${monitor.id}`}
                      className="btn-primary px-3 py-1.5 text-xs font-semibold text-center"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => startEdit(monitor)}
                      className="btn-secondary px-3 py-1.5 text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(monitor.id, monitor.name)}
                      className="border border-[#dc2626]/20 bg-white hover:bg-[#dc2626]/5 text-[#dc2626] font-semibold px-3 py-1.5 rounded-lg text-xs transition-all duration-150 active:scale-95 focus:outline-none"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
