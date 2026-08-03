import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Employee, EmployeeFilters } from '../types/employee.types';

interface EmployeesState {
  employees: Employee[];
  filteredEmployees: Employee[];
  selectedEmployee: Employee | null;
  viewMode: 'grid' | 'list';
  filters: EmployeeFilters;
  loading: boolean;
  error: string | null;
}

const initialState: EmployeesState = {
  employees: [],
  filteredEmployees: [],
  selectedEmployee: null,
  viewMode: (localStorage.getItem('employees_view_mode') as 'grid' | 'list') || 'grid',
  filters: {
    search: '',
    roles: [],
    branches: [],
    statuses: [],
  },
  loading: false,
  error: null,
};

const applyFilters = (state: EmployeesState) => {
  let result = [...state.employees];
  
  if (state.filters.search) {
    const s = state.filters.search.toLowerCase();
    result = result.filter(e => 
      e.name.toLowerCase().includes(s) || 
      (e.nameAr && e.nameAr.includes(s)) ||
      (e.phone && e.phone.includes(s)) ||
      (e.email && e.email.toLowerCase().includes(s)) ||
      e.id.toString().includes(s)
    );
  }
  
  if (state.filters.roles.length > 0) {
    result = result.filter(e => state.filters.roles.includes(e.role));
  }
  
  if (state.filters.branches.length > 0) {
    result = result.filter(e => e.branch && state.filters.branches.includes(e.branch));
  }
  
  if (state.filters.statuses.length > 0) {
    result = result.filter(e => state.filters.statuses.includes(e.status));
  }
  
  state.filteredEmployees = result;
};

const employeesSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    setEmployees: (state, action: PayloadAction<Employee[]>) => {
      state.employees = action.payload;
      applyFilters(state);
    },
    setViewMode: (state, action: PayloadAction<'grid' | 'list'>) => {
      state.viewMode = action.payload;
      localStorage.setItem('employees_view_mode', action.payload);
    },
    setFilters: (state, action: PayloadAction<Partial<EmployeeFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      applyFilters(state);
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      applyFilters(state);
    },
    setSelectedEmployee: (state, action: PayloadAction<Employee | null>) => {
      state.selectedEmployee = action.payload;
    }
  },
});

export const { setEmployees, setViewMode, setFilters, clearFilters, setSelectedEmployee } = employeesSlice.actions;
export default employeesSlice.reducer;
