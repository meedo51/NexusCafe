import React, { useState } from 'react';
import { ArrowLeft, Download, Filter, Search, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AuditLogViewer() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);

  const mockLogs = [
    { id: 1, date: '2024-10-24 10:45:00', emp: 'Sarah Manager', action: 'TRANSACTION_VOID', desc: 'Voided order #1429-A (SAR 45.00)', ip: '192.168.1.100', device: 'POS-01', type: 'warning' },
    { id: 2, date: '2024-10-24 08:00:00', emp: 'Ahmed Cashier', action: 'CLOCK_IN', desc: 'Clocked in successfully', ip: '192.168.1.100', device: 'POS-01', type: 'info' },
    { id: 3, date: '2024-10-24 07:59:00', emp: 'Ahmed Cashier', action: 'LOGIN_SUCCESS', desc: 'Logged in via PIN', ip: '192.168.1.100', device: 'POS-01', type: 'success' },
    { id: 4, date: '2024-10-24 07:55:00', emp: 'Unknown', action: 'LOGIN_FAILED', desc: 'Invalid PIN attempt for ID: EMP-003', ip: '192.168.1.100', device: 'POS-01', type: 'danger' },
    { id: 5, date: '2024-10-23 23:45:00', emp: 'Admin User', action: 'ROLE_UPDATE', desc: 'Changed role of EMP-004 from Cashier to Barista', ip: '10.0.0.5', device: 'Admin-MacBook', type: 'info' },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--color-base-dark)] overflow-hidden w-full">
      <div className="bg-[var(--color-card)] border-b border-[var(--color-border)] p-6 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/employees')}
            className="p-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-base)] text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Audit Log Viewer</h2>
            <p className="text-sm text-gray-400 mt-1">System-wide security and action tracking</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-colors ${showFilters ? 'bg-[var(--color-surface)] border-[var(--color-accent)] text-[var(--color-accent)]' : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)]'}`}>
            <Filter size={16} /> Filters
          </button>
          <div className="w-px h-6 bg-[var(--color-border)] mx-2"></div>
          <button className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] rounded-lg text-sm transition-colors">
            <Download size={16} /> Excel
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] rounded-lg text-sm transition-colors">
            <Download size={16} /> PDF
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] rounded-lg text-sm transition-colors">
            <Printer size={16} />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-[var(--color-base)] p-4 border-b border-[var(--color-border)] flex flex-wrap gap-4 shrink-0">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-400 block mb-1">Date Range</label>
            <div className="flex gap-2">
              <input type="date" className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]" />
              <input type="date" className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]" />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-400 block mb-1">Employee</label>
            <select className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]">
              <option>All Employees</option>
              <option>Admin User</option>
              <option>Sarah Manager</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-400 block mb-1">Action Type</label>
            <select className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]">
              <option>All Actions</option>
              <option>Login/Logout</option>
              <option>Clock In/Out</option>
              <option>Transactions</option>
              <option>Security</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-400 block mb-1">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Search details..." className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded pl-8 pr-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button className="px-4 py-1.5 bg-[var(--color-accent)] text-black font-bold rounded text-sm hover:bg-[var(--color-accent-hover)] transition-colors">Apply</button>
            <button className="px-4 py-1.5 bg-[var(--color-surface)] text-gray-300 font-medium border border-[var(--color-border)] rounded text-sm hover:border-gray-400 transition-colors">Reset</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 bg-[var(--color-base-dark)]">
        <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-base)] text-gray-400 text-xs">
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold">Action Type</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">IP Address</th>
                <th className="px-4 py-3 font-semibold">Device ID</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockLogs.map((log) => (
                <tr key={log.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[#2a2a2a] transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-gray-400 whitespace-nowrap">{log.date}</td>
                  <td className="px-4 py-3 text-sm font-medium">{log.emp}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-1 rounded font-medium whitespace-nowrap ${
                      log.type === 'danger' ? 'bg-red-500/20 text-red-500' : 
                      log.type === 'warning' ? 'bg-orange-500/20 text-orange-500' : 
                      log.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{log.desc}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{log.ip}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{log.device}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-xs text-[var(--color-accent)] hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-base)] flex justify-between items-center text-xs text-gray-400">
            <span>Showing 1 to 5 of 1,240 entries</span>
            <div className="flex gap-1">
              <button className="px-2 py-1 bg-[var(--color-surface)] rounded border border-[var(--color-border)] disabled:opacity-50" disabled>&lt;</button>
              <button className="px-2 py-1 bg-[var(--color-accent)] text-black rounded font-bold">1</button>
              <button className="px-2 py-1 bg-[var(--color-surface)] rounded border border-[var(--color-border)] hover:border-gray-500">2</button>
              <button className="px-2 py-1 bg-[var(--color-surface)] rounded border border-[var(--color-border)] hover:border-gray-500">3</button>
              <span className="px-2 py-1">...</span>
              <button className="px-2 py-1 bg-[var(--color-surface)] rounded border border-[var(--color-border)] hover:border-gray-500">&gt;</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
