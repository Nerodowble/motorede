/**
 * Junta o levantamento de pedágios de SP (feito por agentes de pesquisa, um
 * JSON por grupo de concessionárias) em apps/web/public/dados/pedagios-sp.json.
 *
 * JSON na pasta pública da web, e não código: a Vercel serve o arquivo em
 * /dados/pedagios-sp.json, o app e a web baixam só quando precisam (não pesa
 * no pacote do app) e atualizar uma tarifa é só publicar a web, sem OTA.
 *
 * Uso: npx tsx scripts/montar-pedagios-sp.mts <pasta-com-os-resultado_*.json>
 *
 * Regras aplicadas aqui, e não nos agentes, para valerem em toda atualização:
 * - A lista da ARTESP de 2025 repete praças que trocaram de operador no meio
 *   do ano (TEBE → Ecovias Noroeste; ViaOeste → Raposo Castello e Rota
 *   Sorocabana). Fica uma linha por rodovia + km + sentido, a mais completa.
 * - Moto zero sem frase oficial de isenção vira `a-confirmar` (valor null),
 *   com o motivo na observação. Decisão de 2026-11-17: não mostrar "isenta"
 *   sem a fonte dizer.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface Bruto {
  lote: string;
  concessionaria: string;
  praca: string;
  praca_nome_site: string | null;
  rodovia: string | null;
  km: number | null;
  sentido: string;
  municipio: string | null;
  lat: number | null;
  lon: number | null;
  cobranca: 'cabine' | 'free-flow';
  tarifa_moto: number | null;
  tarifa_cat1: number | null;
  vigencia_desde: string | null;
  fonte_url: string | null;
  consultado_em: string;
  observacao: string | null;
}

const pasta = process.argv[2];
if (!pasta) throw new Error('Informe a pasta com os resultado_*.json');

const arquivos = ['resultado_federal.json', 'resultado_grupo1.json', 'resultado_grupo2.json', 'resultado_grupo3.json'];
const brutos: Bruto[] = arquivos.flatMap((a) => JSON.parse(readFileSync(join(pasta, a), 'utf-8')));

/** O CSV da ARTESP foi lido como latin-1 sendo UTF-8: "TIETÃ\x8a" → "TIETÊ". */
function consertar(texto: string): string {
  try {
    const bytes = Uint8Array.from([...texto].map((c) => c.charCodeAt(0) & 0xff));
    const certo = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return certo;
  } catch {
    return texto;
  }
}

// Zero sem frase oficial de "moto isenta" (ver relatórios dos agentes).
function inferida(b: Bruto, nome: string): boolean {
  if (b.lote.startsWith('L06')) return true; // Intervias: tabela sem categoria moto
  if (b.lote.startsWith('L07') && b.cobranca === 'free-flow') return true; // Ponto a Ponto
  if (/OSASCO|BARUERI|ITAPEVI/i.test(nome)) return true; // Raposo Castello: site bloqueado
  if (/^(ITU|SOROCABA)$/i.test(nome.trim()) || /Pra[cç]a de (Itu|Sorocaba)$/i.test(nome)) return true;
  if (/posse/i.test(nome)) return true; // pórtico fora da lista da Rota Mogiana
  return false;
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const slug = (s: string) =>
  semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const porLugar = new Map<string, Bruto>();
const semLugar: Bruto[] = [];
const completude = (b: Bruto) =>
  (b.tarifa_cat1 != null ? 2 : 0) + (b.lat != null ? 1 : 0) + (b.praca_nome_site ? 1 : 0);

for (const b of brutos) {
  if (b.rodovia && b.km != null) {
    const chave = `${b.rodovia}|${Math.round(b.km)}|${b.sentido}`;
    const atual = porLugar.get(chave);
    if (!atual || completude(b) > completude(atual)) porLugar.set(chave, b);
  } else {
    semLugar.push(b);
  }
}

const vistos = new Set<string>();
const pracas = [...porLugar.values(), ...semLugar].map((b) => {
  const nome = consertar(b.praca_nome_site || b.praca).trim();
  const lote = b.lote === 'FEDERAL' ? 'FEDERAL' : b.lote.split('-')[0];
  let id = `sp-${slug(lote)}-${slug(consertar(b.praca))}-${slug(b.sentido)}`;
  while (vistos.has(id)) id += '-2';
  vistos.add(id);

  const provavelIsenta = b.tarifa_moto === 0 && inferida(b, nome);
  const situacaoMoto =
    b.tarifa_moto == null || provavelIsenta ? 'a-confirmar'
    : b.tarifa_moto > 0 ? 'paga'
    : 'isenta';
  const observacao = [
    provavelIsenta ? 'Provável isenção de moto, sem fonte oficial que diga com todas as letras.' : '',
    b.observacao ? consertar(b.observacao) : '',
  ].filter(Boolean).join(' ');

  return {
    id,
    uf: 'SP',
    lote,
    concessionaria: consertar(b.concessionaria),
    nome,
    rodovia: b.rodovia,
    km: b.km,
    sentido: consertar(b.sentido),
    municipio: b.municipio ? consertar(b.municipio) : null,
    lat: b.lat,
    lng: b.lon,
    cobranca: b.cobranca,
    situacaoMoto,
    motoReais: provavelIsenta ? null : b.tarifa_moto,
    carroReais: b.tarifa_cat1 || null,
    vigenciaDesde: b.vigencia_desde,
    fonte: b.fonte_url,
    consultadoEm: b.consultado_em,
    ...(observacao ? { observacao } : {}),
  };
});

pracas.sort((a, b) => a.lote.localeCompare(b.lote) || a.nome.localeCompare(b.nome) || a.sentido.localeCompare(b.sentido));

// Uma praça por linha: o diff de uma atualização mostra exatamente o que mudou.
const consultas = pracas.map((p) => p.consultadoEm).sort();
const cabecalho = {
  uf: 'SP',
  geradoPor: 'scripts/montar-pedagios-sp.mts (não edite à mão; ver docs/rotas.md)',
  consultadoAte: consultas[consultas.length - 1],
  total: pracas.length,
};
const corpo = JSON.stringify(cabecalho).slice(0, -1);
const saida = `${corpo},"pracas":[\n${pracas.map((p) => JSON.stringify(p)).join(',\n')}\n]}\n`;
mkdirSync('apps/web/public/dados', { recursive: true });
writeFileSync('apps/web/public/dados/pedagios-sp.json', saida, 'utf-8');

const conta = (s: string) => pracas.filter((p) => p.situacaoMoto === s).length;
console.log(
  `${brutos.length} linhas → ${pracas.length} praças por sentido: ` +
  `paga ${conta('paga')}, isenta ${conta('isenta')}, a confirmar ${conta('a-confirmar')}`
);
