// Este arquivo irá conter a lógica para interagir com o banco de dados SQLite.
// Usaremos uma biblioteca como 'sql.js' para manipular o banco de dados no navegador.

let db;

// Função para inicializar o banco de dados
export async function initDatabase() {
  if (db) return;
  try {
    // @ts-ignore
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });
    // Tenta carregar o banco de dados do localStorage
    const dbData = localStorage.getItem('h2o-habits-db');
    if (dbData) {
      const dbBytes = new Uint8Array(JSON.parse(dbData));
      db = new SQL.Database(dbBytes);
    } else {
      db = new SQL.Database();
      // Cria as tabelas se o banco de dados for novo
      createTables();
      // Migra dados do localStorage antigo, se existirem
      migrateFromLocalStorage();
    }
    console.log("Banco de dados SQLite inicializado com sucesso.");
  } catch (err) {
    console.error("Erro ao inicializar o banco de dados:", err);
  }
}

function createTables() {
  if (!db) return;
  const createEntriesTable = `
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      ts INTEGER NOT NULL
    );
  `;
  const createSettingsTable = `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `;
  db.run(createEntriesTable);
  db.run(createSettingsTable);
  // Insere uma meta padrão se não existir
  db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('goal', '2000')");
  saveDatabase();
}

// Função para salvar o estado do banco de dados no localStorage
function saveDatabase() {
  if (!db) return;
  const data = db.export();
  localStorage.setItem('h2o-habits-db', JSON.stringify(Array.from(data)));
}

// Funções para substituir a API de storage.js
export function getGoal() {
  if (!db) return 2000;
  const stmt = db.prepare("SELECT value FROM settings WHERE key = 'goal'");
  let goal = 2000;
  if (stmt.step()) {
    goal = Number(stmt.get()[0]);
  }
  stmt.free();
  return goal;
}

export function setGoal(ml) {
  if (!db) return;
  db.run("UPDATE settings SET value = ? WHERE key = 'goal'", [ml]);
  saveDatabase();
}

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getDayEntries(dayKey) {
  if (!db) return [];
  const startOfDay = new Date(dayKey).setHours(0, 0, 0, 0);
  const endOfDay = new Date(dayKey).setHours(23, 59, 59, 999);
  const stmt = db.prepare("SELECT amount, ts FROM entries WHERE ts >= ? AND ts <= ? ORDER BY ts ASC");
  stmt.bind([startOfDay, endOfDay]);
  const entries = [];
  while (stmt.step()) {
    const row = stmt.get();
    entries.push({ amount: row[0], ts: row[1] });
  }
  stmt.free();
  return entries;
}

export function addEntry(entry) {
  if (!db) return;
  db.run("INSERT INTO entries (amount, ts) VALUES (?, ?)", [entry.amount, entry.ts]);
  saveDatabase();
}

export function removeLastEntry() {
  if (!db) return;
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const endOfDay = new Date().setHours(23, 59, 59, 999);
  const stmt = db.prepare("SELECT id FROM entries WHERE ts >= ? AND ts <= ? ORDER BY ts DESC LIMIT 1");
  stmt.bind([startOfDay, endOfDay]);
  if (stmt.step()) {
    const lastId = stmt.get()[0];
    db.run("DELETE FROM entries WHERE id = ?", [lastId]);
    saveDatabase();
  }
  stmt.free();
}

function getDataForRange(days) {
  if (!db) return { labels: [], values: [] };
  const labels = [];
  const values = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayKey = date.toISOString().slice(0, 10);
    const entries = getDayEntries(dayKey);
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    
    const label = days === 7 
      ? date.toLocaleDateString('pt-BR', { weekday: 'short' })
      : date.toLocaleDateString('pt-BR', { day: '2-digit' });
    labels.push(label);
    values.push(total);
  }
  return { labels, values };
}

export function getWeeklyData() {
  return getDataForRange(7);
}

export function getMonthlyData() {
  return getDataForRange(30);
}

function isGoalMetOn(dayKey) {
  const goal = getGoal();
  const entries = getDayEntries(dayKey);
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  return total >= goal && total > 0;
}

export function getStreak() {
  if (!db) return 0;
  let streak = 0;
  const today = new Date();
  
  // Checa hoje
  if (isGoalMetOn(today.toISOString().slice(0, 10))) {
    streak++;
    const yesterday = new Date(today);
    // Checa dias anteriores em sequência
    while (true) {
      yesterday.setDate(yesterday.getDate() - 1);
      if (isGoalMetOn(yesterday.toISOString().slice(0, 10))) {
        streak++;
      } else {
        break;
      }
    }
  }
  return streak;
}

export function getGoalsHitTotal() {
    if (!db) return 0;
    const stmt = db.prepare(`
        SELECT SUM(amount) as daily_total
        FROM entries
        GROUP BY strftime('%Y-%m-%d', ts / 1000, 'unixepoch', 'localtime')
    `);
    let count = 0;
    const goal = getGoal();
    while (stmt.step()) {
        const row = stmt.get();
        if (row[0] >= goal) {
            count++;
        }
    }
    stmt.free();
    return count;
}

function migrateFromLocalStorage() {
  console.log("Tentando migrar dados do localStorage antigo...");
  const goal = localStorage.getItem('h2o-habits-goal');
  if (goal) {
    setGoal(Number(goal));
  }

  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('h2o-habits-day-')) {
      try {
        const entries = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(entries)) {
          entries.forEach(entry => {
            if (entry.amount && entry.ts) {
              addEntry(entry);
            }
          });
        }
      } catch (e) {
        console.warn(`Não foi possível migrar a chave ${key}`);
      }
    }
  });
  saveDatabase();
  console.log("Migração concluída.");
}
