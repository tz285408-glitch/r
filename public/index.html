// Frontend logic: fetch API and wire UI
let accounts = [];
let eqChart = null;

async function api(path, opts) {
    const res = await fetch('/api' + path, opts);
    if (!res.ok) {
        const body = await res.json().catch(()=>({}));
        throw new Error(body.error || res.statusText);
    }
    return res.json();
}

function showTab(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    const el = document.getElementById('tab-' + id);
    if (el) el.classList.remove('hidden');
    // update nav active
    document.querySelectorAll('header nav button').forEach(b => b.classList.remove('bg-amber-100'));
    const nav = document.getElementById('nav-' + id);
    if (nav) nav.classList.add('bg-amber-100');
    if (id === 'dashboard') loadDashboard();
    if (id === 'journal') loadJournal();
    if (id === 'trial') loadTrial();
    if (id === 'inventory') loadItems();
}

async function loadAccounts() {
    accounts = await api('/accounts');
    const ul = document.getElementById('accounts-list');
    ul.innerHTML = accounts.map(a => `<li>${a.code} - ${a.name} (${a.type})</li>`).join('');
    // fill account selects when creating lines
}

function addLine(pref = {}) {
    const container = document.getElementById('lines-container');
    const id = Math.random().toString(36).slice(2,9);
    const accOptions = accounts.map(a => `<option value="${a.id}">${a.code} - ${a.name}</option>`).join('');
    const html = `
        <div id="line-${id}" class="flex gap-2 items-center">
            <select class="p-2 border rounded line-acc">${accOptions}</select>
            <input type="number" class="p-2 border rounded line-debit" placeholder="مدين" value="${pref.debit||''}">
            <input type="number" class="p-2 border rounded line-credit" placeholder="دائن" value="${pref.credit||''}">
            <button onclick="removeLine('${id}')" class="p-2 bg-red-500 text-white rounded">حذف</button>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
}

function removeLine(id) {
    const el = document.getElementById('line-' + id);
    if (el) el.remove();
}

async function submitEntry() {
    const date = document.getElementById('entry-date').value || new Date().toISOString().slice(0,10);
    const desc = document.getElementById('entry-desc').value;
    const linesEls = Array.from(document.querySelectorAll('#lines-container > div'));
    const lines = linesEls.map(div => {
        const acc = parseInt(div.querySelector('.line-acc').value);
        const dr = parseFloat(div.querySelector('.line-debit').value || 0);
        const cr = parseFloat(div.querySelector('.line-credit').value || 0);
        return { account_id: acc, debit: dr, credit: cr };
    });

    try {
        await api('/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, description: desc, lines })
        });
        document.getElementById('entry-msg').innerText = 'تم حفظ القيد.';
        // reset
        document.getElementById('lines-container').innerHTML = '';
        document.getElementById('entry-desc').value = '';
        refreshAll();
    } catch (e) {
        document.getElementById('entry-msg').innerText = e.message;
    }
}

async function loadJournal() {
    await loadAccounts();
    // prepare one line if none
    const container = document.getElementById('lines-container');
    if (container.children.length === 0) addLine();
    // show journal entries list
    const journal = await api('/journal');
    const list = document.getElementById('journal-list');
    list.innerHTML = journal.map(e => {
        const lines = e.lines.map(l => `${l.code} ${l.name}: مدين ${l.debit||0} - دائن ${l.credit||0}`).join('<br/>');
        return `<div class="p-2 border-b"><div class="font-semibold">${e.date} - ${e.description}</div><div class="text-xs text-gray-600">${lines}</div></div>`;
    }).join('');
    // fill selects for inventory form
    const txnItem = document.getElementById('txn-item');
    txnItem && (txnItem.innerHTML = (await api('/items')).map(it=>`<option value="${it.id}">${it.sku||it.id} - ${it.name} (qty:${it.qty})</option>`).join(''));
}

async function loadDashboard() {
    // recent journal
    const journal = await api('/journal');
    const recent = document.getElementById('recent-journal');
    recent.innerHTML = journal.slice(0,5).map(e => `<li>${e.date} — ${e.description}</li>`).join('');
    // update equation chart (use trial balance numbers)
    const tb = await api('/trial-balance');
    const cash = tb.rows.find(r => r.code === '1000') || { total_debit:0, total_credit:0 };
    const liabilities = tb.rows.filter(r=>r.type === 'liability').reduce((s,r)=> s + (r.total_credit - r.total_debit),0);
    const equity = tb.rows.filter(r=>r.type === 'equity').reduce((s,r)=> s + (r.total_credit - r.total_debit),0);
    const assets = tb.rows.filter(r=> ['asset','contra_asset'].includes(r.type)).reduce((s,r)=> s + (r.total_debit - r.total_credit),0);
    const ctx = document.getElementById('eqChart').getContext('2d');
    if (eqChart) eqChart.destroy();
    eqChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['الأصول', 'الخصوم + الملكية'],
            datasets: [
                { label: 'Assets', data: [Math.max(0,assets), 0], backgroundColor:'#3b82f6' },
                { label: 'Liab+Equity', data: [0, Math.max(0, liabilities + equity)], backgroundColor:'#10b981' }
            ]
        },
        options: { responsive:true, maintainAspectRatio:false }
    });
}

async function loadTrial() {
    const tb = await api('/trial-balance');
    const body = document.getElementById('tb-body');
    body.innerHTML = tb.rows.map(r => {
        return `<tr><td class="p-2 text-right">${r.code}</td><td class="p-2 text-right">${r.name}</td><td class="p-2 text-center">${(r.total_debit||0).toFixed(2)}</td><td class="p-2 text-center">${(r.total_credit||0).toFixed(2)}</td></tr>`;
    }).join('');
    document.getElementById('tb-debit').innerText = tb.totalDebit.toFixed(2);
    document.getElementById('tb-credit').innerText = tb.totalCredit.toFixed(2);
}

async function loadItems() {
    const items = await api('/items');
    const el = document.getElementById('items-list');
    el.innerHTML = items.map(it => `<div class="p-2 border-b">${it.sku || it.id} - <strong>${it.name}</strong> | qty: ${it.qty} | avg cost: ${it.avg_cost}</div>`).join('');
    const txnItem = document.getElementById('txn-item');
    txnItem && (txnItem.innerHTML = items.map(it=>`<option value="${it.id}">${it.sku||it.id} - ${it.name}</option>`).join(''));
}

async function createItem() {
    const sku = document.getElementById('item-sku').value;
    const name = document.getElementById('item-name').value;
    await api('/items', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sku, name }) });
    document.getElementById('item-sku').value = '';
    document.getElementById('item-name').value = '';
    loadItems();
}

async function postInventoryTxn() {
    const item_id = parseInt(document.getElementById('txn-item').value);
    const qty = parseFloat(document.getElementById('txn-qty').value);
    const unit_cost = parseFloat(document.getElementById('txn-cost').value || 0);
    const type = document.getElementById('txn-type').value;
    // Build journal_lines automatically (simple mapping): Purchases debit Purchases account (5000) credit Suppliers (2000)
    // For demo we map by code search
    await loadAccounts(); // ensure accounts loaded
    const acc_map = {};
    accounts.forEach(a => acc_map[a.code] = a);
    // fallback search by type string
    const purchases = accounts.find(a => a.code === '5000') || accounts.find(a=>a.name.includes('مشت'));
    const suppliers = accounts.find(a => a.code === '2000') || accounts.find(a=>a.type === 'liability');
    const cash = accounts.find(a => a.code === '1000') || accounts.find(a=>a.type === 'asset');

    let jlines = [];
    if (type === 'purchase') {
        // debit Purchases, credit Suppliers (on credit purchase)
        jlines = [
            { account_id: purchases.id, debit: qty * unit_cost, credit: 0 },
            { account_id: suppliers.id, debit: 0, credit: qty * unit_cost }
        ];
    } else {
        // sale: debit cash, credit sales
        const sales = accounts.find(a => a.code === '4000') || accounts.find(a => a.type === 'revenue');
        jlines = [
            { account_id: cash.id, debit: qty * unit_cost, credit: 0 },
            { account_id: sales.id, debit: 0, credit: qty * unit_cost }
        ];
    }
    await api('/inventory/txn', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
        item_id, type, qty, unit_cost, journal_lines: jlines
    })});
    document.getElementById('txn-qty').value = '';
    document.getElementById('txn-cost').value = '';
    loadItems();
    loadJournal();
    loadTrial();
}

async function calcDepr() {
    const asset = parseFloat(document.getElementById('depr-value').value);
    const life = parseInt(document.getElementById('depr-life').value);
    const salvage = parseFloat(document.getElementById('depr-salvage').value || 0);
    const res = await api('/depreciation', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ asset_value: asset, life_years: life, salvage }) });
    const div = document.getElementById('depr-schedule');
    div.innerHTML = '<table class="min-w-full text-sm"><thead><tr><th class="p-2">السنة</th><th class="p-2">قسط</th><th class="p-2">مجمع</th><th class="p-2">قيمة دفترية</th></tr></thead><tbody>'+res.schedule.map(s=>`<tr><td class="p-2 text-center">${s.year}</td><td class="p-2 text-center">${s.expense}</td><td class="p-2 text-center">${s.accum}</td><td class="p-2 text-center">${s.book_value}</td></tr>`).join('')+'</tbody></table>';
}

// Templates mapping same as server's examples
function loadTemplate(key) {
    document.getElementById('lines-container').innerHTML = '';
    if (key === 'capital_increase') {
        addLine({debit:10000});
        addLine({credit:10000});
        // set accounts if available after loadAccounts
    } else if (key === 'purchase_goods') {
        addLine({debit:5000});
        addLine({credit:5000});
    } else if (key === 'sale_goods') {
        addLine({debit:3000});
        addLine({credit:3000});
    }
}

// initial
(async function init(){
    await loadAccounts();
    showTab('dashboard');
})();
