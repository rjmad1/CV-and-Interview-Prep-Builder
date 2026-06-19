const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function discover() {
  console.log(`[DISCOVERY] Scanning repository: ${projectRoot}`);
  
  const results = {
    repositoryRoot: projectRoot,
    timestamp: new Date().toISOString(),
    monorepo: {
      type: 'pnpm-workspace',
      manager: 'pnpm',
      buildSystem: 'turborepo'
    },
    applications: {},
    infrastructure: {
      databases: [],
      messageQueues: [],
      vectorStores: []
    },
    dependencyGraph: {
      nodes: [],
      edges: []
    }
  };

  // 1. Scan root package.json
  const rootPackageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(rootPackageJsonPath)) {
    const rootPkg = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
    results.monorepo.name = rootPkg.name;
    results.monorepo.packageManager = rootPkg.packageManager || 'pnpm';
    results.monorepo.devDependencies = rootPkg.devDependencies || {};
  }

  // 2. Scan apps folder
  const appsDir = path.join(projectRoot, 'apps');
  if (fs.existsSync(appsDir)) {
    const apps = fs.readdirSync(appsDir);
    for (const app of apps) {
      const appPath = path.join(appsDir, app);
      const stat = fs.statSync(appPath);
      if (stat.isDirectory()) {
        const appDetails = analyzeApp(app, appPath);
        results.applications[app] = appDetails;
      }
    }
  }

  // 3. Scan for infrastructure configs
  const dockerComposePath = path.join(projectRoot, 'infra', 'docker', 'docker-compose.yml');
  if (fs.existsSync(dockerComposePath)) {
    results.infrastructure.dockerCompose = 'infra/docker/docker-compose.yml';
    // Add default infra based on compose file analysis
    results.infrastructure.databases.push({ name: 'postgresql', port: 5436, targetPort: 5432, container: 'cis-postgres' });
    results.infrastructure.messageQueues.push({ name: 'redis', port: 6379, container: 'cis-redis' });
    results.infrastructure.vectorStores.push({ name: 'qdrant', port: 6335, targetPort: 6333, container: 'cis-qdrant' });
  }

  // Detect local DB
  const localDb = path.join(projectRoot, 'career_intelligence_studio.db');
  if (fs.existsSync(localDb)) {
    results.infrastructure.databases.push({ name: 'sqlite', file: 'career_intelligence_studio.db', type: 'local' });
  }

  // 4. Construct Dependency Graph
  buildDependencyGraph(results);

  // Write results
  const outputPath = path.join(__dirname, 'workspace_discovery.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`[DISCOVERY] Saved scan results to ${outputPath}`);
  
  return results;
}

function analyzeApp(name, appPath) {
  const details = {
    name,
    path: path.relative(projectRoot, appPath),
    type: 'unknown',
    port: null,
    framework: null,
    language: 'unknown',
    dependencies: {},
    devDependencies: {}
  };

  // Node project
  const packageJsonPath = path.join(appPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    details.type = 'frontend/node-service';
    details.language = 'typescript/javascript';
    details.dependencies = pkg.dependencies || {};
    details.devDependencies = pkg.devDependencies || {};
    
    if (pkg.dependencies.next) {
      details.framework = 'Next.js';
      details.type = 'frontend-web';
      details.port = 3000;
    } else if (name === 'api') {
      details.type = 'backend-api-interface';
      details.port = 8000;
    }
  }

  // Python project
  const pyprojectPath = path.join(appPath, 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) {
    details.type = 'backend-service';
    details.language = 'python';
    details.framework = 'FastAPI';
    details.port = 8000;
    
    // Simple parsing of dependencies
    const content = fs.readFileSync(pyprojectPath, 'utf8');
    const matches = content.match(/([a-zA-Z0-9_-]+)\s*=\s*"[^"]+"/g) || [];
    matches.forEach(m => {
      const parts = m.split('=');
      const key = parts[0].trim();
      const val = parts[1].replace(/"/g, '').trim();
      details.dependencies[key] = val;
    });
  }

  return details;
}

function buildDependencyGraph(results) {
  const nodes = results.dependencyGraph.nodes;
  const edges = results.dependencyGraph.edges;

  // Add Nodes
  nodes.push({ id: 'client', label: 'User Browser', type: 'external' });
  
  for (const [appName, app] of Object.entries(results.applications)) {
    nodes.push({
      id: appName,
      label: `${appName} (${app.framework || app.language})`,
      type: 'application',
      port: app.port
    });
  }

  nodes.push({ id: 'ai_gateway', label: 'AI Gateway (FastAPI Proxy)', type: 'application', port: 8001 });

  results.infrastructure.databases.forEach(db => {
    nodes.push({ id: db.name, label: `${db.name} DB`, type: 'database' });
  });

  results.infrastructure.messageQueues.forEach(mq => {
    nodes.push({ id: mq.name, label: `${mq.name} Queue`, type: 'message-queue' });
  });

  results.infrastructure.vectorStores.forEach(vs => {
    nodes.push({ id: vs.name, label: `${vs.name} VectorDB`, type: 'vector-store' });
  });

  // Add Edges (Dependencies)
  edges.push({ from: 'client', to: 'web', type: 'http' });
  edges.push({ from: 'web', to: 'api', type: 'http/api' });
  edges.push({ from: 'api', to: 'ai_gateway', type: 'http/gateway' });
  
  if (results.applications.api) {
    const apiApp = results.applications.api;
    if (apiApp.dependencies.sqlalchemy || apiApp.dependencies.asyncpg) {
      edges.push({ from: 'api', to: 'postgresql', type: 'sql' });
    }
    if (apiApp.dependencies.qdrant_client || apiApp.dependencies['qdrant-client']) {
      edges.push({ from: 'api', to: 'qdrant', type: 'grpc/http' });
    }
    if (apiApp.dependencies.redis) {
      edges.push({ from: 'api', to: 'redis', type: 'redis-protocol' });
    }
    if (apiApp.dependencies.celery) {
      nodes.push({ id: 'celery_worker', label: 'Celery Workers', type: 'background-worker' });
      edges.push({ from: 'api', to: 'redis', type: 'enqueue' });
      edges.push({ from: 'celery_worker', to: 'redis', type: 'dequeue' });
      edges.push({ from: 'celery_worker', to: 'postgresql', type: 'sql-write' });
    }
  }

  edges.push({ from: 'ai_gateway', to: 'nvidia_nim', type: 'external-api', label: 'NVIDIA NIM APIs' });
  nodes.push({ id: 'nvidia_nim', label: 'NVIDIA NIM Cloud Endpoints', type: 'external-service' });
}

if (require.main === module) {
  discover();
}

module.exports = { discover };
