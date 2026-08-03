const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import EmployeesView from './features/employees/components/EmployeesView/EmployeesView';",
  "import EmployeesView from './features/employees/components/EmployeesView/EmployeesView';\nimport AuditLogViewer from './features/employees/components/AuditLog/AuditLogViewer';"
);

code = code.replace(
  '<Route path="employees/*" element={<EmployeesView />} />',
  '<Route path="employees/*" element={<EmployeesView />} />\n                <Route path="audit/*" element={<AuditLogViewer />} />'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");

// Now patch EmployeesView
let empView = fs.readFileSync('src/features/employees/components/EmployeesView/EmployeesView.tsx', 'utf8');
empView = empView.replace(
  "import { UserPlus } from 'lucide-react';",
  "import { UserPlus, ShieldAlert } from 'lucide-react';\nimport { useNavigate } from 'react-router-dom';"
);
empView = empView.replace(
  "const user = useSelector((state: RootState) => state.auth.user);",
  "const user = useSelector((state: RootState) => state.auth.user);\n  const navigate = useNavigate();"
);
empView = empView.replace(
  "{user?.role === 'Admin' && (",
  "{user?.role === 'Admin' && (\n              <button \n                onClick={() => navigate('/audit')}\n                className=\"flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-gray-300 font-bold rounded-lg hover:border-[var(--color-accent)] hover:text-white transition-colors\"\n              >\n                <ShieldAlert size={18} /> Audit Log\n              </button>\n            )}\n            {user?.role === 'Admin' && ("
);

fs.writeFileSync('src/features/employees/components/EmployeesView/EmployeesView.tsx', empView);
console.log("Patched EmployeesView.tsx");
