/* Norske trafikkskilt tegnet som SVG (forenklet, men tro mot form, farge og symbol). */
(function () {
  'use strict';
  const KA = (window.KA = window.KA || {});

  const R = '#c8102e', B = '#0b4ea2', Y = '#f6c400', W = '#ffffff', K = '#111111', G = '#9aa0a6';

  const wrap = (inner, vb = '0 0 100 100') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="256" height="256">${inner}</svg>`;

  // ---------- skiltformer ----------
  const warn = (inner, fill = W) =>
    `<path d="M50 5 L96 89 Q97 93 92 93 L8 93 Q3 93 4 89 Z" fill="${R}"/>` +
    `<path d="M50 21 L83 83 L17 83 Z" fill="${fill}"/>${inner}`;
  const yieldSign = (inner = '') =>
    `<path d="M8 8 L92 8 Q96 8 94 12 L52 92 Q50 96 48 92 L6 12 Q4 8 8 8 Z" fill="${R}"/>` +
    `<path d="M22 17 L78 17 L50 72 Z" fill="${W}"/>${inner}`;
  const forbud = (inner, fill = W) =>
    `<circle cx="50" cy="50" r="47" fill="${R}"/><circle cx="50" cy="50" r="36" fill="${fill}"/>${inner}`;
  const paabud = (inner) =>
    `<circle cx="50" cy="50" r="47" fill="${W}"/><circle cx="50" cy="50" r="44" fill="${B}"/>${inner}`;
  const info = (inner, fill = B) =>
    `<rect x="3" y="3" width="94" height="94" rx="9" fill="${W}"/><rect x="6" y="6" width="88" height="88" rx="7" fill="${fill}"/>${inner}`;
  const stroke = (d, w = 6, c = K, cap = 'round') =>
    `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
  const txt = (s, x, y, size, c = K, weight = 800, family = 'Arial, Helvetica, sans-serif') =>
    `<text x="${x}" y="${y}" font-family="${family}" font-weight="${weight}" font-size="${size}" fill="${c}" text-anchor="middle" dominant-baseline="central">${s}</text>`;

  // ---------- symboler ----------
  const carRear = (x, y, s, c = K) => {
    // bil sett bakfra
    const w = 22 * s, h = 14 * s;
    return `<g transform="translate(${x - w / 2} ${y - h / 2})">` +
      `<path d="M${3 * s} ${6 * s} L${6 * s} ${0} L${16 * s} 0 L${19 * s} ${6 * s} L${22 * s} ${7 * s} L${22 * s} ${12 * s} L0 ${12 * s} L0 ${7 * s} Z" fill="${c}"/>` +
      `<rect x="${1 * s}" y="${11 * s}" width="${5 * s}" height="${4 * s}" rx="${1 * s}" fill="${c}"/>` +
      `<rect x="${16 * s}" y="${11 * s}" width="${5 * s}" height="${4 * s}" rx="${1 * s}" fill="${c}"/>` +
      `<rect x="${7 * s}" y="${1.5 * s}" width="${8 * s}" height="${3.5 * s}" fill="${W}" opacity=".85"/></g>`;
  };
  const person = (x, y, s = 1, c = K) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="2" cy="-17" r="4.5" fill="${c}"/>` +
    stroke('M1 -11 L-2 2 L-8 15 M-2 2 L5 15 M0 -8 L-8 -2 M0 -8 L8 -1', 4.5, c) + `</g>`;
  const bike = (x, y, s = 1, c = K) =>
    `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${c}" stroke-width="3">` +
    `<circle cx="-11" cy="4" r="8"/><circle cx="11" cy="4" r="8"/>` +
    `<path d="M-11 4 L-3 -8 L8 -8 L11 4 M-3 -8 L1 4 L-11 4 M8 -8 L6 -13 L2 -13 M-5 -12 L0 -12" stroke-linejoin="round"/></g>`;
  const arrowUp = (x, y, len, w, c) =>
    `<path d="M${x} ${y - len / 2} L${x + w} ${y - len / 2 + w * 1.1} L${x + w * 0.4} ${y - len / 2 + w * 1.1} L${x + w * 0.4} ${y + len / 2} L${x - w * 0.4} ${y + len / 2} L${x - w * 0.4} ${y - len / 2 + w * 1.1} L${x - w} ${y - len / 2 + w * 1.1} Z" fill="${c}"/>`;
  const arrowDown = (x, y, len, w, c) =>
    `<g transform="rotate(180 ${x} ${y})">${arrowUp(x, y, len, w, c)}</g>`;
  const slash = (c = K, n = 1) => {
    if (n === 1) return stroke('M22 78 L78 22', 6, c);
    let s = '';
    for (let i = -2; i <= 2; i++) s += stroke(`M${26 + i * 7} ${82 + i * 7} L${82 + i * 7} ${26 + i * 7}`, 2.2, c, 'butt');
    return `<clipPath id="cl${n}"><circle cx="50" cy="50" r="38"/></clipPath><g clip-path="url(#cl${n})">${s}</g>`;
  };
  const moose = (c = K) =>
    `<g fill="${c}"><path d="M30 64 Q30 56 40 55 L58 55 Q63 50 66 50 L70 47 Q74 46 75 49 L75 53 Q73 56 70 56 L68 58 Q67 63 64 65 L64 76 L61 76 L60 67 L46 67 L44 76 L41 76 L40 67 Q36 68 35 76 L32 76 Q32 69 30 64 Z"/>` +
    `<path d="M66 50 Q62 42 64 38 L66 43 L67 37 L69 43 L71 38 L71 45 Q70 48 68 49 Z"/></g>`;

  const S = [];
  const add = (o) => S.push(o);

  // ================= FARESKILT =================
  add({ id: 'farlig-sving', nr: '100', cat: 'fare', name: 'Farlig sving', desc: 'Varsler en sving som kan være vanskelig å se eller krapp. Pilens retning viser hvilken vei svingen går. Senk farten før svingen, ikke i den.', svg: () => warn(stroke('M42 80 L42 64 Q42 50 56 46', 7) + `<path d="M54 37 L68 45 L55 54 Z" fill="${K}"/>`) });
  add({ id: 'farlige-svinger', nr: '102', cat: 'fare', name: 'Farlige svinger', desc: 'Varsler flere farlige svinger etter hverandre. Første sving går i den retningen symbolet starter.', svg: () => warn(stroke('M44 81 L44 72 Q44 64 52 61 Q59 58 58 50 L58 47', 6.5) + `<path d="M50 48 L58 36 L66 48 Z" fill="${K}"/>`) });
  add({ id: 'smalere-veg', nr: '106', cat: 'fare', name: 'Smalere veg', desc: 'Vegen blir smalere. Vær forberedt på møtende i et smalt parti, og plasser deg godt til høyre.', svg: () => warn(stroke('M38 81 L43 66 L43 46', 5) + stroke('M62 81 L57 66 L57 46', 5)) });
  add({ id: 'bratt-bakke', nr: '', cat: 'fare', name: 'Bratt bakke', desc: 'Varsler bratt bakke (her 10 % stigning/fall). Ned bakken: bruk lavere gir og motorbrems. Bremselengden blir lengre i nedoverbakke.', svg: () => warn(`<path d="M24 80 L76 80 L76 58 Z" fill="${K}"/>` + txt('10%', 47, 64, 13)) });
  add({ id: 'ujevn-veg', nr: '', cat: 'fare', name: 'Fartshump / ujevn veg', desc: 'Varsler fartshump eller ujevn vegbane. Senk farten.', svg: () => warn(`<path d="M24 78 L38 78 Q50 62 62 78 L76 78 L76 81 L24 81 Z" fill="${K}"/>`) });
  add({ id: 'glatt', nr: '', cat: 'fare', name: 'Glatt kjørebane', desc: 'Vegen kan være glatt, for eksempel av is, vann eller løv. Øk avstanden, kjør jevnt og unngå bråe bevegelser.', svg: () => warn(`<rect x="42" y="38" width="16" height="22" rx="4" fill="${K}"/>` + stroke('M42 66 Q36 70 42 74 Q48 78 42 82', 3) + stroke('M58 66 Q52 70 58 74 Q64 78 58 82', 3)) });
  add({ id: 'gangfelt-fare', nr: '116', cat: 'fare', name: 'Varsel om gangfelt', desc: 'Varsler at det kommer et gangfelt. Vær forberedt på gående, og senk farten hvis sikten er dårlig.', svg: () => warn(person(51, 66, 0.95) + `<g fill="${K}"><rect x="28" y="78" width="7" height="3"/><rect x="39" y="78" width="7" height="3"/><rect x="50" y="78" width="7" height="3"/><rect x="61" y="78" width="7" height="3"/></g>`) });
  add({ id: 'barn', nr: '', cat: 'fare', name: 'Barn', desc: 'Varsler at barn ofte ferdes her, for eksempel ved skole eller lekeplass. Barn er uforutsigbare. Senk farten og vær klar til å stoppe.', svg: () => warn(person(43, 64, 0.85) + person(60, 68, 0.65)) });
  add({ id: 'syklende', nr: '', cat: 'fare', name: 'Syklende', desc: 'Varsler at syklende ofte krysser eller kommer inn på vegen.', svg: () => warn(bike(50, 64, 0.95)) });
  add({ id: 'vegkryss', nr: '', cat: 'fare', name: 'Vegkryss', desc: 'Varsler et kryss der høyreregelen gjelder. Du har vikeplikt for trafikk fra høyre.', svg: () => warn(stroke('M50 40 L50 82', 7, K, 'butt') + stroke('M30 63 L70 63', 7, K, 'butt')) });
  add({ id: 'rundkjoring-fare', nr: '', cat: 'fare', name: 'Rundkjøring', desc: 'Varsler at det kommer en rundkjøring. Senk farten, velg riktig felt og forbered vikeplikt.', svg: () => warn(`<g fill="none" stroke="${K}" stroke-width="5"><path d="M41 55 A12 12 0 0 1 60 54"/><path d="M63 62 A12 12 0 0 1 53 77"/><path d="M45 76 A12 12 0 0 1 38 60"/></g><g fill="${K}"><path d="M57 48 L65 55 L56 59 Z"/><path d="M58 76 L49 81 L50 71 Z"/><path d="M33 62 L37 52 L43 60 Z"/></g>`) });
  add({ id: 'trafikklys-fare', nr: '', cat: 'fare', name: 'Trafikklyssignal', desc: 'Varsler lyskryss som kan komme overraskende.', svg: () => warn(`<rect x="42" y="37" width="16" height="42" rx="3" fill="${K}"/><circle cx="50" cy="45" r="4.5" fill="${R}"/><circle cx="50" cy="58" r="4.5" fill="${Y}"/><circle cx="50" cy="71" r="4.5" fill="#2bb24c"/>`) });
  add({ id: 'elg', nr: '', cat: 'fare', name: 'Elg', desc: 'Varsler fare for elg i vegbanen. Gjelder særlig i skumring og mørke. Senk farten, bruk fjernlys når du kan og se langt ut mot vegkanten.', svg: () => warn(moose()) });
  add({ id: 'mot-trafikk', nr: '', cat: 'fare', name: 'Møtende trafikk', desc: 'Varsler at vegen går over til toveistrafikk, for eksempel etter en strekning med envegskjøring eller midtdeler.', svg: () => warn(arrowUp(59, 63, 28, 6, K) + arrowDown(41, 63, 28, 6, K)) });
  add({ id: 'ko', nr: '', cat: 'fare', name: 'Kø', desc: 'Varsler fare for kø. Hold god avstand og vær forberedt på stillestående trafikk.', svg: () => warn(carRear(50, 50, 0.8) + carRear(50, 70, 1.05)) });
  add({ id: 'vegarbeid', nr: '', cat: 'fare', name: 'Vegarbeid', desc: 'Varsler vegarbeid. Skiltet er gult fordi det er midlertidig. Følg skilting og fartsgrense, og vær oppmerksom på arbeidere.', svg: () => warn(`<circle cx="45" cy="44" r="4.5" fill="${K}"/>` + stroke('M45 50 L41 66 L35 79 M41 66 L48 79 M44 54 L56 62 L63 72', 4.5) + `<path d="M58 80 L70 70 L76 80 Z" fill="${K}"/>`, Y) });
  add({ id: 'annen-fare', nr: '', cat: 'fare', name: 'Annen fare', desc: 'Varsler en fare som ikke har eget skilt. Et underskilt forklarer ofte hva faren er.', svg: () => warn(`<rect x="46" y="40" width="8" height="26" rx="2" fill="${K}"/><circle cx="50" cy="74" r="4.5" fill="${K}"/>`) });

  // ================= VIKEPLIKTSKILT =================
  add({ id: 'vikeplikt', nr: '202', cat: 'vikeplikt', name: 'Vikeplikt', desc: 'Du har vikeplikt for trafikk på vegen du kjører inn på, fra begge sider. Du trenger ikke stoppe hvis vegen er fri, men farten må være slik at du kan stoppe.', svg: () => yieldSign() });
  add({ id: 'stopp', nr: '204', cat: 'vikeplikt', name: 'Stopp', desc: 'Du skal stoppe helt ved stopplinjen, eller der du ser inn på vegen hvis det ikke er stopplinje, og du har vikeplikt. Du må stoppe selv om vegen er fri.', svg: () => `<path d="M31 4 L69 4 L96 31 L96 69 L69 96 L31 96 L4 69 L4 31 Z" fill="${W}"/><path d="M32.5 8 L67.5 8 L92 32.5 L92 67.5 L67.5 92 L32.5 92 L8 67.5 L8 32.5 Z" fill="${R}"/>` + txt('STOPP', 50, 51, 22, W) });
  add({ id: 'forkjorsveg', nr: '206', cat: 'vikeplikt', name: 'Forkjørsveg', desc: 'Vegen du kjører på er forkjørsveg. Trafikk fra sideveger og avkjørsler har vikeplikt for deg. Gjelder til skiltet «Slutt på forkjørsveg».', svg: () => `<path d="M50 3 L97 50 L50 97 L3 50 Z" fill="${W}" stroke="${K}" stroke-width="1.5"/><path d="M50 17 L83 50 L50 83 L17 50 Z" fill="${Y}"/>` });
  add({ id: 'slutt-forkjorsveg', nr: '208', cat: 'vikeplikt', name: 'Slutt på forkjørsveg', desc: 'Forkjørsvegen slutter. Nå gjelder vanlige regler, for eksempel høyreregelen, hvis ikke annet er skiltet.', svg: () => `<path d="M50 3 L97 50 L50 97 L3 50 Z" fill="${W}" stroke="${K}" stroke-width="1.5"/><path d="M50 17 L83 50 L50 83 L17 50 Z" fill="${Y}"/><clipPath id="cf"><path d="M50 17 L83 50 L50 83 L17 50 Z"/></clipPath><g clip-path="url(#cf)">${[-3, -1.5, 0, 1.5, 3].map((i) => stroke(`M${14 + i * 4} ${86 + i * 4} L${86 + i * 4} ${14 + i * 4}`, 1.8, K, 'butt')).join('')}</g>` });
  add({ id: 'forkjorskryss', nr: '210', cat: 'vikeplikt', name: 'Forkjørskryss', desc: 'Du har forkjørsrett i det neste krysset. Trafikk fra sidevegene har vikeplikt for deg. Gjelder bare det ene krysset.', svg: () => warn(stroke('M50 38 L50 84', 10, K, 'butt') + stroke('M30 63 L70 63', 4, K, 'butt')) });
  add({ id: 'moteplikt', nr: '212', cat: 'vikeplikt', name: 'Møteplikt', desc: 'Du har vikeplikt for møtende på den smale strekningen. Den røde pilen er deg. Vent til møtende har passert.', svg: () => forbud(arrowUp(60, 50, 44, 8, R) + arrowDown(40, 50, 44, 8, K)) });
  add({ id: 'forkjorsrett-motende', nr: '214', cat: 'vikeplikt', name: 'Forkjørsrett for møtende', desc: 'Møtende har vikeplikt for deg på den smale strekningen (du har den hvite pilen). Vær likevel forsiktig.', svg: () => info(arrowUp(60, 50, 52, 9, W) + arrowDown(38, 50, 52, 9, R)) });

  // ================= FORBUDSSKILT =================
  add({ id: 'innkjoring-forbudt', nr: '302', cat: 'forbud', name: 'Innkjøring forbudt', desc: 'Det er forbudt å kjøre inn. Settes typisk der en envegsregulert veg starter i motsatt retning.', svg: () => `<circle cx="50" cy="50" r="47" fill="${W}"/><circle cx="50" cy="50" r="44" fill="${R}"/><rect x="20" y="42" width="60" height="16" fill="${W}"/>` });
  add({ id: 'forbudt-alle', nr: '', cat: 'forbud', name: 'Forbudt for alle kjøretøy', desc: 'Forbudt for alle kjøretøy i begge retninger. Gående kan bruke vegen.', svg: () => forbud('') });
  add({ id: 'forbudt-motorvogn', nr: '', cat: 'forbud', name: 'Forbudt for motorvogn', desc: 'Forbudt for all motorvogn. Sykkel og gående er tillatt.', svg: () => forbud(carRear(50, 50, 1.7)) });
  add({ id: 'venstresving-forbudt', nr: '', cat: 'forbud', name: 'Forbudt å svinge til venstre', desc: 'Du kan ikke svinge til venstre i det neste krysset.', svg: () => forbud(stroke('M58 72 L58 46 Q58 38 50 38 L38 38', 7, K, 'butt') + `<path d="M28 38 L40 29 L40 47 Z" fill="${K}"/>` + stroke('M24 76 L76 24', 6, R)) });
  add({ id: 'forbikjoring-forbudt', nr: '334', cat: 'forbud', name: 'Forbikjøring forbudt', desc: 'Forbudt å kjøre forbi motorvogn med mer enn to hjul. Du kan kjøre forbi motorsykkel, moped og sykkel hvis det er trygt. Gjelder til «Slutt på forbikjøringsforbud».', svg: () => forbud(carRear(36, 50, 1.05, R) + carRear(64, 50, 1.05, K)) });
  add({ id: 'slutt-forbikjoring', nr: '336', cat: 'forbud', name: 'Slutt på forbikjøringsforbud', desc: 'Forbikjøringsforbudet er slutt. Vanlige regler gjelder igjen. Se etter oppmerking og sikt.', svg: () => `<circle cx="50" cy="50" r="47" fill="${G}"/><circle cx="50" cy="50" r="42" fill="${W}"/>` + carRear(36, 50, 1.05, G) + carRear(64, 50, 1.05, G) + slash(K, 2) });
  [30, 40, 50, 60, 70, 80, 90, 100, 110].forEach((n) =>
    add({ id: 'fart-' + n, nr: '362', cat: 'forbud', name: `Fartsgrense ${n} km/t`, speed: n, desc: `Høyeste tillatte fart er ${n} km/t fra skiltet og til ny fartsgrense er skiltet. Fartsgrensen er en øvre grense. Du må alltid tilpasse farten til forholdene.`, svg: () => forbud(txt(String(n), 50, 52, n >= 100 ? 33 : 40)) })
  );
  add({ id: 'slutt-fart', nr: '364', cat: 'forbud', name: 'Slutt på særskilt fartsgrense', desc: 'Den skiltede fartsgrensen opphører. Nå gjelder generell fartsgrense: 50 km/t i tettbygd strøk og 80 km/t utenfor.', svg: () => `<circle cx="50" cy="50" r="47" fill="${G}"/><circle cx="50" cy="50" r="42" fill="${W}"/>` + txt('60', 50, 52, 40, G) + slash(K, 3) });
  add({ id: 'fartssone', nr: '366', cat: 'forbud', name: 'Fartsgrensesone', desc: 'Fartsgrensen gjelder i hele sonen, også i sidegater, til skiltet «Slutt på fartsgrensesone».', svg: () => `<rect x="4" y="4" width="92" height="92" rx="6" fill="${W}" stroke="${K}" stroke-width="2"/><circle cx="50" cy="42" r="28" fill="${R}"/><circle cx="50" cy="42" r="21" fill="${W}"/>` + txt('30', 50, 43, 24) + txt('SONE', 50, 83, 16) });
  add({ id: 'stans-forbudt', nr: '370', cat: 'forbud', name: 'Stans forbudt', desc: 'Du kan ikke stanse, heller ikke kort, for eksempel for å slippe av passasjerer. Gjelder på samme side av vegen som skiltet står.', svg: () => `<circle cx="50" cy="50" r="47" fill="${R}"/><circle cx="50" cy="50" r="37" fill="${B}"/>` + stroke('M24 24 L76 76 M76 24 L24 76', 8, R, 'butt') });
  add({ id: 'parkering-forbudt', nr: '372', cat: 'forbud', name: 'Parkering forbudt', desc: 'Parkering er forbudt, men du kan stanse kort for å slippe av og på passasjerer eller laste av og på varer.', svg: () => `<circle cx="50" cy="50" r="47" fill="${R}"/><circle cx="50" cy="50" r="37" fill="${B}"/>` + stroke('M24 24 L76 76', 8, R, 'butt') });

  // ================= PÅBUDSSKILT =================
  add({ id: 'pabudt-retning', nr: '402', cat: 'pabud', name: 'Påbudt kjøreretning', desc: 'Du må kjøre i pilens retning.', svg: () => paabud(arrowUp(50, 52, 54, 15, W)) });
  add({ id: 'pabudt-kjorefelt', nr: '404', cat: 'pabud', name: 'Påbudt kjørefelt', desc: 'Du må passere på den siden pilen viser, for eksempel til høyre for en trafikkøy.', svg: () => paabud(`<g transform="rotate(45 50 50)">${arrowDown(50, 50, 52, 14, W)}</g>`) });
  add({ id: 'rundkjoring', nr: '406', cat: 'pabud', name: 'Rundkjøring', desc: 'Du kjører inn i en rundkjøring og skal kjøre mot klokka. Står ofte sammen med vikepliktskilt: du har vikeplikt for dem som allerede er i rundkjøringen.', svg: () => paabud(`<g fill="none" stroke="${W}" stroke-width="7"><path d="M36 38 A19 19 0 0 1 64 37"/><path d="M69 53 A19 19 0 0 1 55 68"/><path d="M43 69 A19 19 0 0 1 31 53"/></g><g fill="${W}"><path d="M60 27 L73 38 L58 44 Z"/><path d="M63 69 L49 76 L51 62 Z"/><path d="M24 57 L30 42 L39 54 Z"/></g>`) });
  add({ id: 'pabudt-sykkelveg', nr: '', cat: 'pabud', name: 'Påbudt sykkelveg', desc: 'Vegen er for syklende. Motorvogn er ikke tillatt.', svg: () => paabud(bike(50, 52, 1.35, W)) });
  add({ id: 'gang-sykkelveg', nr: '', cat: 'pabud', name: 'Gang- og sykkelveg', desc: 'Felles veg for gående og syklende. Motorvogn er ikke tillatt. Kjører du ut fra en gang- og sykkelveg, har du vikeplikt for alle.', svg: () => paabud(person(36, 54, 1.05, W) + bike(63, 56, 0.8, W)) });

  // ================= OPPLYSNINGSSKILT =================
  add({ id: 'gangfelt', nr: '516', cat: 'opplysning', name: 'Gangfelt', desc: 'Markerer gangfeltet. Du har vikeplikt for gående som er ute i eller på vei ut i gangfeltet. Det er forbudt å parkere nærmere enn 5 meter foran gangfeltet.', svg: () => info(`<path d="M50 16 L84 80 L16 80 Z" fill="${W}"/>` + person(51, 63, 1.0) + `<g fill="${K}"><rect x="30" y="75" width="6" height="3"/><rect x="40" y="75" width="6" height="3"/><rect x="50" y="75" width="6" height="3"/><rect x="60" y="75" width="6" height="3"/></g>`) });
  add({ id: 'motorveg', nr: '503', cat: 'opplysning', name: 'Motorveg', desc: 'Motorvegen begynner. Du kan ikke stanse, parkere, rygge eller snu. Gående, syklende og kjøretøy som ikke kan holde minst 40 km/t er forbudt. Kjør inn fra akselerasjonsfeltet med vikeplikt.', svg: () => info(`<g fill="${W}"><path d="M20 72 Q50 30 80 72 L72 72 Q50 42 28 72 Z"/><rect x="45" y="44" width="10" height="34"/><path d="M30 80 L42 80 L46 50 L41 50 Z"/><path d="M70 80 L58 80 L54 50 L59 50 Z"/></g>`) });
  add({ id: 'slutt-motorveg', nr: '504', cat: 'opplysning', name: 'Slutt på motorveg', desc: 'Motorvegen slutter. Ny fartsgrense og vanlige regler gjelder. Forbered deg på møtende trafikk og kryss.', svg: () => info(`<g fill="${W}"><path d="M20 72 Q50 30 80 72 L72 72 Q50 42 28 72 Z"/><rect x="45" y="44" width="10" height="34"/><path d="M30 80 L42 80 L46 50 L41 50 Z"/><path d="M70 80 L58 80 L54 50 L59 50 Z"/></g>` + stroke('M16 84 L84 16', 7, R, 'butt')) });
  add({ id: 'motortrafikkveg', nr: '505', cat: 'opplysning', name: 'Motortrafikkveg', desc: 'Motortrafikkvegen begynner. Den har mange av de samme reglene som motorveg: ingen stans, parkering, rygging eller snuing, og bare motorvogn som kan holde minst 40 km/t.', svg: () => info(`<g fill="${W}"><path d="M24 66 L30 50 Q32 44 38 44 L62 44 Q68 44 70 50 L76 66 L76 78 L24 78 Z"/></g><g fill="${B}"><rect x="34" y="49" width="32" height="12" rx="2"/><circle cx="33" cy="70" r="4"/><circle cx="67" cy="70" r="4"/></g>`) });
  add({ id: 'parkering', nr: '552', cat: 'opplysning', name: 'Parkering', desc: 'Parkering er tillatt. Underskilt kan begrense tid, avgift eller hvem plassen gjelder for.', svg: () => info(txt('P', 50, 53, 70, W, 900)) });
  add({ id: 'envegs', nr: '', cat: 'opplysning', name: 'Envegskjøring', desc: 'Vegen er envegsregulert i pilens retning. Kjøring mot pilen er forbudt.', svg: () => info(`<rect x="16" y="34" width="68" height="32" fill="${W}"/>` + `<path d="M24 50 L58 50 L58 41 L76 50 L58 59 L58 50" fill="${K}" stroke="${K}" stroke-width="6" stroke-linejoin="round"/>`) });
  add({ id: 'blindveg', nr: '', cat: 'opplysning', name: 'Blindveg', desc: 'Vegen er stengt i enden og har ingen gjennomkjøring.', svg: () => info(`<rect x="42" y="40" width="16" height="44" fill="${W}"/><rect x="24" y="24" width="52" height="16" fill="${R}"/>`) });
  add({ id: 'fartshump', nr: '', cat: 'opplysning', name: 'Fartshump', desc: 'Markerer en fartshump. Senk farten.', svg: () => info(`<path d="M16 70 L32 70 Q50 34 68 70 L84 70 L84 76 L16 76 Z" fill="${W}"/>`) });
  add({ id: 'kollektivfelt', nr: '', cat: 'opplysning', name: 'Kollektivfelt', desc: 'Feltet er reservert for buss, drosje og andre kjøretøy som er angitt (for eksempel elbiler med passasjer der det er tillatt). Vanlige biler kan bare bruke feltet for å svinge av ved neste kryss.', svg: () => info(`<rect x="14" y="14" width="72" height="72" fill="${W}"/>` + txt('BUSS', 50, 42, 22) + `<g fill="${K}"><rect x="47" y="58" width="6" height="22"/></g>` + stroke('M30 80 L30 56 M70 80 L70 56', 3)) });
  add({ id: 'feltet-slutter', nr: '', cat: 'opplysning', name: 'Kjørefelt slutter', desc: 'Feltet til høyre slutter. Er det ingen vikeplikt, gjelder glidelåsprinsippet: bruk begge felt helt fram og flett annenhver bil.', svg: () => info(`<rect x="14" y="14" width="72" height="72" fill="${W}"/>` + `<g fill="${K}">${arrowUp(36, 54, 54, 10, K)}</g>` + stroke('M64 82 L64 56 Q64 46 52 40', 7, K, 'butt') + `<path d="M46 32 L56 44 L44 47 Z" fill="${K}"/>`) });

  // ---------- API ----------
  const byId = {};
  S.forEach((s) => (byId[s.id] = s));
  KA.signs = {
    list: S,
    byId,
    cats: {
      fare: { name: 'Fareskilt', text: 'Trekant med rød kant. Varsler om fare på vegen foran deg.' },
      vikeplikt: { name: 'Vikepliktskilt', text: 'Regulerer hvem som har forkjørsrett og hvem som har vikeplikt.' },
      forbud: { name: 'Forbudsskilt', text: 'Rund med rød kant. Forteller hva som er forbudt.' },
      pabud: { name: 'Påbudsskilt', text: 'Rund og blå. Forteller hva du må gjøre.' },
      opplysning: { name: 'Opplysningsskilt', text: 'Firkantet, oftest blå. Gir informasjon om vegen.' },
    },
    svg(id) {
      const s = byId[id];
      return s ? wrap(s.svg()) : '';
    },
    dataUrl(id) {
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(this.svg(id));
    },
    customSvg(inner) { return wrap(inner); },
  };
})();
