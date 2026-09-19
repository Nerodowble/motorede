// Metro precisa de ajuste para monorepo: por padrão ele só olha o próprio
// diretório do app, e não enxergaria packages/shared nem os pacotes que o npm
// içou para o node_modules da raiz.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Observa o monorepo inteiro, para editar packages/shared refletir no app.
config.watchFolders = [workspaceRoot];

// Procura dependências no app e, depois, na raiz (onde o npm workspaces iça).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Evita que o Metro suba a árvore sozinho e acabe carregando duas cópias da
// mesma biblioteca — causa clássica de "dois Reacts" em monorepo.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
