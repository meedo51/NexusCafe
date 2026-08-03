import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import EmployeeCard from './EmployeeCard';

export default function EmployeesGrid({ onClockIn, onClockOut }: { onClockIn: any, onClockOut: any }) {
  const employees = useSelector((state: RootState) => state.employees.filteredEmployees);
  const loading = useSelector((state: RootState) => state.employees.loading);

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {employees.map(employee => (
        <EmployeeCard 
          key={employee.id} 
          employee={employee} 
          onClockIn={onClockIn} 
          onClockOut={onClockOut} 
        />
      ))}
    </div>
  );
}
