import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UserPlus, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../../../store';
import { setEmployees } from '../../store/employeesSlice';
import ViewToggle from './ViewToggle';
import SearchFilterBar from './SearchFilterBar';
import EmployeesGrid from './EmployeesGrid';
import EmployeesTable from './EmployeesTable';
import EmployeeDetails from '../EmployeeDetails/EmployeeDetails';
import SchedulingView from '../Scheduling/SchedulingView';
import { Calendar } from 'lucide-react';

const MOCK_EMPLOYEES = [
  { id: 1, uid: 'EMP-001', name: 'Admin User', role: 'Admin', status: 'ACTIVE', pinAttempts: 0, shiftStatus: 'CLOCKED_IN', clockInTime: new Date().toISOString(), todaySales: 450.50 },
  { id: 2, uid: 'EMP-002', name: 'Sarah Manager', role: 'Manager', status: 'ACTIVE', pinAttempts: 0, shiftStatus: 'CLOCKED_OUT', todaySales: 0 },
  { id: 3, uid: 'EMP-003', name: 'Ahmed Cashier', role: 'Cashier', status: 'ACTIVE', pinAttempts: 0, shiftStatus: 'CLOCKED_IN', clockInTime: new Date(Date.now() - 4*3600000).toISOString(), todaySales: 1245.00 },
  { id: 4, uid: 'EMP-004', name: 'Fatima Barista', role: 'Barista', status: 'ACTIVE', pinAttempts: 0, shiftStatus: 'CLOCKED_IN', clockInTime: new Date(Date.now() - 2*3600000).toISOString(), todaySales: 890.00 },
  { id: 5, uid: 'EMP-005', name: 'Omar Kitchen', role: 'Kitchen', status: 'ON_LEAVE', pinAttempts: 0, shiftStatus: 'CLOCKED_OUT', todaySales: 0 },
  { id: 6, uid: 'EMP-006', name: 'John Doe', role: 'Cashier', status: 'INACTIVE', pinAttempts: 0, shiftStatus: 'CLOCKED_OUT', todaySales: 0 },
];

export default function EmployeesView() {
  const dispatch = useDispatch();
  const viewMode = useSelector((state: RootState) => state.employees.viewMode);
  const selectedEmployee = useSelector((state: RootState) => state.employees.selectedEmployee);
  const user = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();
  const [showScheduling, setShowScheduling] = useState(false);

  const [clockInEmp, setClockInEmp] = useState<any>(null);
  const [clockOutEmp, setClockOutEmp] = useState<any>(null);

  useEffect(() => {
    dispatch(setEmployees(MOCK_EMPLOYEES as any));
  }, [dispatch]);

  const handleAddEmployee = () => {
  };

  if (showScheduling) {
    return <SchedulingView onBack={() => setShowScheduling(false)} />;
  }

  if (selectedEmployee) {
    return <EmployeeDetails />;
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-base-dark)] overflow-hidden w-full">
      <div className="p-6 pb-0 flex flex-col gap-6 shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
            <p className="text-sm text-gray-400 mt-1">Manage employees, roles, and shifts</p>
          </div>
          <div className="flex items-center gap-4">
            <ViewToggle />
            {user?.role === 'Admin' && (
              <button 
                onClick={() => setShowScheduling(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-gray-300 font-bold rounded-lg hover:border-[var(--color-accent)] hover:text-white transition-colors"
              >
                <Calendar size={18} /> Schedule
              </button>
            )}
            {user?.role === 'Admin' && (
              <button 
                onClick={() => navigate('/audit')}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-gray-300 font-bold rounded-lg hover:border-[var(--color-accent)] hover:text-white transition-colors"
              >
                <ShieldAlert size={18} /> Audit Log
              </button>
            )}
            {user?.role === 'Admin' && (
              <button 
                onClick={handleAddEmployee}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-black font-bold rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors shadow-[0_4px_14px_rgba(201,168,76,0.3)]"
              >
                <UserPlus size={18} /> Add Employee
              </button>
            )}
          </div>
        </div>
        
        <SearchFilterBar />
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        {viewMode === 'grid' ? (
          <EmployeesGrid onClockIn={setClockInEmp} onClockOut={setClockOutEmp} />
        ) : (
          <EmployeesTable onClockIn={setClockInEmp} onClockOut={setClockOutEmp} />
        )}
      </div>

      {clockInEmp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[var(--color-card)] p-6 rounded-xl border border-[var(--color-border)] w-96">
            <h3 className="text-xl font-bold mb-4 text-center">Clock In</h3>
            
            <div className="flex flex-col items-center gap-2 mb-6">
               <div className="w-16 h-16 bg-[var(--color-surface)] border-2 border-[var(--color-accent)] rounded-full flex items-center justify-center text-xl font-bold text-[var(--color-accent)]">
                 {clockInEmp.name.substring(0, 2).toUpperCase()}
               </div>
               <p className="font-bold text-lg">{clockInEmp.name}</p>
               <p className="text-xs text-gray-400">{clockInEmp.role} | {clockInEmp.uid}</p>
            </div>

            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Authentication PIN</label>
                <input type="password" placeholder="Enter 4-digit PIN" className="w-full bg-[var(--color-base)] border border-[var(--color-border)] rounded-lg p-3 text-center tracking-[1em] focus:outline-none focus:border-[var(--color-accent)]" />
              </div>
              
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Opening Balance (SAR)</label>
                <input type="number" placeholder="0.00" className="w-full bg-[var(--color-base)] border border-[var(--color-border)] rounded-lg p-3 text-center text-xl font-mono text-[var(--color-accent)] focus:outline-none focus:border-[var(--color-accent)]" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setClockInEmp(null)} className="flex-1 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-base)] font-bold transition-colors">Cancel</button>
              <button onClick={() => setClockInEmp(null)} className="flex-1 px-4 py-3 bg-[var(--color-accent)] text-black rounded-lg hover:bg-[var(--color-accent-hover)] font-bold transition-colors">Clock In</button>
            </div>
          </div>
        </div>
      )}

      {clockOutEmp && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[var(--color-card)] p-6 rounded-xl border border-[var(--color-border)] w-96">
            <h3 className="text-xl font-bold mb-4 text-center">Clock Out</h3>
            
            <div className="flex flex-col items-center gap-2 mb-6">
               <div className="w-16 h-16 bg-[var(--color-surface)] border-2 border-red-500 rounded-full flex items-center justify-center text-xl font-bold text-red-500">
                 {clockOutEmp.name.substring(0, 2).toUpperCase()}
               </div>
               <p className="font-bold text-lg">{clockOutEmp.name}</p>
               <p className="text-xs text-gray-400">Clocked in at {new Date(clockOutEmp.clockInTime || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            </div>

            <div className="flex flex-col gap-4 mb-6">
              <div className="bg-[var(--color-base)] p-3 rounded-lg border border-[var(--color-border)] flex justify-between items-center text-sm">
                <span className="text-gray-400">Today's Sales</span>
                <span className="font-bold font-mono text-[var(--color-accent)]">{clockOutEmp.todaySales?.toFixed(2) || '0.00'} SAR</span>
              </div>
              
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Closing Balance (SAR)</label>
                <input type="number" placeholder="0.00" className="w-full bg-[var(--color-base)] border border-[var(--color-border)] rounded-lg p-3 text-center text-xl font-mono text-red-400 focus:outline-none focus:border-red-500" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setClockOutEmp(null)} className="flex-1 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-base)] font-bold transition-colors">Cancel</button>
              <button onClick={() => setClockOutEmp(null)} className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold transition-colors">Clock Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
