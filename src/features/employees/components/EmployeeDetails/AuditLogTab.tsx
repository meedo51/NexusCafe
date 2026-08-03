import React from 'react';
import { Employee } from '../../types/employee.types';

export default function AuditLogTab({ employee }: { employee: Employee }) {
  const mockLogs = [
    { id: 1, time: '10:45 AM', action: 'TRANSACTION_VOID', details: 'Voided order #1429-A', ip: '192.168.1.100', type: 'warning' },
    { id: 2, time: '08:00 AM', action: 'CLOCK_IN', details: 'Clocked in successfully', ip: '192.168.1.100', type: 'info' },
    { id: 3, time: '07:59 AM', action: 'LOGIN_SUCCESS', details: 'Logged in via PIN', ip: '192.168.1.100', type: 'success' },
    { id: 4, time: '07:58 AM', action: 'LOGIN_FAILED', details: 'Invalid PIN attempt', ip: '192.168.1.100', type: 'danger' },
  ];

  return (
    <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] h-full flex flex-col">
      <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center shrink-0">
        <h4 className="font-bold">Recent Activity</h4>
        <input type="date" className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-sm px-3 py-1 outline-none focus:border-[var(--color-accent)]" />
      </div>
      <div className="flex-1 overflow-y-auto p-6 relative">
        <div className="absolute left-10 top-6 bottom-6 w-px bg-[var(--color-border)]"></div>
        <div className="flex flex-col gap-6">
          {mockLogs.map((log) => (
            <div key={log.id} className="flex gap-6 relative z-10">
              <div className="w-16 text-right pt-1">
                <span className="text-[10px] text-gray-500 font-mono">{log.time}</span>
              </div>
              <div className={`w-3 h-3 rounded-full mt-1.5 ring-4 ring-[var(--color-card)] shrink-0 ${
                log.type === 'danger' ? 'bg-red-500' : 
                log.type === 'warning' ? 'bg-orange-500' : 
                log.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
              }`}></div>
              <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-bold">{log.action.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-gray-500 font-mono">IP: {log.ip}</span>
                </div>
                <p className="text-sm text-gray-400">{log.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
