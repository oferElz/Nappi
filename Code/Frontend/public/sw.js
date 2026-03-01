// Service Worker for Nappi Push Notifications

// Listen for push events
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  let data = { title: 'Nappi', body: 'New notification', icon: '/logo.svg' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('[SW] Failed to parse push data:', e);
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/logo.svg',
    badge: '/logo.svg',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated');
  event.waitUntil(self.clients.claim());
});
