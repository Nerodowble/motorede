// Importado por scripts/importar-catalogo-bikerway.mjs; revisão das fontes ainda pendente.
import type { RotaCatalogo } from '../domain/rotas.js';
import { revisarRotaCatalogo } from './revisoesRotas.js';

export const ORIGEM_CATALOGO_ROTAS = {
  "projeto": "BikerWay",
  "url": "https://github.com/Nerodowble/BikerWay",
  "commit": "245e5e5",
  "versao": 1
} as const;

export const CATALOGO_ROTAS: readonly RotaCatalogo[] = ([
  {
    "id": "serra-do-rio-do-rastro-sc",
    "nome": "Serra do Rio do Rastro (SC-390)",
    "regiao": "SC, Brasil",
    "inicio": {
      "cidade": "Lauro Müller",
      "lat": -28.388889,
      "lng": -49.395833
    },
    "fim": {
      "cidade": "Bom Jardim da Serra",
      "lat": -28.339722,
      "lng": -49.625833
    },
    "distanciaKm": 32,
    "pavimento": "asfalto",
    "curvas": "alto",
    "trechoSemPostoKm": 25,
    "pedagioIda": 0,
    "pedagios": [],
    "pontosApoio": [
      {
        "nome": "Mirante da Serra do Rio do Rastro",
        "tipo": "mirante",
        "descricao": "Mirante icônico no topo da serra com vista panorâmica das curvas em S, ponto de parada obrigatório com estacionamento amplo para motos.",
        "lat": -28.391944,
        "lng": -49.560278
      },
      {
        "nome": "Posto Lauro Müller (entrada da serra)",
        "tipo": "posto_gasolina",
        "descricao": "Último posto antes da subida da serra, fundamental abastecer pois não há postos no trecho serrano.",
        "lat": -28.391667,
        "lng": -49.398889
      },
      {
        "nome": "Restaurante do Alemão (Bom Jardim da Serra)",
        "tipo": "restaurante",
        "descricao": "Tradicional entre motociclistas, refeições quentes e local de encontro pós-descida da serra.",
        "lat": -28.342222,
        "lng": -49.628333
      },
      {
        "nome": "Mirante Curva do S",
        "tipo": "mirante",
        "descricao": "Vista da famosa Curva do S, paisagem panorâmica e parada rápida para fotos.",
        "lat": -28.385,
        "lng": -49.53
      }
    ],
    "revisao": "2026-05-22",
    "descricao": "A Serra do Rio do Rastro e o trecho mais famoso da SC-390 e referencia obrigatoria para qualquer biker do Sul. Sao 32 km de asfalto novo com curvas em S espelhadas que sobem 600 m de elevacao em poucos quilometros, o famoso caracol visto do mirante. Pista boa, sinalizacao razoavel e trafego pesado de turistas aos fins de semana. Ideal para naked e sport-touring; com touring grande exige atencao redobrada nas ferraduras. Abasteca em Lauro Muller antes de subir.",
    "dificuldade": "intermediario",
    "melhorEpoca": "Marco a outubro. Evitar junho a agosto: neblina densa pela manha e geadas pontuais no topo da serra que tornam o asfalto escorregadio.",
    "observacoes": [
      "Neblina densa frequente entre maio e setembro entre o mirante e Bom Jardim da Serra - reduza velocidade e ligue piscas.",
      "Trafego intenso de turistas aos fins de semana: evite ultrapassagens nas curvas cegas, especialmente na subida.",
      "Sem cobertura de celular Vivo/Tim entre KM 8 e KM 22 da subida.",
      "Posto de Lauro Muller so atende 24h em dias uteis; aos domingos pode fechar a noite."
    ],
    "fontes": [
      "https://pt.wikipedia.org/wiki/Serra_do_Rio_do_Rastro",
      "https://www.deinfra.sc.gov.br/",
      "https://motonline.com.br/estradas/serra-do-rio-do-rastro"
    ]
  },
  {
    "id": "estrada-dos-romeiros-sp",
    "nome": "Estrada dos Romeiros (SP-312)",
    "regiao": "SP, Brasil",
    "inicio": {
      "cidade": "Santana de Parnaíba",
      "lat": -23.443889,
      "lng": -46.917778
    },
    "fim": {
      "cidade": "Itu",
      "lat": -23.264167,
      "lng": -47.299167
    },
    "distanciaKm": 55,
    "pavimento": "asfalto",
    "curvas": "medio",
    "trechoSemPostoKm": 15,
    "pedagioIda": 0,
    "pedagios": [],
    "pontosApoio": [
      {
        "nome": "Posto Graal Pirapora",
        "tipo": "posto_gasolina",
        "descricao": "Conveniência 24h, área coberta para motos e banheiros limpos, ponto de encontro de grupos.",
        "lat": -23.395833,
        "lng": -46.997222
      },
      {
        "nome": "Santuário Nossa Senhora do Ó (Pirapora do Bom Jesus)",
        "tipo": "mirante",
        "descricao": "Ponto histórico-religioso à beira do Rio Tietê, parada cultural na rota dos romeiros.",
        "lat": -23.394167,
        "lng": -46.999722
      },
      {
        "nome": "Empório da Estrada (Cabreúva)",
        "tipo": "restaurante",
        "descricao": "Café colonial e refeições, estacionamento seguro e movimento intenso de motociclistas aos fins de semana.",
        "lat": -23.3075,
        "lng": -47.131389
      },
      {
        "nome": "Posto Shell Cabreúva",
        "tipo": "posto_gasolina",
        "descricao": "Último posto antes do trecho final até Itu, com loja de conveniência e área de descanso.",
        "lat": -23.310278,
        "lng": -47.135
      }
    ],
    "observacoes": [],
    "fontes": []
  },
  {
    "id": "rota-do-sol-rn",
    "nome": "Rota do Sol (RN-063)",
    "regiao": "RN, Brasil",
    "inicio": {
      "cidade": "Natal (Ponta Negra)",
      "lat": -5.880556,
      "lng": -35.18
    },
    "fim": {
      "cidade": "Tibau do Sul (Praia da Pipa)",
      "lat": -6.227778,
      "lng": -35.054722
    },
    "distanciaKm": 85,
    "pavimento": "asfalto",
    "curvas": "baixo",
    "trechoSemPostoKm": 20,
    "pedagioIda": 0,
    "pedagios": [],
    "pontosApoio": [
      {
        "nome": "Barraca Camarões (Praia de Búzios)",
        "tipo": "restaurante",
        "descricao": "Parada gastronômica à beira-mar com estacionamento para motos e vista do litoral.",
        "lat": -6.005556,
        "lng": -35.108333
      },
      {
        "nome": "Posto Ipiranga Pirangi do Norte",
        "tipo": "posto_gasolina",
        "descricao": "Posto bem estruturado no início da rota, conveniência e ar comprimido disponível.",
        "lat": -5.973889,
        "lng": -35.115278
      },
      {
        "nome": "Mirante dos Golfinhos (Praia da Pipa)",
        "tipo": "mirante",
        "descricao": "Mirante natural com vista das falésias, parada fotográfica ao final da rota.",
        "lat": -6.231944,
        "lng": -35.046944
      },
      {
        "nome": "Restaurante Cravo & Canela (Tibau do Sul)",
        "tipo": "restaurante",
        "descricao": "Boa refeição com estacionamento e ambiente acolhedor para grupos de motociclistas.",
        "lat": -6.184167,
        "lng": -35.085
      }
    ],
    "observacoes": [],
    "fontes": []
  },
  {
    "id": "estrada-real-caminho-velho-mg-sp-rj",
    "nome": "Estrada Real - Caminho Velho",
    "regiao": "MG/SP/RJ, Brasil",
    "inicio": {
      "cidade": "Ouro Preto",
      "lat": -20.385833,
      "lng": -43.503611
    },
    "fim": {
      "cidade": "Paraty",
      "lat": -23.220278,
      "lng": -44.713056
    },
    "distanciaKm": 710,
    "pavimento": "misto",
    "curvas": "alto",
    "trechoSemPostoKm": 45,
    "pedagioIda": 0,
    "pedagios": [],
    "pontosApoio": [
      {
        "nome": "Mirante Morro São Sebastião (Ouro Preto)",
        "tipo": "mirante",
        "descricao": "Vista panorâmica do conjunto histórico, parada inicial estratégica para fotos.",
        "lat": -20.3825,
        "lng": -43.510833
      },
      {
        "nome": "Restaurante Casa do Ouvidor (Tiradentes)",
        "tipo": "restaurante",
        "descricao": "Comida mineira tradicional, estacionamento próximo e parada clássica no Caminho Velho.",
        "lat": -21.110556,
        "lng": -44.173611
      },
      {
        "nome": "Posto BR São João del-Rei",
        "tipo": "posto_gasolina",
        "descricao": "Ponto estratégico de reabastecimento entre Tiradentes e o trecho serrano da Mantiqueira.",
        "lat": -21.135833,
        "lng": -44.260833
      },
      {
        "nome": "Mirante do Pico do Itapeva (Campos do Jordão)",
        "tipo": "mirante",
        "descricao": "Ponto alto da Mantiqueira com vista do Vale do Paraíba, parada cênica obrigatória.",
        "lat": -22.704722,
        "lng": -45.527778
      },
      {
        "nome": "Restaurante Banana da Terra (Paraty)",
        "tipo": "restaurante",
        "descricao": "Boa parada gastronômica ao final do Caminho Velho, com estrutura para grupos.",
        "lat": -23.218333,
        "lng": -44.715
      }
    ],
    "revisao": "2026-05-22",
    "descricao": "Roteiro historico de 710 km que reconstroi o caminho colonial do ouro de Ouro Preto a Paraty, passando por Tiradentes, Sao Joao del-Rei, Campos do Jordao e a Serra da Bocaina. E uma rota de varios dias e exige planejamento: tem trechos de paralelepipedo nas cidades historicas, trechos de terra batida em Minas e o descenso tecnico da Bocaina ate o litoral. Indicado para sport-touring, big trail ou dual-sport com piloto experiente. Combustivel e tranquilo nas cidades, mas o trecho Mantiqueira-Bocaina pede atencao a autonomia. Sem pedagios para motos no trajeto: BR-040 MG (EPR Via Mineira) isenta moto, e as estradas estaduais MG (BR-265, MG-129) + a descida da Bocaina via Cunha-Paraty (SP-171/RJ-165) nao tem cobranca.",
    "dificuldade": "avancado",
    "melhorEpoca": "Abril a setembro (seca). Evitar dezembro a marco: chuvas fortes na Mantiqueira e na Serra da Bocaina deixam trechos de paralelepipedo e terra batida traicoeiros.",
    "observacoes": [
      "Paralelepipedo molhado em Ouro Preto, Tiradentes e Paraty - reduza a metade da velocidade em dias de chuva.",
      "Descida da Serra da Bocaina (Cunha-Paraty) tem trechos sem guard-rail; nao desca a noite ou com neblina.",
      "Postos espacados entre Sao Joao del-Rei e Campos do Jordao - encha o tanque sempre que possivel.",
      "Cuidado com animais soltos (vacas e cavalos) no trecho rural do Sul de Minas, principalmente ao amanhecer."
    ],
    "fontes": [
      "https://pt.wikipedia.org/wiki/Estrada_Real",
      "https://www.institutoestradareal.com.br/",
      "https://eprviamineira.com.br/reajuste-contratual-da-tarifa-de-pedagio-da-br-040-entra-em-vigor-em-6-de-fevereiro-conforme-deliberacao-da-antt/",
      "https://www.openstreetmap.org/"
    ]
  },
  {
    "id": "rota-romantica-rs",
    "nome": "Rota Romântica (RS-235)",
    "regiao": "RS, Brasil",
    "inicio": {
      "cidade": "São Leopoldo",
      "lat": -29.760278,
      "lng": -51.147222
    },
    "fim": {
      "cidade": "São Francisco de Paula",
      "lat": -29.448333,
      "lng": -50.583611
    },
    "distanciaKm": 184,
    "pavimento": "asfalto",
    "curvas": "medio",
    "trechoSemPostoKm": 18,
    "pedagioIda": 5,
    "pedagios": [
      {
        "nome": "Praca ERS-235 (Rota Romantica)",
        "valorMoto": 5,
        "sistema": "fisica",
        "fonte": "https://www.egr.rs.gov.br/ers-235"
      }
    ],
    "pontosApoio": [
      {
        "nome": "Café Colonial Bela Vista (Gramado)",
        "tipo": "restaurante",
        "descricao": "Café colonial farto, estacionamento amplo e parada clássica para grupos de motociclistas na serra.",
        "lat": -29.379722,
        "lng": -50.876111
      },
      {
        "nome": "Mirante Vale do Quilombo (Gramado)",
        "tipo": "mirante",
        "descricao": "Vista panorâmica do Vale do Quilombo, parada cênica gratuita com estacionamento.",
        "lat": -29.355833,
        "lng": -50.890278
      },
      {
        "nome": "Posto Ipiranga Nova Petrópolis",
        "tipo": "posto_gasolina",
        "descricao": "Posto bem localizado no meio da rota, conveniência e área coberta para motos.",
        "lat": -29.376111,
        "lng": -51.116389
      },
      {
        "nome": "Restaurante Cantina Pastasciutta (Canela)",
        "tipo": "restaurante",
        "descricao": "Comida italiana farta, ambiente acolhedor e bom estacionamento para motos.",
        "lat": -29.365278,
        "lng": -50.811944
      },
      {
        "nome": "Mirante Cascata do Caracol (Canela)",
        "tipo": "mirante",
        "descricao": "Vista da cascata de 131m, parque com estacionamento seguro e estrutura turística.",
        "lat": -29.290833,
        "lng": -50.798889
      }
    ],
    "revisao": "2026-05-22",
    "descricao": "A Rota Romantica conecta a regiao metropolitana de Porto Alegre a Serra Gaucha pela RS-235, passando por colonias alemas e italianas antes de subir o ultimo trecho ate Sao Francisco de Paula. Sao 184 km de asfalto bem conservado, com curvas suaves e elevacao progressiva, otima para iniciantes ganharem confianca em serra sem o terror das ferraduras do Rio do Rastro. Trafego turistico pesado em alta temporada e em todo o mes de julho. Pontos de apoio sobrando: postos, cafes coloniais e mirantes a cada 15 a 25 km.",
    "dificuldade": "iniciante",
    "melhorEpoca": "Setembro a abril. Inverno (junho a agosto) traz neblina forte na serra de Gramado/Canela e madrugadas proximas de zero - evitar para iniciantes.",
    "observacoes": [
      "Neblina densa nas manhas de inverno entre Nova Petropolis e Gramado - atrasar a saida ate o meio da manha ajuda.",
      "Transito turistico pesado em julho (Festival de Cinema de Gramado): contar com lentidao no trecho urbano.",
      "Atencao a animais soltos no trecho final (Canela - Sao Francisco de Paula), especialmente ao entardecer.",
      "Postos abundantes mas evite deixar o tanque baixar de meio antes de Nova Petropolis aos domingos a noite."
    ],
    "fontes": [
      "https://pt.wikipedia.org/wiki/RS-235",
      "https://www.rotaromantica.com.br/",
      "https://www.openstreetmap.org/",
      "https://duasrodas.com.br/estradas/rota-romantica-rs"
    ]
  },
  {
    "id": "subida-campos-do-jordao-sp-123-sp",
    "nome": "Subida de Campos do Jordao (SP-123 / Floriano Rodrigues Pinheiro)",
    "regiao": "SP, Brasil",
    "inicio": {
      "cidade": "Taubate",
      "lat": -23.026389,
      "lng": -45.555556
    },
    "fim": {
      "cidade": "Campos do Jordao",
      "lat": -22.738889,
      "lng": -45.591111
    },
    "distanciaKm": 47,
    "pavimento": "asfalto",
    "curvas": "alto",
    "trechoSemPostoKm": 30,
    "pedagioIda": 0,
    "pedagios": [],
    "pontosApoio": [
      {
        "nome": "Posto Shell Taubate (entrada da SP-123)",
        "tipo": "posto_gasolina",
        "descricao": "Ultimo posto da Dutra antes do entroncamento com a SP-123, conveniencia 24h e ar comprimido, abasteca aqui pois nao ha postos na subida da serra.",
        "lat": -23.020833,
        "lng": -45.560278
      },
      {
        "nome": "Mirante Pico do Itapeva",
        "tipo": "mirante",
        "descricao": "Ponto mais alto da regiao (2.030m), vista panoramica do Vale do Paraiba, estacionamento para motos em area sinalizada e parada classica de bikers.",
        "lat": -22.704722,
        "lng": -45.527778
      },
      {
        "nome": "Baden Baden Cervejaria (Capivari)",
        "tipo": "restaurante",
        "descricao": "Ponto de encontro tradicional no centro de Capivari, estacionamento de motos na rua e movimento de grupos aos fins de semana.",
        "lat": -22.7375,
        "lng": -45.591389
      },
      {
        "nome": "Posto Ipiranga Campos do Jordao (Abernessia)",
        "tipo": "posto_gasolina",
        "descricao": "Posto urbano em Campos do Jordao com conveniencia, ultimo abastecimento antes de partir para Sao Bento do Sapucai ou descer pela SP-50.",
        "lat": -22.731944,
        "lng": -45.589444
      }
    ],
    "revisao": "2026-05-22",
    "descricao": "Sobe 1.300m de elevacao em 47 km de asfalto bem conservado da SP-123, conhecida como rodovia Floriano Rodrigues Pinheiro. E a porta de entrada classica para Campos do Jordao desde Taubate (saida da Dutra), com curvas medias bem desenhadas, faixas duplas em boa parte da subida e tres trechos de mirante natural. Tem trafego turistico pesado em julho (alta temporada) e nos feriadoes; aos sabados de manha o fluxo de subida e intenso. Pista boa para naked, sport-touring e big trail, e tranquila ate para piloto intermediario sem experiencia de serra. Combine com a SP-50 para descer por Sao Bento do Sapucai ou voltar pela mesma SP-123.",
    "dificuldade": "intermediario",
    "melhorEpoca": "Marco a outubro. Evitar junho e julho: temperatura cai abaixo de 5C no topo, neblina densa pela manha e geadas pontuais deixam o asfalto escorregadio.",
    "observacoes": [
      "Frio extremo de junho a agosto: temperatura no topo cai abaixo de 5C antes do meio-dia, leve roupa termica e luva de inverno.",
      "Neblina frequente pela manha entre o km 25 e o km 40, especialmente em dias de virada de tempo.",
      "Sem postos ativos no trecho serrano: abasteca em Taubate antes de subir, autonomia minima de 150 km recomendada.",
      "Trafego turistico pesado nos sabados de manha em julho, evite ultrapassagens em curvas cegas."
    ],
    "fontes": [
      "https://pt.wikipedia.org/wiki/Rodovia_Floriano_Rodrigues_Pinheiro",
      "https://pt.wikipedia.org/wiki/Campos_do_Jord%C3%A3o",
      "https://www.openstreetmap.org/"
    ]
  },
  {
    "id": "caminho-do-mar-sp-148-sp",
    "nome": "Caminho do Mar / Estrada Velha de Santos (SP-148)",
    "regiao": "SP, Brasil",
    "inicio": {
      "cidade": "Sao Bernardo do Campo",
      "lat": -23.738889,
      "lng": -46.564722
    },
    "fim": {
      "cidade": "Cubatao",
      "lat": -23.895833,
      "lng": -46.425833
    },
    "distanciaKm": 35,
    "pavimento": "asfalto",
    "curvas": "alto",
    "trechoSemPostoKm": 20,
    "pedagioIda": 0,
    "pedagios": [],
    "pontosApoio": [
      {
        "nome": "Posto Shell Riacho Grande (SBC)",
        "tipo": "posto_gasolina",
        "descricao": "Ultimo posto antes da descida da Serra do Mar pela SP-148, conveniencia 24h, ar comprimido e parada tradicional de motoclubes do ABC.",
        "lat": -23.764722,
        "lng": -46.548333
      },
      {
        "nome": "Calcada do Lorena (trecho preservado)",
        "tipo": "ponto_historico",
        "descricao": "Trecho de calcamento original do seculo XVIII na Serra do Mar, parada cultural com mirante para o Vale do Mogi, atencao ao piso de pedra escorregadio em dias de chuva.",
        "lat": -23.838333,
        "lng": -46.475833
      },
      {
        "nome": "Vila de Paranapiacaba",
        "tipo": "ponto_historico",
        "descricao": "Vila ferroviaria inglesa preservada (acesso via SP-122 a partir de Rio Grande da Serra), parada obrigatoria do roteiro biker, estacionamento gratuito no entorno da Estacao.",
        "lat": -23.778611,
        "lng": -46.300833
      },
      {
        "nome": "Mirante Padre Anchieta (Serra do Mar)",
        "tipo": "mirante",
        "descricao": "Mirante da SP-148 com vista da Baixada Santista, estacionamento sinalizado e ponto de fotos classico no Caminho do Mar.",
        "lat": -23.853611,
        "lng": -46.460278
      },
      {
        "nome": "Restaurante Curva da Serra (base de Cubatao)",
        "tipo": "restaurante",
        "descricao": "Restaurante na base da serra com estacionamento de motos, parada tradicional dos grupos que sobem ou descem o Caminho do Mar aos domingos.",
        "lat": -23.890278,
        "lng": -46.428611
      }
    ],
    "revisao": "2026-05-22",
    "descricao": "Roteiro historico que recupera a antiga ligacao Sao Paulo-Santos pelo Caminho do Mar (SP-148), inaugurado em 1922 e tombado pelo IPHAN. Sao 35 km de asfalto antigo descendo 700m da Serra do Mar entre Sao Bernardo do Campo e Cubatao, atravessando trechos preservados da Calcada do Lorena e passando proximo a vila ferroviaria de Paranapiacaba (acessivel por desvio via SP-122). ATENCAO: a SP-148 esta oficialmente fechada para veiculos particulares desde 1985 e e administrada pelo Polo Ecoturistico Caminhos do Mar; embora bikers locais trafeguem o trajeto, va por sua conta e risco e respeite as restricoes do parque. Pista estreita de mao dupla, curvas fechadas e patrimonio rodoviario unico no Brasil. Ideal para passeio dominical lento, sem pretensao de velocidade.",
    "dificuldade": "intermediario",
    "melhorEpoca": "Abril a setembro (seca). Evitar dezembro a marco: chuvas torrenciais fecham trechos da SP-148 com deslizamentos e o asfalto historico fica escorregadio.",
    "observacoes": [
      "Rota oficialmente fechada para veiculos particulares desde 1985 (Polo Ecoturistico Caminhos do Mar) - va por conta e risco.",
      "Piso de pedra historico no trecho da Calcada do Lorena fica muito escorregadio com chuva, reduza velocidade pela metade.",
      "Deslizamentos frequentes na Serra do Mar entre dezembro e marco, consulte boletim da SP-148 antes de subir.",
      "Trecho com baixo sinal de celular entre o mirante Padre Anchieta e a base de Cubatao.",
      "Acesso a Paranapiacaba pede desvio pela SP-122 (Rio Grande da Serra), nao ha conexao direta a partir da SP-148."
    ],
    "fontes": [
      "https://pt.wikipedia.org/wiki/Rodovia_Caminho_do_Mar",
      "https://pt.wikipedia.org/wiki/Paranapiacaba",
      "https://pt.wikipedia.org/wiki/Cal%C3%A7ada_do_Lorena",
      "https://caminhosdomar.com.br/sua-visita/",
      "https://www.openstreetmap.org/"
    ]
  },
  {
    "id": "rodovia-dos-tamoios-sp-099-sp",
    "nome": "Rodovia dos Tamoios (SP-099)",
    "regiao": "SP, Brasil",
    "inicio": {
      "cidade": "Sao Jose dos Campos",
      "lat": -23.179444,
      "lng": -45.886944
    },
    "fim": {
      "cidade": "Caraguatatuba",
      "lat": -23.620278,
      "lng": -45.412778
    },
    "distanciaKm": 82,
    "pavimento": "asfalto",
    "curvas": "alto",
    "trechoSemPostoKm": 35,
    "pedagioIda": 11.8,
    "pedagios": [
      {
        "nome": "Praça de Jambeiro",
        "valorMoto": 2.9,
        "sistema": "fisica",
        "fonte": "https://www23.concessionariatamoios.com.br/noticias/show/1906/atualizacao-tarifaria-dos-pedagios-da-rodovia-dos-tamoios-entra-em-vigor-no-proximo-dia-1?-de-julho="
      },
      {
        "nome": "Praça de Paraibuna",
        "valorMoto": 6.15,
        "sistema": "fisica",
        "fonte": "https://www23.concessionariatamoios.com.br/noticias/show/1906/atualizacao-tarifaria-dos-pedagios-da-rodovia-dos-tamoios-entra-em-vigor-no-proximo-dia-1?-de-julho="
      },
      {
        "nome": "Free Flow Contorno Sul",
        "valorMoto": 2.75,
        "sistema": "free_flow",
        "fonte": "https://freeflowtamoios.com.br/"
      }
    ],
    "pontosApoio": [
      {
        "nome": "Posto Graal Tamoios (Jambeiro)",
        "tipo": "posto_gasolina",
        "descricao": "Posto com conveniencia 24h, restaurante e ar comprimido na entrada do trecho planalto, parada classica de bikers que vao ao litoral norte.",
        "lat": -23.29,
        "lng": -45.7
      },
      {
        "nome": "Mirante da Serra do Mar (Tamoios novo trecho)",
        "tipo": "mirante",
        "descricao": "Mirante oficial do novo trecho de planalto com vista da descida e do litoral de Caraguatatuba, estacionamento sinalizado e seguro para motos.",
        "lat": -23.46,
        "lng": -45.53
      },
      {
        "nome": "Posto Ipiranga Caraguatatuba (entrada)",
        "tipo": "posto_gasolina",
        "descricao": "Primeiro posto ao chegar ao litoral, abastecimento estrategico antes de seguir para Ubatuba ou Sao Sebastiao pela BR-101.",
        "lat": -23.610278,
        "lng": -45.42
      },
      {
        "nome": "Restaurante Cantinho do Mar (Caraguatatuba)",
        "tipo": "restaurante",
        "descricao": "Restaurante de frutos do mar com estacionamento amplo, ponto de encontro tradicional de bikers vindos pela Tamoios.",
        "lat": -23.625833,
        "lng": -45.413333
      }
    ],
    "revisao": "2026-05-22",
    "descricao": "A SP-099 e a ligacao moderna do Vale do Paraiba ao litoral norte de Sao Paulo, com 82 km entre Sao Jose dos Campos e Caraguatatuba. Apos as obras de duplicacao concluidas em 2022 (trecho de planalto e trecho de serra), tornou-se uma das melhores rodovias para moto do estado: asfalto novo, faixas duplas, sinalizacao excelente e tuneis modernos no descenso da Serra do Mar. O trecho de serra (novo) tem curvas amplas e bem desenhadas, com greide controlado. Possui 3 pracas de pedagio (Jambeiro R$ 2,90, Paraibuna R$ 6,15 e Free Flow Contorno Sul R$ 2,75 — valores moto pos-reajuste julho 2026); soma R$ 11,80 por sentido, R$ 23,60 no round-trip. Pico de trafego nos sabados de manha no verao. Ideal para sport-touring e big trail, perfeitamente segura para iniciantes que ja tenham experiencia de serra suave.",
    "dificuldade": "intermediario",
    "melhorEpoca": "Abril a novembro. Evitar dezembro a marco: chuvas fortes no trecho serrano podem fechar pistas e ha pico de trafego turistico no fim de ano.",
    "observacoes": [
      "Pedagio Free Flow do Contorno Sul cobra a placa da moto via leitura otica - pague em ate 30 dias pelo App Tamoios ou voce recebe multa.",
      "Pico de trafego nos sabados de manha de dezembro a marco: saia antes das 6h ou depois das 11h para evitar congestionamento na descida.",
      "Tuneis do novo trecho de serra exigem farol aceso em qualquer horario por regulamentacao.",
      "Vento lateral forte no trecho de planalto entre Jambeiro e o inicio da serra, atencao com bagageiro alto.",
      "Radares fixos em varios pontos do trecho de planalto, mantenha 100 km/h."
    ],
    "fontes": [
      "https://pt.wikipedia.org/wiki/Rodovia_dos_Tamoios",
      "https://www23.concessionariatamoios.com.br/para-voce/pedagio",
      "https://www23.concessionariatamoios.com.br/noticias/show/1906/atualizacao-tarifaria-dos-pedagios-da-rodovia-dos-tamoios-entra-em-vigor-no-proximo-dia-1?-de-julho=",
      "https://freeflowtamoios.com.br/",
      "https://sindivapa.com.br/reajuste-nos-pedagios-das-rodovias-do-vale-do-paraiba-comeca-a-valer-em-julho-de-2025-4430",
      "https://www.openstreetmap.org/"
    ]
  },
  {
    "id": "rio-santos-litoral-norte-sp",
    "nome": "Rio-Santos Litoral Norte (BR-101 / SP-055)",
    "regiao": "SP, Brasil",
    "inicio": {
      "cidade": "Bertioga",
      "lat": -23.853611,
      "lng": -46.140833
    },
    "fim": {
      "cidade": "Ubatuba",
      "lat": -23.434167,
      "lng": -45.083889
    },
    "distanciaKm": 175,
    "pavimento": "asfalto",
    "curvas": "alto",
    "trechoSemPostoKm": 25,
    "pedagioIda": 0,
    "pedagios": [],
    "pontosApoio": [
      {
        "nome": "Posto Shell Bertioga (centro)",
        "tipo": "posto_gasolina",
        "descricao": "Posto urbano em Bertioga, abastecimento estrategico antes de pegar a SP-055 sentido norte com trechos longos sem rede de conveniencia.",
        "lat": -23.851944,
        "lng": -46.138611
      },
      {
        "nome": "Mirante Praia do Camburi (Sao Sebastiao)",
        "tipo": "mirante",
        "descricao": "Mirante na curva da SP-055 com vista da praia de Camburi e ilhas, estacionamento estreito mas seguro fora do horario de pico.",
        "lat": -23.7625,
        "lng": -45.745278
      },
      {
        "nome": "Posto Ipiranga Maresias",
        "tipo": "posto_gasolina",
        "descricao": "Posto no centro de Maresias com conveniencia ampla e estacionamento de motos, ponto medio classico para parada na descida do litoral norte.",
        "lat": -23.797222,
        "lng": -45.5575
      },
      {
        "nome": "Restaurante Cigana (Boicucanga)",
        "tipo": "restaurante",
        "descricao": "Restaurante a beira da SP-055 com prato feito e frutos do mar, estacionamento de motos e ponto tradicional de motoclubes do Vale e ABC.",
        "lat": -23.793056,
        "lng": -45.633056
      },
      {
        "nome": "Mirante Praia do Felix (Ubatuba sul)",
        "tipo": "mirante",
        "descricao": "Mirante natural na curva da SP-055 com vista da costa sul de Ubatuba, parada gratuita e relativamente segura para fotos.",
        "lat": -23.49,
        "lng": -45.15
      }
    ],
    "revisao": "2026-05-22",
    "descricao": "Trecho paulista da BR-101 (rodovia Rio-Santos, SP-055) entre Bertioga e Ubatuba: 175 km de asfalto colado no mar com centenas de curvas, atravessando Sao Sebastiao, Maresias, Boicucanga e Caraguatatuba. E o passeio costeiro classico do sudeste, com paisagem de praias urbanas e selvagens, dezenas de mirantes e travessia de balsa em Sao Sebastiao (sem custo para motos). Pista de mao dupla estreita em muitos pontos, com curvas em ferradura, lombadas no trecho urbano e pavimento variando de excelente a remendado. Tradicionalmente saturada nos fins de semana de verao. Ideal para naked e sport-touring; com touring grande pesado exige atencao nas ferraduras. Motos sao ISENTAS de pedagio em todo o trecho SP da concessao Novo Litoral / CNL (SP-055 + BR-101 trecho SP), confirmado oficialmente.",
    "dificuldade": "intermediario",
    "melhorEpoca": "Abril a novembro. Evitar dezembro a marco: trafego turistico saturado, ja houve fechamentos por deslizamento entre Bertioga e Sao Sebastiao.",
    "observacoes": [
      "Travessia da balsa Sao Sebastiao-Ilhabela e o gargalo: nao pega balsa no caminho costeiro, mas a fila pode bloquear a SP-055 no centro de Sao Sebastiao em alta temporada.",
      "Ciclistas e pedestres na pista no trecho urbano de Maresias e Boicucanga, especialmente ao entardecer.",
      "Curvas cegas com brita seca nas margens entre Camburi e Boissucanga, evite raspar pedal no apex.",
      "Pico de assaltos historicamente em pontos isolados entre Caraguatatuba e Ubatuba a noite, evite trafego apos as 22h."
    ],
    "fontes": [
      "https://pt.wikipedia.org/wiki/BR-101",
      "https://pt.wikipedia.org/wiki/Rodovia_Rio-Santos",
      "https://novolitoral.com.br/pedagio-eletronico/",
      "https://blog.semparar.com.br/free-flow-novo-litoral-cnl/",
      "https://www.openstreetmap.org/"
    ]
  },
  {
    "id": "cunha-paraty-sp-171-rj-165-sp-rj",
    "nome": "Cunha-Paraty (SP-171 / RJ-165)",
    "regiao": "SP/RJ, Brasil",
    "inicio": {
      "cidade": "Cunha",
      "lat": -23.073889,
      "lng": -44.957222
    },
    "fim": {
      "cidade": "Paraty",
      "lat": -23.220278,
      "lng": -44.713056
    },
    "distanciaKm": 50,
    "pavimento": "misto",
    "curvas": "alto",
    "trechoSemPostoKm": 40,
    "pedagioIda": 0,
    "pedagios": [],
    "pontosApoio": [
      {
        "nome": "Posto BR Cunha (centro)",
        "tipo": "posto_gasolina",
        "descricao": "Ultimo posto antes da descida da Serra da Bocaina, abasteca o tanque cheio pois nao ha postos ate Paraty (45 km de descenso tecnico).",
        "lat": -23.074722,
        "lng": -44.958611
      },
      {
        "nome": "Mirante da Serra da Bocaina (descida)",
        "tipo": "mirante",
        "descricao": "Mirante natural com vista da baia de Paraty na descida, estacionamento estreito a beira da RJ-165, parada rapida para fotos.",
        "lat": -23.15,
        "lng": -44.83
      },
      {
        "nome": "Restaurante Banana da Terra (Paraty centro)",
        "tipo": "restaurante",
        "descricao": "Restaurante tradicional em Paraty, estacionamento de motos no entorno (pago) e parada gastronomica obrigatoria ao fim da descida.",
        "lat": -23.218333,
        "lng": -44.715
      },
      {
        "nome": "Posto Shell Paraty (entrada BR-101)",
        "tipo": "posto_gasolina",
        "descricao": "Primeiro posto em Paraty ao chegar pela RJ-165, conveniencia e ar comprimido, abastecimento estrategico antes de seguir pela BR-101 sentido norte ou sul.",
        "lat": -23.221944,
        "lng": -44.708611
      }
    ],
    "revisao": "2026-05-22",
    "descricao": "Descida classica e tecnica da Serra da Bocaina de Cunha (SP) ate Paraty (RJ), 50 km divididos em dois pavimentos distintos: o lado SP (SP-171) e asfalto bem cuidado com curvas amplas; o lado RJ (RJ-165, ultimos 21 km) e PARALELEPIPEDO/CALCAMENTO em vez de asfalto - cobblestone foi a solucao adotada pelo governo RJ para preservar a permeabilidade do solo dentro da area de protecao ambiental. O calcamento muda completamente a dirigibilidade: piso desigual, ruim com chuva, vibracao constante e velocidade tipica abaixo de 40 km/h no trecho RJ. Sem pedagio para motos. Trafego baixo durante a semana. Ideal para big trail; sport-touring sofre na descida RJ. Combine com Paraty-Trindade ou Paraty-Ubatuba pela BR-101.",
    "dificuldade": "avancado",
    "melhorEpoca": "Maio a setembro (seca). Evitar dezembro a marco: chuvas fortes deixam o asfalto antigo escorregadio e ha trechos com piso degradado.",
    "observacoes": [
      "Ultimos 21 km no lado RJ (RJ-165) sao PARALELEPIPEDO, nao asfalto - piso vibratorio, escorregadio com chuva, exige reducao drastica de velocidade.",
      "Sem postos no trecho serrano, abasteca em Cunha antes de descer (autonomia minima de 100 km).",
      "Cuidado com caminhoes e onibus no sentido subida em horario comercial, pista estreita nao permite ultrapassagem facil.",
      "Neblina pode descer a tarde no trecho mais alto, principalmente em maio e junho.",
      "Sport-touring com pneus de baixo perfil sofre no calcamento - prefira pneus mistos/trail."
    ],
    "fontes": [
      "https://pt.wikipedia.org/wiki/RJ-165",
      "https://pt.wikipedia.org/wiki/Rodovia_Paulo_Virg%C3%ADnio_e_Salvador_Pacetti",
      "https://www.correiodamanha.com.br/correio-sul-fluminense/regiao-do-vale/2024/04/amp/126744-rj-165-estrada-cunha-paraty-esta-em-estado-precario.html",
      "https://pt.wikipedia.org/wiki/Paraty",
      "https://www.openstreetmap.org/"
    ]
  },
  {
    "id": "petropolis-teresopolis-br-495-rj",
    "nome": "Petropolis-Teresopolis (BR-495)",
    "regiao": "RJ, Brasil",
    "inicio": {
      "cidade": "Petropolis",
      "lat": -22.510833,
      "lng": -43.176944
    },
    "fim": {
      "cidade": "Teresopolis",
      "lat": -22.4125,
      "lng": -42.965833
    },
    "distanciaKm": 38,
    "pavimento": "asfalto",
    "curvas": "alto",
    "trechoSemPostoKm": 25,
    "pedagioIda": 0,
    "pedagios": [],
    "pontosApoio": [
      {
        "nome": "Posto Shell Petropolis (Itaipava)",
        "tipo": "posto_gasolina",
        "descricao": "Posto em Itaipava com conveniencia 24h, area coberta para motos e parada classica antes de pegar a BR-495 sentido Teresopolis.",
        "lat": -22.435,
        "lng": -43.14
      },
      {
        "nome": "Mirante Vale das Videiras",
        "tipo": "mirante",
        "descricao": "Mirante natural com vista do Vale das Videiras na BR-495, estacionamento sinalizado e parada cenica tradicional.",
        "lat": -22.45,
        "lng": -43.05
      },
      {
        "nome": "Restaurante Italiano Bistro do Vale (Vale das Videiras)",
        "tipo": "restaurante",
        "descricao": "Restaurante italiano tradicional na BR-495, estacionamento amplo e movimento de bikers aos fins de semana.",
        "lat": -22.455,
        "lng": -43.045
      },
      {
        "nome": "Posto Ipiranga Teresopolis (Varzea)",
        "tipo": "posto_gasolina",
        "descricao": "Posto na entrada de Teresopolis pelo bairro da Varzea, ar comprimido e conveniencia, abastecimento ao fim da BR-495.",
        "lat": -22.416389,
        "lng": -42.970833
      }
    ],
    "revisao": "2026-05-22",
    "descricao": "Ligacao classica entre as duas serras imperiais do Rio pela BR-495: 38 km de asfalto sinuoso da Mantiqueira fluminense atravessando o Vale das Videiras e o Vale do Cuiaba. ATENCAO: a BR-495 esta interditada desde 23 de fevereiro de 2026 (pista cedeu no km 22), sem prazo de reabertura segundo DNIT - verifique status atual antes de viajar. Quando aberta, e considerada uma das piores rodovias federais do RJ pela quantidade de curvas cegas, ausencia de acostamento e neblina. Sem pedagio para motos. Trafego turistico pesado aos fins de semana. Ideal para passeio dominical com paradas em mirantes, cafes coloniais e pousadas de Itaipava e Vale das Videiras.",
    "dificuldade": "intermediario",
    "melhorEpoca": "Marco a novembro quando aberta. Verifique status antes de partir: BR-495 esteve interditada em 2026 por deslizamento.",
    "observacoes": [
      "BR-495 interditada desde 23/02/2026 sem prazo de reabertura (DNIT) - confirme status antes de planejar a viagem.",
      "Regiao serrana do Rio teve deslizamentos historicos em 2011 e 2022, evite circular sob chuva forte ou alerta meteorologico.",
      "Neblina densa frequente nas manhas de inverno entre Itaipava e Vale das Videiras.",
      "Trafego pesado no domingo a tarde no sentido Rio: prefira retornar pela manha ou pelo inicio da tarde.",
      "Sem acostamento e poucos pontos de recuo, ultrapassagens arriscadas - paciencia obrigatoria."
    ],
    "fontes": [
      "https://pt.wikipedia.org/wiki/BR-495",
      "https://diariodepetropolis.com.br/integra/interdicao-da-br-495-pesa-no-bolso-e-triplica-tempo-de-viagem-entre-petropolis-e-teresopolis-40624",
      "https://estradas.com.br/estudo-aponta-estrada-que-liga-petropolis-a-teresopolis-rj-como-uma-das-piores-rodovias-do-estado/",
      "https://pt.wikipedia.org/wiki/Petr%C3%B3polis",
      "https://pt.wikipedia.org/wiki/Teres%C3%B3polis"
    ]
  },
  {
    "id": "visconde-de-maua-itatiaia-rj-163-rj",
    "nome": "Visconde de Maua / Itatiaia (RJ-163)",
    "regiao": "RJ, Brasil",
    "inicio": {
      "cidade": "Resende",
      "lat": -22.469722,
      "lng": -44.446944
    },
    "fim": {
      "cidade": "Visconde de Maua",
      "lat": -22.345556,
      "lng": -44.546111
    },
    "distanciaKm": 33,
    "pavimento": "misto",
    "curvas": "alto",
    "trechoSemPostoKm": 28,
    "pedagioIda": 0,
    "pedagios": [],
    "pontosApoio": [
      {
        "nome": "Posto Shell Resende (saida Dutra)",
        "tipo": "posto_gasolina",
        "descricao": "Posto na saida da Dutra para Resende, conveniencia 24h e abastecimento obrigatorio antes da subida da Mantiqueira pela RJ-163.",
        "lat": -22.475,
        "lng": -44.445
      },
      {
        "nome": "Mirante da Pedra Selada (RJ-163)",
        "tipo": "mirante",
        "descricao": "Mirante natural com vista da Pedra Selada na subida da serra, estacionamento na curva da RJ-163, atencao ao acostamento estreito.",
        "lat": -22.38,
        "lng": -44.51
      },
      {
        "nome": "Restaurante Maromba (Visconde de Maua)",
        "tipo": "restaurante",
        "descricao": "Restaurante tradicional na Vila de Maromba, estacionamento de motos e ponto de encontro de bikers nos fins de semana de inverno.",
        "lat": -22.3425,
        "lng": -44.540833
      },
      {
        "nome": "Pousadas da Vila de Maua (concentracao)",
        "tipo": "hotel",
        "descricao": "Concentracao de pousadas no centro de Visconde de Maua com estacionamento privativo para motos, reserva antecipada nos meses de inverno (junho a agosto).",
        "lat": -22.345833,
        "lng": -44.546389
      }
    ],
    "revisao": "2026-05-22",
    "descricao": "Subida da RJ-163 (Rodovia Rubens Tramujas Mader) da Dutra (km 311, entre Resende e Itatiaia) ate o distrito de Visconde de Maua na Serra da Mantiqueira. Sao 29 km asfaltados ate a Vila de Maua, mais 5 km asfaltados ate Maringa, e ULTIMOS 3 km em ESTRADA DE TERRA ate Maromba. Subida de 600m de elevacao com curvas em ferradura na parte alta e vista da Pedra Selada e Parque Nacional do Itatiaia. Unico posto de gasolina da regiao fica em Visconde de Maua. Trafego turistico concentrado em fins de semana de inverno (festival gastronomico de Maua julho-agosto). Pista estreita de mao dupla, sem acostamento na maior parte do trecho serrano. Ideal para big trail; sport-touring sofre nos 3 km de terra ate Maromba.",
    "dificuldade": "intermediario",
    "melhorEpoca": "Abril a outubro. O inverno (junho a agosto) e a melhor epoca pelo clima frio caracteristico da Mantiqueira, mas exige roupa termica.",
    "observacoes": [
      "Ultimos 3 km entre Maringa e Maromba sao ESTRADA DE TERRA - pista escorregadia com chuva, sport-touring sofre.",
      "Temperaturas abaixo de 5C no inverno entre Maromba e Maringa, leve roupa termica e luva de inverno.",
      "Unico posto de gasolina fica em Visconde de Maua centro - abasteca em Resende antes de subir (autonomia minima 100 km).",
      "Asfalto irregular em pontos especificos entre o km 15 e o km 25 da subida.",
      "Animais soltos (vacas) no trecho rural entre Maromba e Maringa, especialmente ao amanhecer."
    ],
    "fontes": [
      "https://pt.wikipedia.org/wiki/Visconde_de_Mau%C3%A1_(Resende)",
      "https://pt.wikipedia.org/wiki/Parque_Nacional_do_Itatiaia",
      "https://www.viscondedemaua.com.br/post/como-chegar-em-visconde-de-maua/",
      "https://www.openstreetmap.org/"
    ]
  },
  {
    "id": "serra-da-bocaina-sao-jose-do-barreiro-sp-rj",
    "nome": "Serra da Bocaina (Sao Jose do Barreiro / Bananal)",
    "regiao": "SP/RJ, Brasil",
    "inicio": {
      "cidade": "Sao Jose do Barreiro",
      "lat": -22.643889,
      "lng": -44.578889
    },
    "fim": {
      "cidade": "Bananal",
      "lat": -22.683056,
      "lng": -44.323611
    },
    "distanciaKm": 60,
    "pavimento": "misto",
    "curvas": "alto",
    "trechoSemPostoKm": 45,
    "pedagioIda": 0,
    "pedagios": [],
    "pontosApoio": [
      {
        "nome": "Posto Sao Jose do Barreiro (centro)",
        "tipo": "posto_gasolina",
        "descricao": "Posto unico no centro de Sao Jose do Barreiro, abasteca o tanque cheio antes de subir a Bocaina pois nao ha postos no trecho serrano.",
        "lat": -22.642778,
        "lng": -44.58
      },
      {
        "nome": "Trilha do Ouro (acesso Bocaina)",
        "tipo": "ponto_historico",
        "descricao": "Trilha historica colonial do ciclo do cafe, ponto de parada cultural com estacionamento de motos na portaria do Parque Nacional da Bocaina.",
        "lat": -22.73,
        "lng": -44.47
      },
      {
        "nome": "Mirante da Serra da Bocaina (parte alta)",
        "tipo": "mirante",
        "descricao": "Mirante natural a 1.500m de altitude com vista do Vale do Paraiba, estacionamento em terra batida e ponto cenico classico do roteiro.",
        "lat": -22.7,
        "lng": -44.5
      },
      {
        "nome": "Posto Bananal (centro)",
        "tipo": "posto_gasolina",
        "descricao": "Posto unico em Bananal, abastecimento ao final do roteiro antes de pegar a BR-116 sentido Volta Redonda ou retornar pela mesma estrada.",
        "lat": -22.682222,
        "lng": -44.322222
      }
    ],
    "revisao": "2026-05-22",
    "descricao": "Roteiro classico de big trail no Parque Nacional da Serra da Bocaina entre Sao Jose do Barreiro (SP) e Bananal (SP), passando por trechos de terra batida no interior do parque. 60 km de pavimento misto: asfalto irregular nas cidades, terra batida e cascalho no trecho serrano alto. E uma das rotas mais selvagens do roteiro biker do sudeste, com vista de pico, trechos de fazenda historica do ciclo do cafe e altitude alta (1.500m). Exige big trail ou dual-sport com pneu adequado; nao recomendado para sport-touring ou naked. Sem pedagio. Sem cobertura de celular na maior parte do trecho. Confiabilidade baixa: condicoes do trecho de terra variam muito conforme estacao e ultimas chuvas, confirme localmente antes de fechar planejamento.",
    "dificuldade": "avancado",
    "melhorEpoca": "Maio a setembro (seca). Evitar dezembro a marco: o trecho de terra do Parque Nacional da Bocaina vira atoleiro com chuva forte e fica intransitavel para motos de rua.",
    "observacoes": [
      "Trecho de terra batida no interior do Parque Nacional vira atoleiro com chuva forte, consulte condicoes locais antes.",
      "Sem cobertura de celular na maior parte do trecho serrano, comunique itinerario a contato externo.",
      "Sem postos no trecho do parque, autonomia minima de 200 km recomendada.",
      "Pneu de rua puro nao recomendado, exige misto (50/50) ou off-road (70/30)."
    ],
    "fontes": [
      "https://pt.wikipedia.org/wiki/Parque_Nacional_da_Serra_da_Bocaina",
      "https://pt.wikipedia.org/wiki/S%C3%A3o_Jos%C3%A9_do_Barreiro",
      "https://pt.wikipedia.org/wiki/Banan_al"
    ]
  },
  {
    "id": "circuito-das-aguas-sp-340-sp",
    "nome": "Circuito das Aguas Paulista (SP-340 / SP-352)",
    "regiao": "SP, Brasil",
    "inicio": {
      "cidade": "Amparo",
      "lat": -22.701389,
      "lng": -46.768056
    },
    "fim": {
      "cidade": "Aguas de Lindoia",
      "lat": -22.4775,
      "lng": -46.633056
    },
    "distanciaKm": 45,
    "pavimento": "asfalto",
    "curvas": "medio",
    "trechoSemPostoKm": 18,
    "pedagioIda": 0,
    "pedagios": [],
    "pontosApoio": [
      {
        "nome": "Posto Shell Amparo (centro)",
        "tipo": "posto_gasolina",
        "descricao": "Posto urbano em Amparo com conveniencia, ar comprimido e parada de partida tradicional do circuito.",
        "lat": -22.7,
        "lng": -46.77
      },
      {
        "nome": "Restaurante Recanto Suico (Serra Negra)",
        "tipo": "restaurante",
        "descricao": "Restaurante tradicional com fondue e estacionamento amplo para motos, parada classica de motoclubes paulistanos.",
        "lat": -22.6125,
        "lng": -46.700278
      },
      {
        "nome": "Mirante do Cristo (Serra Negra)",
        "tipo": "mirante",
        "descricao": "Mirante religioso com vista panoramica de Serra Negra e estacionamento amplo gratuito.",
        "lat": -22.616944,
        "lng": -46.706944
      },
      {
        "nome": "Posto Ipiranga Aguas de Lindoia",
        "tipo": "posto_gasolina",
        "descricao": "Posto na entrada de Aguas de Lindoia, abastecimento ao final do circuito antes de seguir para Socorro, Bragancia ou retornar.",
        "lat": -22.475,
        "lng": -46.63
      }
    ],
    "revisao": "2026-05-22",
    "descricao": "Circuito turistico classico do interior paulista entre Amparo, Serra Negra e Aguas de Lindoia (SP-340/SP-352): 45 km de asfalto bem conservado com curvas suaves e elevacao moderada da Serra da Mantiqueira paulista. Rota ideal para iniciantes ganharem confianca em curvas, com infraestrutura de cafes coloniais, restaurantes suicos e pousadas em todo o trajeto. Sem pedagio para motos. Trafego turistico pesado nos fins de semana, especialmente de motoclubes paulistanos no domingo de manha. Combine com Socorro (SP-008) para um circuito mais longo ou suba ate Bragancia e pegue a Bandeirantes (com pedagio na volta). Otima para naked, scooter de cilindrada e sport-touring leve.",
    "dificuldade": "iniciante",
    "melhorEpoca": "Marco a outubro. Verao (dezembro a fevereiro) traz chuvas de tarde que podem encharcar trechos urbanos sem boa drenagem.",
    "observacoes": [
      "Trafego de motoclubes intenso aos domingos de manha entre Amparo e Serra Negra, mantenha distancia de seguranca em grupos grandes.",
      "Lombadas urbanas mal sinalizadas em Serra Negra e Lindoia, reduza velocidade ao entrar nas cidades.",
      "Trecho rural entre Serra Negra e Lindoia tem animais soltos (vacas e cavalos), atencao ao amanhecer.",
      "Asfalto pode estar molhado em sombra de mata entre Amparo e Serra Negra mesmo apos dia de sol."
    ],
    "fontes": [
      "https://pt.wikipedia.org/wiki/Circuito_das_%C3%81guas_Paulista",
      "https://pt.wikipedia.org/wiki/Serra_Negra_(S%C3%A3o_Paulo)",
      "https://pt.wikipedia.org/wiki/%C3%81guas_de_Lind%C3%B3ia",
      "https://www.openstreetmap.org/"
    ]
  },
  {
    "id": "roteiro-do-vinho-sao-roque-sp-029-sp",
    "nome": "Roteiro do Vinho de Sao Roque (SP-029 / Estrada do Vinho)",
    "regiao": "SP, Brasil",
    "inicio": {
      "cidade": "Sao Roque",
      "lat": -23.528611,
      "lng": -47.135278
    },
    "fim": {
      "cidade": "Sao Roque (Canguera)",
      "lat": -23.58,
      "lng": -47.08
    },
    "distanciaKm": 22,
    "pavimento": "asfalto",
    "curvas": "medio",
    "trechoSemPostoKm": 15,
    "pedagioIda": 0,
    "pedagios": [],
    "pontosApoio": [
      {
        "nome": "Posto Shell Sao Roque (centro)",
        "tipo": "posto_gasolina",
        "descricao": "Posto urbano em Sao Roque na saida para a Estrada do Vinho, conveniencia 24h e ponto de partida tradicional do roteiro.",
        "lat": -23.5275,
        "lng": -47.134722
      },
      {
        "nome": "Restaurante Quinta do Olivardo (SP-029)",
        "tipo": "restaurante",
        "descricao": "Vinicola e restaurante tradicional na Estrada do Vinho com estacionamento amplo, parada classica de motoclubes paulistanos aos sabados.",
        "lat": -23.555,
        "lng": -47.11
      },
      {
        "nome": "Cantina Sao Pedro (SP-029)",
        "tipo": "restaurante",
        "descricao": "Cantina italiana com vinho colonial e estacionamento de motos, ponto de encontro tradicional nos sabados a tarde.",
        "lat": -23.565,
        "lng": -47.095
      },
      {
        "nome": "Vinicola Goes (Canguera)",
        "tipo": "ponto_historico",
        "descricao": "Vinicola centenaria com tour e estacionamento de motos, parada cultural ao final do roteiro do vinho.",
        "lat": -23.578889,
        "lng": -47.080833
      }
    ],
    "revisao": "2026-05-22",
    "descricao": "Roteiro turistico curto de 22 km na SP-029 entre o centro de Sao Roque e o bairro rural de Canguera, conhecido como Estrada do Vinho. Tem vinicolas centenarias de imigrantes italianos, cantinas, queijarias e restaurantes coloniais ao longo do trajeto, com asfalto de qualidade media e curvas suaves. E o passeio dominical mais curto e classico de motoclubes paulistanos, ideal para iniciantes e como pre-passeio antes de subir a SP-280 sentido Castelo. Sem pedagio. Trafego turistico saturado aos sabados a tarde e domingos de manha, especialmente entre Pirassununga e Canguera. Nao confunda com a rota maior do Vinho de Andradas/Sao Joao da Boa Vista (MG/SP).",
    "dificuldade": "iniciante",
    "melhorEpoca": "Marco a outubro. Verao (dezembro a marco) traz chuvas de tarde que podem encharcar a SP-029 em trechos sem drenagem.",
    "observacoes": [
      "Trafego pesado de carros turisticos aos sabados a tarde, reduza velocidade e cuidado com aberturas de porta em estacionamentos a beira da via.",
      "Algumas vinicolas tem entradas curtas direto da rodovia, atencao a freadas bruscas de carros a frente.",
      "Lombadas mal sinalizadas no trecho rural, principalmente proximo a Canguera.",
      "Nao consuma bebida alcoolica nas vinicolas se voce e o piloto, lei seca rigorosa na SP-029 com fiscalizacao em fins de semana."
    ],
    "fontes": [
      "https://pt.wikipedia.org/wiki/S%C3%A3o_Roque",
      "https://pt.wikipedia.org/wiki/Roteiro_do_Vinho",
      "https://www.openstreetmap.org/"
    ]
  }
] satisfies RotaCatalogo[]).map(revisarRotaCatalogo);
