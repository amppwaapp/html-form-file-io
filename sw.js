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
	if (e.request.method == 'GET') { // HEAD ?  OTHER?
console.log('sw GET');	
		e.respondWith(
			caches.match(e.request).then(function(response) {
console.log('sw cache match');					
				return response || fetch(e.request); // FAILURE HERE CAN HAPPEN.
			} )
		);
		return;
	}
	
	if (e.request.method == 'PUT' || e.request.method == 'POST') {
console.log('sw 20 PUT or POST');	
    		const init = {  };
			init.status = '400';
			init.statusText = 'Bad Request';
			/* 
			init.headers = new Headers({
			  'Content-Type': 'text/plain'
			});
			*/	
								
		e.respondWith(async function() {
console.log('sw 22');			
			const formdata = await e.request.formData();
console.log('sw 24, formdata=', formdata);
			
			if (! formdata) {
				const response = new Response('FORMDATA ' + 'err', init);
				console.log('sw 26 no formdata, response=', response);
				return response;			
			} 
			/*
			const formdata_keys = await formdata.keys();
console.log('sw in 36, formdata_keys=', formdata_keys);			
			if (! formdata_keys) {
				const response = new Response('FORMDATA_KEYS ' + 'err', init);
				console.log('sw in 38 response=', response);				
				return response;			
			}
			for (var formdata_key of formdata_keys) {
   				console.log('sw in 39 formdata_key=', formdata_key); 
			}
						
			const formdata_values = await formdata.values();
console.log('sw in 46, formdata_values=', formdata_values);			
			if (! formdata_values) {
				const response = new Response('FORMDATA_VALUES ' + 'err', init);
				console.log('sw in 48 response=', response);				
				return response;			
			} 
			
			//(async function( ) {
console.log('sw formdata_values.length=', formdata_values.length);						
				if (formdata_values.length != 1) {
					const response = new Response('MORE INPUT THAN EXPECTED ', init);
					console.log('sw in 50 response=', response);
					return response;				
				}
				console.log('sw in 52');				
				const temp1 = formdata_values[0];
console.log('sw temp1=', temp1);
*/

			const hasformmode = await formdata.has('formmode');
			console.log('sw 28 hasformmode=' + hasformmode);			
			if (!hasformmode) {
				console.log('sw 30 has no formmode so POST outside');				
				return fetch(e.request); // DID GETTING FORMDATA RUIN REQUEST FOR THIS USE?  SHOULD I CLONE IT?			
			}
			const formmode = await formdata.get('formmode');
			console.log('sw 32 formmode=' + formmode);			
			if (! formmode || formmode.toLowerCase() !== 'local') {
				console.log('sw 34 unknown formmode=' + formmode);				
				const response = new Response('FORMDATA_FILE ' + 'err', init);
				console.log('sw in 36 response=', response);				
				return response;			
			}
			
			const keys = await formdata.keys();
			console.log('sw in 38 keys=', keys);			
			for (let i = 0; i < keys.length; i += 1) {
				console.log('sw 40 key[' + i + ']=' + keys[i]);								
			}
			
			const temp1 = await formdata.get('uploaded_file');
			console.log('sw in 42 temp1=', temp1);						
			if (! temp1) {
				const response = new Response('FORMDATA_FILE ' + 'err', init);
				console.log('sw in 44 response=', response);				
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

				const init_for_payload = {  };
				init_for_payload.status = '200';
				init_for_payload.statusText = 'OK';
				init_for_payload.headers = new Headers({
					'Content-Type': 'text/plain', 
					'Content-Length': text.length
				});
				
				let response2return;				
				if (e.request.method == 'POST') {
					response2return = new Response(text, init_for_payload);					
				} else if (e.request.method == 'PUT') {
					const init_for_no_payload = {  };
					init_for_no_payload.status = '200';
					init_for_no_payload.statusText = 'OK';
					response2return = new Response(null, init_for_no_payload);					
				}				
//console.log('sw in 6a response=', response);

				const request2cache = new Request(e.request.url, {method: 'GET'});
				const response2cache = new Response(text, init_for_payload);				
				caches.open('data-store').then(function(cache) {
console.log('sw cache put');				
					cache.put(request2cache, response2cache).then(function() {
						console.log('sw cache put successful');
					});
				})				
				
				return response2return;					
		}()); // closes e.respondWith(async function() {
	}
		
	// } // SPECIAL PROCESSING else
}); // fetch event listener
