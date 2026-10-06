// SURGITOME — (c) 2026 Piotr Spychalski, MD, PhD, Medical University of Gdańsk · piotr.spychalski@gumed.edu.pl · ORCID 0000-0001-7111-4660 · MIT License
// Składanie SURGITOME: src/core/* → dist/core.js, src/app/* → dist/app.js, wstawienie do src/shell.html → dist/surgitome.html
// Użycie: node build.js   (bez zależności; wynik to jeden samodzielny plik HTML)
const fs = require('fs'), path = require('path');
const R = __dirname, rd = d => fs.readdirSync(path.join(R, d)).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(R, d, f), 'utf8')).join('');
// SURGITOME-STUDY: sha commitu trafia do każdej odpowiedzi (w CI GITHUB_SHA; lokalnie git rev-parse HEAD, „+zmiany” przy niezatwierdzonych zmianach)
let sha = process.env.GITHUB_SHA || '';
if (!sha) try {
  const cp = require('child_process'), git = c => cp.execSync(c, { cwd: R, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  sha = git('git rev-parse HEAD') + (git('git status --porcelain') ? '+zmiany' : '');
} catch (e) { sha = 'nieznany'; }
const core = rd('src/core'), app = rd('src/app').replace("'__STUDY_SHA__'", () => JSON.stringify(sha)), shell = fs.readFileSync(path.join(R, 'src/shell.html'), 'utf8');
fs.mkdirSync(path.join(R, 'dist'), { recursive: true });
fs.writeFileSync(path.join(R, 'dist/core.js'), core);
fs.writeFileSync(path.join(R, 'dist/app.js'), app);
const html = shell.replace('/*CORE*/', () => core).replace('/*APP*/', () => app);
fs.writeFileSync(path.join(R, 'dist/surgitome.html'), html);
console.log('dist/surgitome.html', Math.round(html.length / 1024) + ' KB', '| sha', sha);
