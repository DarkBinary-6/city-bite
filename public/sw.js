
// Service Worker for CityBite
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png', // Generic food icon
      badge: 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/', // Deep link URL
        timestamp: Date.now()
      },
      actions: [
        { action: 'view', title: 'View Order' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'CityBite Update', options)
    );
  } catch (e) {
    console.error('Error processing push event:', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Handle button clicks
  if (event.action === 'view') {
    // Specific logic for view action if needed
  }

  // Open the URL
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const url = event.notification.data.url;
      
      // Focus existing tab if open
      for (let client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
