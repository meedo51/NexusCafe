const fs = require('fs');
let code = fs.readFileSync('src/features/employees/components/EmployeesView/EmployeesView.tsx', 'utf8');

code = code.replace(
  "import EmployeeDetails from '../EmployeeDetails/EmployeeDetails';",
  "import EmployeeDetails from '../EmployeeDetails/EmployeeDetails';\nimport SchedulingView from '../Scheduling/SchedulingView';\nimport { Calendar } from 'lucide-react';"
);

code = code.replace(
  "const navigate = useNavigate();",
  "const navigate = useNavigate();\n  const [showScheduling, setShowScheduling] = useState(false);"
);

code = code.replace(
  "if (selectedEmployee) {",
  "if (showScheduling) {\n    return <SchedulingView onBack={() => setShowScheduling(false)} />;\n  }\n\n  if (selectedEmployee) {"
);

const auditLogButtonStr = `{user?.role === 'Admin' && (
              <button 
                onClick={() => navigate('/audit')}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-gray-300 font-bold rounded-lg hover:border-[var(--color-accent)] hover:text-white transition-colors"
              >
                <ShieldAlert size={18} /> Audit Log
              </button>
            )}`;

const scheduleButtonStr = `{user?.role === 'Admin' && (
              <button 
                onClick={() => setShowScheduling(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-gray-300 font-bold rounded-lg hover:border-[var(--color-accent)] hover:text-white transition-colors"
              >
                <Calendar size={18} /> Schedule
              </button>
            )}`;

code = code.replace(auditLogButtonStr, scheduleButtonStr + '\n            ' + auditLogButtonStr);

fs.writeFileSync('src/features/employees/components/EmployeesView/EmployeesView.tsx', code);
console.log("Patched EmployeesView.tsx");
