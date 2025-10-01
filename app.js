import { initDatabase, getTodayKey, getGoal, setGoal, getDayEntries, addEntry, removeLastEntry, getWeeklyData, getMonthlyData, getStreak, getGoalsHitTotal } from './database.js';
import { requestPermission, scheduleReminders, cancelReminders } from './notifications.js';
import { getRandomTip } from './tips.js';
import confetti from 'confetti';
import Chart from 'chart.js';

/* ...existing code... */
const els = {
  goalInput: document.getElementById('goalInput'),
  goalUnit: document.getElementById('goalUnit'),
  saveGoalBtn: document.getElementById('saveGoalBtn'),
  todayDate: document.getElementById('todayDate'),
  progressCircle: document.getElementById('progressCircle'),
  progressPercent: document.getElementById('progressPercent'),
  progressAmount: document.getElementById('progressAmount'),
  quickButtons: [...document.querySelectorAll('[data-add]')],
  customAmount: document.getElementById('customAmount'),
  addCustomBtn: document.getElementById('addCustomBtn'),
  undoBtn: document.getElementById('undoBtn'),
  streakCount: document.getElementById('streakCount'),
  goalsCount: document.getElementById('goalsCount'),
  tabs: [...document.querySelectorAll('.tab')],
  chartCanvas: document.getElementById('historyChart'),
  reminderInterval: document.getElementById('reminderInterval'),
  enableNotifBtn: document.getElementById('enableNotifBtn'),
  tipText: document.getElementById('tipText'),
  newTipBtn: document.getElementById('newTipBtn'),
};
/* ...existing code... */

let chart;
init();

async function init() {
  await initDatabase();
  // Date
  const today = new Date();
  const fmt = today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  els.todayDate.textContent = fmt;

  // Goal load
  const goalMl = getGoal();
  els.goalInput.value = goalMl >= 100 ? goalMl : 2000;
  els.goalUnit.value = 'ml';

  // UI bindings
  els.saveGoalBtn.addEventListener('click', onSaveGoal);
  els.quickButtons.forEach(btn => btn.addEventListener('click', () => addDrink(Number(btn.dataset.add))));
  els.addCustomBtn.addEventListener('click', () => {
    const v = Number(els.customAmount.value);
    if (!Number.isFinite(v) || v <= 0) return;
    addDrink(v);
    els.customAmount.value = '';
  });
  els.undoBtn.addEventListener('click', onUndoLast);

  els.tabs.forEach(t => t.addEventListener('click', () => {
    els.tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    updateChart(t.dataset.range);
  }));

  els.enableNotifBtn.addEventListener('click', async () => {
    const ok = await requestPermission();
    if (!ok) return;
    const minutes = Number(els.reminderInterval.value);
    if (minutes > 0) scheduleReminders(minutes, () => shouldNotify() ? buildNotifText() : null);
    else cancelReminders();
    els.enableNotifBtn.textContent = minutes > 0 ? 'Notificações ativas' : 'Ativar notificações';
  });

  els.newTipBtn.addEventListener('click', () => {
    els.tipText.textContent = getRandomTip();
  });
  els.tipText.textContent = getRandomTip();

  // Initial render
  renderProgress();
  setupChart();
  updateChart('week');
}

function onSaveGoal() {
  const val = Number(els.goalInput.value);
  const unit = els.goalUnit.value;
  if (!Number.isFinite(val) || val <= 0) return;
  const ml = unit === 'l' ? Math.round(val * 1000) : Math.round(val);
  setGoal(ml);
  renderProgress();
}

function addDrink(amountMl) {
  addEntry({ amount: amountMl, ts: Date.now() });
  renderProgress();
  if (progressPct() >= 100) celebrate();
}

function onUndoLast() {
  removeLastEntry(getTodayKey());
  renderProgress();
}

function progressPct() {
  const goalMl = getGoal();
  const consumed = sumToday();
  return Math.min(100, Math.round((consumed / Math.max(goalMl, 1)) * 100));
}

function sumToday() {
  const entries = getDayEntries(getTodayKey());
  return entries.reduce((s, e) => s + (e.amount || 0), 0);
}

function renderProgress() {
  const goalMl = getGoal();
  const consumed = sumToday();
  const pct = progressPct();
  els.progressPercent.textContent = `${pct}%`;
  els.progressAmount.textContent = `${consumed} / ${goalMl} ml`;
  const circumference = 2 * Math.PI * 44;
  const offset = circumference * (1 - pct / 100);
  els.progressCircle.style.strokeDasharray = `${circumference}`;
  els.progressCircle.style.strokeDashoffset = `${offset}`;
  // Rewards
  els.streakCount.textContent = getStreak();
  els.goalsCount.textContent = getGoalsHitTotal();
}

function celebrate() {
  confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
}

function setupChart() {
  const ctx = els.chartCanvas.getContext('2d');
  chart = new Chart(ctx, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Consumo (ml)', data: [], borderColor: '#111', backgroundColor: '#111' }] },
    options: {
      responsive: true,
      animation: { duration: 300 },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      }
    }
  });
}

function updateChart(range) {
  const d = range === 'month' ? getMonthlyData() : getWeeklyData();
  chart.data.labels = d.labels;
  chart.data.datasets[0].data = d.values;
  chart.update();
}

function shouldNotify() {
  const goal = getGoal();
  const consumed = sumToday();
  const deficit = goal - consumed;
  // Notify if below 70% and last entry older than 45 min
  const entries = getDayEntries(getTodayKey());
  const lastTs = entries.length ? entries[entries.length - 1].ts : 0;
  const minsSince = (Date.now() - lastTs) / 60000;
  return deficit > goal * 0.3 && minsSince >= 45;
}

function buildNotifText() {
  const goal = getGoal();
  const consumed = sumToday();
  const remaining = Math.max(0, goal - consumed);
  return `Hora de hidratar! Faltam ${remaining} ml para sua meta de hoje 💧`;
}
/* ...existing code... */
