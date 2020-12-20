// https://github.com/janl/mustache.js/
importScripts('/html-form-file-io/external-scripts/mustache.js');

let call_id = 0;

const templates = { };

(function () {
	const date = new Date( Date.now() );
	const timestamp = '' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
	console.log('sw ' + timestamp + ' ' + call_id + ' prefetch mustache templates');	
	fetch('/html-form-file-io/index.mustache')
		.then((response) => response.text())
		.then((template) => {
			console.log('sw ' + timestamp + ' ' + call_id + ' index template=', template);		
			templates['index'] = template; //Mustache.parse(template);
			console.log('sw ' + timestamp + ' ' + call_id + ' templates["index"]=',templates["index"]);
			console.log('sw ' + timestamp + ' ' + call_id + ' templates=',templates);				
	});
	/*
	fetch('/html-form-file-io/download.mustache')
		.then((response) => response.text())
		.then((template) => {
			console.log('sw ' + timestamp + ' ' + call_id + ' download template=', template);		
			templates['download'] = template; //Mustache.parse(template);
			console.log('sw ' + timestamp + ' ' + call_id + ' templates["download"]=',templates["download"]);
			console.log('sw ' + timestamp + ' ' + call_id + ' templates=',templates);		
	});
	*/
} () );

//https://stackoverflow.com/questions/45257602/sharing-fetch-handler-logic-defined-across-multiple-service-workers

