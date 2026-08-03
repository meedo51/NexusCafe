import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, X, Filter } from 'lucide-react';
import { RootState } from '../../../../store';
import { setFilters, clearFilters } from '../../store/employeesSlice';

export default function SearchFilterBar() {
  const dispatch = useDispatch();
  const filters = useSelector((state: RootState) => state.employees.filters);
  const [searchTerm, setSearchTerm] = useState(filters.search);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.search !== searchTerm) {
        dispatch(setFilters({ search: searchTerm }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, dispatch, filters.search]);

  const toggleFilter = (type: 'roles' | 'statuses' | 'branches', value: string) => {
    const current = filters[type];
    const updated = current.includes(value) 
      ? current.filter(item => item !== value)
      : [...current, value];
    
    dispatch(setFilters({ [type]: updated }));
  };
  
  const hasActiveFilters = filters.search || filters.roles.length > 0 || filters.statuses.length > 0 || filters.branches.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text"
            placeholder="Search by name, ID, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        {/* Role Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide w-full md:w-auto">
          <div className="flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-1">
            <span className="text-xs text-gray-500 px-2 font-medium flex items-center gap-1"><Filter size={12}/> Role</span>
            {['Admin', 'Manager', 'Cashier', 'Barista', 'Kitchen'].map(role => {
              const isActive = filters.roles.includes(role);
              return (
                <button
                  key={role}
                  onClick={() => toggleFilter('roles', role)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    isActive 
                      ? 'bg-[var(--color-base-dark)] text-[var(--color-accent)] border border-[var(--color-accent)]' 
                      : 'hover:bg-[var(--color-base-dark)] text-gray-400 border border-transparent'
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
          
          <div className="flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-1">
            <span className="text-xs text-gray-500 px-2 font-medium">Status</span>
            {['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'].map(status => {
              const isActive = filters.statuses.includes(status);
              const label = status.replace('_', ' ');
              return (
                <button
                  key={status}
                  onClick={() => toggleFilter('statuses', status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    isActive 
                      ? 'bg-[var(--color-base-dark)] text-white border border-gray-500' 
                      : 'hover:bg-[var(--color-base-dark)] text-gray-400 border border-transparent'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Filter Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center text-xs">
          <span className="text-gray-500">Active Filters:</span>
          
          {filters.search && (
            <span className="bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-1 rounded flex items-center gap-1">
              Search: "{filters.search}"
              <X size={12} className="cursor-pointer hover:text-red-400" onClick={() => setSearchTerm('')} />
            </span>
          )}
          
          {filters.roles.map(role => (
            <span key={`role-${role}`} className="bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-1 rounded flex items-center gap-1">
              Role: {role}
              <X size={12} className="cursor-pointer hover:text-red-400" onClick={() => toggleFilter('roles', role)} />
            </span>
          ))}
          
          {filters.statuses.map(status => (
            <span key={`status-${status}`} className="bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-1 rounded flex items-center gap-1">
              Status: {status.replace('_', ' ')}
              <X size={12} className="cursor-pointer hover:text-red-400" onClick={() => toggleFilter('statuses', status)} />
            </span>
          ))}
          
          <button 
            onClick={() => {
              setSearchTerm('');
              dispatch(clearFilters());
            }}
            className="text-[var(--color-accent)] hover:underline ml-2"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
