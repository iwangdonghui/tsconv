#!/usr/bin/env node

import fs from 'fs';

const filePath = 'api/handlers/unified-health.ts';

console.log('🔧 Fixing double underscores...');

let content = fs.readFileSync(filePath, 'utf8');

// Fix double underscores
content = content.replace(/__redis/g, '_redis');
content = content.replace(/___redis/g, '_redis');

// Fix any other double underscores that might exist
content = content.replace(/__([a-zA-Z])/g, '_$1');

fs.writeFileSync(filePath, content);

console.log('✅ Fixed double underscores');
