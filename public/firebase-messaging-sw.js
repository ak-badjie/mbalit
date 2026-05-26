importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

// Default config - will be initialized if needed, but standard setups might rely on the client app initializing this.
// Usually, we just catch the background message.

firebase.initializeApp({
  // Project settings should be injected here or it relies on default initialization if hosted on firebase hosting
  // For a generic PWA, we'll listen for background messages:
  projectId: "mbalit-8a52f",
  messagingSenderId: "1234567890", // Placeholder if you don't inject
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
