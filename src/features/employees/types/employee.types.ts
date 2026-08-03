export interface Employee {
  id: number;
  uid: string;
  name: string;
  nameAr?: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  phone?: string;
  hireDate?: string;
  branch?: string;
  biometricId?: string;
  pinAttempts: number;
  lockedUntil?: string;
  shiftStatus?: 'CLOCKED_IN' | 'CLOCKED_OUT';
  clockInTime?: string;
  todaySales?: number;
  commission?: number;
}

export interface EmployeeFilters {
  search: string;
  roles: string[];
  branches: string[];
  statuses: string[];
}
