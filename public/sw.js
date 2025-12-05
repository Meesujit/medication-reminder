import { precacheAndRoute } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)

// Custom notification handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'taken') {
    // Handle medicine taken
    clients.openWindow('/?action=taken')
  } else if (event.action === 'snooze') {
    // Handle snooze
    clients.openWindow('/?action=snooze')
  } else {
    clients.openWindow('/')
  }
})