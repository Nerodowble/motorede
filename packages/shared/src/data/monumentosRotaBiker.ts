// Monumentos da Rota Biker conforme monumentobikers.com.br, consultado em 2026-10-13.
// O nº 2 está "em atualização" no site e fica fora até ter local.
// Coordenadas do local (2026-11-17): pinos do mapa oficial do site (Google My Maps
// "ROTA BIKERS", mid=1ZHPck3Yykbhc8M1GYPrCcKf5pajiTvk), conferidos no OpenStreetMap.
// Sem confirmação independente (só o pino oficial): 37, 40, 41, 42 e 43.
// Nº 10: ponto da loja Terra Sul Motos, onde se carimba (o pino do monumento fica no
// Free Shop da BR-116, a ~1,6 km).
import type { MonumentoRotaBiker } from '../domain/rotaBiker.js';

export const MONUMENTOS_ROTA_BIKER: readonly MonumentoRotaBiker[] = [
  { numero: 1, nome: 'Serpenteando Café', cidade: 'Bocaiúva do Sul', uf: 'PR', pais: 'Brasil', lat: -25.07777, lng: -49.086298, situacao: 'carimbando', instagram: 'serpenteando.cafe' },
  { numero: 3, nome: 'Mirante do 12', cidade: 'Lauro Müller', uf: 'SC', pais: 'Brasil', lat: -28.38484, lng: -49.485081, situacao: 'carimbando', instagram: 'mirantedo12' },
  { numero: 4, nome: 'Rota 370', cidade: 'Urubici', uf: 'SC', pais: 'Brasil', lat: -27.998745, lng: -49.554445, situacao: 'carimbando', instagram: 'rota370urubici' },
  { numero: 5, nome: 'Parada Rota 218', cidade: 'Carlópolis', uf: 'PR', pais: 'Brasil', lat: -23.419728, lng: -49.708775, situacao: 'carimbando', instagram: 'rotapr218' },
  { numero: 6, nome: 'Parada Rota Bike Café', cidade: 'Rio dos Cedros', uf: 'SC', pais: 'Brasil', lat: -26.672074, lng: -49.321402, situacao: 'carimbando', instagram: 'rotabikecafe' },
  { numero: 7, nome: 'Container da Serra', cidade: 'Doutor Pedrinho', uf: 'SC', pais: 'Brasil', lat: -26.625462, lng: -49.516577, situacao: 'carimbando', instagram: 'containerdaserra' },
  { numero: 8, nome: 'Parada 261', cidade: 'Guapiara', uf: 'SP', pais: 'Brasil', lat: -24.189802, lng: -48.536707, situacao: 'carimbando', instagram: 'parada_261' },
  { numero: 9, nome: 'Posto Rota 090', cidade: 'Piraí do Sul', uf: 'PR', pais: 'Brasil', lat: -24.537761, lng: -49.959283, situacao: 'carimbando', instagram: 'rota090' },
  { numero: 10, nome: 'Terrasul Motos', cidade: 'Jaguarão', uf: 'RS', pais: 'Brasil', lat: -32.564997, lng: -53.378272, situacao: 'carimbando' },
  { numero: 11, nome: 'Pad Bier Cervejaria', cidade: 'Paranoá', uf: 'DF', pais: 'Brasil', lat: -15.99902, lng: -47.560323, situacao: 'carimbando', instagram: 'padbiercervejaria' },
  { numero: 12, nome: 'Centro Cultural Movimento', cidade: 'Socorro', uf: 'SP', pais: 'Brasil', lat: -22.597253, lng: -46.525631, situacao: 'carimbando', instagram: 'centroculturalmovimento' },
  { numero: 13, nome: 'Rota 513', cidade: 'Ponta Grossa', uf: 'PR', pais: 'Brasil', lat: -25.142165, lng: -49.981155, situacao: 'carimbando', instagram: 'portal.dos.campos' },
  { numero: 14, nome: 'Parador 158', cidade: 'Itaara', uf: 'RS', pais: 'Brasil', lat: -29.601067, lng: -53.767731, situacao: 'carimbando', instagram: 'parador158' },
  { numero: 15, nome: 'Garimpo em Atividade (Passeio Subterrâneo)', cidade: 'Ametista do Sul', uf: 'RS', pais: 'Brasil', lat: -27.357781, lng: -53.191674, situacao: 'carimbando', instagram: 'garimpoematividade' },
  { numero: 16, nome: 'Bar Original · Pier SP-270', cidade: 'Piraju', uf: 'SP', pais: 'Brasil', lat: -23.184275, lng: -49.390602, situacao: 'carimbando', instagram: 'baroriginalpiraju' },
  { numero: 17, nome: 'Armazém Canastra', cidade: 'Piumhi', uf: 'MG', pais: 'Brasil', lat: -20.457659, lng: -45.97841, situacao: 'carimbando', instagram: 'armazem_canastra' },
  { numero: 18, nome: 'Box 1200', cidade: 'Jundiaí', uf: 'SP', pais: 'Brasil', lat: -23.191877, lng: -46.962883, situacao: 'carimbando', instagram: 'box1200oficial' },
  { numero: 19, nome: 'Rancho Terra Crua', cidade: 'Salesópolis', uf: 'SP', pais: 'Brasil', lat: -23.521242, lng: -45.898278, situacao: 'carimbando', instagram: 'rancho.terracrua' },
  { numero: 20, nome: 'Casa Rural', cidade: 'Barra do Ribeiro', uf: 'RS', pais: 'Brasil', lat: -30.40753, lng: -51.4541, situacao: 'carimbando', instagram: 'casa_rural_barra_do_ribeiro' },
  { numero: 21, nome: 'Parada Penhasco', cidade: 'Penha', uf: 'SC', pais: 'Brasil', lat: -26.811291, lng: -48.666404, situacao: 'carimbando', instagram: 'penhascocervejaria' },
  { numero: 22, nome: 'Restaurante Mata Virgem', cidade: 'Três Corações', uf: 'MG', pais: 'Brasil', lat: -21.614409, lng: -45.261405, situacao: 'carimbando', instagram: 'matavirgemrestaurante' },
  { numero: 23, nome: 'Bar do Hélio', cidade: 'Santo Antônio da Alegria', uf: 'SP', pais: 'Brasil', lat: -21.02568, lng: -47.166962, situacao: 'carimbando', instagram: 'bardoheliosaa' },
  { numero: 24, nome: 'Pousada e Camping Poço do Caixão', cidade: 'Timbé do Sul', uf: 'SC', pais: 'Brasil', lat: -28.814169, lng: -49.881393, situacao: 'carimbando', instagram: 'campingpocodocaixao' },
  { numero: 25, nome: 'Os Independentes · Parque do Peão', cidade: 'Barretos', uf: 'SP', pais: 'Brasil', lat: -20.509514, lng: -48.597639, situacao: 'carimbando', instagram: 'barretosmotorcycles_oficial' },
  { numero: 26, nome: 'Restaurante Portal Grill', cidade: 'Porto União', uf: 'SC', pais: 'Brasil', lat: -26.274281, lng: -51.054195, situacao: 'carimbando', instagram: 'restaurante.portalgrilloficial' },
  { numero: 27, nome: 'Restaurante Pedra do Baú', cidade: 'São Bento do Sapucaí', uf: 'SP', pais: 'Brasil', lat: -22.680331, lng: -45.66324, situacao: 'carimbando', instagram: 'restaurantepedradobau' },
  { numero: 28, nome: 'Hotel Barra Bonita', cidade: 'Barra Bonita', uf: 'SP', pais: 'Brasil', lat: -22.498063, lng: -48.562073, situacao: 'carimbando', instagram: 'hotelbarrabonita_' },
  { numero: 29, nome: 'Rancho Gastronomia e Cultura', cidade: 'São José do Barreiro', uf: 'SP', pais: 'Brasil', lat: -22.645281, lng: -44.576762, situacao: 'carimbando', instagram: 'canalrancho' },
  { numero: 30, nome: 'Drei Schritte Restô Bar', cidade: 'Katueté', uf: 'Canindeyú', pais: 'Paraguai', lat: -24.253942, lng: -54.770272, situacao: 'carimbando', instagram: 'dreischrittekatuete' },
  { numero: 31, nome: 'Pro Tork', cidade: 'Siqueira Campos', uf: 'PR', pais: 'Brasil', lat: -23.670483, lng: -49.836561, situacao: 'carimbando', instagram: 'protork_oficial' },
  { numero: 32, nome: "Hell's Dogs Motorcycle Bar", cidade: 'Foz do Iguaçu', uf: 'PR', pais: 'Brasil', lat: -25.515999, lng: -54.57516, situacao: 'carimbando', instagram: 'hellsdogsfoz' },
  { numero: 33, nome: 'Zapata Garage', cidade: 'Garça', uf: 'SP', pais: 'Brasil', lat: -22.200102, lng: -49.649489, situacao: 'carimbando', instagram: 'zapatagarage' },
  { numero: 34, nome: 'Parada da Búfala', cidade: 'Sete Barras', uf: 'SP', pais: 'Brasil', lat: -24.276915, lng: -47.947998, situacao: 'carimbando', instagram: 'parada.dabufala' },
  { numero: 35, nome: 'Portal de São Lourenço', cidade: 'São Lourenço', uf: 'MG', pais: 'Brasil', lat: -22.127071, lng: -45.039243, situacao: 'carimbando' },
  { numero: 36, nome: 'Route 60', cidade: 'Abadiânia', uf: 'GO', pais: 'Brasil', lat: -16.184957, lng: -48.688318, situacao: 'carimbando', instagram: 'route_60' },
  { numero: 37, nome: 'Bela Vista Mall', cidade: 'Conceição do Mato Dentro', uf: 'MG', pais: 'Brasil', lat: -19.044126, lng: -43.422361, situacao: 'carimbando' },
  { numero: 38, nome: 'MAPY', cidade: 'Mauá da Serra', uf: 'PR', pais: 'Brasil', lat: -23.912212, lng: -51.184492, situacao: 'carimbando' },
  { numero: 39, nome: 'Mar & Sol Praia Hotel', cidade: 'Prado', uf: 'BA', pais: 'Brasil', lat: -17.340253, lng: -39.218194, situacao: 'carimbando' },
  { numero: 40, nome: 'Quiosque Romano', cidade: 'Morro Redondo', uf: 'RS', pais: 'Brasil', lat: -31.51598, lng: -52.599415, situacao: 'em_construcao' },
  { numero: 41, nome: 'Rota 15', cidade: 'Casca', uf: 'RS', pais: 'Brasil', lat: -28.640074, lng: -51.938567, situacao: 'em_construcao' },
  { numero: 42, nome: 'Tapioca do Irmão Firmino', cidade: 'Cajá', uf: 'PB', pais: 'Brasil', lat: -7.168417, lng: -35.35096, situacao: 'em_construcao' },
  { numero: 43, nome: 'Parada Route', cidade: 'São Miguel do Passa Quatro', uf: 'GO', pais: 'Brasil', lat: -17.070895, lng: -48.657036, situacao: 'em_construcao' },
  { numero: 44, nome: 'Laranja Doce · Pão com Linguiça', cidade: 'Martinópolis', uf: 'SP', pais: 'Brasil', lat: -22.131556, lng: -51.168964, situacao: 'em_construcao' },
];
