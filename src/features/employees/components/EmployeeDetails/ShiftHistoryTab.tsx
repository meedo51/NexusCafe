import React from 'react';
import { Download } from 'lucide-react';
import { Employee } from '../../types/employee.types';

export default function ShiftHistoryTab({ employee }: { employee: Employee }) {
  const mockShifts = [
    { id: 'SH-101', date: '2024-10-24', in: '08:00', out: '16:05', duration: '8h 5m', sales: 3450, orders: 142, status: 'Completed' },
    { id: 'SH-102', date: '2024-10-25', in: '08:15', out: '16:00', duration: '7h 45m', sales: 2980, orders: 110, status: 'Completed' },
    { id: 'SH-103', date: '2024-10-26', in: '07:55', out: '16:10', duration: '8h 15m', sales: 4120, orders: 165, status: 'Completed' },
  ];

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center bg-[var(--color-card)] p-4 rounded-xl border border-[var(--color-border)] shrink-0">
        <div className="flex gap-4">
          <input type="date" className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-sm px-3 py-2 outline-none focus:border-[var(--color-accent)]" />
          <input type="date" className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-sm px-3 py-2 outline-none focus:border-[var(--color-accent)]" />
          <select className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-sm px-3 py-2 outline-none focus:border-[var(--color-accent)]">
            <option>All Statuses</option>
            <option>Completed</option>
            <option>In Progress</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] rounded-lg text-sm transition-colors">
            <Download size={16} /> Excel
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] rounded-lg text-sm transition-colors">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-base)] text-gray-400 text-xs">
                <th className="px-4 py-3 font-semibold">Shift ID</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Clock In</th>
                <th className="px-4 py-3 font-semibold">Clock Out</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Orders</th>
                <th className="px-4 py-3 font-semibold text-right">Sales (SAR)</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockShifts.map((shift, i) => (
                <tr key={i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[#2a2a2a] transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">{shift.id}</td>
                  <td className="px-4 py-3 text-sm">{shift.date}</td>
                  <td className="px-4 py-3 text-sm font-mono text-green-500">{shift.in}</td>
                  <td className="px-4 py-3 text-sm font-mono text-red-500">{shift.out}</td>
                  <td className="px-4 py-3 text-sm font-mono">{shift.duration}</td>
                  <td className="px-4 py-3 text-sm">{shift.orders}</td>
                  <td className="px-4 py-3 text-sm font-mono text-right">{shift.sales.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] px-2 py-1 rounded bg-[#48bb78]/20 text-[#48bb78] font-medium">
                      {shift.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-[var(--color-base)] p-4 border-t border-[var(--color-border)] flex justify-between text-sm">
          <div><span className="text-gray-400">Total Shifts:</span> <strong>3</strong></div>
          <div><span className="text-gray-400">Avg Duration:</span> <strong>8h 2m</strong></div>
          <div><span className="text-gray-400">Total Sales:</span> <strong className="font-mono text-[var(--color-accent)]">10,550.00 SAR</strong></div>
        </div>
      </div>
    </div>
  );
}
