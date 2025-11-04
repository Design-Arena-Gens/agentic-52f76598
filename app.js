const grid = document.getElementById('grid');
const search = document.getElementById('search');
const category = document.getElementById('category');
const minDemand = document.getElementById('minDemand');
const maxCompetition = document.getElementById('maxCompetition');
const minDemandOut = document.getElementById('minDemandOut');
const maxCompetitionOut = document.getElementById('maxCompetitionOut');
const priceMin = document.getElementById('priceMin');
const priceMax = document.getElementById('priceMax');
const sort = document.getElementById('sort');
const planDialog = document.getElementById('planDialog');

const state = { niches: [], filtered: [] };

function computeOpportunityScore(n) {
  // Higher demand, lower competition, higher margin => better
  const demand = n.demandScore; // 0-100
  const comp = 100 - n.competitionScore; // invert
  const margin = Math.max(0, (n.averagePrice - n.unitCost)); // dollars
  const marginScore = Math.min(100, (margin / 15) * 100); // cap around $15
  return Math.round(demand * 0.45 + comp * 0.35 + marginScore * 0.20);
}

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

function render() {
  grid.innerHTML = '';
  state.filtered.forEach(n => {
    const tpl = document.getElementById('cardTemplate').content.cloneNode(true);
    tpl.querySelector('.title').textContent = n.title;
    tpl.querySelector('.category').textContent = n.category;
    tpl.querySelector('.audience').textContent = n.audience;

    const priceTxt = `$${n.averagePrice.toFixed(0)}`;
    const marginTxt = `$${(n.averagePrice - n.unitCost).toFixed(0)}`;

    tpl.querySelector('.demand').textContent = `${n.demandScore}`;
    tpl.querySelector('.competition').textContent = `${n.competitionScore}`;
    tpl.querySelector('.price').textContent = priceTxt;
    tpl.querySelector('.margin').textContent = marginTxt;
    tpl.querySelector('.seasonality').textContent = n.seasonality;

    const kws = tpl.querySelector('.keywords');
    n.topKeywords.slice(0, 8).forEach(k => kws.appendChild(el('span', 'kw', k)));

    const angles = tpl.querySelector('.angles');
    n.angleVariants.slice(0, 3).forEach(a => angles.appendChild(el('span', 'angle', a)));

    const tags = tpl.querySelector('.tags');
    n.tags.slice(0, 8).forEach(t => tags.appendChild(el('span', 'tag', t)));

    const ideas = tpl.querySelector('.ideas');
    n.designIdeas.slice(0, 3).forEach(i => ideas.appendChild(el('div', 'idea', i)));

    const hooks = tpl.querySelector('.hooks');
    n.socialHooks.slice(0, 3).forEach(h => hooks.appendChild(el('div', 'hook', h)));

    const btn = tpl.querySelector('.btn-plan');
    btn.addEventListener('click', () => openPlan(n));

    grid.appendChild(tpl);
  });
}

function filter() {
  const q = (search.value || '').toLowerCase();
  const cat = category.value;
  const dMin = Number(minDemand.value);
  const cMax = Number(maxCompetition.value);
  const pMin = Number(priceMin.value || 0);
  const pMax = Number(priceMax.value || 999);

  let arr = state.niches.filter(n => {
    const matchQ = !q || [
      n.title, n.category, n.audience,
      ...(n.topKeywords || []),
      ...(n.tags || []),
      ...(n.designIdeas || []),
    ].join(' ').toLowerCase().includes(q);
    const matchCat = !cat || n.category === cat;
    const matchDemand = n.demandScore >= dMin;
    const matchComp = n.competitionScore <= cMax;
    const matchPrice = n.averagePrice >= pMin && n.averagePrice <= pMax;
    return matchQ && matchCat && matchDemand && matchComp && matchPrice;
  });

  const sortBy = sort.value;
  arr.forEach(n => n._score = computeOpportunityScore(n));
  if (sortBy === 'score') arr.sort((a,b)=>b._score - a._score);
  if (sortBy === 'demand') arr.sort((a,b)=>b.demandScore - a.demandScore);
  if (sortBy === 'competition') arr.sort((a,b)=>a.competitionScore - b.competitionScore);
  if (sortBy === 'price') arr.sort((a,b)=>b.averagePrice - a.averagePrice);
  if (sortBy === 'margin') arr.sort((a,b)=> (b.averagePrice-b.unitCost) - (a.averagePrice-a.unitCost));

  state.filtered = arr;
  render();
}

function openPlan(n) {
  const price = n.averagePrice;
  const margin = price - n.unitCost;
  const target = 3000;
  const units = Math.ceil(target / Math.max(1, margin));
  const cr = n.estimatedConversionPct || 2.0;
  const neededVisitors = Math.ceil(units / (cr/100));
  const body = `\nPrice $${price.toFixed(0)} | Margin $${margin.toFixed(0)} | CR ${cr}%\n\nTo reach $3,000: sell ~${units} units.\nTraffic target: ~${neededVisitors} listing visits.\n\nWeek 1: Launch 6 designs in this niche.\nWeek 2: Add 6 variants based on engagement.\nSEO: Use top keywords and tags below; pin 5 images per listing.\nContent Hooks: ${n.socialHooks.slice(0,3).join(' | ')}`;

  planDialog.querySelector('.dialog-title').textContent = `Plan: ${n.title}`;
  planDialog.querySelector('.dialog-body').textContent = body;
  planDialog.showModal();
}

function wireEvents() {
  [search, category, minDemand, maxCompetition, priceMin, priceMax, sort]
    .forEach(el => el.addEventListener('input', filter));
  minDemand.addEventListener('input', ()=> minDemandOut.textContent = minDemand.value);
  maxCompetition.addEventListener('input', ()=> maxCompetitionOut.textContent = maxCompetition.value);

  document.querySelectorAll('[data-qf]')
    .forEach(btn => btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-qf');
      if (key === 'evergreen') category.value = 'Evergreen';
      if (key === 'lowcomp') { maxCompetition.value = 40; maxCompetitionOut.textContent = '40'; }
      if (key === 'highmargin') { priceMin.value = 22; }
      if (key === 'seasonal') {
        category.value = 'Event/Seasonal';
        minDemand.value = 60; minDemandOut.textContent = '60';
      }
      filter();
    }));

  // ROI calculator
  document.getElementById('roiCalc').addEventListener('click', () => {
    const price = Number(document.getElementById('roiPrice').value);
    const cost = Number(document.getElementById('roiCost').value);
    const cr = Number(document.getElementById('roiCr').value);
    const target = Number(document.getElementById('roiTarget').value);
    const margin = Math.max(0, price - cost);
    const units = Math.ceil(target / Math.max(1, margin));
    const visits = Math.ceil(units / (cr/100));
    const listings = Math.ceil(units / 30); // assume 30 units/listing/month across top SKUs
    document.getElementById('roiOut').textContent =
      `Need ~${units} units. At ${cr}% CR ? ~${visits} visits. Launch ~${listings} strong listings.`;
  });
}

async function load() {
  const res = await fetch('./data/niches.json');
  const data = await res.json();
  state.niches = data.map(n => ({
    estimatedConversionPct: 2.0,
    ...n
  }));
  filter();
}

wireEvents();
load();
