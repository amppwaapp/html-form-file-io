//https://stackoverflow.com/questions/45257602/sharing-fetch-handler-logic-defined-across-multiple-service-workers

self.addEventListener('fetch', function(e) {
	const call_id = Math.random();
	console.log('sw ' + call_id + ' 0010 e=', e);
	console.log('sw ' + call_id + ' 0012 e.request=', e.request);
	const url = new URL(e.request.url);
	console.log('sw ' + call_id + ' 0014 url=e.request.url=', url);
	const pathname = url.pathname;
	const namespace = 'datastore';
	if (!pathname.startsWith('/' + namespace) ) {
		return; // let AMP-SW's fetch event listener handle this instead
	}

	e.respondWith(async function() {
		
		const response_headers = {  };
			response_headers.status = '400';
			response_headers.statusText = 'Bad Request';

		if (e.request.method == 'GET') { // HEAD ?  OTHER?
			console.log('sw ' + call_id + ' 0016 GET');
			console.log('sw ' + call_id + ' 0016b caches=', caches);						

			const response = caches.open(namespace).then(function(cache) {				
				if (!cache) {
					const response = new Response(null, response_headers); 
					console.log('sw ' + call_id + ' 0062 response=', response);				
					return response;
				}
				console.log('sw ' + call_id + ' 0017 cache=', cache);
				const keys = await cache.keys();
				console.log('sw ' + call_id + ' 0017b keys=', keys);				
				//console.log('sw ' + call_id + ' 0018 TRY TO GET e.request=', e.request);
				const response = cache.match(e.request).then(function(response) {
					if (!response) {
						response = new Response(null, response_headers);
						console.log('sw ' + call_id + ' 0062 response=', response);						
					}
					console.log('sw ' + call_id + ' 0019 cache match, response=', response);					
					return response;
				} );
				return response;
			} );
			return response;
		} // ^ GET
	
		if (e.request.method == 'POST') {
			console.log('sw ' + call_id + ' 0020 POST');

			e.respondWith(async function() {
				console.log('sw ' + call_id + ' 0022');			

				const parts = url.split('/upload?');
				if (parts.length !== 2) {
					const response = new Response(null, response_headers);
					console.log('sw ' + call_id + ' 0024 not my url, url=', url);
					return response;						
				}
				const baseurl = parts[0] + '/';			

				const formdata = await e.request.formData();
				console.log('sw ' + call_id + ' 0026, formdata=', formdata);

				if (! formdata) {
					const response = new Response(null, response_headers);
					console.log('sw ' + call_id + ' 0028 no formdata, response=', response);
					return response;			
				}

				const items = await formdata.keys();
				console.log('sw ' + call_id + ' 0040 items=', items);
				let item = items.next();
				const files = { };
				while (!item.done) {
					const key = item.value;
					console.log('sw ' + call_id + ' 0042 key=' + key);
					const candidate = await formdata.get(key)
					console.log('sw ' + call_id + ' 0044 candidate=', candidate);		
					const characterized = candidate.toString();
					console.log('sw ' + call_id + ' 0046 characterized=' + characterized);				
					if (characterized == '[object File]') {
						console.log('sw ' + call_id + ' 0048 found a file');					
						files[candidate.name] = candidate;
					}
					item = items.next();				
				}
				const filenames = Object.getOwnPropertyNames(files);
				console.log('sw ' + call_id + ' 0050 filenames.length=' + filenames.length);			
				let successes = 0;
				let errors = 0;
				for (let i = 0; i < filenames.length; i += 1) {
					const filename = filenames[i]; // was sic "console"
					console.log('sw ' + call_id + ' 0052 filename=' + filename);
					if (! filename) {
						errors += 1;
						continue;
					}
					const file_object = files[filename];
					console.log('sw ' + call_id + ' 0053 file_object=', file_object);				
					const text = await file_object.text();
					console.log('sw ' + call_id + ' 0054 text=' + text);
					// 0-length file is allowed 

					const init_for_cache_copy = {  };
					init_for_cache_copy.status = '200';
					init_for_cache_copy.statusText = 'OK';
					init_for_cache_copy.headers = new Headers({
						'Content-Type': 'text/plain', 
						'Content-Length': text.length
					});

					const url = baseurl + filename;
					console.log('sw ' + call_id + ' 0055 cache with url=', url);				
					//const request2cache = new Request(url, {method: 'GET'});
					const response2cache = new Response(text, init_for_cache_copy);				
					caches.open('data-store').then(function(cache) {
						//console.log('sw ' + call_id + ' 0056 PUT TO PLAY cache put, request2cache=', request2cache);
						cache.put(url, response2cache).then(function() {
							console.log('sw ' + call_id + ' 0058 cache put successful');
						});
					} )				

					successes += 1;
				}

				if (successes > 0 && errors == 0) {
					init.status = '200';
					init.statusText = 'OK';
					init.headers = new Headers({
						'Content-Type': 'application/json'
					});
					// , 'Content-Length': text.length
				}
				const response2return = new Response({ }, response_headers);								
				return response2return;					


		} // ^ POST
	} () ); // ^ e.respondWith(async function() {		
} ); // ^ fetch event listener

/*			
			const temp1 = await formdata.get('uploaded_file');
			console.log('sw ' + call_id + ' 0060 temp1=', temp1);						
			if (! temp1) {
				const response = new Response('FORMDATA_FILE ' + 'err', init);
				console.log('sw ' + call_id + ' 0062 response=', response);				
				return response;			
			}

			const text = await temp1.text();
			console.log('sw ' + call_id + ' 0064 text=' + text);			
			if (! text) {
				const response = new Response('TEXT ' + 'err', init);
				console.log('sw ' + call_id + ' 0066 response=', response);				
				return response;							
			} 
				
//console.log('sw temp1a=', temp1a);
			//temp1a.then(function(text){
console.log('sw text=', text);					
				const temp2 = text.replace(/\r\n/,"\n");
console.log('sw temp2=', temp2);											
				// take account of different line endings,
				// between headers and within text content
				const temp3 = temp2.split("\n");
console.log('sw temp3=', temp3);											

				const temp4 = temp3.slice(3,temp3.length-3); // THIS ABRUPTLY NO LONGER NEEDED
console.log('sw temp4=', temp4);
				//put(temp4, 'download'); tried idb	
				//local_storage.setItem('download', JSON.stringify(temp4));
//saved_array = temp4;
//console.log('sw saved_array=', saved_array);																	
				// testing shows 3 envelope lines, both fore and aft

//payload = text;
//console.log('sw payload=', payload);					
	// } // SPECIAL PROCESSING else
*/

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
	clients.claim();
} );
