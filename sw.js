// ГЕО — офлайн-кэш страницы. Запросы к серверам (script.google.com) мимо кэша, как и раньше.
var CACHE='geo-shell-v1';
var SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-512-maskable.png'];
self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL).catch(function(){}); }));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
function isShell(url){ var p=url.pathname; return /\/$/.test(p) || /index\.html$|manifest\.webmanifest$|\.png$/.test(p); }
function notify(){ self.clients.matchAll({type:'window'}).then(function(cs){ cs.forEach(function(c){ c.postMessage({type:'shell-updated'}); }); }); }
self.addEventListener('fetch',function(e){
  var url; try{ url=new URL(e.request.url); }catch(err){ return; }
  if(url.origin!==self.location.origin) return;           // Apps Script, картинки с Диска и т.п. — напрямую
  if(e.request.method!=='GET') return;
  if(!isShell(url)) return;
  e.respondWith(caches.open(CACHE).then(function(c){
    return c.match(e.request,{ignoreSearch:true}).then(function(cached){
      var cachedCopy=cached?cached.clone():null;
      var net=fetch(e.request).then(function(res){
        if(!res||!res.ok) return res;
        var forCache=res.clone(), forText=res.clone();
        return c.put(e.request,forCache).then(function(){
          if(cachedCopy && /\/$|index\.html$/.test(url.pathname)){
            return Promise.all([cachedCopy.text(),forText.text()]).then(function(t){ if(t[0]!==t[1]) notify(); return res; });
          }
          return res;
        });
      }).catch(function(){ return null; });
      if(cached){ e.waitUntil(net); return cached; }               // мгновенно из кэша, свежую версию тянем в фоне
      return net.then(function(res){ return res || new Response('Нет связи, а страница ещё не сохранена на телефоне. Откройте при интернете один раз.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}); });
    });
  }));
});
