import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { RootState } from '../store';
import { logout } from '../store/authSlice';
import { LogOut, Coffee, BarChart3, Settings, User, Search, Home, ClipboardList, Package, Users, PieChart, ChefHat } from 'lucide-react';
import ClockInModal from './ClockInModal';
import ClockOutModal from './ClockOutModal';
import { Clock } from 'lucide-react';

export default function AppLayout() {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const user = useSelector((state: RootState) => state.auth.user);
  const shift = useSelector((state: RootState) => state.auth.shift);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isAr = lang === 'ar';
  const [showClockIn, setShowClockIn] = useState(false);
  const [showClockOut, setShowClockOut] = useState(false);

  // Role based access control for navigation
  const getNavItems = () => {
    const role = user?.role?.toUpperCase() || 'CASHIER';
    const items = [];
    
    if (['ADMIN', 'MANAGER'].includes(role)) {
      items.push({ icon: <Home size={24} />, path: '/dashboard', title: 'Dashboard' });
    }
    
    if (['ADMIN', 'MANAGER', 'CASHIER', 'BARISTA'].includes(role)) {
      items.push({ icon: <Coffee size={24} />, path: '/pos', title: 'POS' });
    }
    
    if (['ADMIN', 'MANAGER'].includes(role)) {
      items.push({ icon: <ClipboardList size={24} />, path: '/menu', title: 'Menu' });
      items.push({ icon: <Package size={24} />, path: '/inventory', title: 'Inventory' });
      items.push({ icon: <Users size={24} />, path: '/employees', title: 'Employees' });
    }
    
    if (['ADMIN', 'MANAGER', 'CASHIER', 'BARISTA', 'KITCHEN'].includes(role)) {
      items.push({ icon: <Search size={24} />, path: '/orders', title: 'Orders' });
    }
    
    if (['BARISTA', 'KITCHEN'].includes(role)) {
      items.push({ icon: <ChefHat size={24} />, path: '/kitchen', title: 'Kitchen' });
    }
    
    if (['ADMIN', 'MANAGER'].includes(role)) {
      items.push({ icon: <PieChart size={24} />, path: '/reports', title: 'Reports' });
    }
    
    if (['ADMIN'].includes(role)) {
      items.push({ icon: <Settings size={24} />, path: '/settings', title: 'Settings' });
    }
    
    return items;
  };

  const navItems = getNavItems();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {showClockIn && <ClockInModal onClose={() => setShowClockIn(false)} />}
      {showClockOut && <ClockOutModal onClose={() => setShowClockOut(false)} />}

      {/* Top Navbar */}
      <nav className="h-16 bg-[var(--color-base)] border-b border-[var(--color-border)] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[var(--color-accent)] rounded flex items-center justify-center font-bold text-[var(--color-base-dark)] text-xl">N</div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">NEXUS<span className="text-[var(--color-accent)]">CAFE</span></h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-none">Terminal 01 • POS Ecosystem</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className={`flex gap-4 ${isAr ? 'border-l pl-6' : 'border-r pr-6'} border-[var(--color-border)] text-xs items-center`}>
            {shift?.status === 'ACTIVE' ? (
              <>
                <div className="flex flex-col items-end mr-4">
                  <span className="text-green-500 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Clocked In</span>
                  <span className="text-[10px] text-gray-400">Open: {shift.openingBalance} SAR</span>
                </div>
                <button 
                  onClick={() => setShowClockOut(true)}
                  className="px-4 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-red-500 hover:text-red-500 rounded font-bold transition-colors"
                >
                  Clock Out
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col items-end mr-4">
                  <span className="text-red-400 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span> Not Clocked In</span>
                </div>
                <button 
                  onClick={() => setShowClockIn(true)}
                  className="px-4 py-1.5 bg-[var(--color-accent)] text-black border border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded font-bold transition-colors flex items-center gap-2"
                >
                  <Clock size={14} /> Clock In
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className={isAr ? 'text-left' : 'text-right'}>
              <p className="text-sm font-medium">{user?.name || 'Cashier'}</p>
              <p className="text-[10px] text-[var(--color-accent)] uppercase">{user?.role || 'Staff'}</p>
            </div>
            <div 
              className="w-10 h-10 rounded-full bg-[var(--color-border)] border border-[var(--color-accent)] flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={() => dispatch(logout())}
              title={isAr ? 'تسجيل الخروج' : 'Sign Out'}
            >
              <User size={18} className="text-gray-400" />
            </div>
            <div className="flex gap-1 bg-[var(--color-surface)] p-1 rounded border border-[var(--color-border)]">
              <button onClick={() => setLang('en')} className={`px-2 py-1 text-[10px] font-bold rounded ${!isAr ? 'bg-[var(--color-accent)] text-black' : 'text-gray-400'}`}>EN</button>
              <button onClick={() => setLang('ar')} className={`px-2 py-1 text-[10px] font-bold rounded ${isAr ? 'bg-[var(--color-accent)] text-black' : 'text-gray-400'}`}>AR</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar Nav */}
        <aside className={`w-20 bg-[var(--color-base)] ${isAr ? 'border-l' : 'border-r'} border-[var(--color-border)] flex flex-col items-center py-6 gap-8 shrink-0`}>
          {navItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              title={item.title}
              className={`p-3 rounded-xl transition-all ${
                location.pathname.startsWith(item.path) || (location.pathname === '/' && item.path === '/pos')
                  ? 'bg-[var(--color-border)] text-[var(--color-accent)] border border-[var(--color-accent)] shadow-[0_0_15px_rgba(201,168,76,0.1)]'
                  : 'text-gray-500 hover:text-[var(--color-accent)]'
              }`}
            >
              {item.icon}
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          <Outlet />
        </div>
      </div>

      <footer className="h-8 bg-[var(--color-base-dark)] border-t border-[var(--color-border)] px-6 flex items-center justify-between text-[10px] text-gray-600 shrink-0">
        <div className="flex gap-4">
          <span>NODE INSTANCE: PM2_16</span>
          <span>DB: POSTGRES+TIMESCALE (SYNC)</span>
          <span>MEMORY: 1.2GB/16GB</span>
        </div>
        <div className="flex gap-4">
          <span>SYSTEM UPTIME: 99.998%</span>
          <span className="text-[var(--color-accent)] font-bold">VERSION 2.4.0-STABLE</span>
        </div>
      </footer>
    </div>
  );
}
