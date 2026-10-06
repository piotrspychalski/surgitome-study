# Wdrożenie SURGITOME-STUDY na GitHub Pages

Jak w `surgitome-wle`: osobne publiczne repozytorium, Pages z GitHub Actions, bez synchronizacji z wersją główną.

1. Repozytorium: `gh repo create piotrspychalski/surgitome-study --public --description "SURGITOME-STUDY — ekspercka walidacja atlasu SURGITOME (ankieta)" --source . --push`
2. Pages: `gh api -X POST repos/piotrspychalski/surgitome-study/pages -f build_type=workflow` (albo Settings → Pages → Source: GitHub Actions).
3. Actions: po 2–3 min zielony znacznik; adres https://piotrspychalski.github.io/surgitome-study/. Każde wypchnięcie do `main` składa stronę, uruchamia testy (`.github/workflows/pages.yml`) i publikuje; sha commitu trafia do każdej odpowiedzi.
4. Zenodo: NIE włączać integracji dla tego repozytorium (cytuje się SURGITOME, DOI 10.5281/zenodo.23185125).

Kody dostępu: `python3 tools/make_codes.py N` (dopisuje; wcześniejsze zostają ważne), w `codes.csv` wpisać osoby, potem `node build.js`, testy, commit `src/app/12-badanie-kody.js` i push. `codes.csv` nigdy nie trafia do repozytorium (`.gitignore`).

Plik `index.html` w katalogu głównym to gotowa strona (awaryjnie działa też jako Pages „Deploy from a branch”), ale zawiera sha poprzedniego commitu — właściwa publikacja idzie przez Actions.
