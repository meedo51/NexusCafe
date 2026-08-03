import React from 'react';
import { Grid, List } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { setViewMode } from '../../store/employeesSlice';

export default function ViewToggle() {
  const dispatch = useDispatch();
  const viewMode = useSelector((state: RootState) => state.employees.viewMode);

  return (
    <div className="flex bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-1 shrink-0">
      <button
        onClick={() => dispatch(setViewMode('grid'))}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
          viewMode === 'grid' 
            ? 'bg-[var(--color-base)] text-[var(--color-accent)] shadow-sm' 
            : 'text-gray-400 hover:text-gray-200 hover:scale-105'
        }`}
      >
        <Grid size={16} /> Grid
      </button>
      <button
        onClick={() => dispatch(setViewMode('list'))}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
          viewMode === 'list' 
            ? 'bg-[var(--color-base)] text-[var(--color-accent)] shadow-sm' 
            : 'text-gray-400 hover:text-gray-200 hover:scale-105'
        }`}
      >
        <List size={16} /> List
      </button>
    </div>
  );
}
