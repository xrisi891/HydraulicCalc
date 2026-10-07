const G = 9.80665;
const RHO = 1000;
const PE100 = {
  10: [
    [32,28],[40,35.2],[50,44],[63,55.4],[75,66],[90,79.2],[110,96.8],[125,110.2],
    [140,123.4],[160,141],[180,158.6],[200,176.2],[225,198.2],[250,220.4],
    [280,246.8],[315,277.6],[355,312.8],[400,352.6],[450,396.6],[500,440.6],
    [560,493.6],[630,555.2]
  ],
  16: [
    [20,16],[25,20.4],[32,26],[40,32.6],[50,40.8],[63,51.4],[75,61.4],[90,73.6],
    [110,90],[125,102.2],[140,114.6],[160,130.8],[180,147.2],[200,163.6],
    [225,184],[250,204.6],[280,229.2],[315,257.8],[355,290.6],[400,327.4],
    [450,368.2],[500,409.2],[560,458.4],[630,515.6]
  ]
};
const initialValues = {};
const titles = {
  pipe: ['Напорен тръбопровод', 'Дебит, скорост и загуби на напор по Hazen–Williams и Darcy–Weisbach.', 'СКОРОСТ НА ТЕЧЕНИЕ', 'Средна скорост в тръбата', 'Hazen–Williams и Darcy–Weisbach'],
  mainpipe: ['Водопровод PN10 / PN16', 'Оразмерителен дебит, вътрешен диаметър, скорост и хидравличен наклон.', 'ХИДРАВЛИЧЕН НАКЛОН', 'Загуба на напор по дължината на тръбата', 'Pipelife · Darcy–Weisbach / Colebrook–White'],
  colebrook: ['Colebrook–White', 'Гравитационно и напорно оразмеряване на тръбопроводи.', 'СКОРОСТ НА ТЕЧЕНИЕ', 'Резултат от хидравличното изчисление', 'Darcy–Weisbach · Colebrook–White'],
  sideweir: ['Страничен дъждопреливник', 'Оразмеряване по дебити, тръбни пълнежи и характеристики на преливника.', 'ДЪЛЖИНА НА ПРЕЛИВНИЯ РЪБ', 'Изчислена дължина', 'Проверка по Наредба № РД-02-20-8'],
  circular: ['Кръгъл канал', 'Равномерно течение в кръгло сечение с частично или пълно запълване.', 'ДЕБИТ ПО МАНИНГ', 'Капацитет при зададено запълване', 'Формула на Манинг · кръгъл сегмент'],
  rectangular: ['Правоъгълен канал', 'Дебит и скорост за правоъгълно призматично сечение.', 'ДЕБИТ ПО МАНИНГ', 'Капацитет на канала', 'Формула на Манинг · правоъгълно сечение'],
  pump: ['Помпа и мощност', 'Оценка на необходимата входна мощност и дневната енергия.', 'НЕОБХОДИМА МОЩНОСТ', 'Входна мощност при зададения КПД', 'Хидравлична мощност и КПД'],
  tank: ['Задържателен резервоар', 'Оразмеряване по вградения калкулатор.', 'ЗАДЪРЖАТЕЛЕН РЕЗЕРВОАР', 'Калкулаторът е вграден без промени', 'Оригинален HTML калкулатор']
};

