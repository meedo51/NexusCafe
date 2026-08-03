const fs = require('fs');
let code = fs.readFileSync('src/features/employees/components/EmployeesView/EmployeesView.tsx', 'utf8');

code = code.replace(
  "import EmployeesTable from './EmployeesTable';",
  "import EmployeesTable from './EmployeesTable';\nimport EmployeeDetails from '../EmployeeDetails/EmployeeDetails';"
);

code = code.replace(
  "return <div className=\"p-6\">Employee Details View (Coming Next)</div>;",
  "return <EmployeeDetails />;"
);

fs.writeFileSync('src/features/employees/components/EmployeesView/EmployeesView.tsx', code);
console.log("Patched EmployeesView.tsx");
