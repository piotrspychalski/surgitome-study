// SURGITOME-STUDY — (c) 2026 Piotr Spychalski, MD, PhD, Medical University of Gdańsk · piotr.spychalski@gumed.edu.pl · ORCID 0000-0001-7111-4660 · MIT License
// Wspólne uruchamianie wersji badawczej w jsdom: strona z dodatkowym kodem testowym TEST23 (jego skrót dopisany tylko w teście),
// WebCrypto i TextEncoder z Node, atrapa fetch (nic nie wychodzi do Web3Forms), przechwytywanie błędów i console.error.
const {JSDOM}=require('jsdom'); const fs=require('fs'), path=require('path'), crypto=require('crypto'), util=require('util');
const TEST_CODE='TEST23';
function studyHtml(){
  let html=fs.readFileSync(path.join(__dirname,'../dist/surgitome.html'),'utf8').replace(/<script src[^>]*><\/script>/g,'');
  const m=html.match(/var STUDY_CODES = (\{.*?\});/); const cfg=JSON.parse(m[1]);
  const h=crypto.pbkdf2Sync(TEST_CODE,cfg.salt,cfg.iter,32,'sha256').toString('hex');
  return html.replace('"hashes": [','"hashes": ["'+h+'", ');
}
const HTML=studyHtml();
const T=Object.assign({},require('three'));
T.WebGLRenderer=function(){return {clearDepth(){},setPixelRatio(){},setSize(){},capabilities:{getMaxAnisotropy:()=>8},setScissorTest(){},setViewport(){},setClearColor(){},clear(){},render(){},setScissor(){},getPixelRatio:()=>1}};
const orbit=fs.readFileSync(path.join(path.dirname(require.resolve('three')),'../examples/js/controls/OrbitControls.js'),'utf8');
const SC=[...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// o: { fresh: bez znaczników surgitome-intro/-tour (pierwsze wejście na urządzeniu), k: kod w adresie (null = bez ?k), store: {klucz: wartość} localStorage, session: {…} sessionStorage, mobile, langs, fetch: 'ok'|'fail'|'net', noCrypto, url }
function boot(o){
  o=o||{}; const errs=[], fetches=[];
  const url=o.url||('https://x.test/surgitome-study/'+(o.k!=null?'?k='+encodeURIComponent(o.k):''));
  const dom=new JSDOM(HTML,{runScripts:'outside-only',pretendToBeVisual:true,url}); const w=dom.window;
  const langs=o.langs||['pl-PL'];
  Object.defineProperty(w.navigator,'languages',{value:langs}); Object.defineProperty(w.navigator,'language',{value:langs[0]});
  for(const k in (o.store||{})) w.localStorage.setItem(k,o.store[k]);
  for(const k in (o.session||{})) w.sessionStorage.setItem(k,o.session[k]);
  if(!o.fresh&&(!o.store||o.store['surgitome-intro']===undefined)){ w.localStorage.setItem('surgitome-intro','1'); w.localStorage.setItem('surgitome-tour','1'); }
  w.matchMedia=q=>({matches:!!o.mobile&&/max-width/.test(q),addEventListener(){}});
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get(_,k){ if(k==='createImageData') return (a,b)=>({data:new Uint8ClampedArray(a*b*4)}); if(k==='measureText') return ()=>({width:10}); return ()=>null; }, set(){return true}})};
  if(!o.noCrypto) Object.defineProperty(w,'crypto',{value:crypto.webcrypto,configurable:true});
  else Object.defineProperty(w,'crypto',{value:{getRandomValues:crypto.webcrypto.getRandomValues.bind(crypto.webcrypto)},configurable:true});
  w.TextEncoder=util.TextEncoder;
  w.fetch=(u,opt)=>{ fetches.push({url:u,opt,body:JSON.parse(opt.body)});
    if(o.fetch==='net') return Promise.reject(new Error('Failed to fetch'));
    if(o.fetch==='fail') return Promise.resolve({ok:false,json:()=>Promise.resolve({success:false,message:'Limit exceeded'})});
    return Promise.resolve({ok:true,json:()=>Promise.resolve({success:true})}); };
  w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{};
  w.THREE=T; w.eval(orbit);
  w.addEventListener('error',e=>errs.push(e.message||String(e.error)));
  const ce=w.console.error.bind(w.console); w.console.error=(...a)=>{ errs.push('console.error: '+a.join(' ')); };
  if(o.before) o.before(w);
  w.eval(SC[0]); w.eval(SC[1]);
  return {w,D:w.document,$:id=>w.document.getElementById(id),errs,fetches};
}
// zapisany stan sesji (localStorage) — do testów wznowienia
function stored(w){ return JSON.parse(w.localStorage.getItem('surgitome-study:'+TEST_CODE)); }
// przejście przez zgodę, metryczkę, wybór pozycji i instrukcję do atlasu
// demo: { country: 'PL' | ISO | 'auto' (podpowiedź z przeglądarki), role, field, fieldOther, year, years, res, spec, specOther, studyYear, prof, profOther, used, sel: [id…] (domyślnie wszystkie) }
async function toAtlas(b,demo){
  const {$}=b, ph=()=>b.w.__sgStudy.state()&&b.w.__sgStudy.state().phase; await sleep(400);
  const d=Object.assign({country:'PL',role:'surgeon',field:'colorectal',years:'10-19',res:'50-99',used:'no'},demo||{});
  const sel=(id,v)=>{ const s=$(id); s.value=v; s.dispatchEvent(new b.w.Event('change',{bubbles:true})); };
  const txt=(id,v)=>{ const t=$(id); t.value=v; t.dispatchEvent(new b.w.Event('input')); };
  const radio=(name,v)=>b.D.querySelector('input[name='+name+'][value="'+v+'"]').click();
  if(ph()==='info'){ if(!$('stConsent').checked) $('stConsent').click(); $('stStart').click(); await sleep(50); }
  if(ph()==='demo'){
    if(d.country==='PL') radio('stCountryChoice','PL'); else { radio('stCountryChoice','other'); if(d.country!=='auto') sel('stCountry',d.country); }
    radio('stRole',d.role);
    if(d.role==='surgeon'||d.role==='resident'){
      radio('stField',d.field); if(d.field==='other'&&d.fieldOther) txt('stFieldOther',d.fieldOther);
      if(d.role==='resident') sel('stResYear',d.year||'3'); else sel('stYears',d.years);
      sel('stRes',d.res);
    }
    if(d.role==='physician'){ sel('stSpec',d.spec||'gastro'); if(d.specOther) txt('stSpecOther',d.specOther); }
    if(d.role==='student') sel('stStudyYear',d.studyYear||'4');
    if(d.role==='professional'){ sel('stProf',d.prof||'nurse'); if(d.profOther) txt('stProfOther',d.profOther); }
    radio('stUsed',d.used);
    $('stDemoNext').click(); await sleep(50);
  }
  if(ph()==='select'){
    if(d.sel){ $('stSelNone').click(); d.sel.forEach(id=>b.D.querySelector('input[name=stSel][value="'+id+'"]').click()); }
    else $('stSelAll').click();
    $('stSelNext').click(); await sleep(50);
  }
  if(ph()==='howto'){ $('stHowGo').click(); await sleep(50); }
}
module.exports={boot,sleep,stored,toAtlas,TEST_CODE,HTML};
