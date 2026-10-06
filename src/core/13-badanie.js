/* =====================================================================
   SURGITOME-STUDY: bez kategorii „Badania” (ETHOS, SCAR) — nie ma ich w nawigacji, wyszukiwarce, ulubionych ani w „Źródłach”.
   Ocena ekspercka obejmuje 31 pozycji z ANAT.PROCS (29 zabiegów + slajdy „Anatomia wątroby” i „Wybór zakresu resekcji”).
   ===================================================================== */
(function (root) {
  'use strict';
  var A = root.ANAT;
  A.PROCS = A.PROCS.filter(function (p) { return p.cat !== 'trials' && !p.split; });
  A.CATS = A.CATS.filter(function (c) { return c.id !== 'trials'; });
  // piśmiennictwo badań (rejestry ETHOS, SCAR) — bez zabiegów, do których byłoby przypisane
  if (A.BIB && A.BIB.P) Object.keys(A.BIB.P).forEach(function (id) { if (/^(ethos|scar)(-|$)/.test(id)) delete A.BIB.P[id]; });
})(typeof window !== 'undefined' ? window : globalThis);
