import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { Fingerprint, ScanFace, Lock, AlertTriangle, Eye, EyeOff, Shuffle } from 'lucide-react';

export default function PinLogin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [keypad, setKeypad] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  const dispatch = useDispatch();

  const handleKeyPress = (num: string) => {
    if (pin.length < 8) {
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleShuffle = () => {
    const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    setKeypad(numbers);
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        dispatch(setCredentials({
          user: data.user,
          token: data.token,
          shift: data.shift
        }));
      } else {
        setError(data.error || 'Invalid PIN');
        setPin('');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-base-dark)]">
      <div className="bg-[var(--color-base)] p-10 rounded-2xl shadow-xl border border-[var(--color-border)] flex flex-col items-center max-w-sm w-full">
        <div className="w-16 h-16 bg-[var(--color-accent)] rounded flex items-center justify-center font-bold text-black text-3xl mb-6">N</div>
        <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Welcome Back</h1>
        <p className="text-gray-500 text-sm uppercase tracking-widest mb-8">Enter PIN to continue</p>
        
        {/* PIN Display */}
        <div className="flex gap-3 mb-2 h-12 items-center justify-center w-full bg-[var(--color-base-dark)] rounded-lg border border-[var(--color-border)] px-4">
          {showPin ? (
            <span className="text-2xl font-mono tracking-widest">{pin}</span>
          ) : (
            Array.from({ length: Math.max(6, pin.length) }).map((_, i) => (
              <div 
                key={i} 
                className={`w-3 h-3 rounded-full transition-colors ${i < pin.length ? 'bg-[var(--color-accent)]' : 'bg-gray-700'}`} 
              />
            ))
          )}
        </div>
        <div className="flex justify-between w-full mb-6 px-1">
           <button onClick={() => setShowPin(!showPin)} className="text-[10px] uppercase text-gray-400 hover:text-white flex items-center gap-1 font-bold">
             {showPin ? <EyeOff size={12}/> : <Eye size={12}/>} {showPin ? 'Hide PIN' : 'Show PIN'}
           </button>
           <button onClick={handleShuffle} className="text-[10px] uppercase text-gray-400 hover:text-white flex items-center gap-1 font-bold">
             <Shuffle size={12}/> Shuffle Keys
           </button>
        </div>

        {error && (
          <div className="text-red-500 text-sm mb-4 flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 w-full justify-center">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full mb-6">
          {keypad.slice(0, 9).map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="h-16 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] text-xl font-bold transition-all active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleBackspace}
            className="h-16 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] hover:border-red-500 hover:text-red-500 text-xl font-bold transition-all active:scale-95 flex items-center justify-center"
          >
            ⌫
          </button>
          <button
            onClick={() => handleKeyPress(keypad[9].toString())}
            className="h-16 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] text-xl font-bold transition-all active:scale-95"
          >
            {keypad[9]}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || pin.length < 4}
            className="h-16 bg-[var(--color-accent)] text-black rounded-xl border border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-xl font-bold transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '...' : '↵'}
          </button>
        </div>

        {/* Biometrics */}
        <div className="w-full flex gap-3">
          <button className="flex-1 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm font-medium text-gray-400 hover:text-white flex items-center justify-center gap-2 hover:border-gray-500 transition-colors">
            <Fingerprint size={16} /> Fingerprint
          </button>
          <button className="flex-1 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm font-medium text-gray-400 hover:text-white flex items-center justify-center gap-2 hover:border-gray-500 transition-colors">
            <ScanFace size={16} /> Face
          </button>
        </div>
      </div>
    </div>
  );
}
