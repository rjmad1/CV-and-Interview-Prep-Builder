const http = require('http');
const child_process = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

// Configurations
const CONFIG = {
  idleTimeout: 5 * 60 * 1000, // 5 minutes
  checkInterval: 10 * 1000,   // 10 seconds
  services: {
    web: {
      publicPort: 3000,
      internalPort: 3005,
      startCmd: 'pnpm',
      startArgs: ['--filter', 'career-intelligence-studio-web', 'dev', '--', '-p', '3005'],
      healthUrl: 'http://127.0.0.1:3005/',
      name: 'Next.js Web Frontend',
      cwd: projectRoot,
      env: { PORT: '3005' }
    },
    api: {
      publicPort: 8000,
      internalPort: 8005,
      startCmd: path.join(projectRoot, 'apps', 'api', '.venv', 'Scripts', 'python.exe'),
      startArgs: ['-m', 'uvicorn', 'apps.api.src.main:app', '--port', '8005', '--host', '127.0.0.1'],
      healthUrl: 'http://127.0.0.1:8005/',
      name: 'FastAPI Backend API',
      cwd: projectRoot,
      env: { PYTHONPATH: projectRoot, DATABASE_URL: 'sqlite:///career_intelligence_studio.db' }
    },
    gateway: {
      publicPort: 8001,
      internalPort: 8015,
      startCmd: path.join(projectRoot, 'apps', 'api', '.venv', 'Scripts', 'python.exe'),
      startArgs: ['-m', 'uvicorn', 'ai_gateway.main:app', '--port', '8015', '--host', '127.0.0.1'],
      healthUrl: 'http://127.0.0.1:8015/',
      name: 'AI Gateway Proxy',
      cwd: projectRoot,
      env: { PYTHONPATH: projectRoot }
    }
  }
};

// State tracker
const state = {
  web: { status: 'DORMANT', process: null, lastActive: 0, pendingRequests: [] },
  api: { status: 'DORMANT', process: null, lastActive: 0, pendingRequests: [] },
  gateway: { status: 'DORMANT', process: null, lastActive: 0, pendingRequests: [] }
};

// Logging helper
function log(msg, level = 'INFO') {
  const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[${ts}] [${level}] ${msg}`);
}

// Check if a service is healthy
function checkHealth(serviceKey) {
  const service = CONFIG.services[serviceKey];
  return new Promise((resolve) => {
    const req = http.get(service.healthUrl, { timeout: 1000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

// Start a service
function startService(serviceKey) {
  if (state[serviceKey].status !== 'DORMANT') return;
  
  const config = CONFIG.services[serviceKey];
  state[serviceKey].status = 'STARTING';
  state[serviceKey].lastActive = Date.now();
  log(`Waking up ${config.name}...`, 'SYSTEM');

  const env = { ...process.env, ...config.env };
  
  // Start the subprocess
  const child = child_process.spawn(config.startCmd, config.startArgs, {
    cwd: config.cwd,
    env,
    shell: true, // Crucial for resolving pnpm on Windows
    stdio: 'ignore' // Prevent terminal flooding
  });

  state[serviceKey].process = child;
  log(`${config.name} process spawned (PID: ${child.pid}).`, 'SYSTEM');

  // Poll health until responsive
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds
  const interval = setInterval(async () => {
    attempts++;
    const healthy = await checkHealth(serviceKey);
    if (healthy) {
      clearInterval(interval);
      state[serviceKey].status = 'ACTIVE';
      state[serviceKey].lastActive = Date.now();
      log(`${config.name} is now HEALTHY and active.`, 'SUCCESS');
      
      // Flush pending requests
      const reqs = state[serviceKey].pendingRequests;
      state[serviceKey].pendingRequests = [];
      reqs.forEach(({ req, res }) => handleProxy(serviceKey, req, res));
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      state[serviceKey].status = 'DORMANT';
      log(`Failed to warm up ${config.name} after ${maxAttempts}s.`, 'ERROR');
      
      // Reject pending requests
      const reqs = state[serviceKey].pendingRequests;
      state[serviceKey].pendingRequests = [];
      reqs.forEach(({ res }) => {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end(`Service ${config.name} failed to start.`);
      });
      killProcessTree(child);
    }
  }, 1000);
}

// Safely kill process tree on Windows
function killProcessTree(child) {
  if (!child) return;
  log(`Terminating process tree for PID ${child.pid}...`, 'SYSTEM');
  try {
    child_process.execSync(`taskkill /pid ${child.pid} /f /t`);
  } catch (err) {
    log(`Standard process tree kill failed: ${err.message}. Trying direct kill.`, 'WARNING');
    try {
      child.kill();
    } catch (e) {
      log(`Direct kill failed: ${e.message}`, 'ERROR');
    }
  }
}

// Stop a service due to inactivity
function stopService(serviceKey) {
  if (state[serviceKey].status === 'DORMANT') return;
  const config = CONFIG.services[serviceKey];
  log(`Service ${config.name} is idle. Hibernating...`, 'SYSTEM');
  
  killProcessTree(state[serviceKey].process);
  state[serviceKey].process = null;
  state[serviceKey].status = 'DORMANT';
  log(`Service ${config.name} is now DORMANT.`, 'SUCCESS');
}

// Proxy requests to the active internal port
function handleProxy(serviceKey, req, res) {
  state[serviceKey].lastActive = Date.now();
  const config = CONFIG.services[serviceKey];
  
  const proxyReq = http.request({
    host: '127.0.0.1',
    port: config.internalPort,
    path: req.url,
    method: req.method,
    headers: req.headers
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    log(`Proxy error to ${config.name}: ${err.message}`, 'ERROR');
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(`Bad Gateway: Internal service ${config.name} is not responding.`);
  });

  req.pipe(proxyReq);
}

// HTML Loading Page for Frontend Warm Up
function getWarmingPage(serviceName) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Warming Up | Career Intelligence Studio</title>
  <meta http-equiv="refresh" content="3">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@350;600&family=Inter:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body {
      background-color: #0b0f19;
      color: #f1f5f9;
      font-family: 'Inter', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      overflow: hidden;
    }
    .container {
      text-align: center;
      max-width: 500px;
      padding: 40px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    }
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 2.2rem;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #a78bfa, #6366f1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 600;
    }
    p {
      color: #94a3b8;
      font-size: 1rem;
      margin-bottom: 30px;
    }
    .spinner {
      position: relative;
      width: 70px;
      height: 70px;
      margin: 0 auto 30px;
    }
    .spinner-inner {
      box-sizing: border-box;
      display: block;
      position: absolute;
      width: 64px;
      height: 64px;
      margin: 3px;
      border: 3px solid transparent;
      border-radius: 50%;
      animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
      border-top-color: #818cf8;
    }
    .spinner-inner:nth-child(1) { animation-delay: -0.45s; }
    .spinner-inner:nth-child(2) { animation-delay: -0.3s; }
    .spinner-inner:nth-child(3) { animation-delay: -0.15s; }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .status-text {
      font-size: 0.85rem;
      color: #64748b;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner">
      <div class="spinner-inner"></div>
      <div class="spinner-inner"></div>
      <div class="spinner-inner"></div>
    </div>
    <h1>Warming Up Studio</h1>
    <p>We are initializing ${serviceName} in the background. This page will reload automatically.</p>
    <div class="status-text">State: Booting Process...</div>
  </div>
</body>
</html>
  `;
}

