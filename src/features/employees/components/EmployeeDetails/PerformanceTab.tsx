import React from 'react';
import { Employee } from '../../types/employee.types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { name: 'Mon', sales: 4000 },
  { name: 'Tue', sales: 3000 },
  { name: 'Wed', sales: 2000 },
  { name: 'Thu', sales: 2780 },
  { name: 'Fri', sales: 1890 },
  { name: 'Sat', sales: 2390 },
  { name: 'Sun', sales: 3490 },
];

export default function PerformanceTab({ employee }: { employee: Employee }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
        <h4 className="font-bold mb-6 flex justify-between items-center">
          <span>Weekly Sales Performance</span>
          <select className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-sm px-2 py-1 outline-none focus:border-[var(--color-accent)]">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Month</option>
          </select>
        </h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#c9a84c" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333', borderRadius: '8px' }}
                itemStyle={{ color: '#c9a84c' }}
              />
              <Area type="monotone" dataKey="sales" stroke="#c9a84c" fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
          <h4 className="font-bold mb-4">Top Selling Items</h4>
          <div className="flex flex-col gap-3">
            {[
              { name: 'V60 Ethiopian', qty: 145, rev: 3625 },
              { name: 'Spanish Latte', qty: 120, rev: 2880 },
              { name: 'Flat White', qty: 98, rev: 1764 },
              { name: 'Chocolate Croissant', qty: 85, rev: 1275 }
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-[var(--color-base)] rounded-lg border border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[var(--color-surface)] rounded text-xs flex items-center justify-center font-mono text-gray-400">{i+1}</div>
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-right flex flex-col">
                  <span className="text-sm font-bold font-mono">{item.rev} SAR</span>
                  <span className="text-[10px] text-gray-500">{item.qty} units</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
          <h4 className="font-bold mb-4">Performance Metrics</h4>
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Sales Target Achievement</span>
                <span className="font-bold text-[var(--color-accent)]">85%</span>
              </div>
              <div className="w-full bg-[var(--color-surface)] rounded-full h-2">
                <div className="bg-[var(--color-accent)] h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Upsell Rate</span>
                <span className="font-bold text-green-500">24%</span>
              </div>
              <div className="w-full bg-[var(--color-surface)] rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '24%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Attendance Score</span>
                <span className="font-bold text-blue-500">98%</span>
              </div>
              <div className="w-full bg-[var(--color-surface)] rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '98%' }}></div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-[var(--color-base)] rounded-lg border border-[var(--color-border)] flex items-center justify-between">
              <span className="text-sm">Overall Rating</span>
              <div className="flex gap-1 text-[var(--color-accent)]">
                ★ ★ ★ ★ ☆
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
