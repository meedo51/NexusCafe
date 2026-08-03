import React from 'react';
import { Phone, Mail, Calendar, MapPin, Fingerprint, Clock, Shield, Key } from 'lucide-react';
import { Employee } from '../../types/employee.types';

export default function OverviewTab({ employee }: { employee: Employee }) {
  const initials = employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-min">
      {/* Left Column: Profile */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 text-center">
          <div className="w-24 h-24 rounded-full bg-[var(--color-surface)] border-4 border-[#c9a84c] flex items-center justify-center text-3xl font-bold mx-auto mb-4 text-[#c9a84c]">
            {initials}
          </div>
          <h3 className="text-xl font-bold">{employee.name}</h3>
          <p className="text-sm text-gray-400 mb-4">{employee.role}</p>
          
          <div className="flex justify-center gap-2 mb-6">
            <span className="text-xs bg-[var(--color-surface)] px-3 py-1 rounded-full text-gray-400 border border-[var(--color-border)]">{employee.uid}</span>
            <span className="text-xs bg-[#48bb78]/20 px-3 py-1 rounded-full text-[#48bb78] border border-[#48bb78]/30">
              {employee.shiftStatus === 'CLOCKED_IN' ? 'Clocked In' : 'Not Clocked In'}
            </span>
          </div>

          <div className="flex flex-col gap-3 text-left">
            <div className="flex items-center gap-3 text-sm text-gray-300 bg-[var(--color-base)] p-3 rounded-lg border border-[var(--color-border)]">
              <Phone size={16} className="text-[var(--color-accent)]" />
              <span>{employee.phone || '+966 50 000 0000'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300 bg-[var(--color-base)] p-3 rounded-lg border border-[var(--color-border)]">
              <Mail size={16} className="text-[var(--color-accent)]" />
              <span>{employee.email || 'employee@nexuscafe.com'}</span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6">
          <h4 className="font-bold mb-4 flex items-center gap-2"><Shield size={16} className="text-[var(--color-accent)]"/> Employment Details</h4>
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
              <span className="text-gray-400 flex items-center gap-2"><Calendar size={14}/> Hire Date</span>
              <span className="font-medium">{employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'Jan 15, 2024'}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
              <span className="text-gray-400 flex items-center gap-2"><MapPin size={14}/> Branch</span>
              <span className="font-medium">{employee.branch || 'Main Branch'}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
              <span className="text-gray-400 flex items-center gap-2"><Fingerprint size={14}/> Biometric ID</span>
              <span className="font-medium text-[var(--color-accent)]">{employee.biometricId ? 'Registered' : 'Not Setup'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-2"><Key size={14}/> PIN Status</span>
              <span className="font-medium text-green-500">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Stats & Actions */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--color-card)] p-5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Clock size={16} /> Total Shifts
            </div>
            <div className="text-2xl font-bold font-mono">142</div>
            <div className="text-xs text-green-500 mt-1">▲ 12 this month</div>
          </div>
          <div className="bg-[var(--color-card)] p-5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <span className="font-serif">SAR</span> Revenue Generated
            </div>
            <div className="text-2xl font-bold font-mono text-[var(--color-accent)]">84,250</div>
            <div className="text-xs text-green-500 mt-1">▲ 5% vs last month</div>
          </div>
          <div className="bg-[var(--color-card)] p-5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
               Orders Processed
            </div>
            <div className="text-2xl font-bold font-mono">3,240</div>
            <div className="text-xs text-gray-500 mt-1">Avg 22/shift</div>
          </div>
          <div className="bg-[var(--color-card)] p-5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
               Avg Order Value
            </div>
            <div className="text-2xl font-bold font-mono">26.00 <span className="text-sm font-sans text-gray-400">SAR</span></div>
            <div className="text-xs text-green-500 mt-1">▲ 1.5% vs peer avg</div>
          </div>
        </div>

        <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 flex-1">
          <h4 className="font-bold mb-4">Quick Actions</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button className="bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] rounded-lg p-4 flex flex-col gap-2 items-center justify-center transition-colors">
              <Clock size={24} />
              <span className="font-medium text-sm">Clock In / Out</span>
            </button>
            <button className="bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] rounded-lg p-4 flex flex-col gap-2 items-center justify-center transition-colors">
              <Key size={24} />
              <span className="font-medium text-sm">Reset PIN</span>
            </button>
            <button className="bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] rounded-lg p-4 flex flex-col gap-2 items-center justify-center transition-colors">
              <Fingerprint size={24} />
              <span className="font-medium text-sm">Register Biometrics</span>
            </button>
            <button className="bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] rounded-lg p-4 flex flex-col gap-2 items-center justify-center transition-colors">
              <Shield size={24} />
              <span className="font-medium text-sm">Edit Permissions</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
