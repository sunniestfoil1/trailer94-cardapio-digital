function urlBase64ParaUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Seguro = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const bruto = atob(base64Seguro);
  return Uint8Array.from([...bruto].map(c => c.charCodeAt(0)));
}

export function statusPermissaoPush() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function ativarNotificacoesPush(motoboyId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') return false;

  const registro = await navigator.serviceWorker.register('/sw.js');

  const resChave = await fetch('/api/motoboy/push/chave-publica');
  const { chavePublica } = await resChave.json();

  const inscricao = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ParaUint8Array(chavePublica)
  });

  await fetch('/api/motoboy/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inscricao.toJSON())
  });

  return true;
}

export async function desativarNotificacoesPush() {
  await fetch('/api/motoboy/push/subscribe', { method: 'DELETE' });

  if ('serviceWorker' in navigator) {
    const registro = await navigator.serviceWorker.getRegistration('/sw.js');
    const inscricao = await registro?.pushManager.getSubscription();
    await inscricao?.unsubscribe();
  }
}
