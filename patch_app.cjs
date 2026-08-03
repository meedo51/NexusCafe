const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import AppLayout from './components/AppLayout';",
  "import AppLayout from './components/AppLayout';\nimport EmployeesView from './features/employees/components/EmployeesView/EmployeesView';"
);

code = code.replace(
  '<Route path="employees/*" element={<div>Employees Module (Coming Soon)</div>} />',
  '<Route path="employees/*" element={<EmployeesView />} />'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");
