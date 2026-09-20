/* eslint-disable no-undef */

/**
 * Recebimento de push no navegador.
 *
 * Este arquivo é puxado para dentro do service worker gerado pelo Workbox
 * (`workbox.importScripts`). Precisa ser JavaScript puro servido da raiz do
 * site: um service worker roda fora da página, sem bundler e sem React.
 *
 * É O ÚNICO CAMINHO PARA UM AVISO CHEGAR COM A ABA FECHADA. Se o alerta
 * dependesse da página estar aberta, a rede de socorro só serviria para quem
 * já está olhando a tela — que é justamente quem não precisa ser avisado.
 */

self.addEventListener('push', (evento) => {
  if (!evento.data) return;

  let carga;
  try {
    carga = evento.data.json();
  } catch {
    carga = { title: 'MotoRede', body: evento.data.text(), data: {} };
  }

  const urgente = carga.urgente !== false;

  const mostrar = self.registration.showNotification(carga.title || 'MotoRede', {
    body: carga.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    // A vibração longa separa socorro de qualquer outra notificação do
    // celular, para ser reconhecível sem olhar a tela — de capacete, parado no
    // semáforo, é a única informação disponível.
    vibrate: urgente ? [0, 400, 200, 400] : [0, 200],
    requireInteraction: urgente,
    tag: carga.data?.pedidoId || undefined,
    renotify: Boolean(carga.data?.pedidoId),
    data: carga.data || {},
  });

  // Avisa também as abas abertas, para a lista na tela mudar na hora em vez
  // de esperar o próximo carregamento.
  const avisarAbas = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((abas) => {
      for (const aba of abas) {
        aba.postMessage({ origem: 'motorede-push', dados: carga.data || {} });
      }
    });

  evento.waitUntil(Promise.all([mostrar, avisarAbas]));
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const dados = evento.notification.data || {};

  evento.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((abas) => {
        // Reaproveita uma aba já aberta em vez de abrir outra: quem toca no
        // aviso quer ver o chamado, não colecionar janelas do MotoRede.
        for (const aba of abas) {
          if ('focus' in aba) {
            aba.postMessage({ origem: 'motorede-push', dados, abrirSos: true });
            return aba.focus();
          }
        }
        return self.clients.openWindow('/?aba=sos');
      })
  );
});
