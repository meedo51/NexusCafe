import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Eye, Edit2, MoreHorizontal } from 'lucide-react';
import { RootState } from '../../../../store';
import { setSelectedEmployee } from '../../store/employeesSlice';

export default function EmployeesTable({ onClockIn, onClockOut }: { onClockIn: any, onClockOut: any }) {
  const dispatch = useDispatch();
  const employees = useSelector((state: RootState) => state.employees.filteredEmployees);
  const loading = useSelector((state: RootState) => state.employees.loading);
  
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading employees...</div>;
  }

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500 border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]">
        <p>No employees found matching current filters.</p>
      </div>
    );
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return <span className="ml-1 text-[var(--color-accent)]">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    let aVal = (a as any)[sortField];
    let bVal = (b as any)[sortField];
    
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="overflow-x-auto bg-[var(--color-card)] rounded-xl border border-[var(--color-border)]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-base)] text-gray-400 text-xs">
            <th className="px-4 py-3 font-semibold">#</th>
            <th className="px-4 py-3 font-semibold">Avatar</th>
            <th className="px-4 py-3 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('uid')}>
              ID {getSortIcon('uid')}
            </th>
            <th className="px-4 py-3 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('name')}>
              Name {getSortIcon('name')}
            </th>
            <th className="px-4 py-3 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('role')}>
              Role {getSortIcon('role')}
            </th>
            <th className="px-4 py-3 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('status')}>
              Status {getSortIcon('status')}
            </th>
            <th className="px-4 py-3 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('shiftStatus')}>
              Shift {getSortIcon('shiftStatus')}
            </th>
            <th className="px-4 py-3 font-semibold text-right cursor-pointer hover:text-white" onClick={() => handleSort('todaySales')}>
              Sales {getSortIcon('todaySales')}
            </th>
            <th className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedEmployees.map((employee, idx) => {
            const isInactive = employee.status === 'INACTIVE' || employee.status === 'TERMINATED';
            const isOnLeave = employee.status === 'ON_LEAVE';
            const isClockedIn = employee.shiftStatus === 'CLOCKED_IN';
            const initials = employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            return (
              <tr 
                key={employee.id} 
                className={`border-b border-[var(--color-border)] last:border-0 hover:bg-[#2a2a2a] transition-colors ${isOnLeave ? 'border-l-2 border-l-[#ed8936]' : ''} ${isInactive ? 'opacity-60' : ''}`}
              >
                <td className="px-4 py-4 text-xs text-gray-500">{idx + 1}</td>
                <td className="px-4 py-4">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-xs font-bold text-[var(--color-accent)]">
                    {initials}
                  </div>
                </td>
                <td className="px-4 py-4 text-xs font-mono text-gray-400">{employee.uid}</td>
                <td className={`px-4 py-4 font-medium text-sm ${isInactive ? 'line-through text-gray-500' : ''}`}>{employee.name}</td>
                <td className="px-4 py-4 text-xs">{employee.role}</td>
                <td className="px-4 py-4">
                  <span className={`text-[10px] px-2 py-1 rounded font-medium ${
                    employee.status === 'ACTIVE' ? 'bg-[#48bb78]/20 text-[#48bb78]' : 
                    employee.status === 'ON_LEAVE' ? 'bg-[#ed8936]/20 text-[#ed8936]' : 
                    'bg-[#fc8181]/20 text-[#fc8181]'
                  }`}>
                    {employee.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs">
                  {isClockedIn ? (
                    <span className="text-green-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> In</span>
                  ) : (
                    <span className="text-gray-500">Out</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right font-mono text-sm">
                  {employee.todaySales?.toFixed(2) || '0.00'} SAR
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {isClockedIn ? (
                      <button onClick={() => onClockOut(employee)} className="px-3 py-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded text-xs font-bold transition-colors">
                        Out
                      </button>
                    ) : (
                      <button disabled={isInactive || isOnLeave} onClick={() => onClockIn(employee)} className="px-3 py-1 bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent-hover)] rounded text-xs font-bold disabled:opacity-50 transition-colors">
                        In
                      </button>
                    )}
                    <button onClick={() => dispatch(setSelectedEmployee(employee))} className="p-1.5 text-gray-400 hover:text-[var(--color-accent)] hover:bg-[var(--color-surface)] rounded transition-colors" title="View Details">
                      <Eye size={16} />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-[var(--color-accent)] hover:bg-[var(--color-surface)] rounded transition-colors" title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-white hover:bg-[var(--color-surface)] rounded transition-colors" title="More">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
