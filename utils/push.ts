
const API_BASE = '/api';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Monitors permission changes to ensure notifications are synced
 */
export const monitorNotificationPermission = (userId: string, role: string) => {
    if (!('Notification' in window)) return;

    if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'notifications' as any }).then((permissionStatus) => {
            permissionStatus.onchange = () => {
                if (permissionStatus.state === 'granted') {
                    registerPushNotifications(userId, role);
                }
            };
        });
    }
};

export const registerPushNotifications = async (userId: string, role: string) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.debug('Push notifications not supported in this browser');
    return;
  }

  try {
    const swPath = './sw.js';
    
    if (Notification.permission === 'denied') return;

    let registration: ServiceWorkerRegistration;
    try {
        registration = await navigator.serviceWorker.register(swPath, { scope: './' });
        // Ensure SW is ready
        await navigator.serviceWorker.ready;
    } catch (swError) {
        console.debug('ServiceWorker registration restricted in this environment:', swError);
        return;
    }
    
    if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
    }

    const configRes = await fetch(`${API_BASE}/config/vapid`).catch(() => null);
    if (!configRes || !configRes.ok) return;
    
    const { publicKey } = await configRes.json();
    if (!publicKey) return;

    // Use getSubscription to see if we already have one
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
    }

    await fetch(`${API_BASE}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        userId,
        role
      })
    }).catch(e => console.debug('Failed to sync push subscription with server:', e));

  } catch (error) {
    console.debug('Push subscription flow skipped:', error);
  }
};

export const triggerNotificationEvent = async (type: string, payload: any) => {
    try {
        await fetch(`${API_BASE}/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, payload })
        });
    } catch (e) {
        // Silent fail for notification triggers
    }
};
