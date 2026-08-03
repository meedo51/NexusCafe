import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setShift } from '../store/authSlice';
import { LogOut, ShieldAlert } from 'lucide-react';

export default function ClockOutModal({ onClose }: { onClose: () => void }) {
  const [closingBalance, setClosingBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const token = useSelector((state: RootState) => state.auth.token);
  const shift = useSelector((state: RootState) => state.auth.shift);
  const dispatch = useDispatch();

  const handleClockOut = async () => {
    const balance = parseFloat(closingBalance);
    if (isNaN(balance) || balance < 0) {
      setError('Please enter a valid closing balance');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/shifts/clock-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ closingBalance: balance })
      });
      const data = await res.json();
      if (res.ok) {
        dispatch(setShift(null)); // Clear shift
        onClose();
      } else {
        setError(data.error || 'Failed to clock out');
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
          <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
            <LogOut size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Clock Out</h2>
            <p className="text-xs text-gray-500 uppercase">End your shift</p>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <ShieldAlert size={16} /> {error}
            </div>
          )}

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
             <div className="flex justify-between text-sm mb-2">
               <span className="text-gray-400">Opening Balance:</span>
               <span className="font-bold">{shift?.openingBalance} SAR</span>
             </div>
             {/* In a full implementation, we'd fetch cash sales for this shift to calculate expected */}
             <div className="flex justify-between text-sm text-gray-400 italic">
               <span>(Expected calculation mocked)</span>
             </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Actual Closing Cash (SAR)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">SAR</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={closingBalance}
                onChange={(e) => { setClosingBalance(e.target.value); setError(''); }}
                className="w-full bg-[var(--color-base-dark)] border border-[var(--color-border)] rounded-xl py-3 pl-14 pr-4 text-white font-bold text-lg focus:outline-none focus:border-red-500 transition-colors"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-2">Enter the exact amount of cash currently in your drawer.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={onClose}
              className="py-3 border border-[var(--color-border)] rounded-xl font-bold text-gray-400 hover:text-white hover:bg-[var(--color-surface)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleClockOut}
              disabled={loading || !closingBalance}
              className="py-3 bg-red-500 text-white rounded-xl font-bold shadow-[0_4px_15px_rgba(239,68,68,0.2)] hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Clocking out...' : 'Clock Out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
