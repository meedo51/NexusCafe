import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { Check, X } from 'lucide-react';

export default function ShiftTrades() {
  const [trades, setTrades] = useState<any[]>([]);
  const token = useSelector((state: RootState) => state.auth.token);
  
  useEffect(() => {
    fetchTrades();
  }, [token]);

  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/scheduling/trades', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setTrades(data);
      }
    } catch(e) {}
  };

  const approveTrade = async (id: number) => {
    try {
      await fetch(`/api/scheduling/trades/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      fetchTrades();
    } catch(e) {}
  };

  const rejectTrade = async (id: number) => {
    try {
      await fetch(`/api/scheduling/trades/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      fetchTrades();
    } catch(e) {}
  };

  const acceptTrade = async (id: number) => {
    try {
      await fetch(`/api/scheduling/trades/${id}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      fetchTrades();
    } catch(e) {}
  };

  return (
    <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-2xl">
      <div className="p-5 border-b border-[var(--color-border)] bg-[var(--color-base)] flex justify-between items-center">
        <h4 className="font-bold text-sm tracking-wide">Shift Trade Board</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1a1a1a] text-xs text-gray-400">
              <th className="p-4 font-semibold border-b border-[var(--color-border)]">Posted By</th>
              <th className="p-4 font-semibold border-b border-[var(--color-border)]">Shift Date & Time</th>
              <th className="p-4 font-semibold border-b border-[var(--color-border)]">Role</th>
              <th className="p-4 font-semibold border-b border-[var(--color-border)]">Picked Up By</th>
              <th className="p-4 font-semibold border-b border-[var(--color-border)]">Status</th>
              <th className="p-4 font-semibold text-right border-b border-[var(--color-border)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No shift trades on the board.</td></tr>
            )}
            {trades.map(trade => (
              <tr key={trade.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[#2a2a2a] transition-colors">
                <td className="p-4 text-sm font-medium">{trade.requestor?.name}</td>
                <td className="p-4 text-sm font-mono text-gray-400 bg-[var(--color-base)]/50">
                  {trade.shift ? `${new Date(trade.shift.date).toLocaleDateString()} ${new Date(trade.shift.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(trade.shift.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Unknown'}
                </td>
                <td className="p-4 text-sm font-medium text-gray-400">{trade.shift?.role}</td>
                <td className="p-4 text-sm font-medium">{trade.acceptorUser ? trade.acceptorUser.name : <span className="text-gray-600 italic">None yet</span>}</td>
                <td className="p-4">
                  <span className={`text-[10px] px-2 py-1.5 rounded font-bold uppercase tracking-wider ${
                    trade.status === 'OPEN' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 
                    trade.status === 'PENDING_APPROVAL' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 
                    trade.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                    'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    {trade.status === 'PENDING_APPROVAL' ? 'PENDING MGR' : trade.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {trade.status === 'OPEN' && (
                    <button onClick={() => acceptTrade(trade.id)} className="px-3 py-1.5 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded hover:text-[var(--color-accent)] transition-colors">
                      Pick Up Shift
                    </button>
                  )}
                  {trade.status === 'PENDING_APPROVAL' && (
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => approveTrade(trade.id)} className="w-8 h-8 flex items-center justify-center bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white rounded-md transition-all shadow-sm" title="Approve Trade">
                        <Check size={16}/>
                      </button>
                      <button onClick={() => rejectTrade(trade.id)} className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-md transition-all shadow-sm" title="Reject Trade">
                        <X size={16}/>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
