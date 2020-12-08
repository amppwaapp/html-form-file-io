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

/*
self.addEventListener('activate', function(e) {
	clients.claim();
} );
*/

self.addEventListener('fetch', function(e) {
	console.log('sw 0010 e=', e);
	console.log('sw 0012 e.request=', e.request);	
	console.log('sw 0014 e.request.url=', e.request.url);

	if (e.request.method == 'GET') { // HEAD ?  OTHER?
		console.log('sw 0016 GET');
/*		
		e.respondWith(async function() {
			caches.open('data-store').then(function(cache) {
				console.log('sw 0017 cache=', cache);	
				console.log('sw 0018 TRY TO GET e.request=', e.request);				
				cache.match(e.request).then(function(response) {
					console.log('sw 0019 cache match, response=', response);					
					return response || fetch(e.request);
				} )
			} )
		);
		} () ); // end e.respondWith(async function() {						
*/			

		e.respondWith(caches.match(e.request, {ignoreSearch: true, ignoreMethod: true, ignoreVary: true}).then(function(response) {
			if (response !== undefined) {
				console.log('sw 0017 returning response from cache');
				return response;
			} else {
				console.log('sw 0018 returning after external fetching');				
				return fetch(e.request).then(function (response) {
					return response;
				} );
			}	  
		} ) );
		
	} // end GET
	
	const url = e.request.url
	if (e.request.method == 'POST') {
		console.log('sw 0020 POST');	
		const init = {  };
		init.status = '400';
		init.statusText = 'Bad Request';
								
		e.respondWith(async function() {
			console.log('sw 0022');			
			
			const parts = url.split('/upload?');
			if (parts.length !== 2) {
				const response = new Response('FORMDATA ' + 'err', init);
				console.log('sw 0024 not my url, url=', url);
				return response;						
			}
			const baseurl = parts[0] + '/';			
			
			const formdata = await e.request.formData();
			console.log('sw 0026, formdata=', formdata);
			
			if (! formdata) {
				const response = new Response('FORMDATA ' + 'err', init);
				console.log('sw 0028 no formdata, response=', response);
				return response;			
			}

			const hasformmode = await formdata.has('formmode');
			console.log('sw 0030 hasformmode=' + hasformmode);			
			if (!hasformmode) {
				console.log('sw 0032 has no formmode so POST outside');				
				return fetch(e.request); // NEED TO TEST HERE			
			}
			const formmode = await formdata.get('formmode');
			console.log('sw 0034 formmode=' + formmode);			
			if (! formmode || formmode.toLowerCase() !== 'local') {
				console.log('sw 0036 unknown formmode=' + formmode);				
				const response = new Response('FORMDATA_FILE ' + 'err', init);
				console.log('sw 0038 response=', response);				
				return response;			
			}
			
			const items = await formdata.keys();
			console.log('sw 0040 items=', items);
			let item = items.next();
			const files = { };
			while (!item.done) {
				const key = item.value;
				console.log('sw 0042 key=' + key);
				const candidate = await formdata.get(key)
				console.log('sw 0044 candidate=', candidate);		
				const characterized = candidate.toString();
				console.log('sw 0046 characterized=' + characterized);				
				if (characterized == '[object File]') {
					console.log('sw 0048 found a file');					
					files[candidate.name] = candidate;
				}
				item = items.next();				
			}
			const filenames = Object.getOwnPropertyNames(files);
			console.log('sw 0050 filenames.length=' + filenames.length);			
			let successes = 0;
			let errors = 0;
			for (let i = 0; i < filenames.length; i += 1) {
				const filename = filenames[i]; // was sic "console"
				console.log('sw 0052 filename=' + filename);
				if (! filename) {
					errors += 1;
					continue;
				}
				const file_object = files[filename];
				console.log('sw 0053 file_object=', file_object);				
				const text = await file_object.text();
				console.log('sw 0054 text=' + text);
				// 0-length file is allowed 

				const init_for_cache_copy = {  };
				init_for_cache_copy.status = '200';
				init_for_cache_copy.statusText = 'OK';
				init_for_cache_copy.headers = new Headers({
					'Content-Type': 'text/plain', 
					'Content-Length': text.length
				});

				const url = baseurl + filename;
				console.log('sw 0055 cache with url=', url);				
				const request2cache = new Request(url, {method: 'GET'});
				const response2cache = new Response(text, init_for_cache_copy);				
				caches.open('data-store').then(function(cache) {
					console.log('sw 0056 PUT TO PLAY cache put, request2cache=', request2cache);
					cache.put(request2cache, response2cache).then(function() {
						console.log('sw 0058 cache put successful');
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
			const response2return = new Response('{ }', init);								
			return response2return;					

		} () ); // end e.respondWith(async function() {
	} // end POST
		
} ); // end fetch event listener

/*			
			const temp1 = await formdata.get('uploaded_file');
			console.log('sw 0060 temp1=', temp1);						
			if (! temp1) {
				const response = new Response('FORMDATA_FILE ' + 'err', init);
				console.log('sw 0062 response=', response);				
				return response;			
			}

			const text = await temp1.text();
			console.log('sw 0064 text=' + text);			
			if (! text) {
				const response = new Response('TEXT ' + 'err', init);
				console.log('sw 0066 response=', response);				
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
