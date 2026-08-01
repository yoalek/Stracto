#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');

// Absolute path to the server file
const serverPath = path.join(__dirname, '../server.js');
const cwd = path.join(__dirname, '..');

console.log('🚀 Iniciando Stracto...');

// Start the server
const server = spawn('node', [serverPath], { 
  stdio: 'inherit',
  cwd: cwd
});

// Wait 1.5 seconds to ensure server is up, then open browser
setTimeout(() => {
  console.log('\n🌐 Abrindo navegador em http://localhost:3001...\n');
  exec('open http://localhost:3001');
}, 1500);

// Forward kill signals to gracefully shut down the server
process.on('SIGINT', () => {
  server.kill('SIGINT');
  process.exit();
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  process.exit();
});
