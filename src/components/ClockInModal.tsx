import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setShift } from '../store/authSlice';
import { Clock, ShieldAlert } from 'lucide-react';

export default function ClockInModal({ onClose }: { onClose: () => void }) {
  const [openingBalance, setOpeningBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = useSelector((state: RootState) => state.auth.token);
  const dispatch = useDispatch();

  const handleClockIn = async () => {
    const balance = parseFloat(openingBalance);
    if (isNaN(balance) || balance < 0) {
      setError('Please enter a valid opening balance');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/shifts/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ openingBalance: balance })
      });
      const data = await res.json();
      if (res.ok) {
        dispatch(setShift(data));
        onClose();
      } else {
        setError(data.error || 'Failed to clock in');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-base)] w-full max-w-md rounded-2xl border border-[var(--color-border)] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-[var(--color-border)] flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--color-accent)]/20 rounded-full flex items-center justify-center text-[var(--color-accent)]">
            <Clock size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Clock In</h2>
            <p className="text-xs text-gray-500 uppercase">Start your shift</p>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <ShieldAlert size={16} /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Opening Cash Balance (SAR)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">SAR</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={(e) => { setOpeningBalance(e.target.value); setError(''); }}
                className="w-full bg-[var(--color-base-dark)] border border-[var(--color-border)] rounded-xl py-3 pl-14 pr-4 text-white font-bold text-lg focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-2">Enter the exact amount of cash in your drawer before starting.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={onClose}
              className="py-3 border border-[var(--color-border)] rounded-xl font-bold text-gray-400 hover:text-white hover:bg-[var(--color-surface)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleClockIn}
              disabled={loading || !openingBalance}
              className="py-3 bg-[var(--color-accent)] text-black rounded-xl font-bold shadow-[0_4px_15px_rgba(201,168,76,0.2)] hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
            >
              {loading ? 'Clocking in...' : 'Clock In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
