import React from 'react';
import { Employee } from '../../types/employee.types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function CommissionTab({ employee }: { employee: Employee }) {
  const data = [
    { name: 'Coffee', value: 400 },
    { name: 'Pastry', value: 300 },
    { name: 'Merch', value: 150 },
  ];
  const COLORS = ['#c9a84c', '#4299e1', '#48bb78'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 flex flex-col gap-6">
        <div className="bg-[var(--color-card)] p-6 rounded-xl border border-[var(--color-border)]">
          <h4 className="font-bold mb-4">Commission Summary</h4>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-gray-400">Total Earned (YTD)</p>
              <p className="text-2xl font-bold font-mono text-[var(--color-accent)]">14,250 <span className="text-sm">SAR</span></p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--color-base)] p-3 rounded-lg border border-[var(--color-border)]">
                <p className="text-[10px] text-gray-400">Pending Payout</p>
                <p className="text-lg font-bold font-mono">1,240 <span className="text-[10px]">SAR</span></p>
              </div>
              <div className="bg-[var(--color-base)] p-3 rounded-lg border border-[var(--color-border)]">
                <p className="text-[10px] text-gray-400">Commission Rate</p>
                <p className="text-lg font-bold font-mono text-green-500">2.5%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-card)] p-6 rounded-xl border border-[var(--color-border)] h-64">
          <h4 className="font-bold mb-2">Category Breakdown</h4>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="md:col-span-2 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-base)]">
          <h4 className="font-bold">Commission History</h4>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-gray-400 text-xs bg-[#1a1a1a]">
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold text-right">Sales Base</th>
                <th className="px-4 py-3 font-semibold text-right">Rate</th>
                <th className="px-4 py-3 font-semibold text-right">Earned</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((_, i) => (
                <tr key={i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[#2a2a2a]">
                  <td className="px-4 py-3 text-sm">Oct 2024 - W{i+1}</td>
                  <td className="px-4 py-3 text-sm font-mono text-right text-gray-400">{(15000 + i*1000).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-right">2.5%</td>
                  <td className="px-4 py-3 text-sm font-mono text-right text-[var(--color-accent)]">{((15000 + i*1000) * 0.025).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] px-2 py-1 rounded font-medium ${i === 0 ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-500'}`}>
                      {i === 0 ? 'Pending' : 'Paid'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
