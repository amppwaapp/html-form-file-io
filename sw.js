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

self.addEventListener('fetch', function(e) {
	console.log('sw e=', e);
	console.log('sw e.request=', e.request);	
	console.log('sw e.request.url=', e.request.url);
	if (e.request.method == 'GET') { // HEAD ?  OTHER?
		console.log('sw GET');	
		e.respondWith(
			caches.match(e.request).then(function(response) {
				console.log('sw cache match');					
				return response || fetch(e.request);
			} )
		);
		return; // SOMETHING MORE HERE?
	}
	
	if (e.request.method == 'POST') {
		console.log('sw 20 PUT or POST');	
		const init = {  };
		init.status = '400';
		init.statusText = 'Bad Request';
								
		e.respondWith(async function() {
			console.log('sw 22');			
			const formdata = await e.request.formData();
			console.log('sw 24, formdata=', formdata);
			
			if (! formdata) {
				const response = new Response('FORMDATA ' + 'err', init);
				console.log('sw 26 no formdata, response=', response);
				return response;			
			}

			const hasformmode = await formdata.has('formmode');
			console.log('sw 28 hasformmode=' + hasformmode);			
			if (!hasformmode) {
				console.log('sw 30 has no formmode so POST outside');				
				return fetch(e.request); // NEED TO TEST HERE			
			}
			const formmode = await formdata.get('formmode');
			console.log('sw 32 formmode=' + formmode);			
			if (! formmode || formmode.toLowerCase() !== 'local') {
				console.log('sw 34 unknown formmode=' + formmode);				
				const response = new Response('FORMDATA_FILE ' + 'err', init);
				console.log('sw 35 response=', response);				
				return response;			
			}
			
			const items = await formdata.keys();
			console.log('sw 36 items=', items);
			let item = items.next();
			const files = { };
			while (!item.done) {
				console.log('sw 37 item.value=', item.value);
				if (item.toString() == '[object File]') {
					files[item.name] = item.text();
				}
				item = items.next();				
			}
			const filenames = Object.getOwnPropertyNames(files);
			let successes = 0;
			let errors = 0;
			for (let i = 0; i < filenames.length; i += 1) {
				console filename = filenames[i];
				console.log('sw 40 filename=' + filename);
				if (! file) {
					errors += 1;
					continue;
				}
				const text = await temp1.text();
				console.log('sw in 46 text=' + text);
				// 0-length file is allowed 

				const init_for_cache_copy = {  };
				init_for_cache_copy.status = '200';
				init_for_cache_copy.statusText = 'OK';
				init_for_cache_copy.headers = new Headers({
					'Content-Type': 'text/plain', 
					'Content-Length': text.length
				});

				const request2cache = new Request(e.request.url, {method: 'GET'});
				const response2cache = new Response(text, init_for_cache_copy);				
				caches.open('data-store').then(function(cache) {
					console.log('sw cache put');				
					cache.put(request2cache, response2cache).then(function() {
						console.log('sw cache put successful');
					});
				})				
			
				successes += 1;
			}

			if (successes > 0) {
				init.status = '200';
				init.statusText = 'OK';
			}
			let response2return = new Response(null, init);								
			return response2return;					

		}()); // end e.respondWith(async function() {
	}
		
}); // end fetch event listener

/*			
			const temp1 = await formdata.get('uploaded_file');
			console.log('sw 42 temp1=', temp1);						
			if (! temp1) {
				const response = new Response('FORMDATA_FILE ' + 'err', init);
				console.log('sw 44 response=', response);				
				return response;			
			}

			const text = await temp1.text();
			console.log('sw in 46 text=' + text);			
			if (! text) {
				const response = new Response('TEXT ' + 'err', init);
				console.log('sw 48 response=', response);				
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
