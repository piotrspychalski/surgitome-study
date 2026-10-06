  /* ---------- SURGITOME-STUDY: ankieta ekspercka wbudowana w atlas ----------
     Wejście tylko z ?k=KOD (6 znaków, bez 0/O/1/I); w stronie są wyłącznie skróty kodów (12-badanie-kody.js, PBKDF2-HMAC-SHA-256).
     Kod jest od razu usuwany z paska adresu (GoatCounter i nagłówek Referer nie widzą go), a pamiętany w sessionStorage/localStorage.
     Przebieg: informacja + zgoda → metryczka → instrukcja → atlas z panelem oceny (31 pozycji, skala 1–4 lub „poza moją dziedziną”,
     komentarz, czas na pozycji, obejrzane warianty) → SUS, przydatność, pytania otwarte → wysłanie JSON przez Web3Forms (pole data).
     Stan zapisywany na bieżąco w localStorage pod kluczem zależnym od kodu; ponowne wysłanie dozwolone (w analizie liczy się ostatnie).
     Zaczepienia w kodzie atlasu: studyTab (zakładki, menu telefonu), studyLang (setLang), studyKeys (klawisze), studyStart (13-start). */
  var STUDY_SHA = '__STUDY_SHA__', STUDY_BASE = 'v1.1.0', STUDY_INFO_VER = '2026-10-07';
  var ST_URL = 'https://api.web3forms.com/submit', ST_KEY = 'fe2f2a94-ba69-47b4-8c24-65c63ec31d85', ST_MAIL = 'piotr.spychalski@gumed.edu.pl';
  var ST_ALPHA = /^[A-HJ-NP-Z2-9]{6}$/, ST_IDLE = 180000;
  // pozycje do oceny (B4): 29 zabiegów + 2 moduły treści; kolejność jak w nawigacji (ANAT.PROCS)
  var ST_IDS = ['esoph', 'dg', 'tg', 'gebp', 'sleeve', 'rygb', 'oagb', 'ds', 'bpd', 'whip', 'pppd', 'dp', 'hj', 'cdd', 'drain',
    'liver', 'lv-guz', 'lv-b23', 'lv-rh', 'lv-lh', 'lv-alpps', 'oltx', 'sb', 'zakres', 'rh', 'lh', 'ar', 'ira', 'ipaa', 'hartmann', 'ileo'];
  var ST_MODULES = { liver: 1, zakres: 1 };
  var ITEMS = A.PROCS.map(function (p) { return p.id; }).filter(function (id) { return ST_IDS.indexOf(id) >= 0; });
  function stIdx(id) { for (var i = 0; i < A.PROCS.length; i++) if (A.PROCS[i].id === id) return i; return -1; }
  var ST_COUNTRIES = 'AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'.split(' ');

  // SUS (Brooke 1996) — standardowe brzmienie angielskie. Zwalidowane tłumaczenie polskie: Borkowska A, Jach K. Pre-testing of Polish
  // translation of System Usability Scale (SUS). W: ISAT 2016, Part I. Adv Intell Syst Comput. 2017;521:143–53. doi:10.1007/978-3-319-46583-8_12.
  // Jego brzmienie nie jest tu wpisane (płatny rozdział, prawa autorskie) — po uzyskaniu tekstu i zgody autorek wpisz 10 zdań i 5 kotwic do SUS_PL;
  // do tego czasu w wersji PL ankiety SUS jest pokazywany w oryginale angielskim.
  var SUS_EN = ['I think that I would like to use this system frequently.', 'I found the system unnecessarily complex.', 'I thought the system was easy to use.',
    'I think that I would need the support of a technical person to be able to use this system.', 'I found the various functions in this system were well integrated.',
    'I thought there was too much inconsistency in this system.', 'I would imagine that most people would learn to use this system very quickly.',
    'I found the system very cumbersome to use.', 'I felt very confident using the system.', 'I needed to learn a lot of things before I could get going with this system.'];
  var SUS_EN_ANCHORS = ['Strongly disagree', 'Strongly agree'];
  // wersja PL: pod każdym oryginalnym zdaniem tłumaczenie własne oznaczone * (decyzja autora 2026-10-07; odpowiedź dotyczy oryginału)
  var SUS_PL_OWN = ['Myślę, że chciał(a)bym często korzystać z tego systemu.', 'System wydał mi się niepotrzebnie skomplikowany.', 'Uważam, że system był łatwy w użyciu.',
    'Myślę, że do korzystania z tego systemu potrzebował(a)bym pomocy osoby technicznej.', 'Uważam, że poszczególne funkcje systemu były dobrze ze sobą zintegrowane.',
    'Uważam, że w systemie było zbyt wiele niespójności.', 'Sądzę, że większość osób bardzo szybko nauczyłaby się korzystać z tego systemu.',
    'Korzystanie z systemu było bardzo uciążliwe.', 'Korzystając z systemu, czułem(-am) się bardzo pewnie.', 'Zanim zacząłem(-ęłam) korzystać z systemu, musiałem(-am) się wiele nauczyć.'];
  var SUS_PL_OWN_ANCHORS = ['zdecydowanie się nie zgadzam', 'zdecydowanie się zgadzam'];
  // role uczestników; chirurdzy (specjaliści i rezydenci) to grupa ekspercka dla CVI, pozostali — użyteczność i opinie
  var ST_ROLES = ['surgeon', 'resident', 'physician', 'student', 'professional', 'patient'];
  var ST_SPECS = ['gastro', 'radiology', 'oncology', 'internal', 'anaesthesia', 'emergency', 'family', 'other'];
  var ST_PROFS = ['nurse', 'dietitian', 'physio', 'paramedic', 'other'];
  var ST_USE = ['teaching', 'patients', 'imaging', 'recommend'];

  var ST_TXT = {
    en: {
      brand: 'SURGITOME-STUDY', langBtn: 'Polski', loading: 'Checking your invitation…',
      gateH: 'Invitation required',
      gateP1: 'This page is part of a research study on SURGITOME, a 3D atlas of postoperative gastrointestinal anatomy. It can only be opened with a personal invitation link.',
      gateP2: 'If you have received an invitation, please open the full link from the message (it ends with ?k= followed by a 6-character code) or type your code below.',
      gateLbl: 'Access code', gateBtn: 'Continue', gateBad: 'This code is not valid. Please check it and try again.', gateChecking: 'Checking…',
      gateCrypto: 'This browser cannot verify the code. Please use an up-to-date browser (Chrome, Edge, Firefox or Safari).',
      gatePublic: 'The public version of SURGITOME is freely available at', contact: 'Questions:',
      infoH: 'Participant information', infoLead: 'Expert validation of SURGITOME, a 3D atlas of postoperative gastrointestinal anatomy',
      infoAimH: 'Purpose', infoAim: 'We are asking surgeons to assess whether the schematic 3D models in SURGITOME represent postoperative anatomy accurately, and all participants — surgeons, other physicians, medical students, other healthcare professionals and patients — how usable and useful the application is. The results will be used to correct the atlas and will be published in aggregate form.',
      infoWhatH: 'What you will do', infoWhat: 'After a few questions about you, you will choose which of the 31 items (29 operations and 2 teaching modules) you want to assess — only those will be shown — and rate each of them on a 4-point scale, with an optional comment. At the end there is a short usability questionnaire (System Usability Scale) and a few questions about usefulness. Rating all 31 items takes about 20–25 minutes, fewer items take less. Your answers are saved automatically in this browser, so you can stop and continue later on the same device.',
      infoVolH: 'Voluntary participation', infoVol: 'Participation is voluntary and unpaid. You may skip items outside your expertise and stop at any time without giving a reason; answers you have not submitted are not sent.',
      infoDataH: 'Data protection', infoData: 'We do not ask for your name, e-mail address or any other personal data. Your answers are linked only to the code in your invitation link. They are sent to the investigator’s mailbox via the Web3Forms service, whose notification also shows the sender’s IP address; IP addresses are not entered into the study dataset. Results are reported only in aggregate; free-text comments may be quoted without any identifying information. Please do not write anything about your own health or about identifiable patients in the comments.',
      infoEthH: 'Ethics', infoEth: 'Opinion of the Bioethics Committee: [number and date to be added].',
      infoWhoH: 'Investigator', infoWho: 'Piotr Spychalski, MD, PhD — Department of Oncological, Transplant and General Surgery, Medical University of Gdańsk, Poland.',
      consent: 'I have read the information above and I agree to take part in this study.', start: 'Start',
      demoH: 'About you', choose: 'Choose…', other: 'Other', specify: 'Please specify', yes: 'Yes', no: 'No', back: 'Back', next: 'Continue',
      demoErr: 'Please answer all questions.',
      dCountry: 'Country where you work or study (or live)', cPL: 'Poland', cOther: 'Another country', dCountryList: 'Which country?',
      dRole: 'You are taking part as', dField: 'Main field of surgical practice', dStatus: 'Professional status', dYear: 'Year of training',
      dSpec: 'Specialty', dStudyYear: 'Year of study', dProf: 'Profession',
      role: { surgeon: 'Surgeon (specialist)', resident: 'Surgical resident / trainee', physician: 'Physician, non-surgical specialty', student: 'Medical student',
        professional: 'Other healthcare professional (non-physician)', patient: 'Patient' },
      spec: { gastro: 'Gastroenterology / endoscopy', radiology: 'Radiology', oncology: 'Oncology (clinical or radiation)', internal: 'Internal medicine',
        anaesthesia: 'Anaesthesiology and intensive care', emergency: 'Emergency medicine', family: 'Family medicine', other: 'Other' },
      prof: { nurse: 'Nurse / midwife', dietitian: 'Dietitian', physio: 'Physiotherapist', paramedic: 'Paramedic', other: 'Other' },
      dYears: 'Years since completing specialist training', dRes: 'Gastrointestinal resections you perform per year (as operating surgeon)', dUsed: 'Have you used SURGITOME before?',
      fColorectal: 'Colorectal surgery', fUpper: 'Upper GI and bariatric surgery', fHpb: 'HPB and transplant surgery', fGeneral: 'General surgery',
      sSpecialist: 'Specialist surgeon (completed specialist training)', sResident: 'Surgical resident / trainee',
      selH: 'Which items will you assess?', selP: 'Choose the operations and teaching modules you want to assess — for example those within your experience. Only the selected items will be shown in the atlas. You can change the selection later (Instructions → Change selection).',
      selAll: 'Select all', selNone: 'Clear', selCat: 'all in this category', selCount: function (k, n) { return 'Selected: ' + k + ' / ' + n; }, selErr: 'Please select at least one item.',
      selChange: 'Change selection',
      howH: 'How to rate',
      how1: 'Only the items you selected are shown. Go through them in the order of the navigation at the top (category → procedure). Each item has several frames (bar at the bottom) and some have variants (buttons above the model).',
      how2: 'For each item, rate the statement “The 3D representation of the postoperative anatomy is accurate” (for the two teaching modules: “The content is anatomically and clinically accurate”). The rating applies to the item as a whole; if a problem concerns one variant, please name it in the comment.',
      how3: 'Scale: 1 — not accurate · 2 — somewhat accurate (major revision needed) · 3 — quite accurate (minor revision needed) · 4 — highly accurate. If an item is outside your expertise, choose “Outside my expertise / cannot judge”.',
      how4: 'The models are simplified and schematic: limb lengths and proportions are not to scale. SURGITOME is an educational tool, not a medical device.',
      how5: 'Your answers are saved automatically. The bar at the top shows your progress; “Finish survey” (available at any time) takes you to the final questions.',
      howGo: 'Go to the atlas', howBack: 'Back to the atlas',
      item: 'Item', of: 'of', module: 'teaching module',
      qOp: 'The 3D representation of the postoperative anatomy is accurate', qMod: 'The content is anatomically and clinically accurate',
      r1: 'not accurate', r2: 'somewhat accurate (major revision needed)', r3: 'quite accurate (minor revision needed)', r4: 'highly accurate',
      na: 'Outside my expertise / cannot judge', comment: 'Comment (optional)', commentPh: 'If the problem concerns a specific variant, please name it.',
      varsOne: 'Your rating applies to the item as a whole — please go through all of its frames first.',
      varsMany: function (n) { return 'This item has ' + n + ' variants (buttons above the model). Your rating applies to the item as a whole — please review all variants first.'; },
      viewed: function (k, n) { return 'Variants viewed: ' + k + ' / ' + n; },
      saved: 'Saved ✓', savedMissing: function (k, n) { return 'Saved. You have not viewed ' + k + ' of ' + n + ' variants yet.'; },
      noStore: 'Autosave is not available in this browser — please do not close the page before submitting.',
      prevItem: '‹ Previous item', nextItem: 'Next item ›', finish: 'Finish survey', finishShort: 'Finish', rate: 'Rate', help: 'Instructions', close: 'Close', rated: 'rated',
      progress: function (k, n) { return 'Rated: ' + k + ' / ' + n; },
      finH: 'Finish the survey?', finP: function (k, n) { return 'You have rated ' + k + ' of ' + n + ' items. Items without a rating will be recorded as not rated. You can still return to the atlas from the final questions.'; },
      finStay: 'Continue rating', finGo: 'Go to the final questions',
      finalH: 'Final questions', susH: 'A. System Usability Scale', susP: 'For each statement, choose how much you agree.', susNote: '', susFoot: '',
      useH: 'B. Usefulness', useP: 'How much do you agree with the following statements?',
      use: { teaching: 'SURGITOME would be useful for teaching medical students and surgical residents.', patients: 'SURGITOME would be useful when explaining an operation to patients.',
        imaging: 'SURGITOME would help in interpreting postoperative CT or endoscopy.', recommend: 'I would recommend SURGITOME to colleagues.' },
      lik: ['Strongly disagree', 'Disagree', 'Neither agree nor disagree', 'Agree', 'Strongly agree'],
      openH: 'C. Your comments', openMissing: 'What is missing in SURGITOME (procedures, variants, features)?', openWrong: 'What is incorrect or misleading?',
      toAtlas: 'Back to the atlas', submit: 'Submit responses', sending: 'Sending…',
      finalErr: function (k) { return 'Please answer all statements in sections A and B (' + k + ' missing).'; },
      sendErr: 'Your responses could not be sent.', download: 'Download responses (JSON)', retry: 'Try again',
      sendHelp: function (code) { return 'Please download your responses and send the file by e-mail to ' + ST_MAIL + ' with the subject “SURGITOME-STUDY ' + code + '”. Your answers also remain saved in this browser, so you can try again later.'; },
      thanksH: 'Thank you!', thanksP: function (d) { return 'Your responses were sent on ' + d + '. You can return to the atlas and change your answers; after a new submission only the latest one will be analysed.'; },
      copy: 'Download a copy (JSON)',
      tourT: 'Rating', tourD: 'For each item, rate the accuracy of the postoperative anatomy here (1–4 or “outside my expertise”) and add a comment if needed. Answers are saved automatically; the bar at the top shows your progress, and “Finish survey” leads to the final questions.',
      tourM: 'Tap “Rate” in the bar at the top to rate the current item (1–4 or “outside my expertise”) and add a comment. Answers are saved automatically; “Finish survey” leads to the final questions.'
    },
    pl: {
      brand: 'SURGITOME-STUDY', langBtn: 'English', loading: 'Sprawdzanie zaproszenia…',
      gateH: 'Wymagane zaproszenie',
      gateP1: 'Ta strona jest częścią badania naukowego dotyczącego SURGITOME — atlasu 3D anatomii po operacjach przewodu pokarmowego. Można ją otworzyć wyłącznie z osobistego linku z zaproszenia.',
      gateP2: 'Jeśli otrzymałeś(-aś) zaproszenie, otwórz pełny link z wiadomości (kończy się na ?k= i 6-znakowym kodzie) albo wpisz kod poniżej.',
      gateLbl: 'Kod dostępu', gateBtn: 'Dalej', gateBad: 'Ten kod jest nieprawidłowy. Sprawdź go i spróbuj ponownie.', gateChecking: 'Sprawdzanie…',
      gateCrypto: 'Ta przeglądarka nie może sprawdzić kodu. Użyj aktualnej przeglądarki (Chrome, Edge, Firefox lub Safari).',
      gatePublic: 'Publiczna wersja SURGITOME jest dostępna bezpłatnie pod adresem', contact: 'Pytania:',
      infoH: 'Informacja dla uczestnika', infoLead: 'Ekspercka walidacja SURGITOME — atlasu 3D anatomii po operacjach przewodu pokarmowego',
      infoAimH: 'Cel', infoAim: 'Prosimy chirurgów o ocenę, czy schematyczne modele 3D w SURGITOME trafnie przedstawiają anatomię pooperacyjną, a wszystkich uczestników — chirurgów, lekarzy innych specjalności, studentów medycyny, innych profesjonalistów medycznych i pacjentów — o ocenę użyteczności i przydatności aplikacji. Wyniki posłużą do poprawienia atlasu i zostaną opublikowane w formie zbiorczej.',
      infoWhatH: 'Przebieg', infoWhat: 'Po kilku pytaniach o Ciebie wybierzesz, które z 31 pozycji (29 operacji i 2 moduły dydaktyczne) chcesz ocenić — tylko te zostaną pokazane — i ocenisz każdą w skali 4-stopniowej, z możliwością komentarza. Na końcu jest krótki kwestionariusz użyteczności (System Usability Scale) i kilka pytań o przydatność. Ocena wszystkich 31 pozycji zajmuje ok. 20–25 minut, mniejszej liczby — mniej. Odpowiedzi zapisują się automatycznie w tej przeglądarce, więc możesz przerwać i dokończyć później na tym samym urządzeniu.',
      infoVolH: 'Dobrowolność', infoVol: 'Udział jest dobrowolny i nieodpłatny. Możesz pominąć pozycje spoza swojej dziedziny i przerwać w dowolnym momencie bez podawania przyczyny; niewysłane odpowiedzi nie są przekazywane.',
      infoDataH: 'Ochrona danych', infoData: 'Nie prosimy o imię i nazwisko, adres e-mail ani inne dane osobowe. Odpowiedzi są powiązane wyłącznie z kodem z linku w zaproszeniu. Trafiają do skrzynki badacza przez serwis Web3Forms, którego powiadomienie pokazuje też adres IP nadawcy; adresy IP nie są wprowadzane do danych badania. Wyniki są przedstawiane wyłącznie zbiorczo; odpowiedzi opisowe mogą być cytowane bez informacji identyfikujących. Prosimy nie wpisywać w komentarzach informacji o własnym zdrowiu ani o możliwych do zidentyfikowania pacjentach.',
      infoEthH: 'Komisja bioetyczna', infoEth: 'Opinia Komisji Bioetycznej: [numer i data do uzupełnienia].',
      infoWhoH: 'Badacz', infoWho: 'dr n. med. Piotr Spychalski — Klinika Chirurgii Onkologicznej, Transplantacyjnej i Ogólnej, Gdański Uniwersytet Medyczny.',
      consent: 'Przeczytałem(-am) powyższą informację i zgadzam się na udział w badaniu.', start: 'Rozpocznij',
      demoH: 'Informacje o Tobie', choose: 'Wybierz…', other: 'Inna', specify: 'Jaka?', yes: 'Tak', no: 'Nie', back: 'Wstecz', next: 'Dalej',
      demoErr: 'Odpowiedz na wszystkie pytania.',
      dCountry: 'Kraj, w którym pracujesz lub studiujesz (albo mieszkasz)', cPL: 'Polska', cOther: 'Inny kraj', dCountryList: 'Jaki kraj?',
      dRole: 'Bierzesz udział jako', dField: 'Główna dziedzina chirurgii', dStatus: 'Status zawodowy', dYear: 'Rok specjalizacji',
      dSpec: 'Specjalność', dStudyYear: 'Rok studiów', dProf: 'Zawód',
      role: { surgeon: 'Chirurg (specjalista)', resident: 'Rezydent / lekarz w trakcie specjalizacji z chirurgii', physician: 'Lekarz innej specjalności (nie chirurg)', student: 'Student(ka) medycyny',
        professional: 'Inny profesjonalista medyczny (nie lekarz)', patient: 'Pacjent(ka)' },
      spec: { gastro: 'Gastroenterologia / endoskopia', radiology: 'Radiologia', oncology: 'Onkologia (kliniczna lub radioterapia)', internal: 'Choroby wewnętrzne',
        anaesthesia: 'Anestezjologia i intensywna terapia', emergency: 'Medycyna ratunkowa', family: 'Medycyna rodzinna', other: 'Inna' },
      prof: { nurse: 'Pielęgniarka / pielęgniarz / położna', dietitian: 'Dietetyk', physio: 'Fizjoterapeuta', paramedic: 'Ratownik medyczny', other: 'Inny' },
      dYears: 'Lata od uzyskania specjalizacji', dRes: 'Liczba resekcji przewodu pokarmowego rocznie (jako operator)', dUsed: 'Czy korzystałeś(-aś) wcześniej z SURGITOME?',
      fColorectal: 'Chirurgia kolorektalna', fUpper: 'Chirurgia górnego odcinka przewodu pokarmowego i bariatryczna', fHpb: 'Chirurgia HPB i transplantacyjna', fGeneral: 'Chirurgia ogólna',
      sSpecialist: 'Specjalista (po specjalizacji)', sResident: 'Rezydent / lekarz w trakcie specjalizacji',
      selH: 'Które pozycje chcesz ocenić?', selP: 'Zaznacz operacje i moduły dydaktyczne, które chcesz ocenić — na przykład te, z którymi masz doświadczenie. W atlasie zostaną pokazane tylko zaznaczone pozycje. Wybór możesz później zmienić (Instrukcja → Zmień wybór).',
      selAll: 'Zaznacz wszystkie', selNone: 'Wyczyść', selCat: 'wszystkie w tej kategorii', selCount: function (k, n) { return 'Zaznaczone: ' + k + ' / ' + n; }, selErr: 'Zaznacz co najmniej jedną pozycję.',
      selChange: 'Zmień wybór',
      howH: 'Jak oceniać',
      how1: 'Widoczne są tylko wybrane przez Ciebie pozycje. Przechodź przez nie w kolejności nawigacji u góry (kategoria → zabieg). Każda pozycja ma kilka kadrów (pasek na dole), a część ma warianty (przyciski nad modelem).',
      how2: 'Dla każdej pozycji oceń stwierdzenie „Trójwymiarowe przedstawienie anatomii pooperacyjnej jest trafne” (dla dwóch modułów dydaktycznych: „Treść jest poprawna anatomicznie i klinicznie”). Ocena dotyczy całej pozycji; jeśli uwaga dotyczy jednego wariantu, podaj go w komentarzu.',
      how3: 'Skala: 1 — nietrafne · 2 — w pewnym stopniu trafne (wymaga dużych poprawek) · 3 — dość trafne (wymaga drobnych poprawek) · 4 — bardzo trafne. Jeśli pozycja wykracza poza Twoją dziedzinę, wybierz „Poza moją dziedziną / nie potrafię ocenić”.',
      how4: 'Modele są uproszczone i schematyczne: długości pętli i proporcje są umowne. SURGITOME jest narzędziem edukacyjnym, nie wyrobem medycznym.',
      how5: 'Odpowiedzi zapisują się automatycznie. Pasek u góry pokazuje postęp; „Zakończ ankietę” (dostępne w każdej chwili) prowadzi do pytań końcowych.',
      howGo: 'Przejdź do atlasu', howBack: 'Wróć do atlasu',
      item: 'Pozycja', of: 'z', module: 'moduł dydaktyczny',
      qOp: 'Trójwymiarowe przedstawienie anatomii pooperacyjnej jest trafne', qMod: 'Treść jest poprawna anatomicznie i klinicznie',
      r1: 'nietrafne', r2: 'w pewnym stopniu trafne (wymaga dużych poprawek)', r3: 'dość trafne (wymaga drobnych poprawek)', r4: 'bardzo trafne',
      na: 'Poza moją dziedziną / nie potrafię ocenić', comment: 'Komentarz (opcjonalnie)', commentPh: 'Jeśli uwaga dotyczy konkretnego wariantu, podaj jego nazwę.',
      varsOne: 'Ocena dotyczy całej pozycji — przejrzyj najpierw wszystkie jej kadry.',
      varsMany: function (n) { return 'Ta pozycja ma ' + n + ' ' + plWar(n) + ' (przyciski nad modelem). Ocena dotyczy całej pozycji — przejrzyj najpierw wszystkie warianty.'; },
      viewed: function (k, n) { return 'Obejrzane warianty: ' + k + ' / ' + n; },
      saved: 'Zapisano ✓', savedMissing: function (k, n) { return 'Zapisano. Nie obejrzano jeszcze ' + k + ' z ' + n + ' wariantów.'; },
      noStore: 'Automatyczny zapis nie działa w tej przeglądarce — nie zamykaj strony przed wysłaniem odpowiedzi.',
      prevItem: '‹ Poprzednia pozycja', nextItem: 'Następna pozycja ›', finish: 'Zakończ ankietę', finishShort: 'Zakończ', rate: 'Oceń', help: 'Instrukcja', close: 'Zamknij', rated: 'ocenione',
      progress: function (k, n) { return 'Ocenione: ' + k + ' / ' + n; },
      finH: 'Zakończyć ankietę?', finP: function (k, n) { return 'Oceniono ' + k + ' z ' + n + ' pozycji. Pozycje bez oceny zostaną zapisane jako nieocenione. Z pytań końcowych możesz jeszcze wrócić do atlasu.'; },
      finStay: 'Oceniaj dalej', finGo: 'Przejdź do pytań końcowych',
      finalH: 'Pytania końcowe', susH: 'A. System Usability Scale (SUS)', susP: 'Przy każdym stwierdzeniu zaznacz, w jakim stopniu się zgadzasz.',
      susNote: 'Kwestionariusz SUS w oryginalnym brzmieniu angielskim (Brooke 1996); pod każdym stwierdzeniem tłumaczenie na język polski*. Przy każdym stwierdzeniu zaznacz, w jakim stopniu się zgadzasz.', susFoot: '* tłumaczenie własne',
      useH: 'B. Przydatność', useP: 'W jakim stopniu zgadzasz się z poniższymi stwierdzeniami?',
      use: { teaching: 'SURGITOME byłby przydatny w nauczaniu studentów i rezydentów.', patients: 'SURGITOME byłby przydatny w rozmowie z pacjentem o operacji.',
        imaging: 'SURGITOME ułatwiłby interpretację TK lub endoskopii po operacji.', recommend: 'Poleciłbym (poleciłabym) SURGITOME koleżankom i kolegom.' },
      lik: ['Zdecydowanie się nie zgadzam', 'Raczej się nie zgadzam', 'Ani się zgadzam, ani nie zgadzam', 'Raczej się zgadzam', 'Zdecydowanie się zgadzam'],
      openH: 'C. Uwagi', openMissing: 'Czego brakuje w SURGITOME (zabiegi, warianty, funkcje)?', openWrong: 'Co jest błędne lub mylące?',
      toAtlas: 'Wróć do atlasu', submit: 'Wyślij odpowiedzi', sending: 'Wysyłanie…',
      finalErr: function (k) { return 'Odpowiedz na wszystkie stwierdzenia w częściach A i B (brakuje: ' + k + ').'; },
      sendErr: 'Nie udało się wysłać odpowiedzi.', download: 'Pobierz odpowiedzi (JSON)', retry: 'Spróbuj ponownie',
      sendHelp: function (code) { return 'Pobierz odpowiedzi i wyślij plik e-mailem na adres ' + ST_MAIL + ' z tematem „SURGITOME-STUDY ' + code + '”. Odpowiedzi zostają też zapisane w tej przeglądarce, więc możesz spróbować ponownie później.'; },
      thanksH: 'Dziękuję!', thanksP: function (d) { return 'Odpowiedzi zostały wysłane ' + d + '. Możesz wrócić do atlasu i zmienić odpowiedzi; po ponownym wysłaniu w analizie liczy się tylko ostatnie.'; },
      copy: 'Pobierz kopię (JSON)',
      tourT: 'Ocena', tourD: 'Tu oceniasz trafność anatomii pooperacyjnej bieżącej pozycji (1–4 lub „poza moją dziedziną”) i możesz dodać komentarz. Odpowiedzi zapisują się automatycznie; pasek u góry pokazuje postęp, a „Zakończ ankietę” prowadzi do pytań końcowych.',
      tourM: 'Przycisk „Oceń” na pasku u góry otwiera ocenę bieżącej pozycji (1–4 lub „poza moją dziedziną”) z komentarzem. Odpowiedzi zapisują się automatycznie; „Zakończ ankietę” prowadzi do pytań końcowych.'
    }
  };
  function plWar(n) { var d = n % 10, h = n % 100; return d >= 2 && d <= 4 && (h < 12 || h > 14) ? 'warianty' : 'wariantów'; }
  var ST = null, stCode = '', stStoreOk = true, stView = '', stMsg = '', stSendState = null, stGateLang = 'en';
  try { stGateLang = localStorage.getItem('surgitome-study-lang') === 'pl' ? 'pl' : 'en'; } catch (e) {}
  function stL() { return ST ? ST.lang : stGateLang; }
  function T(k) { var L = ST_TXT[stL()] || ST_TXT.en; return L[k] !== undefined ? L[k] : ST_TXT.en[k]; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function stNorm(k) { return String(k || '').toUpperCase().replace(/[\s-]/g, ''); }
  function stNow() { return new Date().toISOString(); }

  /* ---------- kod: PBKDF2-HMAC-SHA-256 w WebCrypto, porównanie ze skrótami ---------- */
  function stHex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function stVerify(code) {
    if (!ST_ALPHA.test(code)) return Promise.resolve(false);
    var C = window.crypto, sub = C && C.subtle, enc = window.TextEncoder ? new TextEncoder() : null;
    if (!sub || !enc) return Promise.reject(new Error('nocrypto'));
    return sub.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']).then(function (key) {
      return sub.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(STUDY_CODES.salt), iterations: STUDY_CODES.iter }, key, 256);
    }).then(function (bits) { return STUDY_CODES.hashes.indexOf(stHex(bits)) >= 0; });
  }

  /* ---------- stan ---------- */
  function stNew(code) {
    return { v: 2, code: code, lang: 'en', phase: 'info', consent: null, started: null, demo: {}, sel: null, items: {}, cur: ITEMS[0], activeMs: 0,
      sus: [null, null, null, null, null, null, null, null, null, null], use: {}, open: { missing: '', incorrect: '' }, finishedEarly: false, tourDone: false, submissions: [] };
  }
  var stSaveT = null;
  function stSave() {
    clearTimeout(stSaveT); stSaveT = null; if (!ST) return;
    var ok = lsSet('surgitome-study:' + ST.code, JSON.stringify(ST));
    if (ok !== stStoreOk) { stStoreOk = ok; stRenderRate(); }
  }
  function stSaveSoon() { if (!stSaveT) stSaveT = setTimeout(stSave, 400); }
  window.addEventListener('pagehide', function () { stSave(); });
  function stItem(id) { var it = ST.items[id]; if (!it) it = ST.items[id] = { r: null, na: false, c: '', ms: 0, seen: [], at: null }; return it; }
  function stRated(id) { var it = ST && ST.items[id]; return !!(it && (it.r || it.na)); }
  // wybrane pozycje (kolejność nawigacji); przed wyborem — wszystkie
  function stSelIds() { return ST && ST.sel ? ITEMS.filter(function (id) { return ST.sel.indexOf(id) >= 0; }) : ITEMS.slice(); }
  function stIsSel(id) { return !ST || !ST.sel || ST.sel.indexOf(id) >= 0; }
  function stCount() { return stSelIds().filter(stRated).length; }
  // stan z wersji 1 ankiety (bez wyboru pozycji i ról): rola ze statusu, powrót do wyboru pozycji (zaznaczone dotąd ocenione)
  function stMigrate(s) {
    if (s.v === 1) {
      var D = s.demo || (s.demo = {});
      if (!D.role && D.status) D.role = D.status === 'resident' ? 'resident' : 'surgeon';
      if (D.country && !D.countryChoice) D.countryChoice = D.country === 'PL' ? 'PL' : 'other';
      s.v = 2; s.sel = null;
      if (['howto', 'atlas', 'final', 'thanks'].indexOf(s.phase) >= 0) s.phase = 'select';
    }
    return s;
  }

  /* ---------- wejście ---------- */
  function studyInit() {
    var k = null;
    try {
      var u = new URL(location.href); k = u.searchParams.get('k');
      if (k !== null) { u.searchParams.delete('k'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); }
    } catch (e) {}
    var cand = k !== null ? stNorm(k) : (ssGet('surgitome-study-k') || lsGet('surgitome-study-last') || '');
    if (!cand) { stGate(''); return; }
    stGate('checking');
    stVerify(cand).then(function (ok) {
      if (ok) stOpen(cand);
      else { if (k === null) { try { sessionStorage.removeItem('surgitome-study-k'); localStorage.removeItem('surgitome-study-last'); } catch (e) {} } stGate(k !== null ? 'bad' : ''); }
    }, function () { stGate('crypto'); });
  }
  function stOpen(code) {
    stCode = code; ssSet('surgitome-study-k', code); lsSet('surgitome-study-last', code);
    var saved = null; try { saved = JSON.parse(lsGet('surgitome-study:' + code)); } catch (e) {}
    ST = saved && (saved.v === 1 || saved.v === 2) && saved.code === code ? stMigrate(saved) : stNew(code);
    if (!saved) ST.lang = stGateLang;
    if (ITEMS.indexOf(ST.cur) < 0 || !stIsSel(ST.cur)) ST.cur = stSelIds()[0];
    stSave();
    if (LANG !== ST.lang) setLang(ST.lang); // przez studyLang odświeża też ankietę
    stGoItem(ST.cur, true);
    stShowPhase();
  }
  // przejście do pozycji: kategoria zabiegu (nie „Ulubione”), pierwszy kadr
  function stGoItem(id, keepFrame) {
    var i = stIdx(id); if (i < 0) return;
    S.cat = A.PROCS[i].cat;
    if (i !== S.an) switchAn(i, 0); else if (!keepFrame) switchAn(i, 0); else renderTabs();
    if (MOBILE && !$('mMenu').hidden) mMenu(false);
  }

  /* ---------- budowanie DOM ---------- */
  function E(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function stBtn(cls, text, fn) { var b = E('button', cls, text); b.type = 'button'; b.onclick = fn; return b; }
  // klasa stov wstrzymuje renderowanie 3D (11-rozmiar-render.js) — tylko w sesji ankiety; pod ekranem zaproszenia atlas działa jak w wersji głównej
  function stOvShow(on) { $('stOv').hidden = !on; root.classList.toggle('stov', on && !!ST); if (on) $('stOv').scrollTop = 0; }
  function stHead(box) {
    var h = E('div', 'sthd');
    h.innerHTML = '<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" stroke-width="2.5" opacity=".55"/><circle cx="16" cy="16" r="2.2" fill="currentColor"/></svg>';
    h.appendChild(E('b', '', T('brand')));
    h.appendChild(stBtn('ghostbtn stlang', T('langBtn'), function () { stSwitchLang(); }));
    box.appendChild(h);
  }
  function stSwitchLang() {
    var l = stL() === 'en' ? 'pl' : 'en';
    if (ST) setLang(l); else { stGateLang = l; lsSet('surgitome-study-lang', l); stGate(stMsg); }
  }
  function stPage() { var ov = $('stOv'); ov.innerHTML = ''; var box = E('div', 'stpage'); ov.appendChild(box); stHead(box); stOvShow(true); return box; }
  function stContact(box) {
    var p = E('p', 'stfine'); p.appendChild(document.createTextNode(T('contact') + ' Piotr Spychalski, MD, PhD — '));
    var a = E('a', '', ST_MAIL); a.href = 'mailto:' + ST_MAIL; p.appendChild(a); box.appendChild(p);
  }

  // ekran bez kodu / z błędnym kodem
  function stGate(msg) {
    stMsg = msg; var box = stPage();
    if (msg === 'checking') { box.appendChild(E('p', 'stlead', T('loading'))); return; }
    box.appendChild(E('h2', '', T('gateH')));
    box.appendChild(E('p', '', T('gateP1'))); box.appendChild(E('p', '', T('gateP2')));
    var f = E('form', 'stgate'); f.noValidate = true;
    var lb = E('label', 'stlbl', T('gateLbl')); lb.htmlFor = 'stCode';
    var inp = E('input'); inp.id = 'stCode'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.maxLength = 12; inp.setAttribute('autocapitalize', 'characters');
    var go = E('button', 'btn primary', T('gateBtn')); go.type = 'submit';
    var st = E('p', 'fbstatus' + (msg === 'bad' || msg === 'crypto' ? ' err' : ''), msg === 'bad' ? T('gateBad') : msg === 'crypto' ? T('gateCrypto') : '');
    st.id = 'stGateMsg'; st.setAttribute('role', 'status');
    f.appendChild(lb); var row = E('div', 'strow'); row.appendChild(inp); row.appendChild(go); f.appendChild(row); f.appendChild(st);
    f.onsubmit = function (e) {
      e.preventDefault(); var c = stNorm(inp.value); if (!c) return;
      go.disabled = true; st.className = 'fbstatus'; st.textContent = T('gateChecking');
      stVerify(c).then(function (ok) { if (ok) stOpen(c); else { go.disabled = false; st.className = 'fbstatus err'; st.textContent = T('gateBad'); inp.select(); } },
        function () { go.disabled = false; st.className = 'fbstatus err'; st.textContent = T('gateCrypto'); });
    };
    box.appendChild(f);
    var pub = E('p', 'stfine'); pub.appendChild(document.createTextNode(T('gatePublic') + ' '));
    var a = E('a', '', 'piotrspychalski.github.io/surgitome'); a.href = 'https://piotrspychalski.github.io/surgitome/'; pub.appendChild(a); box.appendChild(pub);
    stContact(box);
    setTimeout(function () { if (!$('stOv').hidden && document.activeElement !== inp) try { inp.focus(); } catch (e) {} }, 0);
  }

  function stShowPhase() {
    stView = '';
    var ph = ST.phase;
    $('stBar').hidden = ph !== 'atlas'; $('stRate').hidden = ph !== 'atlas'; root.classList.toggle('study', ph === 'atlas');
    if (ph === 'info') stInfo(); else if (ph === 'demo') stDemo(); else if (ph === 'select') stChoose(); else if (ph === 'howto') stHow(false);
    else if (ph === 'final') stFinal(); else if (ph === 'thanks') stThanks();
    else { stOvShow(false); stRenderBar(); stRenderRate(); renderTabs(); if (!ST.tourDone) { ST.tourDone = true; stSave(); setTimeout(function () { if (ST.phase === 'atlas' && $('stOv').hidden) tourStart(); }, 400); } }
  }
  function stPhase(p) { ST.phase = p; stSave(); stShowPhase(); }

  function stInfo() {
    var box = stPage();
    box.appendChild(E('h2', '', T('infoH'))); box.appendChild(E('p', 'stlead', T('infoLead')));
    [['infoAimH', 'infoAim'], ['infoWhatH', 'infoWhat'], ['infoVolH', 'infoVol'], ['infoDataH', 'infoData'], ['infoEthH', 'infoEth'], ['infoWhoH', 'infoWho']].forEach(function (s) {
      box.appendChild(E('h3', '', T(s[0]))); box.appendChild(E('p', '', T(s[1])));
    });
    stContact(box);
    var lb = E('label', 'stconsent'), cb = E('input'); cb.type = 'checkbox'; cb.id = 'stConsent'; cb.checked = !!ST.consent;
    lb.appendChild(cb); lb.appendChild(E('span', '', T('consent'))); box.appendChild(lb);
    var row = E('div', 'strow stend'), go = stBtn('btn primary', T('start'), function () {
      if (!cb.checked) return;
      if (!ST.consent) { ST.consent = { at: stNow(), info: STUDY_INFO_VER }; ST.started = ST.consent.at; }
      stPhase('demo');
    });
    go.id = 'stStart'; go.disabled = !cb.checked;
    cb.onchange = function () { go.disabled = !cb.checked; if (!cb.checked) { ST.consent = null; stSave(); } };
    row.appendChild(go); box.appendChild(row);
  }

  function stSelect(id, opts, val, onch) {
    var s = E('select'); s.id = id; var o0 = E('option', '', T('choose')); o0.value = ''; s.appendChild(o0);
    opts.forEach(function (o) { var x = E('option', '', o[1]); x.value = o[0]; s.appendChild(x); });
    s.value = val == null ? '' : String(val); s.onchange = function () { onch(s.value); }; return s;
  }
  function stRadios(name, opts, val, onch, cls) {
    var g = E('div', 'stradios' + (cls ? ' ' + cls : '')); g.setAttribute('role', 'radiogroup');
    opts.forEach(function (o) {
      var lb = E('label', 'stradio'), r = E('input'); r.type = 'radio'; r.name = name; r.value = o[0]; r.checked = String(val) === String(o[0]);
      r.onchange = function () { if (r.checked) onch(o[0]); };
      lb.appendChild(r); lb.appendChild(E('span', '', o[1])); g.appendChild(lb);
    });
    return g;
  }
  function stQ(box, label, ctl) { var q = E('div', 'stq'); var l = E('p', 'stlbl', label); q.appendChild(l); q.appendChild(ctl); box.appendChild(q); return q; }
  // kraj z ustawień przeglądarki (region języka, np. de-DE → DE) — tylko podpowiedź w liście; bez geolokalizacji po IP (nie zbieramy danych osobowych)
  function stGuessCountry() {
    var L = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']);
    for (var i = 0; i < L.length; i++) { var m = /^[a-z]{2,3}[-_]([a-z]{2})\b/i.exec(L[i] || ''); if (m && ST_COUNTRIES.indexOf(m[1].toUpperCase()) >= 0 && m[1].toUpperCase() !== 'PL') return m[1].toUpperCase(); }
    return '';
  }
  function stOtherText(id, val, onch) { var t = E('input', 'sttext'); t.id = id; t.placeholder = T('specify'); t.maxLength = 120; t.value = val || ''; t.oninput = function () { onch(t.value); stSaveSoon(); }; return t; }
  function stDemo() {
    var box = stPage(), D = ST.demo;
    box.appendChild(E('h2', '', T('demoH')));
    // kraj: Polska albo inny (pełna lista z podpowiedzią z przeglądarki)
    var dn = null; try { dn = new Intl.DisplayNames([stL()], { type: 'region' }); } catch (e) {}
    var cs = ST_COUNTRIES.filter(function (c) { return c !== 'PL'; }).map(function (c) { var n = c; try { n = dn ? dn.of(c) : c; } catch (e) {} return [c, n]; })
      .sort(function (a, b) { return a[1].localeCompare(b[1], stL()); });
    var cq = stQ(box, T('dCountry'), stRadios('stCountryChoice', [['PL', T('cPL')], ['other', T('cOther')]], D.countryChoice, function (v) {
      D.countryChoice = v;
      if (v === 'PL') D.country = 'PL'; else { if (D.country === 'PL' || !D.country) D.country = stGuessCountry() || null; csel.value = D.country || ''; }
      stSave(); cl.hidden = v !== 'other';
    }, 'strow'));
    var csel = stSelect('stCountry', cs, D.country !== 'PL' ? D.country : '', function (v) { D.country = v || null; stSave(); });
    var cl = E('div', 'stsub'); cl.appendChild(E('span', 'stlbl2', T('dCountryList'))); cl.appendChild(csel); cl.hidden = D.countryChoice !== 'other'; cq.appendChild(cl);
    // rola i pytania zależne od roli
    var R = T('role');
    stQ(box, T('dRole'), stRadios('stRole', ST_ROLES.map(function (r) { return [r, R[r]]; }), D.role, function (v) { D.role = v; stSave(); upd(); }));
    var fq = stQ(box, T('dField'), stRadios('stField', [['colorectal', T('fColorectal')], ['upper', T('fUpper')], ['hpb', T('fHpb')], ['general', T('fGeneral')], ['other', T('other')]], D.field,
      function (v) { D.field = v; stSave(); oth.hidden = v !== 'other'; }));
    var oth = stOtherText('stFieldOther', D.fieldOther, function (v) { D.fieldOther = v; }); oth.hidden = D.field !== 'other'; fq.appendChild(oth);
    var yrq = stQ(box, T('dYear'), stSelect('stResYear', [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6+', '6+']], D.residentYear, function (v) { D.residentYear = v || null; stSave(); }));
    var ysq = stQ(box, T('dYears'), stSelect('stYears', [['<5', '< 5'], ['5-9', '5–9'], ['10-19', '10–19'], ['>=20', '≥ 20']], D.yearsSinceSpec, function (v) { D.yearsSinceSpec = v || null; stSave(); }));
    var rsq = stQ(box, T('dRes'), stSelect('stRes', [['0-9', '0–9'], ['10-24', '10–24'], ['25-49', '25–49'], ['50-99', '50–99'], ['>=100', '≥ 100']], D.resectionsPerYear, function (v) { D.resectionsPerYear = v || null; stSave(); }));
    var SP = T('spec'), PR = T('prof');
    var spq = stQ(box, T('dSpec'), stSelect('stSpec', ST_SPECS.map(function (k) { return [k, SP[k]]; }), D.specialty, function (v) { D.specialty = v || null; stSave(); spo.hidden = v !== 'other'; }));
    var spo = stOtherText('stSpecOther', D.specialtyOther, function (v) { D.specialtyOther = v; }); spo.hidden = D.specialty !== 'other'; spq.appendChild(spo);
    var syq = stQ(box, T('dStudyYear'), stSelect('stStudyYear', [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']], D.studyYear, function (v) { D.studyYear = v || null; stSave(); }));
    var prq = stQ(box, T('dProf'), stSelect('stProf', ST_PROFS.map(function (k) { return [k, PR[k]]; }), D.profession, function (v) { D.profession = v || null; stSave(); pro.hidden = v !== 'other'; }));
    var pro = stOtherText('stProfOther', D.professionOther, function (v) { D.professionOther = v; }); pro.hidden = D.profession !== 'other'; prq.appendChild(pro);
    function upd() {
      var r = D.role, surg = r === 'surgeon' || r === 'resident';
      fq.hidden = !surg; rsq.hidden = !surg; yrq.hidden = r !== 'resident'; ysq.hidden = r !== 'surgeon';
      spq.hidden = r !== 'physician'; syq.hidden = r !== 'student'; prq.hidden = r !== 'professional';
    }
    upd();
    stQ(box, T('dUsed'), stRadios('stUsed', [['yes', T('yes')], ['no', T('no')]], D.usedBefore == null ? '' : D.usedBefore ? 'yes' : 'no', function (v) { D.usedBefore = v === 'yes'; stSave(); }, 'strow'));
    var err = E('p', 'fbstatus err'); err.id = 'stDemoErr'; err.setAttribute('role', 'status');
    var row = E('div', 'strow stend');
    row.appendChild(stBtn('btn', T('back'), function () { stPhase('info'); }));
    var go = stBtn('btn primary', T('next'), function () {
      var r = D.role, surg = r === 'surgeon' || r === 'resident', txt = function (v) { return !!(v || '').trim(); };
      var ok = (D.countryChoice === 'PL' || (D.countryChoice === 'other' && D.country && D.country !== 'PL')) && ST_ROLES.indexOf(r) >= 0 && D.usedBefore != null &&
        (!surg || (D.field && (D.field !== 'other' || txt(D.fieldOther)) && D.resectionsPerYear && (r === 'resident' ? D.residentYear : D.yearsSinceSpec))) &&
        (r !== 'physician' || (D.specialty && (D.specialty !== 'other' || txt(D.specialtyOther)))) &&
        (r !== 'student' || D.studyYear) && (r !== 'professional' || (D.profession && (D.profession !== 'other' || txt(D.professionOther))));
      if (!ok) { err.textContent = T('demoErr'); return; }
      // pola nieodpowiednie dla roli — puste
      if (D.countryChoice === 'PL') D.country = 'PL';
      if (!surg) { D.field = null; D.fieldOther = ''; D.resectionsPerYear = null; }
      if (r !== 'resident') D.residentYear = null; if (r !== 'surgeon') D.yearsSinceSpec = null;
      if (D.field !== 'other') D.fieldOther = '';
      if (r !== 'physician') { D.specialty = null; D.specialtyOther = ''; } else if (D.specialty !== 'other') D.specialtyOther = '';
      if (r !== 'student') D.studyYear = null;
      if (r !== 'professional') { D.profession = null; D.professionOther = ''; } else if (D.profession !== 'other') D.professionOther = '';
      delete D.status;
      stPhase('select');
    });
    go.id = 'stDemoNext'; row.appendChild(go); box.appendChild(err); box.appendChild(row);
  }
  // wybór pozycji do oceny: kategorie z zaznaczaniem całej grupy; w atlasie widoczne tylko wybrane
  function stChoose() {
    var box = stPage(), pre = ST.sel ? ST.sel.slice() : ITEMS.filter(stRated), boxes = {};
    box.appendChild(E('h2', '', T('selH'))); box.appendChild(E('p', '', T('selP')));
    var cnt = E('p', 'stlbl'); cnt.id = 'stSelCount';
    var tools = E('div', 'strow');
    var all = stBtn('btn', T('selAll'), function () { ITEMS.forEach(function (id) { boxes[id].checked = true; }); sync(); }); all.id = 'stSelAll';
    var none = stBtn('btn', T('selNone'), function () { ITEMS.forEach(function (id) { boxes[id].checked = false; }); sync(); }); none.id = 'stSelNone';
    tools.appendChild(all); tools.appendChild(none); tools.appendChild(cnt); box.appendChild(tools);
    var catBoxes = [];
    A.CATS.forEach(function (c) {
      var ids = ITEMS.filter(function (id) { return A.PROCS[stIdx(id)].cat === c.id; }); if (!ids.length) return;
      var fs = E('fieldset', 'stcat'), lg = E('legend', ''), cl = E('label', 'stcatall'), cb = E('input');
      cb.type = 'checkbox'; cb.dataset.cat = c.id; cl.appendChild(cb); cl.appendChild(E('b', '', tr(c.name))); cl.appendChild(E('span', 'stfine', ' (' + T('selCat') + ')'));
      lg.appendChild(cl); fs.appendChild(lg); catBoxes.push([cb, ids]);
      cb.onchange = function () { ids.forEach(function (id) { boxes[id].checked = cb.checked; }); sync(); };
      ids.forEach(function (id) {
        var P = A.PROCS[stIdx(id)], lb = E('label', 'stradio stitem'), x = E('input');
        x.type = 'checkbox'; x.name = 'stSel'; x.value = id; x.checked = pre.indexOf(id) >= 0; x.onchange = sync; boxes[id] = x;
        lb.appendChild(x); lb.appendChild(E('span', '', tr(P.short) + (ST_MODULES[id] ? ' — ' + T('module') : '')));
        fs.appendChild(lb);
      });
      box.appendChild(fs);
    });
    var err = E('p', 'fbstatus err'); err.id = 'stSelErr'; err.setAttribute('role', 'status');
    function chosen() { return ITEMS.filter(function (id) { return boxes[id].checked; }); }
    function sync() {
      var k = chosen().length; cnt.textContent = T('selCount')(k, ITEMS.length); if (k) err.textContent = '';
      catBoxes.forEach(function (cb) { var on = cb[1].filter(function (id) { return boxes[id].checked; }).length; cb[0].checked = on === cb[1].length; cb[0].indeterminate = on > 0 && on < cb[1].length; });
    }
    sync();
    var row = E('div', 'strow stend');
    row.appendChild(stBtn('btn', T('back'), function () { stPhase(ST.tourDone ? 'atlas' : 'demo'); }));
    var go = stBtn('btn primary', T('next'), function () {
      var sel = chosen(); if (!sel.length) { err.textContent = T('selErr'); return; }
      ST.sel = sel; ST.selAt = stNow();
      if (!stIsSel(curProc().id)) { ST.cur = sel[0]; stGoItem(sel[0]); } else renderTabs();
      stPhase(ST.tourDone ? 'atlas' : 'howto');
    });
    go.id = 'stSelNext'; row.appendChild(go); box.appendChild(err); box.appendChild(row);
  }
  function stHow(fromAtlas) {
    var box = stPage(); stView = fromAtlas ? 'howto' : '';
    box.appendChild(E('h2', '', T('howH')));
    var ul = E('ul', 'stlist'); ['how1', 'how2', 'how3', 'how4', 'how5'].forEach(function (k) { ul.appendChild(E('li', '', T(k))); }); box.appendChild(ul);
    var row = E('div', 'strow stend'), go = stBtn('btn primary', T(fromAtlas ? 'howBack' : 'howGo'), function () { if (fromAtlas) { stView = ''; stOvShow(false); } else stPhase('atlas'); });
    if (fromAtlas) { var ch = stBtn('btn', T('selChange'), function () { stPhase('select'); }); ch.id = 'stSelChange'; row.appendChild(ch); }
    go.id = 'stHowGo'; row.appendChild(go); box.appendChild(row);
  }
  function stFinishAsk() {
    var k = stCount(), n = stSelIds().length;
    if (k === n) { ST.finishedEarly = false; stPhase('final'); return; }
    var box = stPage(); stView = 'finish';
    box.appendChild(E('h2', '', T('finH'))); box.appendChild(E('p', '', T('finP')(k, n)));
    var row = E('div', 'strow stend');
    row.appendChild(stBtn('btn', T('finStay'), function () { stView = ''; stOvShow(false); }));
    var go = stBtn('btn primary', T('finGo'), function () { ST.finishedEarly = true; stPhase('final'); }); go.id = 'stFinGo'; row.appendChild(go);
    box.appendChild(row);
  }

  /* ---------- pytania końcowe: SUS, przydatność, pytania otwarte ---------- */
  function stLikert(name, val, onch, labels, sub) {
    var g = E('div', 'stlik'); g.setAttribute('role', 'radiogroup');
    for (var v = 1; v <= 5; v++) (function (v) {
      var lb = E('label', 'stlk'), r = E('input'); r.type = 'radio'; r.name = name; r.value = v; r.checked = val === v; r.title = labels[v - 1];
      r.setAttribute('aria-label', v + ' — ' + labels[v - 1]); r.onchange = function () { if (r.checked) onch(v); };
      lb.appendChild(r); lb.appendChild(E('span', 'stlkn', String(v))); g.appendChild(lb);
    })(v);
    var an = E('div', 'stanch'); [0, 4].forEach(function (k) { var sp = E('span', '', labels[k]); if (sub) { sp.appendChild(E('br')); sp.appendChild(E('i', '', sub[k])); } an.appendChild(sp); });
    var w = E('div', 'stlikw'); w.appendChild(g); w.appendChild(an); return w;
  }
  function stSusScore(a) {
    if (!a || a.length !== 10 || a.some(function (x) { return !(x >= 1 && x <= 5); })) return null;
    return a.reduce(function (s, x, i) { return s + (i % 2 === 0 ? x - 1 : 5 - x); }, 0) * 2.5;
  }
  function stFinal() {
    var box = stPage(); stSendState = null;
    box.appendChild(E('h2', '', T('finalH')));
    // SUS zawsze w oryginale; w wersji PL pod zdaniem i przy kotwicach tłumaczenie własne oznaczone *
    var pl = stL() === 'pl', lab5 = [SUS_EN_ANCHORS[0], '', '', '', SUS_EN_ANCHORS[1]], sub5 = pl ? [SUS_PL_OWN_ANCHORS[0] + '*', '', '', '', SUS_PL_OWN_ANCHORS[1] + '*'] : null;
    box.appendChild(E('h3', '', T('susH')));
    box.appendChild(E('p', 'stfine', pl ? T('susNote') : T('susP')));
    var ol = E('ol', 'stsus');
    SUS_EN.forEach(function (q, i) {
      var li = E('li', 'stsq'); li.appendChild(E('p', 'stsqt', q));
      if (pl) li.appendChild(E('p', 'stsqpl', SUS_PL_OWN[i] + '*'));
      li.appendChild(stLikert('stSus' + i, ST.sus[i], function (v) { ST.sus[i] = v; stSave(); li.classList.remove('stmiss'); }, lab5, sub5));
      ol.appendChild(li);
    });
    box.appendChild(ol);
    if (pl) { var ft = E('p', 'stfine stfoot', T('susFoot')); ft.id = 'stSusFoot'; box.appendChild(ft); }
    box.appendChild(E('h3', '', T('useH'))); box.appendChild(E('p', 'stfine', T('useP')));
    var ul = E('ol', 'stsus stuse');
    ST_USE.forEach(function (k) {
      var li = E('li', 'stsq'); li.appendChild(E('p', 'stsqt', T('use')[k]));
      li.appendChild(stLikert('stUse_' + k, ST.use[k], function (v) { ST.use[k] = v; stSave(); li.classList.remove('stmiss'); }, T('lik')));
      ul.appendChild(li);
    });
    box.appendChild(ul);
    box.appendChild(E('h3', '', T('openH')));
    [['missing', 'openMissing'], ['incorrect', 'openWrong']].forEach(function (o) {
      var lb = E('label', 'stlbl', T(o[1])); lb.htmlFor = 'stOpen_' + o[0]; box.appendChild(lb);
      var ta = E('textarea', 'sttext'); ta.id = 'stOpen_' + o[0]; ta.rows = 4; ta.maxLength = 4000; ta.value = ST.open[o[0]] || '';
      ta.oninput = function () { ST.open[o[0]] = ta.value; stSaveSoon(); }; box.appendChild(ta);
    });
    var st = E('div', 'stsend'); st.id = 'stSendBox'; st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite'); box.appendChild(st);
    var row = E('div', 'strow stend');
    row.appendChild(stBtn('btn', T('toAtlas'), function () { stPhase('atlas'); }));
    var go = stBtn('btn primary', T('submit'), function () {
      var miss = 0;
      [].forEach.call(box.querySelectorAll('.stsq'), function (li, i) {
        var v = i < 10 ? ST.sus[i] : ST.use[ST_USE[i - 10]], m = !(v >= 1 && v <= 5); li.classList.toggle('stmiss', m); if (m) miss++;
      });
      if (miss) { st.className = 'stsend'; st.innerHTML = ''; st.appendChild(E('p', 'fbstatus err', T('finalErr')(miss))); var f = box.querySelector('.stmiss'); if (f && f.scrollIntoView) try { f.scrollIntoView({ block: 'center' }); } catch (e) {} return; }
      stSend(go, st);
    });
    go.id = 'stSubmit'; row.appendChild(go); box.appendChild(row);
  }

  /* ---------- wysłanie ---------- */
  function stDevice() {
    // typ: główny wskaźnik dotykowy (pointer: coarse) → telefon (< 600 px krótszy bok ekranu) albo tablet; laptop z ekranem dotykowym = komputer
    var sw = (window.screen && screen.width) || 0, sh = (window.screen && screen.height) || 0, touch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
    var coarse = false; try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) {}
    var s = Math.min(sw, sh) || Math.min(window.innerWidth, window.innerHeight);
    return { type: !coarse ? 'desktop' : s < 600 ? 'phone' : 'tablet', viewport: window.innerWidth + 'x' + window.innerHeight, screen: sw + 'x' + sh, touch: !!touch, layout: MOBILE ? 'mobile' : 'desktop' };
  }
  function stPayload() {
    // schemat 2: wszystkie 31 pozycji z flagą selected; ocena, komentarz i czas tylko dla wybranych
    var items = ITEMS.map(function (id, n) {
      var p = A.PROCS[stIdx(id)], it = ST.items[id] || {}, sel = stIsSel(id);
      return { n: n + 1, id: id, kind: ST_MODULES[id] ? 'module' : 'operation', selected: sel, rating: sel && !it.na ? (it.r || null) : null, na: sel && !!it.na, comment: sel ? it.c || '' : '',
        ms: Math.round(it.ms || 0), variants: p.variants.length, variantsSeen: (it.seen || []).length, ratedAt: sel ? it.at || null : null };
    });
    return { study: 'SURGITOME-STUDY', schema: 2, code: ST.code, version: { base: STUDY_BASE, sha: STUDY_SHA }, lang: ST.lang, device: stDevice(),
      consent: ST.consent, started: ST.started, submitted: stNow(), submission: ST.submissions.length + 1, activeMs: Math.round(ST.activeMs),
      demographics: ST.demo, selected: stSelIds(), rated: stCount(), total: stSelIds().length, finishedEarly: !!ST.finishedEarly, items: items,
      sus: ST.sus.slice(), susScore: stSusScore(ST.sus), susLang: 'en', susHelp: stL() === 'pl' ? 'pl-own' : null, usefulness: ST.use, open: ST.open };
  }
  function stDownload(p) {
    var name = 'SURGITOME-STUDY-' + ST.code + '-' + p.submitted.replace(/[:.]/g, '-') + '.json';
    try {
      var url = URL.createObjectURL(new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' })), a = E('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    } catch (e) {}
    return name;
  }
  function stSend(btn, box) {
    var p = stPayload();
    var data = { access_key: ST_KEY, subject: 'SURGITOME-STUDY ' + ST.code, from_name: 'SURGITOME-STUDY', botcheck: false,
      // pola czytelne w mailu i w eksporcie CSV z Web3Forms (pełne dane — JSON w polu data)
      'Kod': ST.code, 'Rola': (ST.demo && ST.demo.role) || '', 'Ocenione pozycje': p.rated + ' / ' + p.total, 'SUS': p.susScore,
      'SUS 1–10': ST.sus.map(function (x) { return x == null ? '-' : x; }).join(' '), 'Wersja': String(STUDY_SHA).slice(0, 7), data: JSON.stringify(p) };
    btn.disabled = true; box.className = 'stsend'; box.innerHTML = ''; box.appendChild(E('p', 'fbstatus', T('sending')));
    var fail = function (m) {
      btn.disabled = false; stSendState = { ok: false, payload: p };
      box.innerHTML = ''; box.className = 'stsend sterr';
      box.appendChild(E('p', 'fbstatus err', T('sendErr') + (m ? ' (' + String(m).slice(0, 160) + ')' : '')));
      box.appendChild(E('p', '', T('sendHelp')(ST.code)));
      var r = E('div', 'strow'); var d = stBtn('btn primary', T('download'), function () { stDownload(p); }); d.id = 'stDownload'; r.appendChild(d); box.appendChild(r);
    };
    try {
      fetch(ST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && res.j && res.j.success === true) {
            ST.submissions.push({ at: p.submitted, rated: p.rated }); stSendState = { ok: true, payload: p }; stPhase('thanks');
          } else fail(res.j && res.j.message);
        }, function (e) { fail(e && e.message); });
    } catch (err) { fail(err && err.message); }
  }
  function stThanks() {
    var box = stPage(), last = ST.submissions[ST.submissions.length - 1], d = last ? new Date(last.at) : new Date();
    var ds = d.toLocaleString(stL() === 'pl' ? 'pl-PL' : 'en-GB', { dateStyle: 'long', timeStyle: 'short' });
    box.appendChild(E('h2', '', T('thanksH'))); box.appendChild(E('p', '', T('thanksP')(ds)));
    var row = E('div', 'strow stend');
    var c = stBtn('btn', T('copy'), function () { var p = stSendState && stSendState.payload || stPayload(); stDownload(p); }); c.id = 'stCopy'; row.appendChild(c);
    var b = stBtn('btn primary', T('toAtlas'), function () { stPhase('atlas'); }); b.id = 'stBackAtlas'; row.appendChild(b);
    box.appendChild(row); stContact(box);
  }

  /* ---------- pasek postępu i panel oceny (atlas) ---------- */
  function stRenderBar() {
    if (!ST) return;
    var k = stCount(), n = stSelIds().length;
    // telefon: krótkie etykiety (pasek w jednym wierszu), pełne w aria-label / title
    $('stProgTxt').textContent = MOBILE ? k + ' / ' + n : T('progress')(k, n); $('stProgFill').style.width = (100 * k / n).toFixed(1) + '%';
    $('stProg').setAttribute('aria-valuenow', k); $('stProg').setAttribute('aria-valuemax', n); $('stProg').setAttribute('aria-label', T('progress')(k, n));
    $('stBrand').textContent = T('brand'); $('stRateBtn').textContent = T('rate');
    $('stHelpBtn').textContent = MOBILE ? '?' : T('help'); $('stFinBtn').textContent = MOBILE ? T('finishShort') : T('finish');
    $('stHelpBtn').setAttribute('aria-label', T('help')); $('stHelpBtn').title = T('help'); $('stFinBtn').setAttribute('aria-label', T('finish'));
  }
  function stRenderRate() {
    if (!ST || !$('stRate')) return;
    var P = curProc(), id = P.id, SEL = stSelIds(), n = SEL.indexOf(id), it = n >= 0 ? stItem(id) : null, nv = P.variants.length;
    ST.cur = n >= 0 ? id : ST.cur;
    $('stRNum').textContent = T('item') + ' ' + (n + 1) + ' ' + T('of') + ' ' + SEL.length + (ST_MODULES[id] ? ' · ' + T('module') : '');
    $('stRName').textContent = tr(P.short);
    $('stRQ').textContent = T(ST_MODULES[id] ? 'qMod' : 'qOp');
    $('stRVar').textContent = nv > 1 ? T('varsMany')(nv) : T('varsOne');
    var seen = it ? it.seen.length : 0;
    $('stRSeen').hidden = nv < 2; $('stRSeen').textContent = T('viewed')(Math.min(seen, nv), nv); $('stRSeen').classList.toggle('stok', seen >= nv);
    [1, 2, 3, 4].forEach(function (v) { var r = $('stR' + v); r.checked = !!(it && !it.na && it.r === v); $('stRL' + v).textContent = T('r' + v); });
    $('stRNA').checked = !!(it && it.na); $('stRNAL').textContent = T('na');
    $('stRComL').textContent = T('comment'); $('stRCom').placeholder = T('commentPh');
    if (document.activeElement !== $('stRCom')) $('stRCom').value = it ? it.c : '';
    $('stRPrev').textContent = T('prevItem'); $('stRPrev').disabled = n <= 0;
    var last = n === SEL.length - 1; $('stRNext').textContent = last ? T('finish') : T('nextItem');
    $('stRClose').textContent = T('close');
    var sv = $('stRSaved');
    if (!stStoreOk) { sv.className = 'stsaved err'; sv.textContent = T('noStore'); }
    else if (it && (it.r || it.na) && sv.dataset.id === id) { sv.className = 'stsaved ok'; sv.textContent = nv > 1 && seen < nv && !it.na ? T('savedMissing')(nv - seen, nv) : T('saved'); }
    else { sv.className = 'stsaved'; sv.textContent = ''; }
  }
  function stSetRating(v, na) {
    var id = curProc().id; if (ITEMS.indexOf(id) < 0 || !stIsSel(id)) return;
    var it = stItem(id); it.na = !!na; it.r = na ? null : v; it.at = stNow();
    if (!it.r && !it.na) it.at = null;
    $('stRSaved').dataset.id = id;
    stSave(); stRenderRate(); stRenderBar(); renderTabs(); if (!$('mMenu').hidden) renderMobileMenu();
  }
  function stStep(d) {
    var SEL = stSelIds(), n = SEL.indexOf(curProc().id), m = n + d;
    if (m >= SEL.length) { stFinishAsk(); return; }
    if (m < 0) return;
    $('stRSaved').dataset.id = ''; stGoItem(SEL[m]); stRateOpen(false);
  }
  function stRateOpen(on) { $('stRate').classList.toggle('open', on); $('stRateBtn').setAttribute('aria-expanded', on ? 'true' : 'false'); }
  [1, 2, 3, 4].forEach(function (v) { $('stR' + v).onchange = function () { if (this.checked) stSetRating(v, false); }; });
  $('stRNA').onchange = function () { stSetRating(null, this.checked); };
  $('stRCom').oninput = function () { var id = curProc().id; if (ITEMS.indexOf(id) < 0) return; stItem(id).c = this.value; stSaveSoon(); };
  $('stRCom').onblur = function () { stSave(); };
  $('stRPrev').onclick = function () { stStep(-1); };
  $('stRNext').onclick = function () { stStep(1); };
  $('stRClose').onclick = function () { stRateOpen(false); };
  $('stRateBtn').onclick = function () { stRateOpen(!$('stRate').classList.contains('open')); };
  $('stHelpBtn').onclick = function () { stHow(true); };
  $('stFinBtn').onclick = function () { stRateOpen(false); stFinishAsk(); };

  // czas na pozycjach (aktywny: karta widoczna, interakcja w ciągu ST_IDLE) i obejrzane warianty (≥ 2 s na wariancie)
  var stAct = Date.now(), stTickT = Date.now(), stSeenK = '', stSeenMs = 0;
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, function () { stAct = Date.now(); }, { passive: true, capture: true }); });
  setInterval(function () {
    var now = Date.now(), dt = Math.min(now - stTickT, 5000); stTickT = now;
    if (!ST || ST.phase !== 'atlas' || stView || document.hidden || now - stAct > ST_IDLE) return;
    var P = curProc(), id = P.id; if (ITEMS.indexOf(id) < 0 || !stIsSel(id)) return;
    var it = stItem(id); it.ms += dt; ST.activeMs += dt;
    var key = id + ':' + (S.vi || 0);
    if (key !== stSeenK) { stSeenK = key; stSeenMs = 0; }
    stSeenMs += dt;
    if (stSeenMs >= 2000 && it.seen.indexOf(S.vi || 0) < 0) { it.seen.push(S.vi || 0); stRenderRate(); }
    stSaveSoon();
  }, 1000);

  /* ---------- zaczepienia w kodzie atlasu ---------- */
  // znacznik ✓ przy ocenionej pozycji (zakładki i menu telefonu); przy każdym odświeżeniu zakładek — panel oceny bieżącej pozycji
  function studyTab(el, id) {
    if (!ST || !stRated(id)) return;
    var s = E('span', 'stck', '✓'); s.title = T('rated'); s.setAttribute('aria-label', T('rated')); el.appendChild(s); el.classList.add('strated');
  }
  // nawigacja w sesji z wyborem: tylko wybrane pozycje (kategorie, zakładki, „Dalej”, wyszukiwarka, menu telefonu); bez „Ulubionych”
  function studyVisible(i) { return !ST || !ST.sel || ST.sel.indexOf(A.PROCS[i].id) >= 0; }
  function studyNoFav() { return !!(ST && ST.sel); }
  function studyTabsDone() { if (ST && ST.phase === 'atlas') stRenderRate(); }
  function studyLang(l) {
    if (ST) { if (ST.lang !== l) { ST.lang = l; stSave(); } } else return;
    stRenderBar(); stRenderRate();
    if (!$('stOv').hidden) {
      if (stView === 'howto') stHow(true); else if (stView === 'finish') stFinishAsk(); else if (ST.phase !== 'atlas') stShowPhase();
    }
  }
  // klawisze atlasu nieaktywne nad ekranami ankiety i w panelu oceny (pisanie komentarza, wybór oceny strzałkami)
  function studyKeys(e) {
    if (!$('stOv').hidden) return true;
    var t = e.target; return !!(t && t.closest && t.closest('#stRate, #stBar'));
  }
  function studyBlocksIntro() { return true; } // informacja startowa i samouczek tylko przez ankietę (instrukcja + samouczek po wejściu do atlasu)
  window.__sgStudy = { state: function () { return ST; }, payload: function () { return ST && stPayload(); }, items: ITEMS, verify: stVerify, sus: stSusScore, save: stSave, guessCountry: stGuessCountry };
