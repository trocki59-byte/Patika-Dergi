function setupMenu(){const button=document.querySelector('.nav-toggle');const nav=document.querySelector('.site-nav');if(!button||!nav)return;button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!open));nav.dataset.open=String(!open)})}
function setupReveal(){const items=document.querySelectorAll('[data-reveal]');if(!('IntersectionObserver'in window)||matchMedia('(prefers-reduced-motion: reduce)').matches){items.forEach(item=>item.classList.add('is-visible'));return}const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.12});items.forEach(item=>observer.observe(item))}
function setupImageLightbox(){const lightbox=document.querySelector('[data-lightbox]');const preview=lightbox?.querySelector('[data-lightbox-preview]');const closeButton=lightbox?.querySelector('[data-lightbox-close]');const triggers=[...document.querySelectorAll('[data-lightbox-image]')];if(!lightbox||!preview||!closeButton||!triggers.length)return;let previousFocus=null;const close=()=>{lightbox.hidden=true;document.body.classList.remove('lightbox-open');preview.src='';previousFocus?.focus()};const open=trigger=>{previousFocus=trigger;preview.src=trigger.dataset.fullSrc||trigger.querySelector('img')?.src||'';preview.alt=trigger.dataset.fullAlt||trigger.querySelector('img')?.alt||'';lightbox.hidden=false;document.body.classList.add('lightbox-open');closeButton.focus()};triggers.forEach(trigger=>trigger.addEventListener('click',()=>open(trigger)));closeButton.addEventListener('click',close);lightbox.addEventListener('click',event=>{if(event.target===lightbox)close()});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!lightbox.hidden)close()})}
async function setupVisitorCounters(locale=document.documentElement.lang||'tr'){
 const total=[...document.querySelectorAll('[data-visitor-count]')], daily=[...document.querySelectorAll('[data-daily-count]')];
 if(!total.length&&!daily.length)return;
 const show=(nodes,value)=>nodes.forEach(el=>el.textContent=value);
 const format=n=>new Intl.NumberFormat(locale).format(n);
 const status=document.querySelector('[data-counter-status]');
 try{
  // First-party endpoint: Cloudflare Pages Function + D1. Count once per browser session.
  const key='patika-visit-session-v2';let token;
  try{token=sessionStorage.getItem(key);if(!token){token=crypto.randomUUID();sessionStorage.setItem(key,token)}}catch{token=crypto.randomUUID()}
  const response=await fetch('/api/visits',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({session:token}),cache:'no-store'});
  if(!response.ok)throw Error('counter unavailable');const data=await response.json();
  if(!Number.isFinite(data.total)||!Number.isFinite(data.today))throw Error('invalid counter');
  show(total,format(data.total));show(daily,format(data.today));if(status)status.textContent=locale.startsWith('en')?'Daily counts follow Türkiye time.':'Günlük sayım Türkiye saatine göredir.';
 }catch(error){show(total,'—');show(daily,'—');if(status)status.textContent=locale.startsWith('en')?'Visitor counter unavailable; Cloudflare D1 setup is required.':'Sayaç bağlantısı kurulamadı. Cloudflare D1 kurulumu gerekiyor.';console.warn('Patika ziyaret sayacı:',error)}
}
function setupNewsletterForms(){const messages={tr:{sending:'Gönderiliyor…',success:'Doğrulama bağlantısı e-posta adresine gönderildi.',error:'Abonelik başlatılamadı. Bilgileri kontrol edip yeniden dene.',network:'Bağlantı kurulamadı. Lütfen yeniden dene.'},en:{sending:'Sending…',success:'A confirmation link was sent to your email.',error:'The subscription could not be started. Check your details and try again.',network:'Could not connect. Please try again.'},fr:{sending:'Envoi…',success:'Un lien de confirmation a été envoyé par e-mail.',error:'L’inscription n’a pas pu commencer. Vérifiez vos informations.',network:'Connexion impossible. Veuillez réessayer.'},de:{sending:'Wird gesendet…',success:'Ein Bestätigungslink wurde per E-Mail gesendet.',error:'Die Anmeldung konnte nicht gestartet werden. Bitte Angaben prüfen.',network:'Verbindung fehlgeschlagen. Bitte erneut versuchen.'},it:{sending:'Invio…',success:'Un link di conferma è stato inviato via e-mail.',error:'Impossibile avviare l’iscrizione. Controlla i dati e riprova.',network:'Connessione non riuscita. Riprova.'}};document.querySelectorAll('[data-newsletter-form]').forEach(form=>form.addEventListener('submit',async event=>{event.preventDefault();const locale=form.elements.locale.value;const copy=messages[locale]||messages.tr;const button=form.querySelector('[data-newsletter-submit]');const status=form.querySelector('[data-newsletter-status]');button.disabled=true;status.dataset.state='';status.textContent=copy.sending;try{const response=await fetch('https://bulten.patikadergi.org/v1/subscribe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:form.elements.email.value,locale,consent:form.elements.consent.checked,website:form.elements.website.value})});const payload=await response.json().catch(()=>({}));if(!response.ok||!payload.ok)throw new Error('request');form.elements.email.value='';form.elements.consent.checked=false;status.dataset.state='success';status.textContent=copy.success}catch(error){status.dataset.state='error';status.textContent=error instanceof TypeError?copy.network:copy.error}finally{button.disabled=false}}))}
function setupMimariLinks(){document.querySelectorAll('.site-nav,.footer-links').forEach(container=>{const links=Array.from(container.querySelectorAll('a'));if(links.some(a=>(a.getAttribute('href')||'').endsWith('mimari.html')))return;const reference=links.find(a=>(a.getAttribute('href')||'').endsWith('felsefe.html'));if(!reference)return;const link=document.createElement('a');link.href=reference.getAttribute('href').replace('felsefe.html','mimari.html');link.textContent=document.documentElement.lang.startsWith('en')?'Architecture':'Mimari';reference.insertAdjacentElement('afterend',link)})}

function setupLanguageSwitcher(){
 const header=document.querySelector('.header-inner');if(!header||header.querySelector('.language-switcher'))return;
 const script=[...document.scripts].find(s=>/\/assets\/js\/main\.js(?:\?|$)/.test(s.src));
 const root=script?new URL('../../',script.src):new URL('/',location.href);
 let current=decodeURIComponent(location.pathname); const rootPath=root.pathname;
 current=current.startsWith(rootPath)?current.slice(rootPath.length):'index.html';
 current=current.replace(/^\/+/, '')||'index.html';
 const english=current.startsWith('en/'), plain=english?current.slice(3):current;
 const translated=new Set(['index.html','doga.html','gezi.html','sanat.html','felsefe.html','mimari.html','edebiyat.html','hakkimizda.html','iletisim.html','gizlilik.html','yazilar/ormanin-hafizasi.html']);
 let target=translated.has(plain)?plain:'index.html';
 if(!translated.has(plain)){
  if(plain.startsWith('mimari/'))target='mimari.html';
  else if(plain.startsWith('edebiyat-')||/\/(anna-karenina|fareler-ve-insanlar|gazap-uzumleri|john-steinbeck|suc-ve-ceza|fyodor-dostoyevski|lev-tolstoy)\.html$/.test(plain))target='edebiyat.html';
  else if(/\/(istrancalarda|gala-golu|ormanin)/.test(plain))target='doga.html';
  else if(/\/(saray-laladere|geliboluda|kiyikoy)/.test(plain))target='gezi.html';
  else if(/\/(rembrandt|bir-resme|muzigin)/.test(plain))target='sanat.html';
  else if(plain.startsWith('yazilar/'))target='felsefe.html';
 }
 const tr=english?root.href+plain:location.href.split('#')[0];
 const en=english?location.href.split('#')[0]:root.href+'en/'+target;
 const nav=document.createElement('nav');nav.className='language-switcher';nav.setAttribute('aria-label','Language / Dil');
 const links=[['TR','tr',tr],['EN','en',en]];
 links.forEach(([label,lang,href])=>{const a=document.createElement('a');a.textContent=label;a.href=href;a.lang=lang;a.hreflang=lang;a.title=lang==='tr'?'Türkçe':'English';if((lang==='en')===english)a.setAttribute('aria-current','page');nav.appendChild(a)});
 const toggle=header.querySelector('.nav-toggle');header.insertBefore(nav,toggle||null);
}

document.addEventListener('DOMContentLoaded',()=>{setupLanguageSwitcher();setupMimariLinks();setupMenu();setupReveal();setupImageLightbox();setupVisitorCounters();setupNewsletterForms()});
