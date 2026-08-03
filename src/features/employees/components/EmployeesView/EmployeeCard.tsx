import React from 'react';
import { Eye, Edit2, Clock } from 'lucide-react';
import { Employee } from '../../types/employee.types';
import { useDispatch } from 'react-redux';
import { setSelectedEmployee } from '../../store/employeesSlice';

interface EmployeeCardProps {
  key?: React.Key;
  employee: Employee;
  onClockIn?: (employee: Employee) => void;
  onClockOut?: (employee: Employee) => void;
}

const roleColors: Record<string, string> = {
  Admin: 'text-[#c9a84c] border-[#c9a84c] bg-[#c9a84c]/10',
  Manager: 'text-[#4299e1] border-[#4299e1] bg-[#4299e1]/10',
  Cashier: 'text-[#48bb78] border-[#48bb78] bg-[#48bb78]/10',
  Barista: 'text-[#9f7aea] border-[#9f7aea] bg-[#9f7aea]/10',
  Kitchen: 'text-[#ed8936] border-[#ed8936] bg-[#ed8936]/10',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'text-[#48bb78] bg-[#48bb78]/20',
  INACTIVE: 'text-[#fc8181] bg-[#fc8181]/20',
  ON_LEAVE: 'text-[#ed8936] bg-[#ed8936]/20',
  TERMINATED: 'text-[#fc8181] bg-[#fc8181]/20',
};

export default function EmployeeCard({ employee, onClockIn, onClockOut }: EmployeeCardProps) {
  const dispatch = useDispatch();
  
  const initials = employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const roleStyle = roleColors[employee.role] || roleColors['Cashier'];
  const statusStyle = statusColors[employee.status] || statusColors['INACTIVE'];
  const isClockedIn = employee.shiftStatus === 'CLOCKED_IN';

  const isInactive = employee.status === 'INACTIVE' || employee.status === 'TERMINATED';
  const isOnLeave = employee.status === 'ON_LEAVE';

  return (
    <div className={`bg-[var(--color-card)] border ${isOnLeave ? 'border-[#ed8936]' : 'border-[var(--color-border)]'} rounded-xl p-4 flex flex-col gap-4 hover:shadow-2xl hover:border-[var(--color-accent)] hover:-translate-y-1 transition-all duration-300 ${isInactive ? 'opacity-60 grayscale' : ''}`}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-lg shrink-0 ${roleStyle}`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-base truncate ${isInactive ? 'line-through text-gray-400' : ''}`}>
            {employee.name}
          </h3>
          <p className="text-xs text-gray-500 font-mono">{employee.uid}</p>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-2">
        <span className={`text-xs px-2 py-0.5 rounded border ${roleStyle}`}>
          {employee.role}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded ${statusStyle}`}>
          {employee.status.replace('_', ' ')}
        </span>
      </div>

      {/* Quick Stats */}
      <div className="bg-[var(--color-base)] rounded-lg p-3 text-xs flex flex-col gap-2 border border-[var(--color-border)] mt-auto">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Shift</span>
          {isClockedIn ? (
            <span className="text-green-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              {employee.clockInTime ? `Since ${new Date(employee.clockInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Clocked In'}
            </span>
          ) : (
            <span className="text-gray-400">Not Clocked In</span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Sales Today</span>
          <span className="font-medium font-mono">{employee.todaySales?.toFixed(2) || '0.00'} SAR</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        {isClockedIn ? (
          <button 
            onClick={() => onClockOut && onClockOut(employee)}
            className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white py-2 rounded-lg text-sm font-bold transition-colors"
          >
            Clock Out
          </button>
        ) : (
          <button 
            onClick={() => onClockIn && onClockIn(employee)}
            disabled={isInactive || isOnLeave}
            className="flex-1 bg-[var(--color-accent)] text-black border border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:bg-[var(--color-surface)] disabled:text-gray-500 disabled:border-[var(--color-border)] py-2 rounded-lg text-sm font-bold transition-colors"
          >
            Clock In
          </button>
        )}
        <button 
          onClick={() => dispatch(setSelectedEmployee(employee))}
          className="w-10 h-10 flex items-center justify-center bg-[var(--color-surface)] text-gray-400 hover:text-[var(--color-accent)] border border-[var(--color-border)] hover:border-[var(--color-accent)] rounded-lg transition-colors"
          title="View Details"
        >
          <Eye size={18} />
        </button>
        <button 
          className="w-10 h-10 flex items-center justify-center bg-[var(--color-surface)] text-gray-400 hover:text-[var(--color-accent)] border border-[var(--color-border)] hover:border-[var(--color-accent)] rounded-lg transition-colors"
          title="Edit"
        >
          <Edit2 size={18} />
        </button>
      </div>
    </div>
  );
}
