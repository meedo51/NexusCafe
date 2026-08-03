const fs = require('fs');
let code = fs.readFileSync('src/features/employees/components/EmployeesView/EmployeeCard.tsx', 'utf8');

code = code.replace(
  "interface EmployeeCardProps {",
  "interface EmployeeCardProps {\n  key?: React.Key;"
);

fs.writeFileSync('src/features/employees/components/EmployeesView/EmployeeCard.tsx', code);
console.log("Patched EmployeeCard.tsx");
