const fs = require('fs');
let code = fs.readFileSync('src/features/employees/components/EmployeesView/EmployeesView.tsx', 'utf8');

const clockInModal = `
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
`;

const clockOutModal = `
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
`;

code = code.replace(/\{clockInEmp && \([\s\S]*?\)\}/, clockInModal);
code = code.replace(/\{clockOutEmp && \([\s\S]*?\)\}/, clockOutModal);

fs.writeFileSync('src/features/employees/components/EmployeesView/EmployeesView.tsx', code);
console.log("Patched Modals");
