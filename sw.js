//https://stackoverflow.com/questions/45257602/sharing-fetch-handler-logic-defined-across-multiple-service-workers

let call_id = 0



self.addEventListener('fetch', function(e) {
	call_id += 1;
	console.log('sw ' + call_id + ' e=', e);
	console.log('sw ' + call_id + ' e.request=', e.request);
	const url = new URL(e.request.url);
	console.log('sw ' + call_id + ' url=e.request.url=', url);
	const pathname = url.pathname;
	console.log('sw ' + call_id + ' pathname=' + pathname);	
	const namespace = 'datastore';
	if (!pathname.startsWith('/html-form-file-io/' + namespace) ) {
		console.log('sw ' + call_id + ' NOT FOR ME');		
		return; // let AMP-SW's fetch event listener handle this instead
	}

	e.respondWith(async function() {
		console.log('sw ' + call_id + ' SW CLAIMING OWNERSHIP');		
		
		const response_init = {  };
			response_init.status = '400';
			response_init.statusText = 'Bad Request';

		if (e.request.method == 'HEAD' || e.request.method == 'GET') { // OTHER?
			console.log('sw ' + call_id + ' HEAD/GET');
			console.log('sw ' + call_id + ' caches=', caches);	
			
			const key = (function() {
				const parts = pathname.split('/html-form-file-io/' + namespace + '/');
				if (parts.length === 2) {
					return parts[1];
				} else {
					return '';					
				}
			}());
			if (!key) {
				const response = new Response(null, response_init); 
				console.log('sw ' + call_id + ' response=', response);				
				return response;
			}

			const response = caches.open(namespace).then(function(cache) {				
				if (!cache) {
					const response = new Response(null, response_init); 
					console.log('sw ' + call_id + ' response=', response);				
					return response;
				}
				console.log('sw ' + call_id + ' cache=', cache);
				const keys = cache.keys();
				console.log('sw ' + call_id + ' keys=', keys);				
				//console.log('sw ' + call_id + ' TRY TO GET e.request=', e.request);
				const response = cache.match(key).then(async function(response) {
					if (response) {
						console.log('sw ' + call_id + ' cache match found, response=', response);						
						if (e.request.method == 'GET') {
							console.log('sw ' + call_id + ' GET');
						} else if (e.request.method == 'HEAD') {
							response_init.status = '200';
							response_init.statusText = 'OK';
							response = new Response(null, response_init);				
							console.log('sw ' + call_id + ' HEAD response=', response);						
						}
					} else {
						//https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/PreloadResponse
						response = await e.preloadResponse; // IF KEPT, SHOULD HEAD/GET BE DIFFERENTIATED HERE IN 'ELSE'?
						if (response) {
							console.log('sw ' + call_id + ' using e.preloadResponse=', e.preloadResponse);											
						} else {
							response = new Response(null, response_init);
							console.log('sw ' + call_id + ' no match or preloadResponse, response=', response);				
						} 
					}
					//e.waitUntil (e.preloadResponse); // combatting download woes on ctrl-click link w/o download attr:
					//The service worker navigation preload request was cancelled before 'preloadResponse' settled. If you intend to use 'preloadResponse', use waitUntil() or respondWith() to wait for the promise to settle.
					// Failed - No file
					return response;					
				} () );
				return response;
			} );
			return response;
		} // ^ HEAD or GET
	
		if (e.request.method == 'POST') {
			console.log('sw ' + call_id + ' POST');
			
			const formdata = await e.request.formData();
			console.log('sw ' + call_id + ' formdata=', formdata);

			if (! formdata) {
				const response = new Response(null, response_init);
				console.log('sw ' + call_id + ' no formdata, response=', response);
				return response;			
			}

			const items = await formdata.keys();
			console.log('sw ' + call_id + ' items=', items);
			let item = items.next();
			const files = { };
			while (!item.done) {
				const key = item.value;
				console.log('sw ' + call_id + ' key=' + key);
				const candidate = await formdata.get(key);
				console.log('sw ' + call_id + ' candidate=', candidate);		
				const characterized = candidate.toString();
				console.log('sw ' + call_id + ' characterized=' + characterized);				
				if (characterized == '[object File]') {
					console.log('sw ' + call_id + ' found a file slot');					
					if (candidate.name) {
						console.log('sw ' + call_id + ' found a named (i.e., uploaded, file');							
						files[candidate.name] = candidate;
					}
				}
				item = items.next();				
			}
			const filenames = Object.getOwnPropertyNames(files);
			console.log('sw ' + call_id + ' filenames.length=' + filenames.length);			
			let successes = 0;
			let errors = 0;
			for (let i = 0; i < filenames.length; i += 1) {
				const filename = filenames[i];
				console.log('sw ' + call_id + ' filename=' + filename);
				if (! filename) {
					errors += 1;
					continue;
				}
				const file_object = files[filename];
				console.log('sw ' + call_id + ' file_object=', file_object);				
				const text = await file_object.text();
				//console.log('sw ' + call_id + ' text=' + text);
				//0-length file is allowed 

				caches.open(namespace).then(function(cache) {
					const cached_response_init = {  };
						cached_response_init.status = '200';
						cached_response_init.statusText = 'OK';
						cached_response_init.headers = new Headers({
							'Cache-Control': 'max-age=0', // 31536000 
							//'Content-Disposition': 'attachment', // ; filename="' + filename + '"', // works but removes user choice of filename							
							'Content-Length': text.length,
							'Content-Type': 'text/plain'							
						});					
					const response = new Response(text, cached_response_init);
					cache.put(filename, response).then(function() {
						console.log('sw ' + call_id + ' cache put successful, under key=' + filename);
					});
				} )				

				successes += 1;
			}

			console.log('sw ' + call_id + ' successes=' + successes + ' errors=' + errors);
			if (successes > 0 && errors == 0) {
				response_init.status = '200';
				response_init.statusText = 'OK';
				response_init.headers = new Headers({
					'Content-Type': 'application/json'
				});
				// , 'Content-Length': text.length
			}
			const response = new Response(JSON.stringify( { } ), response_init);								
			return response;					
		} // ^ POST
		
	} () ); // ^ e.respondWith(async function() {		
} ); // ^ fetch event listener


importScripts('https://cdn.ampproject.org/sw/amp-sw.js');
AMP_SW.init({
	assetCachingOptions: [{
		regexp: /\.(png|jpg)/,
		cachingStrategy: 'CACHE_FIRST'
	}],
	offlinePageOptions: {
		url: 'offline.html',
		assets: []
	}
});

self.addEventListener('install', event => {
	self.skipWaiting();
	/*
	event.waitUntil(
    		// caching etc
	);
	*/
});

self.addEventListener('activate', function(e) {
	e.waitUntil( async function () {
		if ( self.registration.navigationPreload ) {
			await self.registration.navigationPreload.enable(); // dis-
			console.log('sw ' + call_id + ' navigationPreload disabled'); // dis-			
		} else {
			console.log('sw ' + call_id + ' navigationPreload not supported');			
		}
	} () );	
		//https://developers.google.com/web/updates/2017/02/navigation-preload
		//https://love2dev.com/pwa/service-worker-preload/

	clients.claim();
} );

/*
addEventListener("fetch", function(e) {
	e.respondWith(async function() { // Respond from the cache if we can
		const cachedResponse = await caches.match(e.request);
		if (cachedResponse) return cachedResponse;
		// Else, use the preloaded response, if it's there
		const response = await e.preloadResponse;
		if (response) return response;
		// Else try the network.
		return fetch(e.request);
	}());
});
*/
