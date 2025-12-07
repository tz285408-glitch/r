const express = require('express');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.db');
const db = new Database(DB_FILE);

// --- DB Init (create tables if not exist) ---
function initDb() {
    // Accounts table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT,
            name TEXT,
            type TEXT
        )
    `).run();

    // Journal entries and lines
    db.prepare(`
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            description TEXT
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS journal_lines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_id INTEGER,
            account_id INTEGER,
            debit REAL DEFAULT 0,
            credit REAL DEFAULT 0,
            FOREIGN KEY(entry_id) REFERENCES journal_entries(id),
            FOREIGN KEY(account_id) REFERENCES accounts(id)
        )
    `).run();

    // Inventory
    db.prepare(`
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku TEXT,
            name TEXT,
            qty REAL DEFAULT 0,
            avg_cost REAL DEFAULT 0
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS inventory_txns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER,
            type TEXT,
            qty REAL,
            unit_cost REAL,
            date TEXT,
            journal_id INTEGER,
            FOREIGN KEY(item_id) REFERENCES items(id),
            FOREIGN KEY(journal_id) REFERENCES journal_entries(id)
        )
    `).run();

    // Seed basic accounts if not exist
    const count = db.prepare(`SELECT COUNT(*) as c FROM accounts`).get().c;
    if (count === 0) {
        const insert = db.prepare(`INSERT INTO accounts (code, name, type) VALUES (?, ?, ?)`);
        const seed = [
            ['1000','الصندوق','asset'],
            ['1100','المخزون','asset'],
            ['1200','أوراق قبض','asset'],
            ['2000','الموردون','liability'],
            ['3000','رأس المال','equity'],
            ['4000','المبيعات','revenue'],
            ['5000','المشتريات','expense'],
            ['5100','مصاريف الإهلاك','expense'],
            ['1201','مجمع الإهلاك','contra_asset'],
            ['5200','خصم مسموح','expense']
        ];
        const txn = db.transaction(()=> {
            for (const r of seed) insert.run(...r);
        });
        txn();
        console.log('Seeded accounts.');
    }
}
initDb();

// --- Helper functions ---
function getAccountById(id) {
    return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
}

function computeTrialBalance() {
    // Sum debits and credits per account
    const rows = db.prepare(`
        SELECT a.id, a.code, a.name, a.type,
               IFNULL(SUM(j.debit),0) as total_debit,
               IFNULL(SUM(j.credit),0) as total_credit
        FROM accounts a
        LEFT JOIN journal_lines j ON j.account_id = a.id
        GROUP BY a.id
        ORDER BY a.code
    `).all();

    // Calculate balance sign depending on account type: but for trial balance we show debit and credit totals
    const totalDebit = rows.reduce((s,r)=>s + (r.total_debit||0),0);
    const totalCredit = rows.reduce((s,r)=>s + (r.total_credit||0),0);

    return { rows, totalDebit, totalCredit };
}

// --- Express App ---
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API: Accounts ---
app.get('/api/accounts', (req, res) => {
    const accs = db.prepare('SELECT * FROM accounts ORDER BY code').all();
    res.json(accs);
});

// --- API: Journal Entries ---
app.get('/api/journal', (req, res) => {
    const entries = db.prepare('SELECT * FROM journal_entries ORDER BY date DESC, id DESC').all();
    const withLines = entries.map(e => {
        const lines = db.prepare(`
            SELECT jl.*, a.code, a.name 
            FROM journal_lines jl 
            LEFT JOIN accounts a ON jl.account_id = a.id
            WHERE jl.entry_id = ? ORDER BY jl.id
        `).all(e.id);
        return {...e, lines};
    });
    res.json(withLines);
});

app.post('/api/journal', (req, res) => {
    const { date, description, lines } = req.body;
    if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ error: 'Lines required' });
    }
    // Validate debit == credit
    const sumDebit = lines.reduce((s,l)=> s + (l.debit || 0), 0);
    const sumCredit = lines.reduce((s,l)=> s + (l.credit || 0), 0);
    if (Math.abs(sumDebit - sumCredit) > 0.001) {
        return res.status(400).json({ error: 'مجموع المدين يجب أن يساوي مجموع الدائن' });
    }

    const insertEntry = db.prepare('INSERT INTO journal_entries (date, description) VALUES (?, ?)');
    const insertLine = db.prepare('INSERT INTO journal_lines (entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)');
    const info = insertEntry.run(date || new Date().toISOString(), description || '');
    const entryId = info.lastInsertRowid;
    const txn = db.transaction((lines) => {
        for (const l of lines) {
            insertLine.run(entryId, l.account_id, l.debit || 0, l.credit || 0);
        }
    });
    txn(lines);

    res.json({ ok: true, entryId });
});

// --- API: Trial Balance / Ledger aggregation ---
app.get('/api/trial-balance', (req, res) => {
    const tb = computeTrialBalance();
    res.json(tb);
});

// --- API: Inventory (basic perpetual) ---
app.get('/api/items', (req, res) => {
    const items = db.prepare('SELECT * FROM items ORDER BY id').all();
    res.json(items);
});

app.post('/api/items', (req, res) => {
    const { sku, name, qty = 0, avg_cost = 0 } = req.body;
    const info = db.prepare('INSERT INTO items (sku, name, qty, avg_cost) VALUES (?, ?, ?, ?)').run(sku, name, qty, avg_cost);
    res.json({ id: info.lastInsertRowid });
});

app.post('/api/inventory/txn', (req, res) => {
    // { item_id, type: 'purchase'|'sale', qty, unit_cost, date, journal_lines }
    const { item_id, type, qty, unit_cost, date, journal_lines } = req.body;
    if (!item_id || !type || !qty) return res.status(400).json({ error: 'item_id, type, qty required' });

    const insertEntry = db.prepare('INSERT INTO journal_entries (date, description) VALUES (?, ?)');
    const insertLine = db.prepare('INSERT INTO journal_lines (entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)');
    const insertTxn = db.prepare('INSERT INTO inventory_txns (item_id, type, qty, unit_cost, date, journal_id) VALUES (?, ?, ?, ?, ?, ?)');

    const entryInfo = insertEntry.run(date || new Date().toISOString(), `Inventory ${type} for item ${item_id}`);
    const entryId = entryInfo.lastInsertRowid;

    // Insert journal lines passed by frontend (already balanced)
    const txn = db.transaction((jlines) => {
        for (const l of jlines) {
            insertLine.run(entryId, l.account_id, l.debit || 0, l.credit || 0);
        }
        insertTxn.run(item_id, type, qty, unit_cost || 0, date || new Date().toISOString(), entryId);

        // Update item qty & avg_cost for purchases (perpetual avg cost)
        if (type === 'purchase') {
            const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
            const oldQty = item ? item.qty : 0;
            const oldAvg = item ? item.avg_cost : 0;
            const newQty = oldQty + qty;
            const newAvg = newQty === 0 ? 0 : ((oldQty * oldAvg) + (qty * unit_cost)) / newQty;
            db.prepare('UPDATE items SET qty = ?, avg_cost = ? WHERE id = ?').run(newQty, newAvg, item_id);
        } else if (type === 'sale') {
            const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
            const oldQty = item ? item.qty : 0;
            const newQty = oldQty - qty;
            db.prepare('UPDATE items SET qty = ? WHERE id = ?').run(newQty, item_id);
        }
    });

    txn(journal_lines || []);
    res.json({ ok: true, entryId });
});

// --- API: Depreciation schedule (simple straight-line) ---
app.post('/api/depreciation', (req, res) => {
    // { asset_value, life_years, salvage = 0, date }
    const { asset_value, life_years, salvage = 0, date } = req.body;
    if (!asset_value || !life_years) return res.status(400).json({ error: 'asset_value and life_years required' });
    const annual = (asset_value - salvage) / life_years;
    const schedule = [];
    let book = asset_value;
    for (let y = 1; y <= life_years; y++) {
        const accum = annual * y;
        book = asset_value - accum;
        schedule.push({ year: y, expense: +annual.toFixed(2), accum: +accum.toFixed(2), book_value: +Math.max(0, book).toFixed(2) });
    }
    res.json({ schedule });
});

// --- Serve frontend index.html for any other route (SPA) ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
