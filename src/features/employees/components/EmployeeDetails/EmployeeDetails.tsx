import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft } from 'lucide-react';
import { RootState } from '../../../../store';
import { setSelectedEmployee } from '../../store/employeesSlice';
import OverviewTab from './OverviewTab';
import PerformanceTab from './PerformanceTab';
import ShiftHistoryTab from './ShiftHistoryTab';
import CommissionTab from './CommissionTab';
import AuditLogTab from './AuditLogTab';

export default function EmployeeDetails() {
  const dispatch = useDispatch();
  const employee = useSelector((state: RootState) => state.employees.selectedEmployee);
  const [activeTab, setActiveTab] = useState('overview');

  if (!employee) return null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'performance', label: 'Performance' },
    { id: 'shifts', label: 'Shift History' },
    { id: 'commission', label: 'Commission' },
    { id: 'audit', label: 'Audit Log' },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--color-base-dark)] overflow-hidden w-full">
      {/* Header */}
      <div className="bg-[var(--color-card)] border-b border-[var(--color-border)] p-6 shrink-0 flex items-center gap-4">
        <button 
          onClick={() => dispatch(setSelectedEmployee(null))}
          className="p-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-base)] text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-3">
            {employee.name}
            <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
              employee.status === 'ACTIVE' ? 'bg-[#48bb78]/20 text-[#48bb78] border-[#48bb78]' : 
              employee.status === 'ON_LEAVE' ? 'bg-[#ed8936]/20 text-[#ed8936] border-[#ed8936]' : 
              'bg-[#fc8181]/20 text-[#fc8181] border-[#fc8181]'
            }`}>
              {employee.status.replace('_', ' ')}
            </span>
          </h2>
          <p className="text-sm text-gray-400">ID: {employee.uid} | Role: {employee.role}</p>
        </div>
      </div>

      {/* Tabs Nav */}
      <div className="px-6 border-b border-[var(--color-border)] bg-[var(--color-base)] shrink-0 flex overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-[var(--color-base-dark)]">
        {activeTab === 'overview' && <OverviewTab employee={employee} />}
        {activeTab === 'performance' && <PerformanceTab employee={employee} />}
        {activeTab === 'shifts' && <ShiftHistoryTab employee={employee} />}
        {activeTab === 'commission' && <CommissionTab employee={employee} />}
        {activeTab === 'audit' && <AuditLogTab employee={employee} />}
      </div>
    </div>
  );
}
