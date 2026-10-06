// SURGITOME-STUDY — (c) 2026 Piotr Spychalski, MD, PhD, Medical University of Gdańsk · piotr.spychalski@gumed.edu.pl · ORCID 0000-0001-7111-4660 · MIT License
// Wybór pozycji i role uczestników: kraj (Polska / inny z podpowiedzią z przeglądarki), role i pytania zależne od roli, wybór pozycji (całe kategorie,
// walidacja), w atlasie tylko wybrane (kategorie, zakładki, wyszukiwarka, „Dalej”, następna pozycja, postęp), zmiana wyboru z instrukcji,
// payload (selected), migracja zapisanej sesji z wersji 1 ankiety (bez wyboru pozycji i ról)
const {boot,sleep,toAtlas,TEST_CODE}=require('./badanie_boot.js');
const fails=[], allErrs=[]; function ok(c,m){ if(!c) fails.push(m); }
const h2=b=>{ const e=b.D.querySelector('#stOv h2'); return e&&!b.$('stOv').hidden?e.textContent:''; };
const cur=b=>b.w.ANAT.PROCS[b.w.__sgTest.state().an].id;
const COLON=['zakres','rh','lh','ar','ira','ipaa','hartmann','ileo'];
(async()=>{
  // 1. kraj: „Another country” → lista z podpowiedzią z języka przeglądarki (de-DE → Niemcy), bez IP; lekarz innej specjalności
  let b=boot({k:TEST_CODE,store:{},langs:['de-DE','en']}); let {$,D,w}=b; await sleep(500);
  $('stConsent').click(); $('stStart').click(); await sleep(30);
  ok(w.__sgStudy.guessCountry()==='DE','podpowiedź kraju: '+w.__sgStudy.guessCountry());
  D.querySelector('input[name=stCountryChoice][value=other]').click(); await sleep(10);
  ok(!$('stCountry').closest('.stsub').hidden&&$('stCountry').value==='DE','lista krajów: '+$('stCountry').value);
  D.querySelector('input[name=stRole][value=physician]').click(); await sleep(10);
  const vis=id=>!$(id).closest('.stq').hidden;
  ok(vis('stSpec')&&!vis('stRes')&&!vis('stYears')&&!vis('stResYear')&&!vis('stStudyYear')&&!vis('stProf')&&D.querySelector('input[name=stField]').closest('.stq').hidden,'lekarz: widoczne pola');
  $('stSpec').value='other'; $('stSpec').dispatchEvent(new w.Event('change')); D.querySelector('input[name=stUsed][value=no]').click();
  $('stDemoNext').click(); await sleep(30); ok(w.__sgStudy.state().phase==='demo','„Inna” specjalność bez opisu przepuszcza');
  $('stSpecOther').value='chirurgia dziecięca? nie — urologia'; $('stSpecOther').dispatchEvent(new w.Event('input'));
  $('stDemoNext').click(); await sleep(30);
  ok(w.__sgStudy.state().phase==='select'&&h2(b)==='Which items will you assess?','po metryczce: '+h2(b));
  const Dm=w.__sgStudy.state().demo;
  ok(Dm.role==='physician'&&Dm.specialty==='other'&&/urologia/.test(Dm.specialtyOther)&&Dm.country==='DE'&&Dm.field===null&&Dm.resectionsPerYear===null,'metryczka lekarza: '+JSON.stringify(Dm));
  // 2. wybór pozycji: bez wyboru nie przechodzi; cała kategoria; stan pośredni kategorii
  ok($('stSelCount').textContent==='Selected: 0 / 31','licznik: '+$('stSelCount').textContent);
  $('stSelNext').click(); await sleep(20); ok($('stSelErr').textContent==='Please select at least one item.'&&w.__sgStudy.state().phase==='select','pusty wybór przepuszcza');
  const catBox=c=>D.querySelector('.stcat input[data-cat="'+c+'"]');
  catBox('colon').click(); await sleep(10);
  ok(COLON.every(id=>D.querySelector('input[name=stSel][value="'+id+'"]').checked)&&$('stSelCount').textContent==='Selected: 8 / 31','kategoria „Jelito grube”: '+$('stSelCount').textContent);
  D.querySelector('input[name=stSel][value=esoph]').click(); D.querySelector('input[name=stSel][value=liver]').click(); D.querySelector('input[name=stSel][value=liver]').click();
  D.querySelector('input[name=stSel][value=ipaa]').click(); await sleep(10);
  ok(catBox('colon').indeterminate&&!catBox('colon').checked&&catBox('eso').checked,'stan pośredni kategorii');
  D.querySelector('input[name=stSel][value=ipaa]').click(); await sleep(10);
  $('stSelNext').click(); await sleep(30); ok(h2(b)==='How to rate','po wyborze: '+h2(b));
  $('stHowGo').click(); await sleep(600); $('tourSkip').click(); await sleep(50);
  // 3. atlas: tylko wybrane pozycje
  const S=w.__sgStudy.state(); ok(JSON.stringify(S.sel)===JSON.stringify(['esoph'].concat(COLON)),'wybrane: '+JSON.stringify(S.sel));
  const cats=[...D.querySelectorAll('#cats .cat')].map(c=>c.textContent);
  ok(JSON.stringify(cats)==='["Oesophagus","Large bowel"]','kategorie: '+JSON.stringify(cats));
  ok(cur(b)==='esoph'&&$('stRNum').textContent==='Item 1 of 9'&&$('stProgTxt').textContent==='Rated: 0 / 9','start: '+cur(b)+' | '+$('stRNum').textContent+' | '+$('stProgTxt').textContent);
  [...D.querySelectorAll('#cats .cat')].find(c=>c.textContent==='Large bowel').click(); await sleep(300);
  ok([...D.querySelectorAll('#tabs .tab')].length===8,'zakładki jelita grubego: '+D.querySelectorAll('#tabs .tab').length);
  ok(w.getComputedStyle(D.querySelector('#tabs .tab .star')).display==='none','gwiazdki „Ulubione” widoczne w ankiecie');
  for(const [q,want] of [['Whipple',0],['hemikolektomia',2],['sleeve',0]]){ $('q').value=q; $('q').dispatchEvent(new w.Event('input')); await sleep(30);
    const n=D.querySelectorAll('#qres [role=option], #qres .qitem').length; ok(want?n>=1&&![...D.querySelectorAll('#qres .qitem')].some(x=>/Whipple|sleeve|RYGB/i.test(x.textContent)):n===0,'wyszukiwarka „'+q+'”: wyników '+n); }
  $('q').value=''; $('q').dispatchEvent(new w.Event('input'));
  // następna pozycja z panelu idzie po wybranych; ostatnia → „Finish survey”
  [...D.querySelectorAll('#cats .cat')].find(c=>c.textContent==='Oesophagus').click(); await sleep(300);
  $('stR4').click(); $('stRNext').click(); await sleep(500);
  ok(cur(b)==='zakres'&&$('stRNum').textContent==='Item 2 of 9 · teaching module'&&$('stProgTxt').textContent==='Rated: 1 / 9','następna wybrana: '+cur(b)+' | '+$('stRNum').textContent);
  const tabs=()=>[...D.querySelectorAll('#tabs .tab')]; tabs()[tabs().length-1].click(); await sleep(500);
  ok(cur(b)==='ileo'&&$('stRNext').textContent==='Finish survey','ostatnia wybrana: '+cur(b));
  // „Dalej” po ostatnim kadrze ostatniego wariantu ostatniej pozycji nie prowadzi poza wybrane
  const vb=D.querySelectorAll('#variants .vbtn'); vb[vb.length-1].click(); await sleep(400);
  for(let i=0;i<15;i++){ $('btnNext').click(); await sleep(60); } await sleep(400);
  ok(cur(b)==='ileo','„Dalej” wyszedł poza wybrane: '+cur(b));
  // 4. zmiana wyboru z instrukcji: bez Oesophagectomy → zostaje w atlasie, ocena esoph poza payloadem
  $('stHelpBtn').click(); await sleep(30); ok($('stSelChange'),'brak „Change selection” w instrukcji');
  $('stSelChange').click(); await sleep(30); ok(h2(b)==='Which items will you assess?'&&D.querySelector('input[name=stSel][value=esoph]').checked,'zmiana wyboru: ekran / zaznaczenia');
  D.querySelector('input[name=stSel][value=esoph]').click(); $('stSelNext').click(); await sleep(400);
  ok(w.__sgStudy.state().phase==='atlas'&&$('stOv').hidden&&$('stProgTxt').textContent==='Rated: 0 / 8','po zmianie wyboru: '+w.__sgStudy.state().phase+' | '+$('stProgTxt').textContent);
  ok(![...D.querySelectorAll('#cats .cat')].some(c=>c.textContent==='Oesophagus'),'kategoria bez wybranych pozycji widoczna');
  const p=w.__sgStudy.payload(), pe=p.items.find(x=>x.id==='esoph'), pz=p.items.find(x=>x.id==='zakres');
  ok(p.schema===2&&p.total===8&&p.selected.length===8&&pe.selected===false&&pe.rating===null&&pz.selected===true&&p.items.length===31,'payload: '+JSON.stringify({t:p.total,pe,pz:pz.selected}));
  ok(w.__sgStudy.state().items.esoph.r===4,'ocena odznaczonej pozycji usunięta ze stanu (powinna zostać na wypadek ponownego wyboru)');
  allErrs.push(...b.errs);
  // 5. role: student (rok studiów), pacjent (bez dodatkowych pytań), inny profesjonalista („Inny” + opis), chirurg (pola chirurgiczne)
  for(const [role,extra,check] of [
    ['student',{studyYear:'5'},d=>d.studyYear==='5'&&d.field===null],
    ['patient',{},d=>d.field===null&&d.specialty===null&&d.studyYear===null&&d.profession===null],
    ['professional',{prof:'other',profOther:'technik elektroradiologii'},d=>d.profession==='other'&&d.professionOther==='technik elektroradiologii'],
    ['surgeon',{field:'upper',years:'5-9',res:'25-49'},d=>d.field==='upper'&&d.yearsSinceSpec==='5-9'&&d.resectionsPerYear==='25-49'&&d.residentYear===null]]){
    const r=boot({k:TEST_CODE,store:{}}); await toAtlas(r,Object.assign({role,sel:['rh']},extra)); await sleep(300);
    const st=r.w.__sgStudy.state();
    ok(st.phase==='atlas'&&st.demo.role===role&&check(st.demo)&&st.sel.length===1,'rola '+role+': '+st.phase+' '+JSON.stringify(st.demo));
    allErrs.push(...r.errs);
  }
  // 6. migracja sesji z wersji 1 (zapisana przed zmianą ankiety): rola ze statusu, powrót do wyboru pozycji z zaznaczonymi ocenionymi
  const v1={v:1,code:TEST_CODE,lang:'en',phase:'atlas',consent:{at:'2026-10-06T20:00:00Z',info:'2026-10-06'},started:'2026-10-06T20:00:00Z',
    demo:{country:'PL',field:'colorectal',status:'specialist',yearsSinceSpec:'10-19',residentYear:null,resectionsPerYear:'50-99',usedBefore:false,fieldOther:''},
    items:{esoph:{r:3,na:false,c:'x',ms:5000,seen:[0],at:'2026-10-06T20:05:00Z'},rh:{r:null,na:true,c:'',ms:1000,seen:[0],at:'2026-10-06T20:06:00Z'}},cur:'rh',activeMs:6000,
    sus:[null,null,null,null,null,null,null,null,null,null],use:{},open:{missing:'',incorrect:''},finishedEarly:false,tourDone:true,submissions:[]};
  const m=boot({store:{['surgitome-study:'+TEST_CODE]:JSON.stringify(v1),'surgitome-study-last':TEST_CODE}}); await sleep(700);
  const ms=m.w.__sgStudy.state();
  ok(ms.v===2&&ms.phase==='select'&&ms.demo.role==='surgeon'&&ms.demo.countryChoice==='PL'&&h2(m)==='Which items will you assess?','migracja: '+ms.v+' '+ms.phase+' '+ms.demo.role);
  const pre=[...m.D.querySelectorAll('input[name=stSel]')].filter(x=>x.checked).map(x=>x.value);
  ok(JSON.stringify(pre)==='["esoph","rh"]','migracja: zaznaczone oceniane: '+JSON.stringify(pre));
  m.$('stSelNext').click(); await sleep(400);
  ok(m.w.__sgStudy.state().phase==='atlas'&&m.$('stProgTxt').textContent==='Rated: 2 / 2','migracja: powrót do atlasu (samouczek już był): '+m.w.__sgStudy.state().phase+' | '+m.$('stProgTxt').textContent);
  allErrs.push(...m.errs);
  console.log('kraj, role, wybór pozycji, filtr atlasu, zmiana wyboru, migracja: sprawdzone');
  console.log('errors',JSON.stringify(allErrs.concat(fails))); process.exit(0);
})();
