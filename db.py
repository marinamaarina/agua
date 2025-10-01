import sqlite3
from datetime import datetime, timedelta

DB_NAME = "h2o_habits.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Tabela para registros de consumo
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            ts INTEGER NOT NULL
        )
    """)
    # Tabela para configurações
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    # Meta padrão
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('goal', '2000')")
    conn.commit()
    conn.close()

def get_goal():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = 'goal'")
    goal = cursor.fetchone()
    conn.close()
    return int(goal[0]) if goal else 2000

def set_goal(ml):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("UPDATE settings SET value = ? WHERE key = 'goal'", (ml,))
    conn.commit()
    conn.close()

def add_entry(amount_ml):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    ts = int(datetime.now().timestamp())
    cursor.execute("INSERT INTO entries (amount, ts) VALUES (?, ?)", (amount_ml, ts))
    conn.commit()
    conn.close()

def get_today_entries():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    today_start = int(datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).timestamp())
    today_end = int(datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999).timestamp())
    cursor.execute("SELECT amount, ts FROM entries WHERE ts >= ? AND ts <= ? ORDER BY ts ASC", (today_start, today_end))
    entries = cursor.fetchall()
    conn.close()
    return [{"amount": row[0], "ts": row[1]} for row in entries]

def get_data_for_range(days):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    labels = []
    values = []
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    for i in range(days - 1, -1, -1):
        date = today - timedelta(days=i)
        start_ts = int(date.timestamp())
        end_ts = int((date + timedelta(days=1) - timedelta(seconds=1)).timestamp())
        
        cursor.execute("SELECT SUM(amount) FROM entries WHERE ts >= ? AND ts <= ?", (start_ts, end_ts))
        total = cursor.fetchone()[0] or 0
        
        label = date.strftime('%d/%m') if days > 7 else date.strftime('%a')
        labels.append(label)
        values.append(total)
        
    conn.close()
    return {"labels": labels, "values": values}

# Inicializa o banco de dados na primeira importação
init_db()
