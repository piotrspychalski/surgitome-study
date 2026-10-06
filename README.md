# SURGITOME-STUDY — expert validation of SURGITOME

Research version of **SURGITOME**, the interactive schematic 3D atlas of postoperative gastrointestinal anatomy by Piotr Spychalski, MD, PhD (Department of Oncological, Transplant and General Surgery, Medical University of Gdańsk, Poland; ORCID [0000-0001-7111-4660](https://orcid.org/0000-0001-7111-4660)), with a built-in expert survey.

- **Study (invitation only):** https://piotrspychalski.github.io/surgitome-study/ — opens only with a personal link `?k=CODE`.
- **Main (updated) version:** https://piotrspychalski.github.io/surgitome/ · code: https://github.com/piotrspychalski/surgitome
- **How to cite SURGITOME:** Spychalski P. *SURGITOME: interactive 3D atlas of postoperative gastrointestinal anatomy* [software]. Zenodo; 2026. doi:[10.5281/zenodo.23185125](https://doi.org/10.5281/zenodo.23185125) (concept DOI). The atlas evaluated in this study is the code of SURGITOME v1.1.0 (`piotrspychalski/surgitome@063cf7c`, tag v1.1.0, doi:[10.5281/zenodo.23196737](https://doi.org/10.5281/zenodo.23196737)); every response records the commit SHA of this repository.

This is a **frozen copy** for the study: changes in the main version are deliberately not carried over. Compared with the main version, the clinical-trial views (ETHOS, SCAR) and the “Report an issue” button are hidden (comments are collected by the survey).

## The survey

Surgeons rate the anatomical accuracy of 31 items (29 operations and 2 teaching modules) on a 4-point scale (1 not accurate · 2 somewhat accurate, major revision needed · 3 quite accurate, minor revision needed · 4 highly accurate; separately “outside my expertise / cannot judge”), with optional comments, and then complete the System Usability Scale (SUS), four usefulness questions and two open questions. Analysis: item- and scale-level content validity index (I-CVI, S-CVI/Ave, S-CVI/UA; Lynn 1986; Polit & Beck 2006), modified kappa (Polit, Beck & Owen 2007), SUS score; reporting according to CHERRIES (Eysenbach 2004). No names, e-mail addresses or IP addresses are stored in the responses. English by default, Polish available.

## For the investigator

    npm install && bash tests/uruchom_wszystkie.sh     # build and full test suite
    python3 tools/make_codes.py 25                      # 25 new access codes → codes.csv (local only) + hashes in the page
    python3 tools/analiza_ankiety.py odpowiedzi/        # .json / .eml / .mbox → wyniki/ (CSV + raport.md)

Technical documentation (Polish): [docs/TECHNICAL.md](docs/TECHNICAL.md) — section “SURGITOME-STUDY”. Deployment: [WDROZENIE.md](WDROZENIE.md).

## Licence

Code: MIT ([LICENSE](LICENSE)). 3D models, illustrations and texts: CC BY 4.0 ([LICENSE-CONTENT](LICENSE-CONTENT)).

---

## SURGITOME-STUDY — wersja badawcza (PL)

Wersja badawcza atlasu SURGITOME z wbudowaną ankietą ekspercką: ocena trafności anatomicznej 31 pozycji (29 operacji i 2 moduły dydaktyczne) oraz użyteczności (SUS). Zamrożona kopia — zmiany w wersji głównej nie są tu przenoszone. Wejście tylko z osobistego linku `?k=KOD`. Wersja główna: https://piotrspychalski.github.io/surgitome/. Dokumentacja: [docs/TECHNICAL.md](docs/TECHNICAL.md), wdrożenie: [WDROZENIE.md](WDROZENIE.md).
