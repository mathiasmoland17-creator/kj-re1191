/* Kjøreskole-appen: ruting, fremgang, visninger. */
(function () {
  'use strict';
  const KA = (window.KA = window.KA || {});
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const DAY = 86400000;

  // ------------------------------------------------------------
  // Lagring (bare i denne nettleseren)
  // ------------------------------------------------------------
  const KEY = 'kjoreklar-v1';
  const store = (KA.store = {
    d: { q: {}, sim: {}, safety: {}, sit: {}, days: [], mock: [] },
    load() { try { const raw = localStorage.getItem(KEY); if (raw) this.d = Object.assign(this.d, JSON.parse(raw)); } catch (e) { /* privat modus */ } },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch (e) { /* */ } },
    touchDay() { const t = new Date().toISOString().slice(0, 10); if (!this.d.days.includes(t)) { this.d.days.push(t); this.d.days = this.d.days.slice(-60); this.save(); } },
    answer(id, ok) {
      const r = this.d.q[id] || { box: 0, due: 0, r: 0, w: 0 };
      if (ok) { r.box = Math.min(5, r.box + 1); r.r++; } else { r.box = 0; r.w++; }
      r.due = Date.now() + [0, 1, 2, 4, 8, 16][r.box] * DAY * (ok ? 1 : 0) + (ok ? 0 : 60000);
      this.d.q[id] = r; this.touchDay(); this.save();
    },
    simResult(res) {
      const r = this.d.sim[res.id] || { best: 0, runs: 0, passed: 0 };
      r.best = Math.max(r.best, res.score); r.runs++; if (res.passed) r.passed++; r.last = res.score; r.at = Date.now();
      this.d.sim[res.id] = r; this.touchDay(); this.save();
    },
  });
  store.load();

  // ------------------------------------------------------------
  // Fremgang
  // ------------------------------------------------------------
  const SIM_BASES = [
    ['hoyreregel', 'Høyreregel'], ['gangfelt', 'Gangfelt'], ['rundkjoring', 'Rundkjøring'], ['glidelas', 'Glidelås'],
    ['pakjoring', 'Påkjøring motorveg'], ['avkjoring', 'Avkjøring motorveg'], ['forbikjoring', 'Forbikjøring'], ['morke', 'Mørkekjøring'],
  ];
  function progress() {
    const qs = KA.questions;
    const theory = qs.filter((q) => q.c !== 'skilt'), signs = qs.filter((q) => q.c === 'skilt');
    const m = (list) => list.length ? list.reduce((s, q) => s + Math.min(1, ((store.d.q[q.id] || {}).box || 0) / 2), 0) / list.length : 0;
    const sitDone = KA.situations.filter((s) => store.d.sit[s.id]).length / KA.situations.length;
    const safety = KA.safety.filter((s, i) => store.d.safety[i] === 2).length / KA.safety.length;
    const simPassed = SIM_BASES.filter(([b]) => KA.scenarios.some((sc) => sc.base === b && (store.d.sim[sc.id] || {}).passed)).length / SIM_BASES.length;
    const parts = { teori: m(theory), skilt: m(signs), situasjoner: sitDone, sikkerhet: safety, kjoring: simPassed };
    const total = parts.teori * 0.25 + parts.skilt * 0.1 + parts.situasjoner * 0.1 + parts.sikkerhet * 0.1 + parts.kjoring * 0.45;
    return { parts, total };
  }
  const catProgress = (c) => { const l = KA.questions.filter((q) => q.c === c); return l.length ? l.reduce((s, q) => s + Math.min(1, ((store.d.q[q.id] || {}).box || 0) / 2), 0) / l.length : 0; };
  const pct = (x) => Math.round(x * 100) + ' %';

  // ------------------------------------------------------------
  // Ruting
  // ------------------------------------------------------------
  const app = $('#app');
  const VIEWS = {};
  let current = null;
  function go(hash) { if (location.hash === '#' + hash) route(); else location.hash = hash; }
  function route() {
    const h = (location.hash || '#hjem').slice(1) || 'hjem';
    let name = h, arg = null;
    if (h.startsWith('modul-')) { name = 'modul'; arg = h.slice(6); }
    if (!VIEWS[name]) name = 'hjem';
    current = name;
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === name || (a.dataset.also || '').split(' ').includes(name)));
    app.innerHTML = '';
    VIEWS[name](arg);
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', route);

  const signImg = (id, cls = '') => `<span class="sign ${cls}" aria-hidden="true">${KA.signs.svg(id)}</span>`;

  // ------------------------------------------------------------
  // HJEM
  // ------------------------------------------------------------
  function roadMeter(p) {
    const x = 6 + p * 88;
    return `<div class="road-meter" role="img" aria-label="Du er ${pct(p)} klar for oppkjøring">
      <svg viewBox="0 0 100 14" preserveAspectRatio="none"><rect x="0" y="2" width="100" height="10" rx="1.5" class="rm-road"/><line x1="2" y1="7" x2="98" y2="7" class="rm-line"/><rect x="0" y="2" width="${x}" height="10" rx="1.5" class="rm-done"/></svg>
      <div class="rm-car" style="left:${x}%"><svg viewBox="0 0 28 14"><rect x="1" y="3" width="26" height="8" rx="3" fill="currentColor"/><rect x="15" y="4.5" width="6" height="5" rx="1" fill="#0d1a24" opacity=".6"/></svg></div>
      <div class="rm-flag" aria-hidden="true">${signImg('forkjorsveg')}</div>
    </div>`;
  }
  VIEWS.hjem = () => {
    const pr = progress();
    const due = KA.questions.filter((q) => { const r = store.d.q[q.id]; return !r || r.due <= Date.now(); }).length;
    const recent = Object.entries(store.d.sim).sort((a, b) => (b[1].at || 0) - (a[1].at || 0)).slice(0, 3);
    app.innerHTML = `
    <section class="hero">
      <div class="hero-text">
        <p class="eyebrow">Klasse B · oppkjøring</p>
        <h1>Fra skilt til motorveg. Bygg kompetansen sensor ser etter.</h1>
        <p class="lead">Teori, trafikkbilder og en 3D-simulator med ekte speil, blindsone og trafikk som reagerer på deg. Etter hver økt får du en kjøreprotokoll slik en sensor ville vurdert deg.</p>
        <div class="hero-actions"><a class="btn btn-primary" href="#kjor">Start simulatoren</a><a class="btn" href="#ov">Dagens øving (${Math.min(due, 12)} spm)</a></div>
      </div>
      <div class="ready card">
        <div class="ready-head"><span>Klar for oppkjøring</span><b>${pct(pr.total)}</b></div>
        ${roadMeter(pr.total)}
        <ul class="ready-parts">
          ${[['teori', 'Teori', 'laer'], ['skilt', 'Skilt', 'skilt'], ['situasjoner', 'Trafikkbilder', 'situasjoner'], ['sikkerhet', 'Sikkerhetskontroll', 'sikkerhet'], ['kjoring', 'Kjøreøvelser bestått', 'kjor']].map(([k, n, h]) => `<li class="lnk"><a href="#${h}"><span>${n}</span><span class="bar"><i style="width:${pr.parts[k] * 100}%"></i></span><b>${pct(pr.parts[k])}</b></a></li>`).join('')}
        </ul>
        <p class="note">Fremgangen lagres bare i denne nettleseren.</p>
      </div>
    </section>
    <section class="block">
      <div class="block-head"><h2>Kjøreøvelser</h2><a href="#kjor">Alle øvelser</a></div>
      <div class="grid cards3">${['pakjoring-middels', 'rundkjoring', 'glidelas'].map((id) => scenCard(KA.scenarioById[id])).join('')}</div>
    </section>
    <section class="block">
      <div class="block-head"><h2>Læringsløp</h2><a href="#laer">Alle moduler</a></div>
      <ol class="path">${KA.modules.map((m) => `<li><a href="#modul-${m.id}">${signImg(m.sign, 'sm')}<span>${esc(m.title)}</span><span class="mini-bar"><i style="width:${catProgress(m.id) * 100}%"></i></span></a></li>`).join('')}</ol>
    </section>
    ${recent.length ? `<section class="block"><div class="block-head"><h2>Siste kjøringer</h2></div><ul class="recent">${recent.map(([id, r]) => { const sc = KA.scenarioById[id]; return sc ? `<li><span>${esc(sc.title)} <small>${esc(sc.level || '')}</small></span><b class="${r.last >= 70 ? 'ok' : 'bad'}">${r.last} p</b><small>beste ${r.best} · ${r.runs} forsøk</small></li>` : ''; }).join('')}</ul></section>` : ''}`;
    app.querySelectorAll('[data-sim]').forEach((b) => (b.onclick = () => startSim(b.dataset.sim)));
  };

  // ------------------------------------------------------------
  // LÆR
  // ------------------------------------------------------------
  VIEWS.laer = () => {
    const groups = {};
    KA.modules.forEach((m) => (groups[m.group] = groups[m.group] || []).push(m));
    app.innerHTML = `<header class="page-head"><p class="eyebrow">Pensum</p><h1>Lær</h1><p class="lead">Alt du må kunne til oppkjøring, samlet i korte moduler. Hver modul har nøkkelpunkter, det sensor ser etter, spørsmål og, der det passer, en kjøreøvelse.</p>
      <div class="quick"><a class="chip" href="#skilt">${signImg('vikeplikt', 'xs')} Skiltbank (${KA.signs.list.length})</a><a class="chip" href="#sikkerhet">Sikkerhetskontroll</a><a class="chip" href="#situasjoner">Trafikkbilder</a></div></header>
      ${Object.entries(groups).map(([g, list]) => `<section class="block"><h2 class="group-title">${esc(g)}</h2><div class="grid cards2">${list.map((m) => `
        <a class="card mod-card" href="#modul-${m.id}">${signImg(m.sign, 'md')}<div><h3>${esc(m.title)}</h3><p>${esc(m.intro)}</p><span class="mini-bar"><i style="width:${catProgress(m.id) * 100}%"></i></span></div></a>`).join('')}</div></section>`).join('')}`;
  };
  VIEWS.modul = (id) => {
    const m = KA.modules.find((x) => x.id === id) || KA.modules[0];
    const idx = KA.modules.indexOf(m), next = KA.modules[idx + 1];
    const qn = KA.questions.filter((q) => q.c === m.id).length;
    const sims = KA.scenarios.filter((s) => s.base === m.sim);
    app.innerHTML = `<article class="lesson">
      <a class="back" href="#laer">← Alle moduler</a>
      <header class="lesson-head">${signImg(m.sign, 'lg')}<div><p class="eyebrow">${esc(m.group)}</p><h1>${esc(m.title)}</h1><p class="lead">${esc(m.intro)}</p></div></header>
      <div class="lesson-grid">
        <div class="prose">${m.body}</div>
        <aside class="lesson-side">
          <div class="card keybox"><h3>Husk</h3><ul>${m.keys.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></div>
          <div class="card sensorbox"><h3>Sensor ser etter</h3><ul>${m.sensor.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></div>
          ${qn ? `<button type="button" class="btn btn-primary wide" id="mq">Øv: ${qn} spørsmål</button>` : ''}
          ${sims.map((s) => `<button type="button" class="btn wide" data-sim="${s.id}">Kjør: ${esc(s.title)}${s.level && sims.length > 1 ? ' · ' + esc(s.level) : ''}</button>`).join('')}
        </aside>
      </div>
      ${next ? `<a class="next card" href="#modul-${next.id}"><small>Neste modul</small><b>${esc(next.title)} →</b></a>` : ''}
    </article>`;
    const b = $('#mq'); if (b) b.onclick = () => runQuiz({ title: m.title, list: shuffle(KA.questions.filter((q) => q.c === m.id)), back: '#modul-' + m.id });
    app.querySelectorAll('[data-sim]').forEach((x) => (x.onclick = () => startSim(x.dataset.sim)));
  };

  // ------------------------------------------------------------
  // SKILT
  // ------------------------------------------------------------
  VIEWS.skilt = () => {
    const cats = KA.signs.cats;
    let active = 'alle';
    app.innerHTML = `<header class="page-head"><p class="eyebrow">Skiltbank</p><h1>Trafikkskilt</h1><p class="lead">De viktigste norske skiltene, med betydning og hva du skal gjøre. Trykk på et skilt for å lese mer.</p>
      <div class="tabs" role="tablist"><button type="button" class="tab active" data-c="alle">Alle</button>${Object.entries(cats).map(([k, c]) => `<button type="button" class="tab" data-c="${k}">${c.name}</button>`).join('')}</div>
      <button type="button" class="btn btn-primary" id="signquiz">Øv på skilt (${pct(catProgress('skilt'))} kan du)</button></header>
      <p class="cat-desc" id="catdesc"></p>
      <div class="sign-grid" id="sg"></div>
      <dialog class="sheet" id="sd"></dialog>`;
    const draw = () => {
      $('#catdesc').textContent = active === 'alle' ? '' : cats[active].text;
      $('#sg').innerHTML = KA.signs.list.filter((s) => active === 'alle' || s.cat === active).map((s) => {
        const r = store.d.q['skilt-' + s.id];
        return `<button type="button" class="sign-tile ${r && r.box >= 2 ? 'known' : ''}" data-id="${s.id}">${signImg(s.id, 'md')}<span>${esc(s.name)}</span>${s.nr ? `<small>${s.nr}</small>` : ''}</button>`;
      }).join('');
    };
    draw();
    app.querySelectorAll('.tab').forEach((t) => (t.onclick = () => { active = t.dataset.c; app.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t)); draw(); }));
    $('#sg').onclick = (e) => {
      const b = e.target.closest('.sign-tile'); if (!b) return;
      const s = KA.signs.byId[b.dataset.id];
      const d = $('#sd');
      d.innerHTML = `<div class="sheet-body">${signImg(s.id, 'xl')}<div><p class="eyebrow">${cats[s.cat].name}${s.nr ? ' · nr. ' + s.nr : ''}</p><h2>${esc(s.name)}</h2><p>${esc(s.desc)}</p></div></div><form method="dialog"><button class="btn">Lukk</button></form>`;
      if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    };
    $('#signquiz').onclick = () => {
      const list = KA.questions.filter((q) => q.c === 'skilt');
      const sorted = shuffle(list).sort((a, b) => ((store.d.q[a.id] || {}).box || 0) - ((store.d.q[b.id] || {}).box || 0));
      runQuiz({ title: 'Skilt', list: sorted.slice(0, 15), back: '#skilt' });
    };
  };

  // ------------------------------------------------------------
  // ØV (quiz)
  // ------------------------------------------------------------
  VIEWS.ov = () => {
    const now = Date.now();
    const due = KA.questions.filter((q) => { const r = store.d.q[q.id]; return !r || r.due <= now; });
    app.innerHTML = `<header class="page-head"><p class="eyebrow">Øving</p><h1>Øv på teori</h1><p class="lead">Spørsmålene kommer igjen med økende mellomrom når du kan dem, og raskt igjen når du svarer feil.</p></header>
      <div class="grid cards3">
        <button type="button" class="card action" id="daily"><b>Dagens øving</b><span>12 spørsmål du bør repetere nå (${due.length} venter)</span></button>
        <button type="button" class="card action" id="weak"><b>Svake punkter</b><span>Spørsmålene du har bommet mest på</span></button>
        <button type="button" class="card action exam" id="exam"><b>Teoriprøve</b><span>45 spørsmål. Du består med maks 7 feil, som på den ekte prøven.</span></button>
      </div>
      <section class="block"><h2 class="group-title">Velg tema</h2><div class="cat-list">${Object.entries(KA.qcats).map(([c, n]) => { const cnt = KA.questions.filter((q) => q.c === c).length; return cnt ? `<button type="button" class="cat-row" data-c="${c}"><span>${esc(n)}</span><span class="mini-bar"><i style="width:${catProgress(c) * 100}%"></i></span><small>${cnt}</small></button>` : ''; }).join('')}</div></section>
      <section class="block"><a class="card action" href="#situasjoner"><b>Trafikkbilder: hvem kjører først?</b><span>${KA.situations.length} situasjoner sett ovenfra</span></a></section>`;
    $('#daily').onclick = () => { const l = shuffle(due).slice(0, 12); runQuiz({ title: 'Dagens øving', list: l.length ? l : shuffle(KA.questions).slice(0, 12), back: '#ov' }); };
    $('#weak').onclick = () => { const l = KA.questions.slice().sort((a, b) => ((store.d.q[b.id] || {}).w || 0) - ((store.d.q[a.id] || {}).w || 0) || ((store.d.q[a.id] || {}).box || 0) - ((store.d.q[b.id] || {}).box || 0)); runQuiz({ title: 'Svake punkter', list: l.slice(0, 12), back: '#ov' }); };
    $('#exam').onclick = () => {
      const theory = shuffle(KA.questions.filter((q) => q.c !== 'skilt')).slice(0, 35), sg = shuffle(KA.questions.filter((q) => q.c === 'skilt')).slice(0, 10);
      runQuiz({ title: 'Teoriprøve', list: shuffle(theory.concat(sg)), back: '#ov', exam: true });
    };
    app.querySelectorAll('.cat-row').forEach((b) => (b.onclick = () => runQuiz({ title: KA.qcats[b.dataset.c], list: shuffle(KA.questions.filter((q) => q.c === b.dataset.c)), back: '#ov' })));
  };

  function runQuiz({ title, list, back, exam }) {
    let i = 0, right = 0;
    const wrong = [];
    const t0 = Date.now();
    const render = () => {
      if (i >= list.length) return done();
      const q = list[i];
      const opts = shuffle(q.a.map((t, k) => ({ t, ok: k === 0 })));
      app.innerHTML = `<section class="quiz">
        <div class="quiz-top"><a class="back" href="${back}">← Avslutt</a><span>${esc(title)}</span><span class="tnum">${i + 1} / ${list.length}</span></div>
        <div class="quiz-bar"><i style="width:${(i / list.length) * 100}%"></i></div>
        <div class="quiz-card card">
          ${q.sign ? `<div class="quiz-fig">${signImg(q.sign, 'xl')}</div>` : ''}
          <p class="quiz-cat">${esc(KA.qcats[q.c] || '')}</p>
          <h2 class="quiz-q">${esc(q.q)}</h2>
          <div class="quiz-opts">${opts.map((o, k) => `<button type="button" class="opt" data-k="${k}"><span class="opt-l">${'ABCD'[k]}</span><span>${esc(o.t)}</span></button>`).join('')}</div>
          <div class="quiz-exp" hidden></div>
          <div class="quiz-next" hidden><button type="button" class="btn btn-primary" id="nx">${i + 1 < list.length ? 'Neste' : 'Se resultat'}</button></div>
        </div></section>`;
      app.querySelectorAll('.opt').forEach((b) => (b.onclick = () => {
        const o = opts[+b.dataset.k];
        store.answer(q.id, o.ok);
        if (o.ok) right++; else wrong.push(q);
        app.querySelectorAll('.opt').forEach((x, k) => { x.disabled = true; if (opts[k].ok) x.classList.add('right'); });
        if (!o.ok) b.classList.add('wrong');
        if (!exam || true) {
          const ex = $('.quiz-exp'); ex.hidden = false;
          ex.innerHTML = `<b class="${o.ok ? 'ok' : 'bad'}">${o.ok ? 'Riktig' : 'Feil'}</b> ${esc(q.e)}`;
        }
        $('.quiz-next').hidden = false; $('#nx').focus();
        $('#nx').onclick = () => { i++; render(); };
      }));
    };
    const done = () => {
      const wrongN = list.length - right;
      const passed = exam ? wrongN <= 7 : right / list.length >= 0.8;
      const mins = Math.round((Date.now() - t0) / 60000);
      app.innerHTML = `<section class="quiz-result card">
        <p class="eyebrow">${esc(title)}</p>
        <h1>${right} av ${list.length} riktige</h1>
        ${exam ? `<p class="verdict ${passed ? 'ok' : 'bad'}">${passed ? 'Bestått' : 'Ikke bestått'}: ${wrongN} feil (grensen er 7)</p>` : `<p class="verdict ${passed ? 'ok' : 'bad'}">${passed ? 'Godt jobbet!' : 'Ta en ny runde på det du bommet på.'}</p>`}
        <p class="note">Tid: ${mins} min</p>
        ${wrong.length ? `<h3>Se over igjen</h3><ul class="review">${wrong.map((q) => `<li>${q.sign ? signImg(q.sign, 'xs') : ''}<div><b>${esc(q.q)}</b><span>Riktig: ${esc(q.a[0])}</span><small>${esc(q.e)}</small></div></li>`).join('')}</ul>` : ''}
        <div class="row"><a class="btn" href="${back}">Tilbake</a>${wrong.length ? '<button type="button" class="btn btn-primary" id="again">Øv på feilene</button>' : ''}</div></section>`;
      const a = $('#again'); if (a) a.onclick = () => runQuiz({ title: title + ': feil', list: shuffle(wrong), back });
    };
    render();
  }

  // ------------------------------------------------------------
  // TRAFIKKBILDER
  // ------------------------------------------------------------
  VIEWS.situasjoner = () => {
    let i = 0;
    const list = KA.situations;
    const render = () => {
      const s = list[i];
      const opts = shuffle(s.a.map((t, k) => ({ t, ok: k === 0 })));
      app.innerHTML = `<section class="sit">
        <header class="page-head compact"><p class="eyebrow">Trafikkbilder · ${i + 1} / ${list.length}</p><h1>${esc(s.title)}</h1></header>
        <div class="sit-grid">
          <figure class="sit-fig card">${KA.renderSituation(s.spec)}<figcaption>Sett ovenfra. Stiplet pil viser hvor bilen skal.</figcaption></figure>
          <div class="sit-q">
            <h2>${esc(s.q)}</h2>
            <div class="quiz-opts">${opts.map((o, k) => `<button type="button" class="opt" data-k="${k}"><span class="opt-l">${'ABCD'[k]}</span><span>${esc(o.t)}</span></button>`).join('')}</div>
            <div class="quiz-exp" hidden></div>
            <div class="row"><button type="button" class="btn" id="pv" ${i === 0 ? 'disabled' : ''}>← Forrige</button><button type="button" class="btn btn-primary" id="nv">${i + 1 < list.length ? 'Neste →' : 'Ferdig'}</button></div>
          </div>
        </div>
        <div class="sit-dots">${list.map((x, k) => `<button type="button" class="dot ${store.d.sit[x.id] ? 'done' : ''} ${k === i ? 'cur' : ''}" data-i="${k}" aria-label="Situasjon ${k + 1}"></button>`).join('')}</div>
      </section>`;
      app.querySelectorAll('.opt').forEach((b) => (b.onclick = () => {
        const o = opts[+b.dataset.k];
        app.querySelectorAll('.opt').forEach((x, k) => { x.disabled = true; if (opts[k].ok) x.classList.add('right'); });
        if (!o.ok) b.classList.add('wrong'); else { store.d.sit[s.id] = 1; store.touchDay(); store.save(); }
        const ex = $('.quiz-exp'); ex.hidden = false; ex.innerHTML = `<b class="${o.ok ? 'ok' : 'bad'}">${o.ok ? 'Riktig' : 'Feil'}</b> ${esc(s.e)}`;
      }));
      $('#pv').onclick = () => { i = Math.max(0, i - 1); render(); };
      $('#nv').onclick = () => { if (i + 1 < list.length) { i++; render(); } else go('ov'); };
      app.querySelectorAll('.dot').forEach((d) => (d.onclick = () => { i = +d.dataset.i; render(); }));
    };
    render();
  };

  // ------------------------------------------------------------
  // KJØR (simulator)
  // ------------------------------------------------------------
  function scenCard(s) {
    if (!s) return '';
    const r = store.d.sim[s.id];
    const st = r ? (r.passed ? `<span class="pill ok">Bestått · beste ${r.best}</span>` : `<span class="pill bad">Beste ${r.best} p</span>`) : '<span class="pill">Ikke prøvd</span>';
    return `<article class="card scen ${s.night ? 'night' : ''}">${signImg(s.icon, 'md')}<div class="scen-body"><p class="eyebrow">${esc(s.group)} · ${esc(s.level)}</p><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p><div class="scen-foot">${st}<button type="button" class="btn btn-primary" data-sim="${s.id}">Kjør</button></div></div></article>`;
  }
  VIEWS.kjor = () => {
    const groups = {};
    KA.scenarios.forEach((s) => (groups[s.group] = groups[s.group] || []).push(s));
    const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; } })();
    app.innerHTML = `<header class="page-head"><p class="eyebrow">3D-simulator</p><h1>Kjøreøvelser</h1>
      <p class="lead">Du kjører selv i førerperspektiv, med innvendig speil og sidespeil som viser det som faktisk er bak deg. Blindsonen er ekte: biler ved siden av deg ses bare med skulderblikk. Trafikken følger trafikkreglene og reagerer på deg.</p>
      ${webgl ? '' : '<p class="warn">Nettleseren din støtter ikke WebGL, så simulatoren kan ikke kjøre her.</p>'}
      <div class="keys-strip"><span><kbd>↑</kbd><kbd>↓</kbd> gass/brems</span><span><kbd>←</kbd><kbd>→</kbd> ratt</span><span><kbd>Q</kbd><kbd>E</kbd> blinklys</span><span><kbd>R</kbd> speil</span><span>hold <kbd>Z</kbd>/<kbd>C</kbd> skulderblikk</span><span><kbd>V</kbd> kamera</span></div></header>
      ${Object.entries(groups).map(([g, l]) => `<section class="block"><h2 class="group-title">${esc(g)}</h2><div class="grid cards2">${l.map(scenCard).join('')}</div></section>`).join('')}`;
    app.querySelectorAll('[data-sim]').forEach((b) => (b.onclick = () => startSim(b.dataset.sim)));
  };
  function startSim(id, extra = {}) {
    const scen = KA.scenarioById[id];
    if (!scen) return;
    if (!window.THREE) { alertBox('3D-biblioteket kunne ikke lastes. Sjekk nettforbindelsen og prøv igjen.'); return; }
    const host = document.createElement('div');
    host.className = 'sim-host';
    document.body.appendChild(host);
    document.body.classList.add('sim-open');
    const close = () => { host.remove(); document.body.classList.remove('sim-open'); if (!extra.keepView) route(); };
    try {
      KA.sim.engine = new KA.sim.Engine(host, scen, Object.assign({
        onExit: () => { close(); if (extra.onExit) extra.onExit(); },
        onResult: (res) => { store.simResult(res); if (extra.onResult) extra.onResult(res); },
        onNext: extra.onNext ? (res) => { host.remove(); document.body.classList.remove('sim-open'); extra.onNext(res); } : null,
        nextLabel: extra.nextLabel,
        coach: extra.coach != null ? extra.coach : true,
      }, {}));
    } catch (e) {
      console.error(e);
      close();
      alertBox('Simulatoren kunne ikke starte på denne enheten: ' + esc(e.message));
    }
  }
  function alertBox(msg) {
    const d = document.createElement('dialog'); d.className = 'sheet';
    d.innerHTML = `<p>${msg}</p><form method="dialog"><button class="btn">OK</button></form>`;
    document.body.appendChild(d); if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    d.addEventListener('close', () => d.remove());
  }

  // ------------------------------------------------------------
  // SIKKERHETSKONTROLL
  // ------------------------------------------------------------
  VIEWS.sikkerhet = () => {
    const groups = {};
    KA.safety.forEach((s, i) => (groups[s.g] = groups[s.g] || []).push([s, i]));
    app.innerHTML = `<header class="page-head"><p class="eyebrow">Oppkjøringens første del</p><h1>Sikkerhetskontroll</h1><p class="lead">Sensor spør deg om to–tre punkter på bilen, og du viser og forklarer. Øv til du kan svare med egne ord, og forklar også hvorfor det er viktig for sikkerheten.</p>
      <div class="row"><button type="button" class="btn btn-primary" id="draw">Trekk som sensor</button><span class="note">${pct(KA.safety.filter((s, i) => store.d.safety[i] === 2).length / KA.safety.length)} kan du</span></div></header>
      ${Object.entries(groups).map(([g, l]) => `<section class="block"><h2 class="group-title">${esc(g)}</h2><div class="flash-list">${l.map(([s, i]) => `
        <details class="flash ${store.d.safety[i] === 2 ? 'known' : store.d.safety[i] === 1 ? 'practice' : ''}" data-i="${i}"><summary>${esc(s.q)}</summary><div class="flash-a"><p>${esc(s.a)}</p><div class="row"><button type="button" class="btn sm" data-v="1">Må øve mer</button><button type="button" class="btn sm btn-primary" data-v="2">Kan dette</button></div></div></details>`).join('')}</div></section>`).join('')}`;
    app.querySelectorAll('.flash').forEach((f) => f.addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]'); if (!b) return;
      store.d.safety[f.dataset.i] = +b.dataset.v; store.touchDay(); store.save();
      f.classList.toggle('known', b.dataset.v === '2'); f.classList.toggle('practice', b.dataset.v === '1'); f.open = false;
    }));
    $('#draw').onclick = () => safetyDraw(2, () => go('sikkerhet'));
  };
  function safetyDraw(n, onDone, wrapTitle) {
    const pick = shuffle(KA.safety.map((s, i) => [s, i])).slice(0, n);
    let k = 0; const res = [];
    const render = () => {
      if (k >= pick.length) return onDone(res);
      const [s, i] = pick[k];
      app.innerHTML = `<section class="quiz"><div class="quiz-top"><span>${wrapTitle || 'Sikkerhetskontroll'}</span><span class="tnum">${k + 1} / ${pick.length}</span></div>
        <div class="card quiz-card"><p class="quiz-cat">${esc(s.g)}</p><h2 class="quiz-q">Sensor: «${esc(s.q)}»</h2><p class="note">Svar høyt, som om du står ved bilen. Vis med hendene og forklar hvorfor. Trykk så for å se fasit.</p>
        <button type="button" class="btn btn-primary" id="show">Vis fasit</button><div class="quiz-exp" hidden><p>${esc(s.a)}</p><div class="row"><button type="button" class="btn" data-v="1">Jeg var usikker</button><button type="button" class="btn btn-primary" data-v="2">Jeg kunne det</button></div></div></div></section>`;
      $('#show').onclick = () => { $('.quiz-exp').hidden = false; $('#show').hidden = true; };
      app.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => { store.d.safety[i] = +b.dataset.v; store.save(); res.push({ q: s.q, ok: b.dataset.v === '2' }); k++; render(); }));
    };
    render();
  }

  // ------------------------------------------------------------
  // OPPKJØRING
  // ------------------------------------------------------------
  VIEWS.oppkjoring = () => {
    const m = KA.modules.find((x) => x.id === 'oppkjoring');
    const mocks = store.d.mock || [];
    app.innerHTML = `<header class="page-head"><p class="eyebrow">Prøvedagen</p><h1>Oppkjøringen</h1><p class="lead">${esc(m.intro)}</p></header>
      <section class="card mock">
        <div><p class="eyebrow">Generalprøve</p><h2>Prøveoppkjøring</h2><p>Sikkerhetskontroll og tre kjøreøvelser etter hverandre, uten tips underveis, slik det er på prøven. Til slutt får du en samlet vurdering.</p>
        ${mocks.length ? `<p class="note">Sist: ${mocks[mocks.length - 1].passed ? 'bestått' : 'ikke bestått'} (${mocks.length} forsøk)</p>` : ''}</div>
        <button type="button" class="btn btn-primary" id="mock">Start prøveoppkjøring</button>
      </section>
      <div class="lesson-grid"><div class="prose">${m.body}</div>
      <aside class="lesson-side"><div class="card keybox"><h3>Sjekkliste før prøven</h3><ul class="check">
        ${['Gyldig legitimasjon', 'Bestått teoriprøve', 'Alle obligatoriske kurs fullført (trinn 2–4)', 'Kjent med bilen du skal bruke', 'Øvd på sikkerhetskontroll høyt', 'Sovet godt og spist', 'Vært på stedet i god tid'].map((t, i) => `<li><label><input type="checkbox" id="ck${i}"> ${esc(t)}</label></li>`).join('')}
      </ul></div></aside></div>`;
    $('#mock').onclick = mockExam;
    for (let i = 0; i < 7; i++) {
      const c = $('#ck' + i);
      try { c.checked = localStorage.getItem('kjoreklar-ck' + i) === '1'; } catch (e) { /* */ }
      c.onchange = () => { try { localStorage.setItem('kjoreklar-ck' + i, c.checked ? '1' : '0'); } catch (e) { /* */ } };
    }
  };
  function mockExam() {
    const by = shuffle(['rundkjoring', 'glidelas', 'gangfelt', 'hoyreregel'])[0];
    const mw = shuffle(['pakjoring-middels', 'pakjoring-tett', 'avkjoring'])[0];
    const land = 'forbikjoring';
    const plan = [by, mw, land];
    const out = { safety: [], drives: [] };
    safetyDraw(2, (res) => {
      out.safety = res;
      let k = 0;
      const next = () => {
        if (k >= plan.length) return report();
        const id = plan[k];
        app.innerHTML = `<section class="card quiz-result"><p class="eyebrow">Prøveoppkjøring · kjøring ${k + 1} av ${plan.length}</p><h1>${esc(KA.scenarioById[id].title)}</h1><p>${esc(KA.scenarioById[id].task)}</p><div class="row"><button type="button" class="btn btn-primary" id="go">Kjør</button><a class="btn" href="#oppkjoring">Avbryt</a></div></section>`;
        $('#go').onclick = () => startSim(id, {
          coach: false, keepView: true, nextLabel: k + 1 < plan.length ? 'Neste del av prøven' : 'Se samlet vurdering',
          onResult: (r) => { out.drives[k] = r; },
          onNext: () => { k++; next(); },
          onExit: () => go('oppkjoring'),
        });
      };
      next();
    }, 'Prøveoppkjøring · sikkerhetskontroll');
    function report() {
      const crit = out.drives.some((d) => d.items.some((i) => i.sev === 'critical'));
      const majors = out.drives.reduce((s, d) => s + d.items.filter((i) => i.sev === 'major').length, 0);
      const minors = out.drives.reduce((s, d) => s + d.items.filter((i) => i.sev === 'minor').length, 0);
      const safeOk = out.safety.filter((s) => s.ok).length;
      const passed = !crit && majors === 0 && minors <= 5;
      store.d.mock.push({ at: Date.now(), passed }); store.save();
      const all = out.drives.flatMap((d) => d.items.filter((i) => i.sev !== 'good').map((i) => Object.assign({ sc: KA.scenarioById[d.id].title }, i)));
      app.innerHTML = `<section class="card quiz-result"><p class="eyebrow">Prøveoppkjøring · samlet vurdering</p>
        <h1 class="verdict ${passed ? 'ok' : 'bad'}">${passed ? 'Bestått' : 'Ikke bestått'}</h1>
        <p>${crit ? 'Du havnet i en farlig situasjon. Sensor ville grepet inn.' : majors ? `${majors} alvorlige feil. Hver av dem kan alene gi ikke bestått.` : minors > 5 ? 'Mange mindre feil gir et helhetsinntrykk av usikker kjøring.' : 'Trygg og selvstendig kjøring med få anmerkninger.'}</p>
        <ul class="ready-parts"><li><span>Sikkerhetskontroll</span><b>${safeOk} / ${out.safety.length}</b></li>${out.drives.map((d) => `<li><span>${esc(KA.scenarioById[d.id].title)}</span><b class="${d.passed ? 'ok' : 'bad'}">${d.score} p</b></li>`).join('')}</ul>
        ${all.length ? `<h3>Dette må du jobbe med</h3><ul class="review">${all.map((i) => `<li><div><b>${esc(i.title)}</b><span>${esc(i.sc)} · ${esc(i.cat)}</span>${i.text ? `<small>${esc(i.text)}</small>` : ''}</div></li>`).join('')}</ul>` : ''}
        <div class="row"><a class="btn btn-primary" href="#oppkjoring">Ferdig</a></div></section>`;
    }
  }

  // ------------------------------------------------------------
  // start
  // ------------------------------------------------------------
  KA.app = { go, startSim };
  route();
})();
