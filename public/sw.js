// Service Worker for caching static assets
const CACHE_VERSION = 'v2'
const CACHE_NAME = `frou-manager-${CACHE_VERSION}`
const STATIC_CACHE = `static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`
const IMAGE_CACHE = `images-${CACHE_VERSION}`
const API_CACHE = `api-${CACHE_VERSION}`

// Critical resources to cache immediately
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/favicon.ico'
]

// Static assets to cache on install
const STATIC_ASSETS = [
  // Will be populated with built assets
]

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        return cache.addAll(CRITICAL_RESOURCES)
      })
      .then(() => {
        return self.skipWaiting()
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE, API_CACHE]
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => !currentCaches.includes(cacheName))
            .map(cacheName => {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            })
        )
      })
      .then(() => {
        console.log('Service Worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Handle Supabase API requests with network-first + cache
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, 5 * 60 * 1000))
    return
  }

  // Skip cross-origin requests (except Supabase)
  if (url.origin !== location.origin) return

  // Images - cache first
  if (request.destination === 'image') {
    event.respondWith(cacheFirstWithRefresh(request, IMAGE_CACHE))
    return
  }

  // JS/CSS - stale-while-revalidate
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
    return
  }

  // Everything else - cache first
  event.respondWith(cacheFirstWithRefresh(request, DYNAMIC_CACHE))
})

// Cache strategies
async function cacheFirstWithRefresh(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  
  if (cached) {
    // Return cached, but fetch fresh in background
    fetchAndCache(request, cacheName)
    return cached
  }
  
  // Not in cache, fetch and cache
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    // Network failed, return offline fallback
    if (request.mode === 'navigate') {
      return caches.match('/')
    }
    throw error
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  })
  
  // Return cached immediately if available, otherwise wait for network
  return cached || fetchPromise
}

async function networkFirstWithCache(request, cacheName, maxAge = 5 * 60 * 1000) {
  const cache = await caches.open(cacheName)
  
  try {
    const response = await fetch(request)
    if (response.ok) {
      // Add timestamp header
      const clonedResponse = response.clone()
      const blob = await clonedResponse.blob()
      const headers = new Headers(clonedResponse.headers)
      headers.set('sw-cache-time', Date.now().toString())
      
      const cachedResponse = new Response(blob, {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers: headers
      })
      
      cache.put(request, cachedResponse)
    }
    return response
  } catch (error) {
    // Network failed, try cache
    const cached = await cache.match(request)
    if (cached) {
      const cacheTime = cached.headers.get('sw-cache-time')
      const age = cacheTime ? Date.now() - parseInt(cacheTime) : Infinity
      
      // Return cached if not too old
      if (age < maxAge) {
        console.log('Serving stale API cache:', request.url)
        return cached
      }
    }
    throw error
  }
}

async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
  } catch (error) {
    // Ignore background fetch errors
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync
      handleBackgroundSync()
    )
  }
})

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: data.tag || 'default',
      requireInteraction: true
    }

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.openWindow('/')
  )
})

// Helper function for background sync
async function handleBackgroundSync() {
  // Implement background sync logic here
  console.log('Background sync triggered')
}

