# html-form-file-io

https://amp.dev/documentation/guides-and-tutorials/optimize-and-measure/amp_to_pwa/#download-and-run-the-starter-code
https://amp.dev/documentation/guides-and-tutorials/optimize-and-measure/amp-as-pwa/
https://search.google.com/test/amp

 
Note in the following that by PWA specs
different subdomains determine
+ mutually exclusive service worker scope
and
+ different cache ownership and availability

Let's use the PWA service worker (or several complementing each other) as the PWA's internal and primary HTTP server.
We may want only one service worker or several depending on our needs.
Note again that the URL scopes of these will be mutually exclusive.



 could involve
+ multiple service workers (obviously with each servicing different scopes)
or 
+ multiple fetch event listens
or
+ both of these together
or
+ simply one of each
-- these more or less useful, per the use case.



then using multiple subdomains in the URL mix of a PWA implies multiple service workers,
assuming each subdomain requires one.  But multiple service workers could also be configured
 -- by scoping each service worker to a 
different initial subdirectory of the URL path.  (This could involve all PWA URLs being in a single (sub)domain)
or multiple (sub)domains.

and by coding convention, let's 
1. use the initial path subdirectory as a
'fetch' event listener namespace, and 
enforce this so that each 'fetch' event listener
2. quickly ignores any other URL
(more certain of 1 than of 2)




sw scope is the directory holding sw.js
but can be adjusted upwards
but not out of domain

so sw scope cannot span domains, 
not even subdomains of same domain





