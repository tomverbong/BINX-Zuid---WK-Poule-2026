const data = window.POULE_DATA || {};
const els = {
  summaryStrip: document.getElementById('summaryStrip'),
  lastUpdated: document.getElementById('lastUpdated'),
  sourceName: document.getElementById('sourceName'),
  phaseSelect: document.getElementById('phaseSelect'),
  searchInput: document.getElementById('searchInput'),
  onlyResults: document.getElementById('onlyResults'),
  matchesContainer: document.getElementById('matchesContainer'),
  standBody: document.querySelector('#standTable tbody'),
  deadlineList: document.getElementById('deadlineList'),
  rulesList: document.getElementById('rulesList'),
  bonusContainer: document.getElementById('bonusContainer')
};
const state = { phase: 'Alles', search: '', onlyResults: false };
function init() {
  els.lastUpdated.textContent = data.meta?.laatst_ververst || '-';
  els.sourceName.textContent = data.meta?.bronbestand || 'WK2026_poule_beheer.xlsx';
  buildSummary(); buildFilters(); renderStand(); renderDeadlines(); renderRules(); renderBonus(); attachEvents(); renderMatches();
}
function buildSummary() {
  const items = [['Deelnemers', data.summary?.deelnemers ?? 0], ['Wedstrijden', data.summary?.wedstrijden ?? 0], ['Ingevulde uitslagen', data.summary?.ingevulde_uitslagen ?? 0], ['Voorspellingen', data.summary?.ingevulde_voorspellingen ?? 0], ['Bonusvragen', data.bonus_questions?.length ?? 0]];
  els.summaryStrip.innerHTML = items.map(([label, value]) => `<div class="summary-cell"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(String(value))}</div></div>`).join('');
}
function buildFilters() {
  const phases = ['Alles', ...new Set((data.matches || []).map(m => m.fase).filter(Boolean))];
  els.phaseSelect.innerHTML = phases.map(phase => `<option value="${escapeHtml(phase)}">${escapeHtml(phase)}</option>`).join('');
}
function attachEvents() {
  els.phaseSelect.addEventListener('change', e => { state.phase = e.target.value; renderMatches(); });
  els.searchInput.addEventListener('input', e => { state.search = e.target.value.trim().toLowerCase(); renderMatches(); });
  els.onlyResults.addEventListener('change', e => { state.onlyResults = e.target.checked; renderMatches(); });
}
function renderStand() {
  const rows = [...(data.stand || [])].sort((a,b) => Number(b.totaal) - Number(a.totaal) || Number(b.punten_wedstrijden) - Number(a.punten_wedstrijden) || a.deelnemer.localeCompare(b.deelnemer));
  els.standBody.innerHTML = rows.map((row, index) => `<tr><td>${escapeHtml(String(index + 1))}</td><td>${escapeHtml(row.deelnemer)}</td><td>${escapeHtml(String(row.punten_wedstrijden ?? 0))}</td><td>${escapeHtml(String(row.punten_bonus ?? 0))}</td><td>${escapeHtml(String(row.totaal ?? 0))}</td></tr>`).join('');
}
function renderDeadlines() {
  els.deadlineList.innerHTML = (data.deadlines || []).map(item => `<li><strong>${escapeHtml(item.onderdeel)}</strong>${escapeHtml(item.datum || '')}</li>`).join('');
}
function renderRules() {
  els.rulesList.innerHTML = (data.rules || []).map(item => `<li><strong>${escapeHtml(item.onderdeel)}</strong>${escapeHtml(String(item.punten))} punten${item.voorbeeld ? `<div style="color:var(--muted);margin-top:4px;">${escapeHtml(item.voorbeeld)}</div>` : ''}</li>`).join('');
}
function renderMatches() {
  let matches = [...(data.matches || [])];
  if (state.phase !== 'Alles') matches = matches.filter(match => match.fase === state.phase);
  if (state.onlyResults) matches = matches.filter(match => !!match.uitslag);
  if (state.search) {
    const search = state.search;
    matches = matches.filter(match => {
      const teamHit = `${match.thuis} ${match.uit} ${match.fase} ${match.datum}`.toLowerCase().includes(search);
      const predictionHit = Object.entries(match.predictions || {}).some(([name, prediction]) => `${name} ${prediction || ''}`.toLowerCase().includes(search));
      return teamHit || predictionHit;
    });
  }
  if (!matches.length) {
    els.matchesContainer.innerHTML = '<div class="empty-state">Geen wedstrijden gevonden voor deze filters.</div>';
    return;
  }
  const grouped = groupBy(matches, match => `${match.datum_iso || match.datum || 'zonder-datum'}||${match.datum || 'Onbekende datum'}||${match.fase || 'Wedstrijd'}`);
  els.matchesContainer.innerHTML = Object.entries(grouped).map(([groupKey, groupMatches]) => {
    const [, dateLabel, phaseLabel] = groupKey.split('||');
    return `<section class="date-group"><div class="date-header"><span>${escapeHtml(dateLabel)}</span><span class="fase">${escapeHtml(phaseLabel)}</span></div>${groupMatches.map(renderMatchCard).join('')}</section>`;
  }).join('');
}
function renderMatchCard(match) {
  const result = match.uitslag || '–';
  const predictionRows = (data.participants || []).map(name => {
    const prediction = match.predictions?.[name];
    const points = match.points?.[name] ?? 0;
    const exact = match.uitslag && prediction && prediction === match.uitslag;
    const cls = exact ? 'points-good' : points >= 5 ? 'points-mid' : 'points-zero';
    return `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(prediction || '—')}</td><td class="${cls}">${escapeHtml(String(points || 0))}</td><td>${renderOutcomeTag(match, prediction)}</td></tr>`;
  }).join('');
  return `<article class="match-card"><div class="match-top"><div class="match-time">${escapeHtml(match.tijd || '')}</div><div class="match-main"><div class="team home">${escapeHtml(match.thuis)}</div><div class="result-box"><div class="label">Uitslag</div><div class="score">${escapeHtml(result)}</div></div><div class="team away">${escapeHtml(match.uit)}</div></div></div><div class="prediction-table-wrap"><table class="prediction-table"><thead><tr><th>Deelnemer</th><th>Voorspelling</th><th>Punten</th><th>Vergelijking</th></tr></thead><tbody>${predictionRows}</tbody></table></div></article>`;
}
function renderOutcomeTag(match, prediction) {
  if (!match.uitslag || !prediction) return '<span style="color:var(--muted)">nog geen vergelijking</span>';
  const actual = splitScore(match.uitslag), guess = splitScore(prediction);
  if (!actual || !guess) return '<span style="color:var(--muted)">—</span>';
  if (actual.home === guess.home && actual.away === guess.away) return '<span class="points-good">exact goed</span>';
  if (sign(actual.home - actual.away) === sign(guess.home - guess.away)) return '<span class="points-mid">uitslagrichting goed</span>';
  return '<span style="color:var(--muted)">afwijkend</span>';
}
function renderBonus() {
  const participants = data.participants || [];
  const headerCells = participants.map(name => `<th>${escapeHtml(name)}</th>`).join('');
  const rows = (data.bonus_questions || []).map(question => {
    const answerCells = participants.map(name => {
      const answer = question.antwoorden?.[name] ?? '—';
      const points = question.punten?.[name] ?? 0;
      const cls = points >= 10 ? 'points-good' : points > 0 ? 'points-mid' : 'points-zero';
      return `<td><div>${escapeHtml(String(answer))}</div><div class="${cls}" style="margin-top:4px;">${escapeHtml(String(points))} pt</div></td>`;
    }).join('');
    return `<tr><td>${escapeHtml(String(question.nr || ''))}</td><td>${escapeHtml(question.vraag || '')}</td><td class="correct-answer">${escapeHtml(question.correct_antwoord || 'nog niet ingevuld')}</td>${answerCells}</tr>`;
  }).join('');
  els.bonusContainer.innerHTML = `<div class="bonus-table-wrap"><table class="bonus-table"><thead><tr><th>Nr</th><th>Bonusvraag</th><th>Correct antwoord</th>${headerCells}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function splitScore(score) { const m = String(score).match(/^(\d+)\s*-\s*(\d+)$/); return m ? { home: Number(m[1]), away: Number(m[2]) } : null; }
function sign(n) { return n === 0 ? 0 : (n > 0 ? 1 : -1); }
function groupBy(items, keyFn) { return items.reduce((acc, item) => { const key = keyFn(item); (acc[key] ||= []).push(item); return acc; }, {}); }
function escapeHtml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
init();