const formFor = (key) => document.querySelector(`.view-form[data-view="${key}"]`);
const numeric = (form, name) => Number(form.elements[name].value);
const fmt = (x, digits = 2) => {
  if (!Number.isFinite(x)) return '—';
  return new Intl.NumberFormat('bg-BG', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(x);
};
const metric = (label, value, unit = '', accent = false) => `
  <div class="metric${accent ? ' accent' : ''}"><div class="metric-label">${label}</div>
  <div class="metric-value">${value}<small>${unit}</small></div></div>`;

function setResults(hero, unit, caption, items, note, error = '') {
  document.querySelector('#hero-value').textContent = hero;
  document.querySelector('#hero-unit').textContent = unit;
  document.querySelector('#hero-caption').textContent = caption;
  document.querySelector('#result-grid').innerHTML = items.join('');
  document.querySelector('#formula-note').textContent = note;
  const err = document.querySelector('#result-error');
  err.hidden = !error;
  err.textContent = error;
}

function calculatePipe() {
  const f = formFor('pipe');
  const qh = numeric(f, 'q'), dmm = numeric(f, 'd'), length = numeric(f, 'length');
  const c = numeric(f, 'c'), epsmm = numeric(f, 'roughness'), nu = numeric(f, 'nu');
  if (!(qh > 0 && dmm > 0 && length >= 0 && c > 0 && epsmm >= 0 && nu > 0)) return;
  const q = qh / 3600, d = dmm / 1000, eps = epsmm / 1000;
  const area = Math.PI * d * d / 4;
  const v = q / area;
  const re = v * d / (nu * 1e-6);
  const hw = 10.67 * length * Math.pow(q, 1.852) / (Math.pow(c, 1.852) * Math.pow(d, 4.871));
  let fDarcy;
  if (re < 2300) fDarcy = re > 0 ? 64 / re : 0;
  else fDarcy = 0.25 / Math.pow(Math.log10(eps / (3.7 * d) + 5.74 / Math.pow(re, 0.9)), 2);
  const dw = fDarcy * (length / d) * (v * v / (2 * G));
  const j = length > 0 ? dw / length * 1000 : 0;
  const dp = RHO * G * dw / 100000;
  const warn = (re >= 2300 && re < 4000) ? 'Течението е в преходната област; Darcy–Weisbach е ориентировъчна оценка.' : '';
  setResults(fmt(v, 3), 'm/s', 'Средна скорост в тръбата', [
    metric('ЗАГУБА НАПОР · HAZEN–WILLIAMS', fmt(hw), 'm', true),
    metric('ЗАГУБА НАПОР · DARCY–WEISBACH', fmt(dw), 'm'),
    metric('ЧИСЛО НА РЕЙНОЛДС', fmt(re, 0), 'Re'),
    metric('КОЕФИЦИЕНТ НА ТРЕНЕ', fmt(fDarcy, 4), 'f'),
    metric('ХИДРАВЛИЧЕН НАКЛОН', fmt(j, 2), 'm/km'),
    metric('ПАД НА НАЛЯГАНЕ', fmt(dp, 3), 'bar')
  ], 'Hazen–Williams · Darcy–Weisbach', warn);
}

function calculateCircular() {
  const f = formFor('circular');
  const dmm = numeric(f, 'd'), slope = numeric(f, 'slope'), n = numeric(f, 'n'), ratio = numeric(f, 'ratio');
  if (!(dmm > 0 && slope > 0 && n > 0 && ratio > 0 && ratio <= 1)) return;
  const d = dmm / 1000, r = d / 2, y = ratio * d;
  const theta = Math.acos(Math.max(-1, Math.min(1, 1 - y / r)));
  const area = r * r * (theta - Math.sin(theta) * Math.cos(theta));
  const perimeter = 2 * r * theta;
  const rh = perimeter > 0 ? area / perimeter : 0;
  const q = (1 / n) * area * Math.pow(rh, 2 / 3) * Math.sqrt(slope);
  const v = area > 0 ? q / area : 0;
  setResults(fmt(q * 1000, 2), 'L/s', 'Капацитет при зададеното запълване', [
    metric('ДЕБИТ', fmt(q * 3600), 'm³/h', true),
    metric('СКОРОСТ', fmt(v, 3), 'm/s'),
    metric('ПЛОЩ НА СЕЧЕНИЕТО', fmt(area * 1e4, 2), 'dm²'),
    metric('ХИДРАВЛИЧЕН РАДИУС', fmt(rh * 1000, 1), 'mm'),
    metric('ДЪЛБОЧИНА НА ВОДАТА', fmt(y * 1000, 0), 'mm'),
    metric('МОКЪР ПЕРИМЕТЪР', fmt(perimeter * 1000, 1), 'mm')
  ], 'Манинг · геометрия на кръгов сегмент');
}

function populateMainPipe(preferredDn = 250) {
  const f = formFor('mainpipe');
  const pn = f.elements.pn.value;
  const dnSelect = f.elements.dn;
  const old = Number(dnSelect.value) || preferredDn;
  dnSelect.replaceChildren(...PE100[pn].map(([dn, id]) => {
    const option = document.createElement('option');
    option.value = String(dn);
    option.textContent = `DN ${dn} · вътр. ${fmt(id, 1)} mm`;
    return option;
  }));
  dnSelect.value = PE100[pn].some(([dn]) => dn === old) ? String(old) : String(preferredDn);
  if (!dnSelect.value) dnSelect.selectedIndex = 0;
}

function colebrook(Re, roughness, diameter) {
  if (Re <= 0) return 0;
  if (Re < 2300) return 64 / Re;
  let invRoot = 1 / Math.sqrt(0.02);
  for (let k = 0; k < 30; k++) {
    const next = -2 * Math.log10(roughness / (3.7 * diameter) + 2.51 * invRoot / Re);
    if (!Number.isFinite(next) || next <= 0) break;
    if (Math.abs(next - invRoot) < 1e-10) { invRoot = next; break; }
    invRoot = next;
  }
  return 1 / (invRoot * invRoot);
}

function calculateMainPipe() {
  const f = formFor('mainpipe');
  const pn = f.elements.pn.value;
  const dn = Number(f.elements.dn.value);
  const qInput = numeric(f, 'q');
  const q = f.elements.qunit.value === 'ls' ? qInput / 1000 : qInput / 3600;
  const pipe = PE100[pn].find(([nominal]) => nominal === dn);
  if (!pipe || !(q > 0)) return;
  const dmm = pipe[1], d = dmm / 1000;
  const area = Math.PI * d * d / 4;
  const v = q / area;
  const nu = 1.308e-6;
  const epsilon = 0.01e-3;
  const Re = v * d / nu;
  const lambda = colebrook(Re, epsilon, d);
  const i = lambda * v * v / (2 * G * d);
  const qLs = q * 1000;
  const transition = Re < 4000;
  setResults(fmt(i, 6), 'm/m', `Хидравличен наклон · ${fmt(i * 1000, 3)} mm/m`, [
    metric('СКОРОСТ НА ПОТОКА', fmt(v, 3), 'm/s', true),
    metric('ХИДРАВЛИЧЕН НАКЛОН', fmt(i, 6), 'm/m'),
    metric('ЗАГУБА НА 100 m', fmt(i * 100, 3), 'm'),
    metric('ВЪТРЕШЕН ДИАМЕТЪР', fmt(dmm, 1), 'mm'),
    metric('ЧИСЛО НА РЕЙНОЛДС', fmt(Re, 0), 'Re'),
    metric('КОЕФИЦИЕНТ НА ТРЕНЕ', fmt(lambda, 5), 'λ')
  ], `PE100 PN${pn} · SDR${pn === '10' ? '17' : '11'} · k=0.01 mm · вода 10°C`,
  transition ? 'Справочникът приема турбулентен режим; провери внимателно резултата при Re под 4000.' : '');
}

const waterNu = [0,0,1.6736,1.6191,1.5674,1.5182,1.4716,1.4272,1.3849,1.3447,1.3063,1.2696,1.2347,1.2012,1.1692,1.1386,1.1092,1.0811,1.0541,1.0282,1.0034,.9795,.9565,.9344,.9131,.8926,.8729,.8539,.8355,.8178,.8007,.7842,.7682,.7528,.7379,.7234,.7095,.6959,.6828,.6702,.6579].map(x => x * 1e-6);

function cbFlow(form) {
  const q = Number(form.elements.q.value);
  switch (form.elements.qunit.value) {
    case 'ls': return q / 1000;
    case 'm3s': return q;
    default: return q / 3600;
  }
}

function cbDiameter(form) {
  const src = form.elements.dsource.value;
  if (src === 'catalog') {
    const found = PE100[form.elements.pn.value].find(([dn]) => dn === Number(form.elements.dn.value));
    return found ? found[1] / 1000 : NaN;
  }
  if (src === 'inner') return Number(form.elements.di.value) / 1000;
  const du = Number(form.elements.du.value) / 1000, sdr = Number(form.elements.sdr.value);
  return du * (1 - 2 / sdr);
}

function cbGradient(v, d, eps, nu) {
  if (!(v > 0 && d > 0)) return NaN;
  const re = v * d / nu, lambda = colebrook(re, eps, d);
  return { re, lambda, i: lambda * v * v / (2 * G * d) };
}

function solveVelocity(d, eps, nu, targetI) {
  let lo = 1e-5, hi = 100;
  for (let k = 0; k < 90; k++) {
    const mid = (lo + hi) / 2;
    if (cbGradient(mid, d, eps, nu).i < targetI) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function solveDiameter(q, eps, nu, targetI) {
  let lo = 0.001, hi = 10;
  for (let k = 0; k < 100; k++) {
    const d = (lo + hi) / 2, v = q / (Math.PI * d * d / 4);
    if (cbGradient(v, d, eps, nu).i > targetI) lo = d; else hi = d;
  }
  return (lo + hi) / 2;
}

function syncColebrookForm() {
  const f = formFor('colebrook'), system = f.elements.system.value, mode = f.elements.mode;
  const options = system === 'gravity' ? [['qv','Дебит и скорост'],['dv','Диаметър и скорост']] : [['loss','Напорни загуби и скорост'],['qv','Дебит и скорост'],['dv','Диаметър и скорост']];
  const prior = mode.value;
  mode.replaceChildren(...options.map(([value,label]) => { const o=document.createElement('option'); o.value=value; o.textContent=label; return o; }));
  mode.value = options.some(([v]) => v === prior) ? prior : options[0][0];
  const m = mode.value, src = f.elements.dsource.value;
  const show = (selector, visible) => f.querySelectorAll(`[data-cb-field="${selector}"]`).forEach(el => { el.hidden = !visible; });
  show('pn', src === 'catalog' && (m === 'qv' || m === 'loss'));
  show('di', src === 'inner' && (m === 'qv' || m === 'loss'));
  show('sdr', src === 'sdr' && (m === 'qv' || m === 'loss'));
  show('slope', system === 'gravity');
  show('length', system === 'pressure');
  show('q', m === 'dv' || m === 'loss');
  show('pressure', system === 'pressure' && m !== 'loss');
  f.elements.dsource.closest('label').hidden = m === 'dv';
}

function calculateColebrook() {
  const f = formFor('colebrook'), system = f.elements.system.value, mode = f.elements.mode.value;
  const t = Math.round(numeric(f, 'temp'));
  if (t < 2 || t > 40) return;
  const nu = waterNu[t], eps = numeric(f, 'roughness') / 1000;
  let d = (mode === 'dv') ? NaN : cbDiameter(f), q = (mode === 'dv' || mode === 'loss') ? cbFlow(f) : NaN;
  let targetI;
  if (!(eps >= 0) || !Number.isFinite(eps)) return;
  if (system === 'gravity') {
    const slope = numeric(f, 'slope'), unit = f.elements.iunit.value;
    targetI = unit === 'permil' ? slope / 1000 : unit === 'mkm' ? slope / 1000 : slope;
  } else if (mode !== 'loss') {
    const factor = f.elements.punit.value === 'bar' ? 100000 / (RHO * G) : 1;
    const head = (numeric(f, 'p1') - numeric(f, 'p2')) * factor + numeric(f, 'h1') - numeric(f, 'h2');
    const length = numeric(f, 'length');
    if (!(length > 0)) { setResults('—','', 'Провери входните данни', [], 'Дължината трябва да е положителна.', 'Въведи дължина на тръбния участък над нула.'); return; }
    targetI = head / length;
  }
  if ((mode === 'dv' || mode === 'loss') && !(q > 0)) { setResults('—','', 'Провери входните данни', [], 'Дебитът трябва да е положителен.', 'Въведи дебит над нула.'); return; }
  if (mode === 'dv' && system === 'gravity' && !(targetI > 0)) { setResults('—','', 'Провери входните данни', [], 'Наклонът трябва да е положителен.', 'Въведи положителен наклон.'); return; }
  if (mode === 'dv' && Number.isFinite(targetI) && targetI > 0 && q > 0) d = solveDiameter(q, eps, nu, targetI);
  if (!(d > 0 && eps >= 0 && nu > 0) || (mode === 'dv' && !(q > 0)) || (mode === 'loss' && !(q > 0))) return;
  if (system === 'pressure' && mode !== 'loss' && !(targetI > 0)) {
    setResults('—','', 'Няма наличен положителен напор', [], 'Провери P₁, P₂, котите и дължината.', 'Разликата в налягане и коти трябва да осигури положителен напор по посоката на потока.'); return;
  }
  let v, flow, hydraulics;
  if (mode === 'dv') {
    v = q / (Math.PI * d * d / 4); flow = q;
  } else if (mode === 'loss') {
    v = q / (Math.PI * d * d / 4); flow = q;
  } else {
    v = solveVelocity(d, eps, nu, targetI); flow = v * Math.PI * d * d / 4;
  }
  hydraulics = cbGradient(v, d, eps, nu);
  const headLoss = system === 'pressure' ? hydraulics.i * numeric(f, 'length') : NaN;
  const deltaBar = RHO * G * headLoss / 100000;
  const qls = flow * 1000, qh = flow * 3600;
  let hero, unit, caption, items;
  if (mode === 'dv') {
    hero = fmt(d * 1000, 1); unit = 'mm'; caption = 'Изчислен вътрешен диаметър';
    items = [metric('СКОРОСТ',fmt(v,3),'m/s',true),metric('ДЕБИТ',fmt(qls,2),'L/s'),metric('ДЕБИТ',fmt(qh,2),'m³/h'),metric('НАКЛОН / ΔH НА ЕДИНИЦА',fmt(hydraulics.i,6),'m/m'),metric('REYNOLDS',fmt(hydraulics.re,0),'Re'),metric('КОЕФИЦИЕНТ НА ТРЕНЕ',fmt(hydraulics.lambda,5),'λ')];
  } else if (mode === 'loss') {
    hero = fmt(v,3); unit = 'm/s'; caption = 'Скорост на потока';
    items = [metric('ЗАГУБА НА НАЛЯГАНЕ',fmt(deltaBar,4),'bar',true),metric('ЗАГУБА НА НАПОР',fmt(headLoss,3),'m вод. ст.'),metric('ДЕБИТ',fmt(qls,2),'L/s'),metric('НАКЛОН НА ЕНЕРГИЙНАТА ЛИНИЯ',fmt(hydraulics.i,6),'m/m'),metric('REYNOLDS',fmt(hydraulics.re,0),'Re'),metric('КОЕФИЦИЕНТ НА ТРЕНЕ',fmt(hydraulics.lambda,5),'λ')];
  } else {
    hero = fmt(v,3); unit = 'm/s'; caption = 'Скорост на потока';
    items = [metric('ДЕБИТ',fmt(qls,2),'L/s',true),metric('ДЕБИТ',fmt(qh,2),'m³/h'),metric(system === 'pressure' ? 'ЗАГУБА НА НАЛЯГАНЕ' : 'НАКЛОН',system === 'pressure' ? fmt(deltaBar,4) : fmt(hydraulics.i,6),system === 'pressure' ? 'bar' : 'm/m'),metric('ВЪТРЕШЕН ДИАМЕТЪР',fmt(d*1000,1),'mm'),metric('REYNOLDS',fmt(hydraulics.re,0),'Re'),metric('КОЕФИЦИЕНТ НА ТРЕНЕ',fmt(hydraulics.lambda,5),'λ')];
  }
  const warn = hydraulics.re < 4000 ? 'Потокът е в ламинарна или преходна област; проверете приложимостта на резултата.' : '';
  setResults(hero,unit,caption,items,`Colebrook–White · k=${fmt(eps*1000,3)} mm · вода ${t}°C`,warn);
}

function drawSideWeir(_profile, values) {
  const svg=document.querySelector('#sideweir-chart'), legend=document.querySelector('#sideweir-legend');
  if(!values||!Number.isFinite(values.hWet)){svg.innerHTML='<text x="450" y="180" text-anchor="middle" class="chart-empty">Схемата ще се покаже при валидни входни данни</text>';legend.innerHTML='';return;}
  const {z0,slope,p,zrecv,hWet,hOut,dh,length}=values;
  const zWet=z0+hWet, zDry=z0+p, zOutlet=z0+dh, zOutletWater=zOutlet+hOut;
  const zCrestEnd=z0-slope*length+p;
  const levels=[z0,zWet,zDry,zOutlet,zOutletWater,zCrestEnd];
  if(Number.isFinite(zrecv))levels.push(zrecv);
  let min=Math.min(...levels),max=Math.max(...levels);if(max-min<.25){min-=.15;max+=.15;}
  const yTop=48,yBottom=282,scale=(yBottom-yTop)/(max-min),Y=z=>yTop+(max-z)*scale;
  const xIn=52,xRise=305,xWeirEnd=650,xOut=700,xRight=860,yi=Y(z0),yWet=Y(zWet),yDry=Y(zDry),yOut=Y(zOutlet),yOutWater=Y(zOutletWater),yCrestEnd=Y(zCrestEnd);
  const dim=(x,y1,y2,label)=>`<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" class="chart-dim" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)"/><text x="${x+6}" y="${(y1+y2)/2+3}" class="chart-dimension-label">${label}</text>`;
  const receiver=Number.isFinite(zrecv)?`<line x1="${xIn}" y1="${Y(zrecv)}" x2="${xRight}" y2="${Y(zrecv)}" class="chart-receiver"/><text x="${xRight-2}" y="${Y(zrecv)-5}" text-anchor="end" class="chart-annotation">Водоприемник 1%</text>`:'';
  svg.innerHTML=`<defs><pattern id="wall-hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="8" stroke="#8799a1" stroke-width="2"/></pattern><marker id="dim-arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7Z" fill="#516a76"/></marker></defs>
    <rect x="${xIn}" y="28" width="${xRise-xIn}" height="13" fill="url(#wall-hatch)" stroke="#71858e"/>
    <rect x="${xOut}" y="28" width="${xRight-xOut}" height="13" fill="url(#wall-hatch)" stroke="#71858e"/>
    <rect x="${xIn-8}" y="${yi}" width="${xWeirEnd-xIn+8}" height="10" fill="url(#wall-hatch)" stroke="#71858e"/>
    <rect x="${xOut}" y="${yOut}" width="${xRight-xOut}" height="10" fill="url(#wall-hatch)" stroke="#71858e"/>
    <path d="M${xRise} ${yi}V${yDry} M${xOut} 41V${yOut}" class="chart-wall"/>
    <path d="M${xIn} ${yWet}H${xRise}L${xWeirEnd} ${yCrestEnd}" class="chart-water"/>
    <path d="M${xIn} ${yDry}H${xRise}" class="chart-dry-water"/>
    <path d="M${xRise} ${yDry}L${xWeirEnd} ${yCrestEnd}" class="chart-crest"/>
    <path d="M${xWeirEnd} ${yCrestEnd}H${xOut}" class="chart-wall"/>
    ${receiver}
    ${dim(92,yi,yWet,'H₀,₁')}${dim(145,yi,yDry,'h₁ = P')}${dim(198,yWet,yDry,'H₁')}${dim(625,yi,yDry,'P')}${dim(820,yOut,yOutWater,'h₂')}${dim(675,yi,yOut,'Δh')}
    <line x1="${xRise}" y1="326" x2="${xWeirEnd}" y2="326" class="chart-dim" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)"/><text x="${(xRise+xWeirEnd)/2}" y="319" text-anchor="middle" class="chart-dimension-label">b = ${fmt(length,2)} m</text>
    <text x="${xIn+4}" y="${Math.max(54,yWet-9)}" class="chart-annotation">Qор</text><text x="${xIn+4}" y="${yDry-7}" class="chart-annotation">Qнепр</text>
    <text x="${xOut+8}" y="${yOutWater-8}" class="chart-annotation">Qнепр</text>
    <text x="${xRise+8}" y="${yCrestEnd+15}" class="chart-annotation">Преливен ръб</text>
    <text x="${xIn}" y="350" class="chart-axis-label">Довеждаща тръба</text><text x="${xOut+4}" y="350" class="chart-axis-label">Отвеждаща тръба</text>`;
  legend.innerHTML=`<span><i class="swatch water"></i>Водно ниво при Qор</span><span><i class="swatch crest"></i>Преливен ръб</span><span><i class="swatch bed"></i>Дъно на тръбите</span>${Number.isFinite(zrecv)?'<span><i class="swatch receiver"></i>Водоприемник при 1%</span>':''}`;
}

function syncSideWeirForm() {
  const f=formFor('sideweir'), regulatory=f.elements.qnonmode.value==='regulation';
  f.querySelector('[data-sw-field="qnon"]').hidden=regulatory;
  f.querySelectorAll('[data-sw-field="qmax"]').forEach(el=>el.hidden=!regulatory);
}

function circularManningQ(d, y, n, slope) {
  const r=d/2, theta=Math.acos(Math.max(-1,Math.min(1,1-y/r)));
  const area=r*r*(theta-Math.sin(theta)*Math.cos(theta)), perimeter=2*r*theta;
  const rh=perimeter>0?area/perimeter:0;
  return (1/n)*area*Math.pow(rh,2/3)*Math.sqrt(slope);
}

function normalDepthCircular(q, d, n, slope) {
  if(!(q>0&&d>0&&n>0&&slope>0)) return NaN;
  // Use the lower-depth branch of the circular-pipe Manning curve (up to 0.94D).
  let lo=d*1e-7, hi=d*.94;
  if(circularManningQ(d,hi,n,slope)<q) return NaN;
  for(let k=0;k<70;k++){
    const mid=(lo+hi)/2;
    if(circularManningQ(d,mid,n,slope)<q) lo=mid; else hi=mid;
  }
  return (lo+hi)/2;
}

function calculateSideWeir() {
  const f=formFor('sideweir');
  const q0Ls=numeric(f,'q0'), qnonLs=f.elements.qnonmode.value==='regulation'?(1+numeric(f,'n0'))*numeric(f,'qmax'):numeric(f,'qnon');
  const q0=q0Ls/1000, qnon=qnonLs/1000, d1=numeric(f,'d1'), d2=numeric(f,'d2'), d3=numeric(f,'d3'), s1=numeric(f,'s1'), s2=numeric(f,'s2'), s3=numeric(f,'s3'), manning=numeric(f,'manning'), mu=numeric(f,'mu'), z0=numeric(f,'z0'), slope=numeric(f,'slope');
  const zrecv=f.elements.zrecv.value.trim()===''?NaN:Number(f.elements.zrecv.value), qoverflow=q0-qnon;
  const err=(message)=>{ setResults('—','', 'Провери входните данни', [], 'Няма изчислен профил.', message); drawSideWeir(null,{}); };
  if(!(q0>qnon&&qnon>0&&d1>0&&d2>0&&d3>0&&s1>0&&s2>0&&s3>0&&manning>0&&mu>=.5&&mu<=.9&&slope>=0)){err('Провери дебитите, диаметрите, наклоните, коефициента на Манинг и коефициента μ.');return;}
  // Worked-example method in the supplied diploma: calculate circular-pipe
  // normal depths for the storm and non-overflow flows, then set P to the
  // non-overflow depth in the incoming pipe.
  const hWet=normalDepthCircular(q0,d1,manning,s1);
  const hDryIn=normalDepthCircular(qnon,d1,manning,s1);
  const hOut=normalDepthCircular(qnon,d2,manning,s2);
  const hOverflow=normalDepthCircular(qoverflow,d3,manning,s3);
  if(![hWet,hDryIn,hOut,hOverflow].every(Number.isFinite)){err('Поне една от тръбите няма капацитет за зададения дебит при този диаметър, наклон и n. Увеличи диаметъра/наклона или провери дебита.');return;}
  const p=hDryIn, head=hWet-p, dh=hDryIn-hOut;
  if(!(head>0)){err('Водният стоеж при Q₀ трябва да е над стоежа при Qнепр, за да има преливане.');return;}
  // Free, non-submerged rectangular overflow using the report's mean head H/2.
  const length=qoverflow/((2/3)*mu*(head/2)*Math.sqrt(2*G*(head/2)));
  const crestIn=z0+p, crestOut=z0-slope*length+p;
  const receiverOK=Number.isFinite(zrecv)?Math.min(crestIn,crestOut)>zrecv:null;
  const metrics=[
    metric('НЕПРЕЛИВАЩ ДЕБИТ Qнепр',fmt(qnon*1000,2),'L/s'),
    metric('ПРЕЛИВАЩ ДЕБИТ Qпр',fmt(qoverflow*1000,2),'L/s',true),
    metric('ВХОДЕН СТОЕЖ ПРИ Q₀',fmt(hWet,3),'m'),
    metric('ВХОДЕН СТОЕЖ ПРИ Qнепр',fmt(hDryIn,3),'m'),
    metric('ВИСОЧИНА НА ПРЕЛИВНИЯ РЪБ P',fmt(p,3),'m'),
    metric('НАПОР НАД ПРЕЛИВНИЯ РЪБ',fmt(head,3),'m'),
    metric('СТОЕЖ В ОТВЕЖДАЩАТА ТРЪБА h₂',fmt(hOut,3),'m'),
    metric('СТОЕЖ В ОТЛИВНАТА ТРЪБА h₃',fmt(hOverflow,3),'m'),
    metric('РАЗЛИКА Δh = h₁ − h₂',fmt(dh,3),'m'),
    metric('КОТА НА ПРЕЛИВНИЯ РЪБ ПРИ ВХОДА',fmt(crestIn,3),'m'),
    metric('КОТА НА ПРЕЛИВНИЯ РЪБ ПРИ ИЗХОДА',fmt(crestOut,3),'m'),
    metric('ПРОВЕРКА ПО ЧЛ. 32',receiverOK===null?'Въведи водно ниво':receiverOK?'Премината':'Непремината','')
  ];
  const warning=receiverOK===null?'За проверка по чл. 32 въведи котата на водоприемника при 1% обезпеченост.':receiverOK?'Котата на преливния ръб е над зададеното водно ниво при 1%.':'Котата на преливния ръб не е над зададеното водно ниво при 1%.';
  setResults(fmt(length,2),'m','Изчислена дължина на преливния ръб',metrics,'Примерът в приложената дипломна работа · Манинг за пълнежите · свободен непотопен преливник',warning);
  drawSideWeir(null,{z0,slope,p,zrecv,hWet,hOut,dh,length});
}

function calculateRectangular() {
  const f = formFor('rectangular');
  const b = numeric(f, 'b'), y = numeric(f, 'y'), slope = numeric(f, 'slope'), n = numeric(f, 'n');
  if (!(b > 0 && y > 0 && slope > 0 && n > 0)) return;
  const area = b * y, perimeter = b + 2 * y, rh = area / perimeter;
  const q = (1 / n) * area * Math.pow(rh, 2 / 3) * Math.sqrt(slope);
  const v = q / area;
  setResults(fmt(q * 1000, 2), 'L/s', 'Дебит при зададената дълбочина', [
    metric('ДЕБИТ', fmt(q * 3600), 'm³/h', true),
    metric('СКОРОСТ', fmt(v, 3), 'm/s'),
    metric('ПЛОЩ НА СЕЧЕНИЕТО', fmt(area, 3), 'm²'),
    metric('ХИДРАВЛИЧЕН РАДИУС', fmt(rh, 3), 'm'),
    metric('МОКЪР ПЕРИМЕТЪР', fmt(perimeter, 3), 'm'),
    metric('ФРУДОВО ЧИСЛО', fmt(v / Math.sqrt(G * y), 3), 'Fr')
  ], 'Манинг · правоъгълно сечение');
}

function calculatePump() {
  const f = formFor('pump');
  const qh = numeric(f, 'q'), h = numeric(f, 'h'), eta = numeric(f, 'eta'), hours = numeric(f, 'hours');
  if (!(qh > 0 && h > 0 && eta > 0 && eta <= 100 && hours >= 0)) return;
  const q = qh / 3600, hydraulic = RHO * G * q * h / 1000;
  const input = hydraulic / (eta / 100);
  const daily = input * hours;
  setResults(fmt(input, 2), 'kW', 'Ориентировъчна входна мощност', [
    metric('ХИДРАВЛИЧНА МОЩНОСТ', fmt(hydraulic, 2), 'kW', true),
    metric('ВХОДНА МОЩНОСТ', fmt(input, 2), 'kW'),
    metric('ДНЕВНА ЕНЕРГИЯ', fmt(daily, 1), 'kWh/day'),
    metric('ГОДИШНА ЕНЕРГИЯ', fmt(daily * 365, 0), 'kWh/year'),
    metric('ДЕБИТ', fmt(q, 4), 'm³/s'),
    metric('КПД', fmt(eta, 1), '%')
  ], 'Pₕ = ρgQH · Pвх = Pₕ/η');
}

const calculators = { pipe: calculatePipe, mainpipe: calculateMainPipe, colebrook: calculateColebrook, sideweir: calculateSideWeir, circular: calculateCircular, rectangular: calculateRectangular, pump: calculatePump };
let currentView = 'pipe';

function calculate() {
  document.querySelector('#result-error').hidden = true;
  calculators[currentView]();
}

function activate(view) {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  document.querySelectorAll('.view-form').forEach((form) => form.classList.toggle('active', form.dataset.view === view));
  const data = titles[view];
  document.querySelector('#crumb-current').textContent = data[0];
  document.querySelector('#page-title').textContent = data[0];
  document.querySelector('#page-desc').textContent = data[1];
  document.querySelector('#hero-label').textContent = data[2];
  document.querySelector('#hero-caption').textContent = data[3];
  document.querySelector('#formula-note').textContent = data[4];
  const tank = view === 'tank';
  document.querySelector('.workspace').hidden = tank;
  document.querySelector('#tank-view').hidden = !tank;
  document.querySelector('.sideweir-chart-wrap').hidden = view !== 'sideweir';
  if (!tank) calculate();
}

populateMainPipe();
const cbForm = formFor('colebrook');
cbForm.elements.pn.addEventListener('change', () => { populateColebrookDn(); calculateColebrook(); });
function populateColebrookDn() {
  const select = cbForm.elements.dn, pn = cbForm.elements.pn.value, old = Number(select.value) || 280;
  select.replaceChildren(...PE100[pn].map(([dn]) => { const o=document.createElement('option'); o.value=String(dn); o.textContent=`DN ${dn}`; return o; }));
  select.value = PE100[pn].some(([dn])=>dn===old) ? String(old) : '280';
  if (!select.value) select.selectedIndex=0;
}
populateColebrookDn();
cbForm.elements.system.addEventListener('change', () => { syncColebrookForm(); calculateColebrook(); });
cbForm.elements.mode.addEventListener('change', () => { syncColebrookForm(); calculateColebrook(); });
cbForm.elements.dsource.addEventListener('change', () => { syncColebrookForm(); calculateColebrook(); });
syncColebrookForm();
document.querySelectorAll('.view-form').forEach((form) => {
  initialValues[form.id] = new FormData(form);
  form.addEventListener('input', calculate);
  form.addEventListener('change', calculate);
  form.addEventListener('submit', (event) => event.preventDefault());
});
formFor('sideweir').elements.qnonmode.addEventListener('change', () => { syncSideWeirForm(); calculateSideWeir(); });
document.querySelector('#sideweir-print').addEventListener('click', () => window.print());
syncSideWeirForm();
formFor('mainpipe').elements.pn.addEventListener('change', () => { populateMainPipe(); calculateMainPipe(); });
formFor('mainpipe').elements.dn.addEventListener('change', calculateMainPipe);
document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => activate(button.dataset.view)));
document.querySelector('#reset-btn').addEventListener('click', () => {
  const form = formFor(currentView);
  for (const [name, value] of initialValues[form.id].entries()) form.elements[name].value = value;
  if (currentView === 'colebrook') { populateColebrookDn(); syncColebrookForm(); }
  calculate();
});

calculatePipe();