// Start Proxy Servers
function initServers() {
  // Setup 3 ports
  Object.keys(CONFIG.services).forEach((serviceKey) => {
    const service = CONFIG.services[serviceKey];
    
    const server = http.createServer((req, res) => {
      // Internal system API endpoints for Orchestrator management
      if (req.url === '/_orchestrator/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          service: serviceKey,
          status: state[serviceKey].status,
          lastActive: state[serviceKey].lastActive,
          uptime: state[serviceKey].process ? 'Running' : 'Stopped'
        }));
      }

      if (req.url === '/_orchestrator/hibernate') {
        stopService(serviceKey);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'OK', service: serviceKey }));
      }

      // 1. If Active, proxy directly
      if (state[serviceKey].status === 'ACTIVE') {
        handleProxy(serviceKey, req, res);
      }
      // 2. If Starting, enqueue or return loader page
      else if (state[serviceKey].status === 'STARTING') {
        state[serviceKey].lastActive = Date.now();
        if (serviceKey === 'web' && req.headers.accept && req.headers.accept.includes('text/html')) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(getWarmingPage(service.name));
        } else {
          // Queue API/JSON requests
          state[serviceKey].pendingRequests.push({ req, res });
        }
      }
      // 3. If Dormant, trigger boot and enqueue
      else if (state[serviceKey].status === 'DORMANT') {
        startService(serviceKey);
        if (serviceKey === 'web' && req.headers.accept && req.headers.accept.includes('text/html')) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(getWarmingPage(service.name));
        } else {
          state[serviceKey].pendingRequests.push({ req, res });
        }
      }
    });

    server.listen(service.publicPort, '127.0.0.1', () => {
      log(`Proxy listening on port ${service.publicPort} -> internal ${service.internalPort} (${service.name})`);
    });
  });

  // Start Idle Checker
  setInterval(() => {
    const now = Date.now();
    Object.keys(state).forEach((serviceKey) => {
      if (state[serviceKey].status === 'ACTIVE' && (now - state[serviceKey].lastActive > CONFIG.idleTimeout)) {
        stopService(serviceKey);
      }
    });
  }, CONFIG.checkInterval);
}

// Handle shutdown
process.on('SIGINT', () => {
  log('Shutting down orchestrator. Terminating all active services...', 'SYSTEM');
  Object.keys(state).forEach((key) => {
    if (state[key].process) {
      killProcessTree(state[key].process);
    }
  });
  process.exit(0);
});

initServers();
log('Multi-Application Orchestrator is running. Ready for incoming requests.', 'SUCCESS');
