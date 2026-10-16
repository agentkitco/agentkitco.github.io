/* AgentKit Co: copy buttons + library filter. No tracking, no network calls. */
(function(){
  var live=document.getElementById('live');
  function say(m){if(live){live.textContent='';setTimeout(function(){live.textContent=m},30)}}
  function fallbackCopy(t){var a=document.createElement('textarea');a.value=t;a.setAttribute('readonly','');a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();var ok=false;try{ok=document.execCommand('copy')}catch(e){}document.body.removeChild(a);return ok}
  function copyText(t){
    if(navigator.clipboard&&window.isSecureContext){return navigator.clipboard.writeText(t).then(function(){return true},function(){return fallbackCopy(t)})}
    return Promise.resolve(fallbackCopy(t));
  }
  document.querySelectorAll('button[data-copy]').forEach(function(b){
    b.hidden=false;
    b.addEventListener('click',function(){
      var card=b.closest('.pcard');var pre=card&&card.querySelector('pre');if(!pre)return;
      copyText(pre.innerText.replace(/\u00a0/g,' ').trim()).then(function(ok){
        var old=b.getAttribute('data-label')||b.textContent;b.setAttribute('data-label',old);
        b.textContent=ok?'Copied':'Press Ctrl+C';b.setAttribute('data-state',ok?'done':'fail');
        say(ok?'Prompt copied to clipboard':'Copy failed. Select the text and press Ctrl+C');
        setTimeout(function(){b.textContent=old;b.removeAttribute('data-state')},1800);
      });
    });
  });
  var bar=document.getElementById('toolbar');
  if(bar){
    bar.hidden=false;
    var q=document.getElementById('q'),cards=[].slice.call(document.querySelectorAll('.pcard[data-text]')),
        groups=[].slice.call(document.querySelectorAll('.group')),chips=[].slice.call(document.querySelectorAll('.chip')),
        count=document.getElementById('count'),empty=document.getElementById('empty'),pack='all';
    function run(){
      var term=(q.value||'').toLowerCase().trim().split(/\s+/).filter(Boolean),n=0;
      cards.forEach(function(c){
        var okPack=pack==='all'||c.getAttribute('data-pack')===pack,t=c.getAttribute('data-text'),okTerm=term.every(function(w){return t.indexOf(w)>-1});
        var show=okPack&&okTerm;c.hidden=!show;if(show)n++;
      });
      groups.forEach(function(g){g.hidden=!g.querySelector('.pcard:not([hidden])')});
      count.textContent=n+(n===1?' prompt':' prompts');empty.hidden=n!==0;say(n+' prompts shown');
    }
    chips.forEach(function(c){c.addEventListener('click',function(){
      pack=c.getAttribute('data-pack');chips.forEach(function(x){x.setAttribute('aria-pressed',x===c?'true':'false')});run();
    })});
    q.addEventListener('input',run);run();
    var h=location.hash.match(/^#pack-(coding|game|kit)$/);
    if(h){chips.forEach(function(c){if(c.getAttribute('data-pack')===h[1])c.click()})}
  }
})();
