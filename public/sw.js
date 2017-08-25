
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('fonts').then(function(cache) {
      return cache.addAll(
        ['https://fonts.googleapis.com/icon?family=Material+Icons']
      );
    })
  );
});

self.addEventListener('fetch', function fetcher (event) {
  var request = event.request;
  // check if request 
  if (request.url.indexOf('destiny_content/icons') > -1) {
    // contentful asset detected
    event.respondWith(
      caches.match(event.request).then(function(response) {
        // return from cache, otherwise fetch from network
        return response || fetch(request).then(response => {
          return caches.open('icons')
            .then(cache => {
              cache.put(event.request, response.clone());
              return response;
            });
        });
      })
    );
  }
  const Account = request.url.indexOf('Account') > -1;
  const Inventory = request.url.indexOf('Character') > -1;
  const Character = request.url.indexOf('Inventory') > -1;
  const Definitions = request.url.indexOf('?definitions=true') > -1;

  if (Account && Inventory && Character && Definitions) {
    // contentful asset detected
    event.respondWith(
      caches.match(event.request).then(function(response) {
        // return from cache, otherwise fetch from network
        return response || fetch(request).then(response => {
          return caches.open('inventory-items')
            .then(cache => {
              cache.put(event.request, response.clone());
              return response;
            });
        });
      })
    );
  }
  // otherwise: ignore event
});