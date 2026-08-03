const fs = require('fs');
let code = fs.readFileSync('src/components/POSLayout.tsx', 'utf8');

const mainMatch = code.match(/<main[\s\S]*?<\/main>/);
if (mainMatch) {
  let mainContent = mainMatch[0];
  code = code.replace(/return \(\s*<div className="`flex flex-col h-screen[\s\S]*?<\/div>\s*\);/m, 'return (\n' + mainContent + '\n  );');
  
  // also fallback regex if the first fails
  code = code.replace(/return \([\s\S]*?<\/footer>[\s]*<\/div>\s*\);/m, 'return (\n' + mainContent + '\n  );');

  fs.writeFileSync('src/components/POSLayout.tsx', code);
  console.log("Patched POSLayout");
} else {
  console.log("Could not find main content");
}
