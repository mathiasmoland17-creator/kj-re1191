/* Trafikksituasjoner tegnet ovenfra: hvem kjører først, hva gjør du? */
(function () {
  'use strict';
  const KA = (window.KA = window.KA || {});

  const COL = { A: '#e23d28', B: '#1f6fd1', C: '#1d9a5b', D: '#e8a317' };
  const ROT = { S: 0, N: 180, E: -90, W: 90 };
  const POS = { S: [165, 232], N: [135, 68], E: [232, 135], W: [68, 165] };
  // lokale piler (bil peker opp)
  const TURN = {
    straight: 'M0 -18 L0 -150',
    left: 'M0 -18 Q0 -97 -95 -97',
    right: 'M0 -18 Q0 -67 62 -67',
  };

  function car(id, arm, turn, opts = {}) {
    const [x, y] = opts.pos || POS[arm];
    const r = opts.rot != null ? opts.rot : ROT[arm];
    const c = opts.color || COL[id] || '#444';
    const arrow = turn ? `<path d="${TURN[turn]}" fill="none" stroke="${c}" stroke-width="3.5" stroke-dasharray="7 5" stroke-linecap="round" marker-end="url(#ah-${id})" opacity=".85"/>` : '';
    const w = opts.w || 18, h = opts.h || 32;
    let body = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="5" fill="${c}" stroke="#fff" stroke-width="1.5"/>` +
      `<rect x="${-w / 2 + 2.5}" y="${-h / 2 + 5}" width="${w - 5}" height="6" rx="2" fill="#1b2530" opacity=".75"/>` +
      `<rect x="${-w / 2 + 2.5}" y="${h / 2 - 8}" width="${w - 5}" height="4" rx="1.5" fill="#1b2530" opacity=".55"/>`;
    if (opts.blue) body += `<rect x="-7" y="-2" width="6" height="3.5" fill="#3aa0ff"/><rect x="1" y="-2" width="6" height="3.5" fill="#3aa0ff"/>`;
    if (opts.blinkL) body += `<circle cx="${-w / 2}" cy="${h / 2 - 2}" r="3.2" fill="#ffb000"/><circle cx="${-w / 2}" cy="${-h / 2 + 2}" r="3.2" fill="#ffb000"/>`;
    if (opts.blinkR) body += `<circle cx="${w / 2}" cy="${h / 2 - 2}" r="3.2" fill="#ffb000"/><circle cx="${w / 2}" cy="${-h / 2 + 2}" r="3.2" fill="#ffb000"/>`;
    const lbl = opts.label || id;
    const label = `<g transform="rotate(${-r})"><text y="1" font-size="${lbl.length > 2 ? 9 : 12}" font-weight="800" text-anchor="middle" dominant-baseline="central" fill="#fff" stroke="#111" stroke-width="2.6" paint-order="stroke" font-family="Arial">${lbl}</text></g>`;
    return `<defs><marker id="ah-${id}" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="6" refY="7" orient="auto"><path d="M0 0 L14 7 L0 14 Z" fill="${c}"/></marker></defs>` +
      `<g transform="translate(${x} ${y}) rotate(${r})">${arrow}${body}${label}</g>`;
  }

  const signImg = (id, x, y, s = 22) => `<image href="${KA.signs.dataUrl(id)}" x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}"/>`;
  const SIGNPOS = { S: [198, 200], N: [102, 100], E: [200, 102], W: [100, 198] };

  function roads(arms, o = {}) {
    let s = `<rect width="300" height="300" fill="#7fa35b"/>`;
    // hus/hekk for boligstemning
    if (o.hedges) s += `<g fill="#3f6b2f">${[[60, 60], [240, 60], [60, 240], [240, 240]].map(([x, y]) => `<rect x="${x - 50}" y="${y - 50}" width="100" height="100" rx="12" opacity=".95"/>`).join('')}</g>`;
    const g = '#5d6166';
    if (arms.includes('N')) s += `<rect x="120" y="0" width="60" height="150" fill="${g}"/>`;
    if (arms.includes('S')) s += `<rect x="120" y="150" width="60" height="150" fill="${g}"/>`;
    if (arms.includes('E')) s += `<rect x="150" y="120" width="150" height="60" fill="${g}"/>`;
    if (arms.includes('W')) s += `<rect x="0" y="120" width="150" height="60" fill="${g}"/>`;
    s += `<rect x="120" y="120" width="60" height="60" fill="${g}"/>`;
    if (!o.noLines) {
      const y = '#f0c419';
      if (arms.includes('N')) s += `<line x1="150" y1="0" x2="150" y2="115" stroke="${y}" stroke-width="2" stroke-dasharray="10 8"/>`;
      if (arms.includes('S')) s += `<line x1="150" y1="185" x2="150" y2="300" stroke="${y}" stroke-width="2" stroke-dasharray="10 8"/>`;
      if (arms.includes('E')) s += `<line x1="185" y1="150" x2="300" y2="150" stroke="${y}" stroke-width="2" stroke-dasharray="10 8"/>`;
      if (arms.includes('W')) s += `<line x1="0" y1="150" x2="115" y2="150" stroke="${y}" stroke-width="2" stroke-dasharray="10 8"/>`;
    }
    return s;
  }

  function zebra(arm) {
    // gangfelt på armen, nær krysset
    const st = [];
    for (let i = 0; i < 6; i++) {
      const t = 123 + i * 10;
      if (arm === 'E') st.push(`<rect x="196" y="${t}" width="16" height="6" fill="#fff"/>`);
      if (arm === 'W') st.push(`<rect x="88" y="${t}" width="16" height="6" fill="#fff"/>`);
      if (arm === 'N') st.push(`<rect x="${t}" y="88" width="6" height="16" fill="#fff"/>`);
      if (arm === 'S') st.push(`<rect x="${t}" y="196" width="6" height="16" fill="#fff"/>`);
    }
    return st.join('');
  }
  const ped = (x, y, c = '#ffd23f') => `<g transform="translate(${x} ${y})"><circle r="6" fill="${c}" stroke="#111" stroke-width="1.5"/><circle r="2.5" fill="#111"/></g>`;

  function render(sp) {
    let s = '';
    if (sp.type === 'street') {
      s += `<rect width="300" height="300" fill="#7fa35b"/><rect x="100" y="0" width="100" height="300" fill="#5d6166"/>` +
        `<rect x="200" y="0" width="22" height="300" fill="#a7a59d"/><rect x="78" y="0" width="22" height="300" fill="#a7a59d"/>` +
        `<line x1="150" y1="0" x2="150" y2="300" stroke="#f0c419" stroke-width="2" stroke-dasharray="10 8"/>`;
      if (sp.busStop) s += `<rect x="176" y="60" width="24" height="70" fill="#6d7177"/><text x="211" y="95" font-size="10" fill="#111" font-family="Arial" transform="rotate(90 211 95)" text-anchor="middle">BUSS</text>`;
      if (sp.bikeLane) s += `<rect x="186" y="0" width="14" height="300" fill="#8c4a3a" opacity=".55"/>`;
      (sp.cars || []).forEach((c) => (s += car(c.id, 'S', c.turn, c)));
      if (sp.signs) sp.signs.forEach(([id, x, y]) => (s += signImg(id, x, y)));
      return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" role="img">${s}</svg>`;
    }
    if (sp.type === 'round') {
      s += roads(['N', 'S', 'E', 'W'], { noLines: true });
      s += `<circle cx="150" cy="150" r="64" fill="#5d6166"/><circle cx="150" cy="150" r="30" fill="#6e9a4c" stroke="#d8d6cf" stroke-width="4"/>`;
      s += `<g fill="#fff">${[0, 1, 2, 3, 4].map((i) => `<path d="M${152 + i * 6} 216 l3 6 l3 -6 z"/>`).join('')}</g>`;
      s += signImg('vikeplikt', 198, 226, 20) + signImg('rundkjoring', 220, 226, 20);
      (sp.cars || []).forEach((c) => (s += car(c.id, c.arm, c.turn, c)));
      return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" role="img">${s}</svg>`;
    }
    const arms = sp.arms || ['N', 'S', 'E', 'W'];
    s += roads(arms, sp);
    if (sp.tram) s += `<g stroke="#c9c3b8" stroke-width="2"><line x1="0" y1="140" x2="300" y2="140"/><line x1="0" y1="160" x2="300" y2="160"/></g>`;
    if (sp.parking) s += `<rect x="110" y="250" width="80" height="50" fill="#666a70"/><text x="150" y="285" font-size="18" font-weight="800" fill="#fff" text-anchor="middle" font-family="Arial">P</text>`;
    if (sp.zebra) s += zebra(sp.zebra);
    if (sp.stopLine) s += `<rect x="150" y="184" width="30" height="4" fill="#fff"/>`;
    if (sp.signs) Object.entries(sp.signs).forEach(([arm, id]) => { const [x, y] = SIGNPOS[arm]; s += signImg(id, x, y); });
    if (sp.peds) sp.peds.forEach(([x, y]) => (s += ped(x, y)));
    if (sp.tramCar) s += `<g transform="translate(${sp.tramCar[0]} ${sp.tramCar[1]})"><rect x="-38" y="-9" width="76" height="18" rx="5" fill="#2f6fcc" stroke="#fff" stroke-width="1.5"/><text y="1" font-size="10" font-weight="800" fill="#fff" text-anchor="middle" dominant-baseline="central" font-family="Arial">TRIKK</text></g>`;
    if (sp.bike) s += `<g transform="translate(${sp.bike[0]} ${sp.bike[1]})"><rect x="-3" y="-10" width="6" height="20" rx="3" fill="#ffd23f" stroke="#111"/><circle r="3.5" fill="#111"/></g>`;
    (sp.cars || []).forEach((c) => (s += car(c.id, c.arm, c.turn, c)));
    return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" role="img">${s}</svg>`;
  }

  KA.situations = [
    { id: 'hoyre1', title: 'Boligkryss uten skilt', spec: { hedges: true, cars: [{ id: 'A', arm: 'S', turn: 'straight', label: 'Du' }, { id: 'B', arm: 'E', turn: 'straight' }] }, q: 'Du (A) og B kommer samtidig til krysset. Det er ingen skilt. Hvem kjører først?', a: ['B', 'Du (A)', 'Den som er nærmest', 'Den som blinker'], e: 'Høyreregelen gjelder: B kommer fra din høyre side. Hekkene gir dårlig sikt, så du må komme sakte inn mot krysset.' },
    { id: 'venstre1', title: 'Venstresving', spec: { cars: [{ id: 'A', arm: 'S', turn: 'left', label: 'Du', blinkL: true }, { id: 'B', arm: 'N', turn: 'straight' }] }, q: 'Du skal svinge til venstre. B kommer imot og skal rett fram. Hvem kjører først?', a: ['B', 'Du (A)', 'Begge samtidig', 'Den som kom først'], e: 'Venstresvingende har vikeplikt for møtende som skal rett fram eller til høyre.' },
    { id: 'forkjors1', title: 'Forkjørsveg', spec: { signs: { S: 'forkjorsveg', N: 'forkjorsveg', E: 'vikeplikt', W: 'vikeplikt' }, cars: [{ id: 'A', arm: 'S', turn: 'straight', label: 'Du' }, { id: 'B', arm: 'E', turn: 'straight' }] }, q: 'Du kjører på forkjørsveg. B har vikepliktskilt. Hvem kjører først?', a: ['Du (A)', 'B, fordi B kommer fra høyre', 'Den som er raskest', 'Begge må stoppe'], e: 'Skilt går foran høyreregelen. B har vikeplikt.' },
    { id: 'tre1', title: 'Tre biler, ingen skilt', spec: { cars: [{ id: 'A', arm: 'S', turn: 'left', blinkL: true }, { id: 'B', arm: 'N', turn: 'right', blinkL: true }, { id: 'C', arm: 'E', turn: 'straight' }] }, q: 'Ingen skilt. I hvilken rekkefølge kjører bilene?', a: ['B, C, A', 'A, B, C', 'C, B, A', 'B, A, C'], e: 'B har ingen fra høyre og svinger av, så B kjører først. C har B på sin høyre side og venter på B. A har C på sin høyre side, og må dessuten vike for møtende fordi A svinger til venstre. Derfor kjører A sist.' },
    { id: 'tre2', title: 'Hvem viker for hvem?', spec: { cars: [{ id: 'A', arm: 'S', turn: 'straight' }, { id: 'B', arm: 'W', turn: 'straight' }] }, q: 'Ingen skilt. A og B kommer samtidig. Hvem kjører først?', a: ['A', 'B', 'Den som er nærmest', 'Begge samtidig'], e: 'For B kommer A fra høyre. B har derfor vikeplikt.' },
    { id: 'parkering1', title: 'Ut fra parkeringsplass', spec: { arms: ['S', 'E', 'W'], parking: true, cars: [{ id: 'A', arm: 'S', turn: 'left', label: 'Du', blinkL: true }, { id: 'B', arm: 'W', turn: 'straight' }, { id: 'C', arm: 'E', turn: 'straight' }] }, q: 'Du kjører ut fra en parkeringsplass. B og C kommer på vegen. Hvem har vikeplikt?', a: ['Du har vikeplikt for både B og C', 'Bare C, fordi C er til høyre', 'B og C har vikeplikt for deg', 'Bare B'], e: 'Kjører du ut fra parkeringsplass, har du vikeplikt for alle. Høyreregelen gjelder ikke her.' },
    { id: 'gangfelt1', title: 'Høyresving og gående', spec: { zebra: 'E', peds: [[204, 165]], cars: [{ id: 'A', arm: 'S', turn: 'right', label: 'Du', blinkR: true }] }, q: 'Du svinger til høyre. En gående er ute i gangfeltet du skal kjøre over. Hva gjør du?', a: ['Venter til den gående har gått over', 'Kjører foran den gående', 'Tuter', 'Kjører bak den gående mens den går'], e: 'Du har vikeplikt for gående som er ute i eller på vei ut i gangfeltet.' },
    { id: 'rundkjoring1', title: 'Rundkjøring', spec: { type: 'round', cars: [{ id: 'A', arm: 'S', turn: null, label: 'Du', pos: [165, 252] }, { id: 'B', arm: 'S', turn: null, pos: [100, 188], rot: 140 }] }, q: 'Du skal inn i rundkjøringen. B er i rundkjøringen og kommer fra venstre. Hvem kjører først?', a: ['B', 'Du (A)', 'Den som blinker', 'Den som har høyest fart'], e: 'Du har vikeplikt for trafikk som er i rundkjøringen.' },
    { id: 'trikk1', title: 'Trikk i krysset', spec: { tram: true, tramCar: [55, 140], cars: [{ id: 'A', arm: 'S', turn: 'straight', label: 'Du' }] }, q: 'Ingen skilt. Trikken kommer fra venstre. Hvem kjører først?', a: ['Trikken', 'Du, fordi trikken er på venstre side', 'Den som kommer først', 'Du, hvis du blinker'], e: 'Du har vikeplikt for sporvogn, uansett hvor den kommer fra, med mindre skilt sier noe annet.' },
    { id: 'buss1', title: 'Buss på holdeplass', spec: { type: 'street', busStop: true, signs: [['fart-50', 236, 230]], cars: [{ id: 'A', pos: [175, 240], label: 'Du' }, { id: 'B', pos: [188, 95], color: '#d97c12', label: 'Buss', w: 22, h: 60, blinkL: true }] }, q: 'Bussen gir tegn for å kjøre ut fra holdeplassen. Fartsgrensen er 50. Hva gjør du?', a: ['Senker farten og slipper bussen ut', 'Kjører forbi før bussen kommer ut', 'Tuter', 'Bussen har vikeplikt'], e: 'Der fartsgrensen er 60 km/t eller lavere, skal du gi buss som gir tegn mulighet til å kjøre ut.' },
    { id: 'utrykning1', title: 'Utrykning bakfra', spec: { type: 'street', cars: [{ id: 'A', pos: [172, 130], label: 'Du' }, { id: 'B', pos: [172, 230], color: '#f4f4f4', label: '+', blue: true }] }, q: 'En ambulanse med blålys og sirene kommer bak deg. Hva gjør du?', a: ['Holder til høyre, senker farten og stopper om nødvendig', 'Øker farten', 'Stopper brått der du er', 'Kjører over i motgående felt'], e: 'Gi fri veg tydelig og forutsigbart. Unngå å stoppe i kryss og gangfelt.' },
    { id: 'stopp1', title: 'Stoppskilt', spec: { signs: { S: 'stopp' }, stopLine: true, cars: [{ id: 'A', arm: 'S', turn: 'straight', label: 'Du' }] }, q: 'Du har stoppskilt, og ingen kommer. Hva gjør du?', a: ['Stopper helt ved stopplinjen og kjører så', 'Ruller sakte over', 'Kjører uten å stoppe', 'Stopper bare hvis noen kommer'], e: 'Ved stoppskilt er det alltid stoppeplikt, også når vegen er fri.' },
    { id: 'forkjors2', title: 'Venstresving på forkjørsveg', spec: { signs: { S: 'forkjorsveg', N: 'forkjorsveg' }, cars: [{ id: 'A', arm: 'S', turn: 'straight', label: 'Du' }, { id: 'B', arm: 'N', turn: 'left', blinkR: true }] }, q: 'Begge er på forkjørsvegen. B skal svinge til venstre (sett fra B). Hvem kjører først?', a: ['Du (A)', 'B', 'Begge samtidig', 'Den som kommer fra høyre'], e: 'B svinger til venstre og har vikeplikt for møtende, altså deg.' },
    { id: 'sykkel1', title: 'Høyresving over sykkelfelt', spec: { arms: ['N', 'S', 'E'], bike: [192, 272], cars: [{ id: 'A', arm: 'S', turn: 'right', label: 'Du', blinkR: true, pos: [165, 222] }] }, q: 'Du skal svinge til høyre. En syklist kommer bak deg til høyre og skal rett fram. Hva gjelder?', a: ['Du har vikeplikt for syklisten', 'Syklisten må vente', 'Du blinker og svinger', 'Høyreregelen gir deg forkjørsrett'], e: 'Ved høyresving må du se etter syklende i blindsonen. Du har vikeplikt for syklende som fortsetter rett fram langs vegen eller i sykkelfelt.' },
  ];
  KA.renderSituation = render;
})();
