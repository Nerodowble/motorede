import type { RotaCatalogo } from '../domain/rotas.js';

/** Correções locais sobrevivem à reimportação do catálogo de origem. */
export function revisarRotaCatalogo(rota: RotaCatalogo): RotaCatalogo {
  if (rota.id !== 'caminho-do-mar-sp-148-sp') return rota;
  const fonte = 'https://caminhosdomar.com.br/sua-visita';
  return {
    ...rota,
    restricaoMoto: {
      motivo: 'O trecho de serra do Caminho do Mar tem acesso restrito a veículos particulares. O passeio histórico do parque é realizado a pé ou com transporte interno autorizado. Não é um percurso completo disponível para motos.',
      fonte,
    },
    descricao: 'Estrada histórica entre São Bernardo do Campo e Cubatão, com patrimônio e paisagens da Serra do Mar. O trecho do parque tem visitação a pé e transporte interno autorizado; consulte o operador sobre acesso, estacionamento e ingressos.',
    observacoes: [
      'Não planeje a travessia do trecho de serra com moto particular.',
      'O navegador pode sugerir outra estrada até Cubatão. Esse desvio não equivale ao passeio pelo Caminho do Mar.',
      'Confirme o ponto de entrada e as condições de visitação diretamente com o parque.',
    ],
    fontes: [...new Set([...rota.fontes, fonte])],
  };
}
