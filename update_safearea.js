const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (content.includes('SafeAreaView') && content.match(/import\s+{[^}]*SafeAreaView[^}]*}\s+from\s+['"]react-native['"]/)) {
        // Remove SafeAreaView from react-native import
        content = content.replace(/(import\s+{[^}]*)(SafeAreaView,?\s*)([^}]*}\s+from\s+['"]react-native['"])/, '$1$3');
        // Add import from react-native-safe-area-context
        content = "import { SafeAreaView } from 'react-native-safe-area-context';\n" + content;
        
        fs.writeFileSync(fullPath, content);
        console.log('Updated:', fullPath);
      }
    }
  }
}

processDir(path.join(process.cwd(), 'screens'));
processDir(path.join(process.cwd(), 'components'));
