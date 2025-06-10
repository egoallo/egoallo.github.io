const CACHE_NAME = 'egoallo-results-v1';

// Extract all resource URLs from results.js dynamically
async function getAllResources() {
  const resources = new Set();
  
  // Essential files
  const essentials = [
    '/results.html',
    '/results.js', 
    '/style.css',
    '/favicon.png',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
    'https://cdn.jsdelivr.net/npm/modern-normalize@3.0.1/modern-normalize.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/tabler-icons/3.19.0/tabler-icons-outline.min.css'
  ];
  
  essentials.forEach(url => resources.add(url));
  
  try {
    // Fetch and parse results.js to get all video/viser file URLs
    const response = await fetch('/results.js');
    const text = await response.text();
    
    // Extract the results array
    const resultsMatch = text.match(/const results = (\[[\s\S]*?\]);/);
    if (resultsMatch) {
      // Use Function constructor instead of eval for safer execution
      const resultsArray = new Function('return ' + resultsMatch[1])();
      
      resultsArray.forEach(([title, viserParams, thumbnail]) => {
        if (thumbnail) {
          resources.add(thumbnail);
          
          // Generate corresponding video and viser file paths
          const baseName = thumbnail.replace('_thumbnail.jpg', '');
          resources.add(`${baseName}.mp4`);
          resources.add(`${baseName}.viser`);
        }
      });
    }
  } catch (e) {
    console.log('Could not parse results.js:', e);
  }
  
  // Add viser-embed assets
  const viserAssets = [
    '/viser-embed/',
    '/viser-embed/index.html',
    '/viser-embed/Inter-VariableFont_slnt,wght.ttf',
    '/viser-embed/logo.svg',
    '/viser-embed/manifest.json',
    '/viser-embed/robots.txt',
    '/viser-embed/assets/Sorter-Df0J3ZWJ.wasm',
    '/viser-embed/assets/SplatSortWorker-9TA3iU-_.js',
    '/viser-embed/assets/WebsocketServerWorker-2xce1CWr.js',
    '/viser-embed/assets/index-B-y1Dkm4.js',
    '/viser-embed/assets/index-Cph--GSH.css',
    '/viser-embed/hdri/dikhololo_night_1k.hdr',
    '/viser-embed/hdri/empty_warehouse_01_1k.hdr',
    '/viser-embed/hdri/forest_slope_1k.hdr',
    '/viser-embed/hdri/kiara_1_dawn_1k.hdr',
    '/viser-embed/hdri/lebombo_1k.hdr',
    '/viser-embed/hdri/potsdamer_platz_1k.hdr',
    '/viser-embed/hdri/rooitou_park_1k.hdr',
    '/viser-embed/hdri/st_fagans_interior_1k.hdr',
    '/viser-embed/hdri/studio_small_03_1k.hdr',
    '/viser-embed/hdri/venice_sunset_1k.hdr'
  ];
  
  viserAssets.forEach(url => resources.add(url));
  
  return Array.from(resources);
}

self.addEventListener('install', function(event) {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('Opened cache');
        
        const allResources = await getAllResources();
        console.log(`Caching ${allResources.length} resources`);
        
        // Cache in batches to avoid overwhelming the browser
        const batchSize = 10;
        for (let i = 0; i < allResources.length; i += batchSize) {
          const batch = allResources.slice(i, i + batchSize);
          try {
            await cache.addAll(batch);
            console.log(`Cached batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allResources.length/batchSize)}`);
          } catch (e) {
            console.log('Failed to cache batch:', batch, e);
            // Try caching individual files if batch fails
            for (const url of batch) {
              try {
                await cache.add(url);
              } catch (individualError) {
                console.log('Failed to cache:', url, individualError);
              }
            }
          }
        }
        
        console.log('All resources cached successfully');
      } catch (e) {
        console.error('Cache installation failed:', e);
      }
    })()
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response; // Cache hit
        }
        
        // Not in cache, fetch from network
        return fetch(event.request).then(function(response) {
          // Cache successful responses for future use
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        }).catch(function() {
          // Network failed, return offline fallback
          return caches.match('/results.html');
        });
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});