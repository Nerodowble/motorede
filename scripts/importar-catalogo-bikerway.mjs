import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Importação manual: a pesquisa e a publicação do catálogo ficam fora do app.
// Uso: node scripts/importar-catalogo-bikerway.mjs <routes.json> <commit de origem>
const [arquivo, commit] = process.argv.slice(2);
if (!arquivo || !/^[a-f0-9]{7,40}$/.test(commit ?? '')) {
  throw new Error('Informe o arquivo routes.json e o commit de origem.');
}
const bruto = JSON.parse(readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, ''));
const ids = new Set();
const coordenada = (p) => {
  if (!p || !Number.isFinite(p.latitude) || Math.abs(p.latitude) > 90 ||
      !Number.isFinite(p.longitude) || Math.abs(p.longitude) > 180) {
    throw new Error('Coordenada inválida no catálogo.');
  }
  return { lat: p.latitude, lng: p.longitude };
};
const numero = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
if (!Array.isArray(bruto) || bruto.length === 0) throw new Error('Catálogo vazio ou inválido.');
const catalogo = bruto.map((r) => {
  if (typeof r.rota_id !== 'string' || !r.rota_id || ids.has(r.rota_id) ||
      !r.nome_rota || !r.estado_pais || !r.coordenada_inicio?.cidade || !r.coordenada_fim?.cidade ||
      !numero(r.distancia_total_km) || r.distancia_total_km === 0 ||
      !['asfalto', 'misto', 'terra'].includes(r.caracteristicas?.tipo_pavimento) ||
      !['baixo', 'medio', 'alto'].includes(r.caracteristicas?.nivel_curvas) ||
      !numero(r.caracteristicas?.trecho_critico_sem_posto_km) ||
      !Array.isArray(r.pontos_apoio_homologados)) throw new Error(`Rota inválida: ${r.rota_id}`);
  ids.add(r.rota_id);
  if (r.pedagios_detalhados !== undefined && (!Array.isArray(r.pedagios_detalhados) ||
      r.pedagios_detalhados.some((p) => !p.nome || !numero(p.valor_moto_reais) ||
        !['fisica', 'free_flow'].includes(p.sistema)))) throw new Error(`Pedágios inválidos: ${r.rota_id}`);
  if (r.pedagios_detalhados !== undefined && (!numero(r.total_pedagios_moto_reais) ||
      Math.abs(r.pedagios_detalhados.reduce((s, p) => s + p.valor_moto_reais, 0) - r.total_pedagios_moto_reais) > 0.01)) {
    throw new Error(`Soma de pedágios divergente: ${r.rota_id}`);
  }
  return {
    id: r.rota_id, nome: r.nome_rota, regiao: r.estado_pais,
    inicio: { cidade: r.coordenada_inicio.cidade, ...coordenada(r.coordenada_inicio) },
    fim: { cidade: r.coordenada_fim.cidade, ...coordenada(r.coordenada_fim) },
    distanciaKm: r.distancia_total_km,
    pavimento: r.caracteristicas.tipo_pavimento, curvas: r.caracteristicas.nivel_curvas,
    trechoSemPostoKm: r.caracteristicas.trecho_critico_sem_posto_km,
    // Zero sem praças explícitas não comprova ausência de pedágio.
    pedagioIda: numero(r.total_pedagios_moto_reais) &&
      (r.total_pedagios_moto_reais > 0 || Array.isArray(r.pedagios_detalhados)) ? r.total_pedagios_moto_reais : null,
    pedagios: r.pedagios_detalhados?.map((p) => ({
      nome: p.nome, valorMoto: p.valor_moto_reais, sistema: p.sistema, fonte: p.fonte_url,
    })),
    pontosApoio: r.pontos_apoio_homologados.map((p) => ({
      nome: p.nome, tipo: p.tipo, descricao: p.descricao_biker, ...coordenada(p),
    })),
    revisao: r.ultima_revisao, descricao: r.descricao_biker, dificuldade: r.dificuldade,
    melhorEpoca: r.melhor_epoca, observacoes: r.dicas_seguranca ?? [], fontes: r.fontes_dados ?? [],
  };
});
const destino = fileURLToPath(new URL('../packages/shared/src/data/catalogoRotas.ts', import.meta.url));
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, `// Importado por scripts/importar-catalogo-bikerway.mjs; revisão das fontes ainda pendente.\n` +
  `import type { RotaCatalogo } from '../domain/rotas.js';\n\n` +
  `export const ORIGEM_CATALOGO_ROTAS = ${JSON.stringify({ projeto: 'BikerWay', url: 'https://github.com/Nerodowble/BikerWay', commit, versao: 1 }, null, 2)} as const;\n\n` +
  `export const CATALOGO_ROTAS: readonly RotaCatalogo[] = ${JSON.stringify(catalogo, null, 2)};\n`, 'utf8');
console.log(`${catalogo.length} rotas importadas em ${resolve(destino)}`);
