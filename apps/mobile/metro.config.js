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

// Nota: não desativar `resolver.disableHierarchicalLookup`. O expo doctor
// acusa divergência, e a duplicação de pacotes em monorepo se resolve
// alinhando as versões no package.json, não escondendo a busca do Metro.

module.exports = config;
