import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ArrowLeft, Plus, Clock, Check, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import CalendarPlanner from './CalendarPlanner';
import ShiftTrades from './ShiftTrades';

export default function SchedulingView({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState('planner');
  
  const tabs = [
    { id: 'planner', label: 'Shift Planner', icon: <CalendarIcon size={16} /> },
    { id: 'trades', label: 'Shift Trades', icon: <RefreshCw size={16} /> },
    { id: 'availability', label: 'Availability', icon: <Clock size={16} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--color-base-dark)] overflow-hidden w-full animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-[var(--color-card)] border-b border-[var(--color-border)] p-6 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-base)] text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Advanced Scheduling</h2>
            <p className="text-sm text-gray-400 mt-1">Manage weekly rosters and availability</p>
          </div>
        </div>
      </div>
      
      <div className="px-6 border-b border-[var(--color-border)] bg-[var(--color-base)] shrink-0 flex overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-[var(--color-base-dark)]">
        {activeTab === 'planner' && <CalendarPlanner />}
        {activeTab === 'trades' && <ShiftTrades />}
        {activeTab === 'availability' && <Availability />}
      </div>
    </div>
  );
}

function ShiftPlanner() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/scheduling/shifts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setShifts(data);
        const uniqueEmps: any[] = [];
        data.forEach((s: any) => {
          if (!uniqueEmps.find(e => e.id === s.employee.id)) {
            uniqueEmps.push(s.employee);
          }
        });
        setEmployees(uniqueEmps);
      } else {
        console.error("Error fetching shifts:", data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const roleColors: Record<string, string> = {
    Admin: 'bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]/30',
    Manager: 'bg-[#4299e1]/20 text-[#4299e1] border-[#4299e1]/30',
    Cashier: 'bg-[#48bb78]/20 text-[#48bb78] border-[#48bb78]/30',
    Barista: 'bg-[#9f7aea]/20 text-[#9f7aea] border-[#9f7aea]/30',
    Kitchen: 'bg-[#ed8936]/20 text-[#ed8936] border-[#ed8936]/30',
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-base)]">
        <div className="flex items-center gap-4">
          <button className="p-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded hover:border-[var(--color-accent)] transition-colors"><ChevronLeft size={16} /></button>
          <span className="font-bold text-sm tracking-wide">Next Week</span>
          <button className="p-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded hover:border-[var(--color-accent)] transition-colors"><ChevronRight size={16} /></button>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-3 py-1.5 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded hover:text-[var(--color-accent)] transition-colors" onClick={fetchData}>Refresh</button>
          <button className="px-3 py-1.5 text-xs font-bold bg-[var(--color-accent)] text-black rounded hover:bg-[var(--color-accent-hover)] transition-colors shadow-[0_4px_14px_rgba(201,168,76,0.2)]">Publish Schedule</button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">Loading schedules...</div>
        ) : employees.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">No scheduled shifts found. Publish shifts or add via API to see them here.</div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[#1a1a1a] text-xs">
                <th className="p-4 w-56 font-semibold border-b border-r border-[var(--color-border)]">Employee</th>
                {days.map((day, idx) => {
                  const d = new Date();
                  const offset = (8 - d.getDay()) % 7; 
                  d.setDate(d.getDate() + (offset === 0 ? 1 : offset) + idx);
                  return (
                  <th key={day} className="p-4 font-semibold border-b border-r border-[var(--color-border)] min-w-[140px] text-center">
                    <div className="text-gray-200">{day}</div>
                    <div className="text-[10px] text-gray-500 font-normal mt-1">{d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                  </th>
                )})}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-b border-[var(--color-border)] hover:bg-[#2a2a2a] transition-colors">
                  <td className="p-4 border-r border-[var(--color-border)] bg-[var(--color-base)]">
                    <div className="font-semibold text-sm truncate">{emp.name}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{emp.role}</div>
                  </td>
                  {days.map((day, i) => {
                    const dayShifts = shifts.filter(s => {
                      const d = new Date(s.date).getDay();
                      // getDay() 0 is Sunday, so map to our Monday-first array
                      const mapping = [6, 0, 1, 2, 3, 4, 5];
                      return s.userId === emp.id && mapping[d] === i;
                    });
                    
                    return (
                      <td key={day} className="p-2 border-r border-[var(--color-border)] relative group min-h-[80px] align-top bg-[var(--color-card)]">
                        {dayShifts.map(s => (
                          <div key={s.id} className={`p-2 rounded-md text-[11px] font-bold border mb-2 cursor-pointer shadow-sm hover:scale-[1.02] transition-transform ${roleColors[s.role] || 'bg-gray-800 text-gray-300'}`}>
                            {new Date(s.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(s.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        ))}
                        <div className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] transition-all cursor-pointer">
                          <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-accent)] text-[var(--color-accent)] flex items-center justify-center">
                            <Plus size={16} />
                          </div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function ShiftSwaps() {
  const [swaps, setSwaps] = useState<any[]>([]);
  const token = useSelector((state: RootState) => state.auth.token);
  
  useEffect(() => {
    fetchSwaps();
  }, [token]);

  const fetchSwaps = async () => {
    try {
      const res = await fetch('/api/scheduling/swaps', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setSwaps(data);
      }
    } catch(e) {}
  };

  const updateSwap = async (id: number, status: string) => {
    try {
      await fetch(`/api/scheduling/swaps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchSwaps();
    } catch(e) {}
  };

  return (
    <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-2xl">
      <div className="p-5 border-b border-[var(--color-border)] bg-[var(--color-base)] flex justify-between items-center">
        <h4 className="font-bold text-sm tracking-wide">Shift Swap Requests</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1a1a1a] text-xs text-gray-400">
              <th className="p-4 font-semibold border-b border-[var(--color-border)]">Requestor</th>
              <th className="p-4 font-semibold border-b border-[var(--color-border)]">Their Shift</th>
              <th className="p-4 font-semibold border-b border-[var(--color-border)]">Target Employee</th>
              <th className="p-4 font-semibold border-b border-[var(--color-border)]">Target Shift</th>
              <th className="p-4 font-semibold border-b border-[var(--color-border)]">Status</th>
              <th className="p-4 font-semibold text-right border-b border-[var(--color-border)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {swaps.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No shift swaps pending.</td></tr>
            )}
            {swaps.map(swap => (
              <tr key={swap.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[#2a2a2a] transition-colors">
                <td className="p-4 text-sm font-medium">{swap.requestor?.name}</td>
                <td className="p-4 text-sm font-mono text-gray-400 bg-[var(--color-base)]/50">{swap.requestorShift ? new Date(swap.requestorShift.date).toLocaleDateString() : 'Unknown'}</td>
                <td className="p-4 text-sm font-medium">{swap.targetUser?.name || 'Day Off'}</td>
                <td className="p-4 text-sm font-mono text-gray-400 bg-[var(--color-base)]/50">{swap.targetShift ? new Date(swap.targetShift.date).toLocaleDateString() : 'Off'}</td>
                <td className="p-4">
                  <span className={`text-[10px] px-2 py-1.5 rounded font-bold uppercase tracking-wider ${
                    swap.status === 'PENDING' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 
                    swap.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                    'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    {swap.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {swap.status === 'PENDING' && (
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => updateSwap(swap.id, 'APPROVED')} className="w-8 h-8 flex items-center justify-center bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white rounded-md transition-all shadow-sm">
                        <Check size={16}/>
                      </button>
                      <button onClick={() => updateSwap(swap.id, 'REJECTED')} className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-md transition-all shadow-sm">
                        <X size={16}/>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Availability() {
  const [availability, setAvailability] = useState<any[]>([]);
  const [timeOff, setTimeOff] = useState<any[]>([]);
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    if (user && token) {
      fetchAvailability();
      fetchTimeOff();
    }
  }, [user, token]);

  const fetchAvailability = async () => {
    try {
      const res = await fetch(`/api/scheduling/availability?userId=${user?.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        const filled = days.map((day, i) => {
          const jsDay = i === 6 ? 0 : i + 1; // Mon=1, Tue=2, ... Sun=0
          const found = data.find((d: any) => d.dayOfWeek === jsDay);
          return found || { dayOfWeek: jsDay, startTime: '08:00', endTime: '16:00', isUnavailable: false };
        });
        setAvailability(filled);
      }
    } catch(e) {}
  };

  const fetchTimeOff = async () => {
    try {
      const res = await fetch(`/api/scheduling/timeoff`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setTimeOff(data.filter((d: any) => d.userId === user?.id));
      }
    } catch(e) {}
  };

  const saveAvailability = async () => {
    try {
      await fetch('/api/scheduling/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ availability })
      });
      alert('Availability saved!');
    } catch(e) {}
  };

  const updateAvail = (index: number, field: string, value: any) => {
    const newAv = [...availability];
    newAv[index] = { ...newAv[index], [field]: value };
    setAvailability(newAv);
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-2xl">
        <h4 className="font-bold text-sm tracking-wide mb-6">My Weekly Availability</h4>
        <div className="flex flex-col gap-4">
          {availability.map((av, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-[var(--color-base)] border border-[var(--color-border)] rounded-lg hover:border-gray-700 transition-colors">
              <span className="text-sm font-medium w-28">{days[i]}</span>
              <div className="flex items-center gap-3 flex-1">
                <input 
                  type="time" 
                  value={av.startTime || '08:00'} 
                  onChange={(e) => updateAvail(i, 'startTime', e.target.value)}
                  disabled={av.isUnavailable} 
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-xs text-gray-300 outline-none focus:border-[var(--color-accent)] disabled:opacity-50 transition-colors" 
                />
                <span className="text-gray-500 text-xs font-medium">TO</span>
                <input 
                  type="time" 
                  value={av.endTime || '16:00'} 
                  onChange={(e) => updateAvail(i, 'endTime', e.target.value)}
                  disabled={av.isUnavailable} 
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-xs text-gray-300 outline-none focus:border-[var(--color-accent)] disabled:opacity-50 transition-colors" 
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer ml-4">
                <input 
                  type="checkbox" 
                  checked={av.isUnavailable} 
                  onChange={(e) => updateAvail(i, 'isUnavailable', e.target.checked)}
                  className="accent-[var(--color-accent)] w-4 h-4 rounded bg-[var(--color-surface)] border-[var(--color-border)]" 
                />
                <span className="text-xs text-gray-400 font-medium">Unavailable</span>
              </label>
            </div>
          ))}
        </div>
        <button onClick={saveAvailability} className="w-full mt-6 bg-[var(--color-accent)] text-black font-bold py-3 rounded-lg hover:bg-[var(--color-accent-hover)] transition-all shadow-[0_4px_14px_rgba(201,168,76,0.2)]">
          Save Availability Settings
        </button>
      </div>

      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-2xl h-fit">
        <h4 className="font-bold text-sm tracking-wide mb-6">Time Off Requests</h4>
        
        <div className="flex flex-col gap-4 mb-8">
          {timeOff.length === 0 && (
             <div className="text-sm text-gray-500 text-center py-4">No time off requests.</div>
          )}
          {timeOff.map((req, i) => (
             <div key={i} className="p-4 bg-[var(--color-base)] border border-[var(--color-border)] rounded-lg hover:border-gray-700 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-sm font-bold">{req.type}</div>
                  <div className="text-xs text-gray-400 mt-1 font-mono">{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</div>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider ${
                  req.status === 'PENDING' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 
                  req.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                  'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  {req.status}
                </span>
              </div>
              {req.reason && <div className="text-xs text-gray-400 italic bg-[var(--color-surface)] p-2 rounded-md">"{req.reason}"</div>}
            </div>
          ))}
        </div>

        <button className="w-full border-2 border-[var(--color-accent)] text-[var(--color-accent)] font-bold py-3 rounded-lg hover:bg-[var(--color-accent)] hover:text-black transition-all flex items-center justify-center gap-2">
          <Plus size={18} /> Request Time Off
        </button>
      </div>
    </div>
  )
}
