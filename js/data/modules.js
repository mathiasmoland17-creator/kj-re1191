/* Læringsmoduler: alt du må kunne til oppkjøring for klasse B. */
(function () {
  'use strict';
  const KA = (window.KA = window.KA || {});

  KA.modules = [
    {
      id: 'grunn', title: 'Grunnregler og ansvar', sign: 'annen-fare', group: 'Grunnlag',
      intro: 'Grunnregelen ligger under alt du gjør i trafikken. Sensor vurderer om du kjører trygt, hensynsfullt og selvstendig, ikke bare om du kan reglene.',
      body: `
<h3>Grunnregelen</h3>
<p><strong>Vegtrafikkloven § 3:</strong> Enhver skal ferdes hensynsfullt og være aktpågivende og varsom, så det ikke kan oppstå fare eller voldes skade, og slik at annen trafikk ikke unødig hindres eller forstyrres.</p>
<p>Grunnregelen betyr at du kan gjøre noe galt selv om ingen enkeltregel forbyr det. Kjører du i 80 km/t i tett tåke der fartsgrensen er 80, bryter du grunnregelen.</p>
<h3>Plassering</h3>
<ul>
<li>Kjør så langt til høyre som det er hensiktsmessig, med tanke på fart, sikt og andre trafikanter.</li>
<li>På veg med flere felt i samme retning skal du som hovedregel bruke feltet lengst til høyre og bruke venstre felt til forbikjøring.</li>
<li>I kø kan alle feltene brukes, og det regnes ikke som forbikjøring på høyre side om høyre felt går fortere.</li>
</ul>
<h3>Rus, trøtthet og distraksjon</h3>
<ul>
<li>Promillegrensen er <strong>0,2</strong>. Du kan fortsatt ha alkohol i blodet dagen etter.</li>
<li>Legemidler med <strong>rød varseltrekant</strong> på pakningen kan påvirke kjøreevnen.</li>
<li>Det er forbudt å bruke håndholdt mobiltelefon under kjøring. Dette gjelder også i kø og ved rødt lys.</li>
<li>Trøtthet virker omtrent som alkohol. Merker du at du blir trøtt, stopp og ta en pause.</li>
</ul>
<h3>Sikring</h3>
<p>Alle skal bruke bilbelte. Føreren har ansvar for at passasjerer under 15 år er sikret. Barn under 135 cm skal ha godkjent barnesikring. Barn i bakovervendt stol skal aldri sitte foran en aktiv kollisjonspute.</p>
<h3>Prøvetid og prikker</h3>
<p>De første to årene med førerkort har du prøvetid. Får du prikker i prøvetiden, teller de dobbelt. Får du <strong>8 prikker</strong> i løpet av tre år, mister du førerretten i seks måneder. Kjøring med promille i prøvetiden kan føre til ny førerprøve.</p>`,
      keys: ['Grunnregelen gjelder alltid, også der ingen skilt forteller deg hva du skal gjøre.', 'Promillegrensen er 0,2.', 'Ikke bruk håndholdt mobil under kjøring.', 'Prikker teller dobbelt i prøvetiden.'],
      sensor: ['Selvstendighet: at du tar egne, trygge valg uten å vente på instrukser.', 'At du viser hensyn og ikke hindrer andre unødig.'],
    },
    {
      id: 'merking', title: 'Vegoppmerking', sign: 'mot-trafikk', group: 'Grunnlag',
      intro: 'Linjer i vegbanen er like bindende som skilt. Gul og hvit farge betyr forskjellige ting.',
      body: `
<h3>Gul eller hvit linje</h3>
<ul>
<li><strong>Gul</strong> linje skiller trafikk i <em>motsatt</em> retning (midtlinje).</li>
<li><strong>Hvit</strong> linje skiller trafikk i <em>samme</em> retning (feltlinjer) og markerer vegkanten (kantlinje).</li>
</ul>
<h3>Typer midtlinjer</h3>
<ul>
<li><strong>Skillelinje</strong> (korte streker med lange mellomrom): du kan krysse den når det er trygt, for eksempel ved forbikjøring.</li>
<li><strong>Varsellinje</strong> (lange streker med korte mellomrom): varsler at det kommer en sperrelinje eller et farlig parti. Vær forsiktig med å krysse den.</li>
<li><strong>Sperrelinje</strong> (heltrukken): du kan ikke krysse den eller kjøre til venstre for den. Ved dobbel linje med én heltrukken og én stiplet gjelder den linjen som er nærmest deg.</li>
</ul>
<h3>Annen oppmerking</h3>
<ul>
<li><strong>Vikelinje</strong> («haitenner»): trekanter på tvers av feltet. Du har vikeplikt.</li>
<li><strong>Stopplinje</strong>: heltrukken tverrlinje ved stoppskilt eller trafikklys. Stopp før linjen.</li>
<li><strong>Sperreområde</strong>: skraverte felt. Du kan ikke kjøre inn i dem eller stanse der.</li>
<li><strong>Gangfelt</strong>: hvite striper på tvers av vegen («sebrastriper»).</li>
<li><strong>Kollektivfelt / sykkelfelt</strong>: merket med tekst eller symbol og skilt.</li>
<li><strong>Flettepiler</strong>: skrå piler som viser at et felt opphører og du må flette inn.</li>
</ul>`,
      keys: ['Gul linje skiller motsatt retning, hvit linje skiller samme retning.', 'Du kan ikke krysse en sperrelinje.', 'En varsellinje forteller at en sperrelinje kommer.', 'Du kan ikke kjøre inn i et sperreområde.'],
      sensor: ['Plassering i forhold til linjer, særlig at du ikke «kapper» svinger over midtlinjen.'],
    },
    {
      id: 'vikeplikt', title: 'Vikeplikt og kryss', sign: 'vikeplikt', group: 'Samspill', sim: 'hoyreregel',
      intro: 'Vikeplikt er den regelen sensor oftest stryker kandidater for. Lær deg rekkefølgen: politi, trafikklys, skilt og oppmerking, og til slutt høyreregelen.',
      body: `
<h3>Hva vikeplikt betyr</h3>
<p>Har du vikeplikt, skal du tydelig vise at du vil vike, i god tid. Farten din skal vise det. Den du har vikeplikt for, skal ikke måtte endre fart eller retning på grunn av deg.</p>
<h3>Hvem bestemmer? Rekkefølgen</h3>
<ol>
<li>Tegn fra politi eller trafikkdirigent</li>
<li>Trafikklys</li>
<li>Skilt og vegoppmerking (vikeplikt, stopp, forkjørsveg)</li>
<li>Trafikkreglene: høyreregelen og de andre generelle reglene</li>
</ol>
<h3>Høyreregelen</h3>
<p>I kryss uten skilt eller lys har du <strong>vikeplikt for trafikk fra høyre</strong>. Dette gjelder også i boligfelt og på parkeringsplasser med vegsystem.</p>
<h3>Venstresving</h3>
<p>Skal du svinge til venstre, har du vikeplikt for <strong>møtende</strong> trafikk som skal rett fram eller til høyre, selv om du har forkjørsrett i krysset.</p>
<h3>Du har vikeplikt for alle når du kjører ut fra</h3>
<ul>
<li>parkeringsplass, gårdsplass, bensinstasjon og lignende</li>
<li>gang- og sykkelveg, fortau og gangfelt</li>
<li>gatetun og gågate</li>
<li>terreng eller jorde</li>
</ul>
<h3>Særlige regler</h3>
<ul>
<li><strong>Trikk:</strong> du har vikeplikt for sporvogn, uansett hvor den kommer fra, med mindre skilt sier noe annet.</li>
<li><strong>Buss:</strong> der fartsgrensen er 60 km/t eller lavere, skal du gi buss som gir tegn mulighet til å kjøre ut fra holdeplassen.</li>
<li><strong>Utrykningskjøretøy</strong> med blålys og sirene: gi fri veg. Kjør til siden og stopp om nødvendig, men ikke i kryss eller gangfelt hvis det kan unngås.</li>
<li><strong>Gående i gangfelt:</strong> se modulen om myke trafikanter.</li>
</ul>
<h3>Sikt og fart inn mot kryss</h3>
<p>Dårlig sikt mot høyre, for eksempel på grunn av hekk, gjerde eller parkerte biler, krever lav fart. Du må kunne stoppe for en bil som kommer fra høyre. Vær aktiv med blikket: se høyre, venstre og høyre igjen.</p>`,
      keys: ['Høyreregelen gjelder der ingenting annet er skiltet.', 'Venstresvingende viker for møtende.', 'Den som kjører ut fra parkeringsplass, gårdsplass eller gang- og sykkelveg, viker for alle.', 'Du har vikeplikt for trikk.', 'Vis tidlig med farten at du skal vike.'],
      sensor: ['At du viser vikeplikten tydelig og i god tid.', 'At du ikke venter unødvendig når du har forkjørsrett, siden det skaper usikkerhet.', 'Observasjon inn mot kryss: høyre, venstre, høyre.'],
    },
    {
      id: 'rundkjoring', title: 'Rundkjøring', sign: 'rundkjoring', group: 'Samspill', sim: 'rundkjoring',
      intro: 'I rundkjøringen kjører du mot klokka. Du har vikeplikt for dem som allerede er i rundkjøringen, og du skal alltid gi tegn før du kjører ut.',
      body: `
<h3>Inn i rundkjøringen</h3>
<ul>
<li>Senk farten i god tid. Velg felt tidlig hvis rundkjøringen har flere felt.</li>
<li>Du har vikeplikt for trafikk i rundkjøringen (skiltet vikeplikt og vikelinje).</li>
<li>Se til <strong>venstre</strong> etter trafikk i rundkjøringen, og hold også øye med gående i gangfeltet foran deg.</li>
<li>Skal du ta <strong>første avkjøring</strong>, gir du tegn til høyre allerede før innkjøring.</li>
<li>Det er ikke påbudt å blinke til venstre inn i rundkjøringen.</li>
</ul>
<h3>Feltvalg i rundkjøring med to felt</h3>
<ul>
<li>Første avkjøring eller rett fram: som regel ytre (høyre) felt.</li>
<li>Lenger rundt: som regel indre (venstre) felt, og flytt deg ut før din avkjøring.</li>
<li>Følg alltid pilene i vegbanen hvis de finnes.</li>
<li>Skal du bytte fra indre til ytre felt, har du vikeplikt for trafikk i ytre felt.</li>
</ul>
<h3>Ut av rundkjøringen</h3>
<ul>
<li><strong>Gi tegn til høyre</strong> når du har passert avkjøringen før din. Dette er påbudt.</li>
<li>Pass på gående og syklende i gangfelt ved utkjøringen. Du har vikeplikt for dem.</li>
<li>Slå av blinklyset etter at du har kjørt ut.</li>
</ul>
<h3>Typiske feil på oppkjøring</h3>
<ul>
<li>For høy fart inn, slik at du ikke rekker å observere.</li>
<li>Glemmer blinklys ut av rundkjøringen.</li>
<li>Stopper unødvendig når det er god luke. Det gir usikkerhet bak deg.</li>
<li>Ser ikke etter gående ved utkjøringen.</li>
</ul>`,
      keys: ['Kjør mot klokka.', 'Du har vikeplikt for dem som er i rundkjøringen.', 'Gi alltid tegn til høyre før du kjører ut.', 'Ved første avkjøring blinker du til høyre allerede før innkjøring.'],
      sensor: ['Fartstilpasning inn mot rundkjøringen.', 'Tegngiving ved utkjøring.', 'Observasjon av gående i gangfelt.'],
    },
    {
      id: 'motorveg', title: 'Motorveg: påkjøring og avkjøring', sign: 'motorveg', group: 'Samspill', sim: 'pakjoring',
      intro: 'Påkjøring er en av de mest krevende situasjonene på oppkjøring. Du må opp i samme fart som trafikken, finne en luke og bruke speil, blinklys og skulderblikk.',
      body: `
<h3>Påkjøring fra akselerasjonsfelt</h3>
<ol>
<li><strong>Allerede i rampen:</strong> se etter trafikk på motorvegen og planlegg hvilken luke du sikter mot.</li>
<li><strong>Gi tegn til venstre</strong> i god tid.</li>
<li><strong>Akselerer bestemt</strong> opp mot farten på motorvegen. Er du for treg, tvinger du andre til å bremse.</li>
<li><strong>Speil, så skulderblikk til venstre.</strong> Bilen i blindsonen ser du ikke i speilet.</li>
<li><strong>Gli inn</strong> i en luke med minst 2 sekunders avstand foran og bak. Bruk gjerne mye av akselerasjonsfeltet, men vent ikke til det er slutt.</li>
<li><strong>Slå av blinklyset</strong> og legg deg i riktig fart og avstand.</li>
</ol>
<p><strong>Du har vikeplikt</strong> når du kjører inn fra akselerasjonsfelt. Det er ikke glidelås. Trafikken på motorvegen bør gjøre plass når det er mulig, men det er ditt ansvar å tilpasse deg.</p>
<p>Er det helt fullt, kan du i verste fall måtte stoppe i enden av feltet. Da må du akselerere kraftig når det blir en luke. Det er bedre å tilpasse farten tidlig i feltet.</p>
<h3>Avkjøring via retardasjonsfelt</h3>
<ol>
<li>Les skiltene og plasser deg tidlig i høyre felt.</li>
<li>Gi tegn til høyre i god tid før retardasjonsfeltet.</li>
<li>Skift over til retardasjonsfeltet der det begynner. Ikke kryss sperreområdet.</li>
<li><strong>Brems ned i retardasjonsfeltet</strong>, ikke ute i motorvegfeltet. Ellers blir du en fare for dem bak.</li>
<li>Tilpass farten til rampen, som ofte har lavere fartsgrense og krappe svinger.</li>
</ol>
<h3>Regler på motorveg</h3>
<ul>
<li>Ikke stans, parker, rygg eller snu. Ikke engang hvis du har kjørt forbi avkjøringen. Kjør til neste.</li>
<li>Kjør i høyre felt, og bruk venstre felt til forbikjøring.</li>
<li>Gående, syklende og kjøretøy som ikke kan holde 40 km/t er ikke tillatt.</li>
<li>Ved stopp på grunn av motorstopp: nødblink, refleksvest og varseltrekant langt bak (gjerne 150–250 m). Gå ut på siden bort fra trafikken og bak rekkverket hvis det er mulig.</li>
<li>Hold minst 3 sekunders avstand.</li>
</ul>`,
      keys: ['Du har vikeplikt fra akselerasjonsfeltet. Det er ikke glidelås.', 'Kom opp i samme fart som trafikken før du glir inn.', 'Rekkefølgen er speil, blinklys, skulderblikk og så feltskifte.', 'Brems i retardasjonsfeltet, ikke i motorvegfeltet.'],
      sensor: ['Fart ved påkjøring: lav fart er en vanlig strykårsak.', 'Skulderblikk og blinklys.', 'Om du tvinger andre til å bremse.'],
    },
    {
      id: 'felt', title: 'Feltskifte og glidelås', sign: 'feltet-slutter', group: 'Samspill', sim: 'glidelas',
      intro: 'Feltskifte er en manøver der observasjon, kommunikasjon og timing skal sitte. Glidelåsprinsippet gjelder når to felt går sammen til ett.',
      body: `
<h3>Feltskifte steg for steg</h3>
<ol>
<li><strong>Speil:</strong> innvendig speil og sidespeil på den siden du skal.</li>
<li><strong>Blinklys:</strong> gi tegn i god tid, minst 3 blink før du begynner å flytte deg.</li>
<li><strong>Skulderblikk:</strong> et raskt blikk over skulderen inn i blindsonen.</li>
<li><strong>Skift felt</strong> jevnt, uten å bremse, og helst med litt høyere fart enn feltet du skifter til.</li>
<li><strong>Slå av blinklyset.</strong></li>
</ol>
<p>Blindsonen er området på siden av og litt bak bilen som du ikke ser i speilene. En bil eller motorsykkel kan ligge der i flere sekunder.</p>
<h3>Glidelåsprinsippet</h3>
<p>Når to kjørefelt i samme retning går sammen til ett, og ingen har vikeplikt etter skilt eller oppmerking, skal de kjørende fra hvert felt slippe hverandre inn <strong>annenhver gang</strong>, som en glidelås.</p>
<ul>
<li>Bruk begge feltene helt fram til der de går sammen. Å flette for tidlig gjør køen lengre og skaper uklarhet.</li>
<li>Gi tegn og tilpass farten til luken.</li>
<li>Er du i feltet som fortsetter, slipper du inn én bil og kjører så selv.</li>
<li>Glidelås gjelder ikke fra akselerasjonsfelt. Der har du vikeplikt.</li>
</ul>`,
      keys: ['Rekkefølgen er speil, blinklys, skulderblikk og så feltskifte.', 'Glidelås betyr annenhver bil, helt fram der feltene møtes.', 'Ikke glidelås fra akselerasjonsfelt.'],
      sensor: ['Skulderblikk ved hvert feltskifte.', 'At du tar plassen din i glidelåsen uten å være for nølende eller for frekk.'],
    },
    {
      id: 'fart', title: 'Fart, avstand og stopplengde', sign: 'fart-50', group: 'Kjøreteknikk',
      intro: 'Fart er den viktigste faktoren for hvor alvorlig en ulykke blir. Fartsgrensen er bare en øvre grense.',
      body: `
<h3>Generelle fartsgrenser</h3>
<ul>
<li><strong>50 km/t</strong> i tettbygd strøk</li>
<li><strong>80 km/t</strong> utenfor tettbygd strøk</li>
<li>Motorveg er skiltet, ofte 90, 100 eller 110 km/t</li>
<li>Bil med tilhenger: 60 km/t uten brems, 80 km/t med brems</li>
</ul>
<h3>Stopplengde = reaksjonslengde + bremselengde</h3>
<p><strong>Reaksjonslengde</strong> (1 sekund reaksjonstid): fart / 10 × 3 meter. I 50 km/t er det omtrent 15 m.</p>
<p><strong>Bremselengde</strong> på tørr asfalt: (fart / 10)² / 2. I 50 km/t er det omtrent 12,5 m.</p>
<table class="tbl"><thead><tr><th>Fart</th><th>Reaksjon</th><th>Brems (tørt)</th><th>Stopplengde</th></tr></thead>
<tbody><tr><td>30 km/t</td><td>9 m</td><td>4,5 m</td><td>13,5 m</td></tr>
<tr><td>50 km/t</td><td>15 m</td><td>12,5 m</td><td>27,5 m</td></tr>
<tr><td>80 km/t</td><td>24 m</td><td>32 m</td><td>56 m</td></tr>
<tr><td>100 km/t</td><td>30 m</td><td>50 m</td><td>80 m</td></tr></tbody></table>
<p>Dobler du farten, blir bremselengden fire ganger så lang. På våt veg kan bremselengden doble seg, og på is kan den bli opptil ti ganger så lang.</p>
<h3>Avstand</h3>
<p>Bruk <strong>tresekundersregelen</strong>: når bilen foran passerer et fast punkt, skal det ta minst tre sekunder før du passerer samme punkt. Øk avstanden i mørke, regn og på glatt føre.</p>
<h3>Fartstilpasning</h3>
<p>Tilpass farten til sikt, føre, trafikk og hva som kan skje: barn ved skoler, parkerte biler som skjuler gående, kryss med dårlig sikt. Det er også feil å kjøre unødig sakte. Det hindrer annen trafikk og kan gi farlige forbikjøringer.</p>`,
      keys: ['Fartsgrensen er 50 km/t i tettbygd strøk og 80 km/t utenfor.', 'Reaksjonslengde = fart/10 × 3.', 'Bremselengde = (fart/10)² / 2.', 'Dobbel fart gir fire ganger så lang bremselengde.', 'Hold minst 3 sekunders avstand.'],
      sensor: ['Riktig fart for forholdene: både for høy og for lav fart gir anmerkning.', 'Jevn kjøring og avstand til forankjørende.'],
    },
    {
      id: 'myke', title: 'Gående, syklende og barn', sign: 'gangfelt', group: 'Samspill', sim: 'gangfelt',
      intro: 'De myke trafikantene har ingen beskyttelse. Mange situasjoner på oppkjøring handler om å se dem tidlig og vise tydelig hva du gjør.',
      body: `
<h3>Gangfelt</h3>
<ul>
<li>Du har vikeplikt for gående som <strong>er ute i eller på vei ut i</strong> gangfeltet.</li>
<li>Senk farten mot gangfelt der gående kan komme, særlig når parkerte biler eller busser skjuler sikten.</li>
<li>Det er forbudt å kjøre forbi et kjøretøy som har stanset foran et gangfelt for å slippe gående over.</li>
<li>Du kan ikke parkere nærmere enn 5 m foran et gangfelt.</li>
<li>Stopp i god avstand før gangfeltet, slik at gående ser at du har stoppet, og slik at du ikke skjuler dem for trafikk i feltet ved siden av.</li>
</ul>
<h3>Syklende</h3>
<ul>
<li>Hold god avstand når du kjører forbi. Minst 1,5 m anbefales, og mer når farten er høy.</li>
<li>Syklende kan svinge plutselig for å unngå hull eller is.</li>
<li>Svinger du over et sykkelfelt, har du vikeplikt for syklende i feltet.</li>
<li>Pass på syklende i blindsonen når du svinger til høyre.</li>
</ul>
<h3>Barn, eldre og andre</h3>
<ul>
<li>Barn kan ikke vurdere fart og avstand og kan løpe ut uten å se. Ser du en ball, kan det komme et barn etter.</li>
<li>Eldre kan bruke lengre tid over vegen.</li>
<li>Elsparkesykler kan komme raskt og fra uventede retninger.</li>
<li>Skolebuss med blinkende lys: vær ekstra forsiktig, siden barn kan krysse vegen.</li>
</ul>`,
      keys: ['Du har vikeplikt for gående ute i eller på vei ut i gangfeltet.', 'Ikke kjør forbi en bil som har stoppet for gangfelt.', 'Hold god avstand når du passerer syklende, minst 1,5 m.', 'Skjult sikt krever lav fart.'],
      sensor: ['At du oppdager gående tidlig og senker farten.', 'At du stopper tydelig og i god avstand.'],
    },
    {
      id: 'forbikjoring', title: 'Forbikjøring og møting', sign: 'forbikjoring-forbudt', group: 'Kjøreteknikk', sim: 'forbikjoring',
      intro: 'Forbikjøring er en av de farligste manøvrene. Er du i tvil, er du ikke i tvil: ikke kjør forbi.',
      body: `
<h3>Før du kjører forbi</h3>
<ul>
<li>Du må se at strekningen er fri lang nok, både for møtende og for kryss og avkjørsler.</li>
<li>Ikke kjør forbi der det er sperrelinje, forbikjøringsforbud, dårlig sikt (bakketopp, sving), kryss eller gangfelt.</li>
<li>Sjekk at ingen bak deg allerede er i ferd med å kjøre forbi deg.</li>
<li>Du kan ikke overskride fartsgrensen for å kjøre forbi.</li>
</ul>
<h3>Gjennomføring</h3>
<ol>
<li>Hold avstand til den du skal forbi, slik at du ser langt fram.</li>
<li>Speil, blinklys venstre og skulderblikk.</li>
<li>Kjør ut og passer bestemt med god sideavstand.</li>
<li>Blinklys høyre, og gå inn igjen når du ser hele bilen du kjørte forbi i innvendig speil.</li>
<li>Slå av blinklyset.</li>
</ol>
<h3>Når noen kjører forbi deg</h3>
<p>Hold farten jevn eller senk litt, og hold deg til høyre. Det er forbudt å øke farten når noen kjører forbi deg.</p>
<h3>Møting</h3>
<p>Ved møting skal du holde godt til høyre. På smal veg har den som har hindringen på sin side, eller den som har lettest for å vike, ansvaret for å vike. Følg skiltene for møteplikt og forkjørsrett for møtende. I bakker skal den som kjører nedover vanligvis vike.</p>`,
      keys: ['Ikke kjør forbi i tvilstilfeller.', 'Ikke kjør forbi over sperrelinje, i kryss, ved gangfelt eller med dårlig sikt.', 'Ikke kjør over fartsgrensen for å kjøre forbi.', 'Gå inn igjen når du ser bilen i innvendig speil.'],
      sensor: ['Risikovurdering: at du bare kjører forbi når det er klart trygt.', 'Kommunikasjon og observasjon før og etter.'],
    },
    {
      id: 'morke', title: 'Mørke, lys og vilt', sign: 'elg', group: 'Forhold',
      sim: 'morke',
      intro: 'I mørket ser du mye mindre, og andre ser deg dårligere. Riktig lysbruk og riktig fart er avgjørende.',
      body: `
<h3>Lysbruk</h3>
<ul>
<li>Du skal alltid kjøre med lys, også om dagen.</li>
<li><strong>Fjernlys</strong> rekker omtrent 100 m eller mer, <strong>nærlys</strong> bare omtrent 30–40 m. Bruk fjernlys når du kan.</li>
<li>Blend av <strong>i god tid</strong> for møtende, og når du kjører rett bak andre. Ellers blender du dem.</li>
<li>Blir du blendet: senk farten, se mot høyre vegkant og stopp om nødvendig.</li>
<li>Tåkelys foran kan brukes i tåke og nedbør. Tåkebaklys brukes bare ved svært dårlig sikt, fordi det kan blende.</li>
</ul>
<h3>Fart i mørket</h3>
<p>Du skal kunne stoppe på den strekningen du ser er fri. Med nærlys er det kort. En gående i mørke klær ser du ofte først på 20–30 m med nærlys. Med refleks kan du se dem på 140 m eller mer med fjernlys.</p>
<h3>Vilt</h3>
<ul>
<li>Elg og hjort er særlig aktive i skumring og mørke, høst og vinter.</li>
<li>Ser du ett dyr, kommer det ofte flere.</li>
<li>Brems kraftig og hold retningen. Bråe unnamanøvrer kan gi utforkjøring eller møteulykke.</li>
<li>Kollisjon med vilt skal meldes til politiet (02800), selv om dyret løper videre.</li>
</ul>`,
      keys: ['Kjør alltid med lys.', 'Bruk fjernlys når det er mulig, og blend av i god tid for møtende.', 'Du skal kunne stoppe på den strekningen du ser er fri.', 'Ved vilt: brems kraftig og hold retningen.'],
      sensor: ['Lysbruk og avblending, også på mørkekjøringskurset.', 'Fart tilpasset sikt.'],
    },
    {
      id: 'vinter', title: 'Vinter og føre', sign: 'glatt', group: 'Forhold',
      intro: 'Norske vinterforhold krever mer avstand, mykere kjøring og riktig utstyr.',
      body: `
<h3>Dekk</h3>
<ul>
<li>Minste mønsterdybde er <strong>1,6 mm</strong> for sommerdekk og <strong>3 mm</strong> for vinterdekk i vinterperioden (fra 1. november til og med første søndag etter 2. påskedag, med andre datoer i Nord-Norge).</li>
<li>Piggdekk er tillatt i samme periode, og ellers når føret tilsier det. Enkelte byer krever piggdekkgebyr.</li>
<li>Alle fire hjul skal ha samme type dekk.</li>
</ul>
<h3>Kjøring på glatt føre</h3>
<ul>
<li>Øk avstanden kraftig. Bremselengden på is kan bli flere ganger lengre.</li>
<li>Kjør mykt: rolig gass, rolig ratt og rolig brems.</li>
<li>Med ABS bremser du hardt og styrer samtidig. ABS hindrer at hjulene låser seg, men gir ikke kortere bremselengde på is.</li>
<li>Skrensler bakhjulene, styrer du dit du vil, ikke dit bilen peker, og letter på gassen.</li>
<li>Prøvebrems forsiktig på et trygt sted når føret er usikkert.</li>
<li>Rundt 0 °C er det ofte glattest. Bruer kan være glatte før resten av vegen.</li>
</ul>
<h3>Vannplaning</h3>
<p>Ved mye vann i vegbanen kan dekkene miste kontakten med vegen. Senk farten. Skjer det, slipper du gassen rolig, holder rattet rett og bremser ikke brått.</p>
<h3>Sikt</h3>
<p>Rut av bilen helt før du kjører, også taket, slik at snø ikke blåser over rutene. Sørg for at lysene er rene.</p>`,
      keys: ['Vinterdekk skal ha minst 3 mm mønster i vinterperioden.', 'Sommerdekk skal ha minst 1,6 mm.', 'Kjør mykt og med lang avstand på glatt føre.', 'Med ABS kan du bremse og styre samtidig.'],
      sensor: ['Tilpasning til føre, som du blant annet øver på i obligatorisk glattkjøringskurs.'],
    },
    {
      id: 'kjoretoy', title: 'Kjøretøyet og sikkerhetskontroll', sign: 'annen-fare', group: 'Bilen',
      intro: 'På oppkjøringen spør sensor om sikkerhetskontroll av bilen. Du må vise og forklare. Se også egen øving under Sikkerhetskontroll.',
      body: `
<h3>Dette bør du kunne vise på bilen</h3>
<ul>
<li><strong>Lys:</strong> nærlys, fjernlys, blinklys, bremselys, baklys, skiltlys, refleks og nødblink. Bremselys kan du sjekke med refleks i en vegg eller rute, eller med hjelp fra noen.</li>
<li><strong>Dekk:</strong> mønsterdybde (indikator i mønsteret), lufttrykk (oppgitt i dørkarm, tanklokk eller instruksjonsbok), skader og at dekkene er like.</li>
<li><strong>Bremser:</strong> pedalfølelse, bremsevæskenivå mellom MIN og MAX og varsellampe. Prøvebrems etter at du har startet.</li>
<li><strong>Motorrom:</strong> motorolje (peilepinne, sjekk med motoren stanset på flat mark), kjølevæske (sjekk når motoren er kald) og spylervæske.</li>
<li><strong>Styring:</strong> rattet skal ikke ha unormalt slark. Servostyringen skal virke.</li>
<li><strong>Sikt:</strong> rene og hele ruter, viskere som virker og riktig innstilte speil.</li>
<li><strong>Varsellamper:</strong> rød betyr stopp så snart det er trygt (for eksempel oljetrykk eller bremser). Gul betyr at noe bør kontrolleres snart.</li>
<li><strong>Utstyr:</strong> varseltrekant og refleksvest (påbudt), og gjerne førstehjelpsskrin og brannslukker.</li>
</ul>
<h3>Last og sikring</h3>
<p>Last skal sikres slik at den ikke kan forskyve seg ved bråbrems. Totalvekt og takbelastning står i vognkortet og instruksjonsboka. Tung last bak gjør at bilen styrer annerledes og kan kreve justering av lyktene.</p>`,
      keys: ['Rød varsellampe betyr at du skal stoppe trygt med en gang.', 'Kontroller kjølevæske med kald motor.', 'Varseltrekant og refleksvest er påbudt.'],
      sensor: ['At du forstår hvorfor kontrollen er viktig for trafikksikkerheten, ikke bare hvor du finner ting.'],
    },
    {
      id: 'ulykke', title: 'Ulykke og førstehjelp', sign: 'annen-fare', group: 'Bilen',
      intro: 'Er du innblandet i eller kommer først til en ulykke, har du plikt til å stoppe og hjelpe.',
      body: `
<h3>Rekkefølge på ulykkesstedet</h3>
<ol>
<li><strong>Stopp og skaff deg oversikt.</strong> Sett på nødblink.</li>
<li><strong>Sikre stedet:</strong> refleksvest på og varseltrekant ut i god avstand. Tenk på egen sikkerhet.</li>
<li><strong>Varsle:</strong> 113 (ambulanse), 112 (politi), 110 (brann). Gi adresse eller sted, antall skadde og skadenes art.</li>
<li><strong>Førstehjelp:</strong> sjekk bevissthet og pust. Sørg for frie luftveier, og legg en bevisstløs som puster i stabilt sideleie. Puster personen ikke normalt: start hjerte- og lungeredning med 30 kompresjoner og 2 innblåsninger.</li>
<li>Hold de skadde varme og rolige, og stans store blødninger med trykk.</li>
</ol>
<h3>Plikter</h3>
<ul>
<li>Er du innblandet i en ulykke, skal du stoppe, hjelpe og oppgi navn og adresse.</li>
<li>Ved personskade skal politiet varsles.</li>
<li>Kollisjon med elg, hjort, rådyr og andre store dyr skal meldes til politiet.</li>
<li>Skade på parkert bil: forsøk å finne eieren eller meld til politiet, og legg igjen kontaktinfo.</li>
</ul>`,
      keys: ['Rekkefølgen er stopp, sikre, varsle og førstehjelp.', 'Nødnumrene er 113 (ambulanse), 112 (politi) og 110 (brann).', 'Ved hjertestans gir du 30 kompresjoner og 2 innblåsninger.'],
      sensor: ['Spørsmål om ulykke og førstehjelp kan komme muntlig.'],
    },
    {
      id: 'miljo', title: 'Miljøvennlig kjøring', sign: 'fart-80', group: 'Kjøreteknikk',
      intro: 'Miljøvennlig kjøring er en del av læreplanen og vurderes på oppkjøringen. Det er også ofte tryggere kjøring.',
      body: `
<ul>
<li><strong>Planlegg og se langt fram,</strong> slik at du slipper unødvendig bremsing og akselerasjon.</li>
<li>Slipp gassen tidlig mot rødt lys og kø, og la bilen rulle.</li>
<li>Gir manuelt? Gir tidlig opp, og kjør på høyest mulig gir uten at motoren jobber tungt.</li>
<li>Hold jevn fart. Høy fart øker forbruket kraftig, siden luftmotstanden øker med kvadratet av farten.</li>
<li>Unngå tomgangskjøring. Ikke la bilen gå på tomgang for å varme den opp.</li>
<li>Riktig dekktrykk og fjerne takboks eller stativ når de ikke brukes, gir lavere forbruk.</li>
<li>Elbil: bruk regenerering, og planlegg lading og rekkevidde. Kulde reduserer rekkevidden.</li>
</ul>`,
      keys: ['Se langt fram og hold jevn fart.', 'Slipp gassen tidlig og rull.', 'Ha riktig dekktrykk.'],
      sensor: ['Jevn, planlagt kjøring uten unødige akselerasjoner og oppbremsinger.'],
    },
    {
      id: 'parkering', title: 'Stans, parkering og rygging', sign: 'parkering-forbudt', group: 'Kjøreteknikk',
      intro: 'På oppkjøringen må du som regel gjennomføre en manøver, for eksempel lukeparkering, rygging eller snuing. Reglene for hvor du kan stanse må sitte.',
      body: `
<h3>Stans og parkering er forbudt</h3>
<ul>
<li>i kryss og nærmere enn 5 m fra et kryss</li>
<li>i gangfelt, sykkelfelt og nærmere enn 5 m foran gangfelt eller sykkelkryssing</li>
<li>på steder med dårlig sikt, for eksempel i sving og på bakketopp</li>
<li>på jernbaneplanovergang og i tunnel</li>
<li>slik at du dekker skilt eller signaler</li>
</ul>
<p><strong>Parkering</strong> er i tillegg forbudt blant annet på forkjørsveg utenfor tettbygd strøk, nærmere enn 5 m fra brannhydrant og foran innkjørsler. Det er også forbudt der det er mindre enn 3 m fri kjørebane forbi bilen.</p>
<p><em>Stans</em> er et kort opphold for å slippe av eller på passasjerer eller laste. <em>Parkering</em> er alt annet opphold, også om du sitter i bilen.</p>
<h3>Manøvrer</h3>
<ul>
<li><strong>Rygging:</strong> se deg rundt før og under, rygg sakte og hold blikket der du skal.</li>
<li><strong>Lukeparkering:</strong> gi tegn, legg deg parallelt med bilen foran, og rygg inn med rolige rattutslag. Observer hele tiden, særlig fronten som svinger ut.</li>
<li><strong>Bakkestart:</strong> bruk parkeringsbrems eller bakkestartassistent, slik at bilen ikke triller bakover.</li>
<li>Parker med hjulene vendt mot fortauskanten i bratt bakke.</li>
</ul>`,
      keys: ['Ikke stans eller parker nærmere enn 5 m fra kryss eller foran gangfelt.', 'Stans er kort opphold. Parkering er alt annet.', 'Observer hele tiden når du rygger.'],
      sensor: ['Observasjon under manøveren. Det er viktigere enn om bilen står helt perfekt.'],
    },
    {
      id: 'oppkjoring', title: 'Selve oppkjøringen', sign: 'forkjorsveg', group: 'Prøven',
      intro: 'Vit hva som skjer på prøvedagen, så kan du bruke energien på kjøringen.',
      body: `
<h3>Før du kan ta prøven</h3>
<ul>
<li>Du må være 18 år, ha bestått teoriprøven og fullført den obligatoriske opplæringen. Det gjelder blant annet trafikalt grunnkurs, sikkerhetskurs på bane (glattkjøring), mørkekjøring og sikkerhetskurs på veg (trinn 4).</li>
<li>Ta med gyldig legitimasjon. Bilen må være godkjent for prøven.</li>
</ul>
<h3>Hvordan prøven foregår</h3>
<ul>
<li>Prøven varer rundt 75 minutter. Mesteparten er kjøring, omtrent 55 minutter.</li>
<li>Du starter med sikkerhetskontroll av bilen. Sensor stiller spørsmål, og du viser og forklarer.</li>
<li>Sensor gir instrukser i god tid. Er du usikker, kan du spørre. Kjør selvstendig mellom instruksene, og følg skilting når du får beskjed om det.</li>
<li>Kjøringen skjer i variert trafikk: by, landeveg, motorveg eller motortrafikkveg, rundkjøringer og boligområder. Ofte er det også en manøver, som rygging eller parkering.</li>
<li>Du får vite resultatet og en begrunnelse rett etter prøven.</li>
</ul>
<h3>Hva sensor vurderer</h3>
<ul>
<li><strong>Kjøretøybeherskelse:</strong> styring, gir, brems, jevn og myk kjøring.</li>
<li><strong>Observasjon:</strong> speil, skulderblikk og blikk inn mot kryss.</li>
<li><strong>Plassering og kjøremønster:</strong> riktig felt og riktig plass i feltet.</li>
<li><strong>Fart:</strong> tilpasset fartsgrense, forhold og trafikk.</li>
<li><strong>Samhandling og kommunikasjon:</strong> blinklys i tide, vikeplikt og forutsigbarhet.</li>
<li><strong>Risikovurdering og selvstendighet:</strong> at du tar trygge, egne valg.</li>
<li><strong>Miljøvennlig kjøring.</strong></li>
</ul>
<h3>Vanlige årsaker til stryk</h3>
<ul>
<li>Manglende eller sene skulderblikk ved feltskifte og påkjøring</li>
<li>Brudd på vikeplikt, særlig høyreregelen og gangfelt</li>
<li>For lav fart på motorveg og ved påkjøring, eller for høy fart i boligområder</li>
<li>Usikker og nølende kjøring som skaper uklare situasjoner</li>
<li>Feil plassering i kryss og rundkjøringer</li>
</ul>
<h3>Tips</h3>
<ul>
<li>Gjør observasjonene tydelige. Sensor må se at du ser.</li>
<li>En feil er ikke automatisk stryk. Fortsett å kjøre trygt og glem den.</li>
<li>Kjør slik du har lært, ikke prøv å imponere.</li>
</ul>`,
      keys: ['Prøven varer rundt 75 minutter og starter med sikkerhetskontroll.', 'Sensor vurderer helheten: observasjon, plassering, fart, samhandling og selvstendighet.', 'Gjør skulderblikkene tydelige.'],
      sensor: ['Helhetsvurdering. Én liten feil gir ikke stryk, men en farlig situasjon gjør det.'],
    },
  ];
})();