self.addEventListener('fetch', function(e) { 
	call_id += 1;
	const date = new Date( Date.now() );
	const timestamp = '' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
	const request = e.request;	
	const url = new URL(request.url); 
	const pathname = url.pathname;	

	const namespace = 'datastore';
	if (pathname.startsWith('/html-form-file-io/' + namespace) ) {
		console.log('sw ' + call_id + ' ' + timestamp + ' pathname=' + pathname);	
	} else {
		console.debug('sw ' + call_id + ' ' + timestamp + ' pathname=' + pathname);		
		console.debug('sw ' + call_id + ' NOT FOR ME');
		return; // so rely on stock fetch event listener -- AMP-SW or Workbox, etc.
	}

	const method = request.method;	
	console.log('sw ' + call_id + ' e=', e);	
	console.log('sw ' + call_id + ' e.request=', request);
	console.log('sw ' + call_id + ' e.request.url=', url);
	console.log('sw ' + call_id + ' e.request.method=' + method);	

	e.respondWith(async function() {
		console.log('sw ' + call_id + ' SW CLAIMING OWNERSHIP');		
		
		const response_init = {  };
			response_init.status = '400';
			response_init.statusText = 'Bad Request';

		const cache = await caches.open(namespace);
		console.log('sw ' + call_id + ' settled cache=', cache);				
		if (!cache) {
			const response = new Response(null, response_init); 
			console.log('sw ' + call_id + ' no cache, response=', response);				
			return response;
		}

		if ( ['HEAD', 'GET'].includes(method) ) {
			const key = (function() {
				const parts = pathname.split('/html-form-file-io/' + namespace + '/');
				if (parts.length === 2) {
					return parts[1];
				} else {
					return '';					
				}
			}());
			console.log('sw ' + call_id + ' key=', key);			
			if (!key) {
				const response = new Response(null, response_init); 
				console.log('sw ' + call_id + ' response=', response);				
				return response;
			}
			
			const [base, extension] = (function(key) {
				let base = key;
				let extension = '';
				const parts = key.split('.');
				if (parts.length > 1) {
					extension = parts.pop();
					base = parts.join('.');
				}
				return [base, extension];
			}(key));
			console.log('sw ' + call_id + ' base=' + base);			
			console.log('sw ' + call_id + ' extension=' + extension);			

			if ( 'index' === base  && ['json','html'].includes(extension) ) {			   
				response_init.status = '200';
				response_init.statusText = 'OK';
				let body = null;					
				if ('HEAD' === method) {
					console.log('sw ' + call_id + ' HEAD');							
					const response = new Response(null, response_init);				
					console.log('sw ' + call_id + ' response=', response);
					return response;
				}
				console.log('sw ' + call_id + ' GET');
				const keys = await cache.keys();
				console.log('sw ' + call_id + ' settled keys=', keys);
				console.log('sw ' + call_id + ' keys.length=', keys.length);	
				const items = [ ];
				for (let i = 0; i < keys.length; i += 1) {
					const request = keys[i];
					console.log('sw ' + call_id + ' as key request=', request);
					const item = { };
					let request_url = request.url;
					console.log('sw ' + call_id + ' request_url=', request_url);							
					const parts = request_url.split('/');
					item.title = parts.pop(); // use filename from upload as title
					parts.push(namespace); // insert into url
					parts.push(item.title); // put back
					item.url = parts.join('/');
					console.log('sw ' + call_id + ' completed item=', item);							
					items.push(item);
				}
				console.log('sw ' + call_id + ' completed items=', items);												
				const container = { };
				container.items = items;
				console.log('sw ' + call_id + ' completed container=', container);
				response_init.headers = new Headers( ); // { }							
				if ('json' == extension) {
					console.log('sw ' + call_id + ' .json');
					response_init.headers.set('Content-Type','application/json');
					body = JSON.stringify(container);
					console.log('sw ' + call_id + ' body=JSON.stringify(container)=' + body);						
				} else if ('html' == extension) {
					console.log('sw ' + call_id + ' .html');			
					response_init.headers.set('Content-Type','text/html');
					const template = templates[base];
					console.log('sw ' + call_id + ' for Mustache.render template=', template);						
					body = Mustache.render(template, container);
				}
				response_init.headers.set('Cache-Control', 'max-age=0'); // 31536000 XXXXXXXXX
				response_init.headers.set('Content-Length', body.length);
				const response = new Response(body, response_init);				
				console.log('sw ' + call_id + ' response=', response);
				console.log('sw ' + call_id + ' response_init.headers[Content-Type]=', response_init.headers['Content-Type']);				
				return response;							
			} // end special case index.*

			const response = await cache.match(key);
			if (response) {
				console.log('sw ' + call_id + ' cache match found, response=', response);						
				if ('HEAD' == method) {
					response_init.status = '200';
					response_init.statusText = 'OK';
					response = new Response(null, response_init);	
					console.log('sw ' + call_id + ' HEAD response=', response);						
				} else if ('GET' == method) {
					console.log('sw ' + call_id + ' GET');	
					let disposition = 'inline';
					let filename; 
					if ( url.searchParams.has('disposition') ) {
						disposition = url.searchParams.get('disposition');
						if ( url.searchParams.has('filename') ) {							
							filename = url.searchParams.get('filename');
						}
					}				
					if (disposition) {
						let value = disposition;
						if (filename) {
							value += '; filename=' + filename;
						}
						response.headers.set('Content-Disposition', value);
					}
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
		} // ^ HEAD or GET
	
		if ('POST' == method) {
			console.log('sw ' + call_id + ' post');
			
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

//caches.open(namespace).then(function(cache) {
				const cached_response_init = {  };
					cached_response_init.status = '200';
					cached_response_init.statusText = 'OK';
					cached_response_init.headers = new Headers({
						'Cache-Control': 'max-age=0', // 31536000 
						'Content-Disposition': 'attachment; filename="' + filename + '"', // unfortunately, user won't be able to override this filename							
						'Content-Length': text.length,
						'Content-Type': 'text/plain'							
					});					
				const response = new Response(text, cached_response_init);
				cache.put(filename, response).then(function() {
					console.log('sw ' + call_id + ' cache put successful, under key=' + filename);
				});
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
		} // ^ post
		
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
	const date = new Date( Date.now() );
	const timestamp = '' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
	console.log('sw ' + timestamp + ' ' + call_id + ' e=', e);
	
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
