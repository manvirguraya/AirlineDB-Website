/* ============================================================
   AirlineDB front-end logic
   ============================================================ */
 
const API = '';  // same origin (Express serves the static files)
 
/* =============== Schema definitions for CRUD =============== */
/*
  For each entity:
   - endpoint:   API path
   - title:      display name
   - idField:    column used as primary key
   - columns:    columns to display in the table
   - createFields: form fields for creating a new record
   - editFields:   form fields shown in the edit modal (subset of createFields,
                   excludes the primary key which can't be changed)
*/
const ENTITIES = {
    customers: {
        endpoint: '/api/customers',
        title: 'Customers',
        idField: 'customer_id',
        columns: ['customer_id', 'name', 'email', 'phone'],
        createFields: [
            { name: 'customer_id', label: 'Customer ID', type: 'number', required: true },
            { name: 'name',        label: 'Name',        type: 'text',   required: true },
            { name: 'email',       label: 'Email',       type: 'email',  required: true },
            { name: 'phone',       label: 'Phone',       type: 'text' }
        ],
        editFields: ['name', 'email', 'phone']
    },
    loyalty: {
        endpoint: '/api/loyalty',
        title: 'Loyalty Accounts',
        idField: 'member_id',
        columns: ['member_id', 'customer_id', 'customer_name', 'points_balance', 'tier'],
        createFields: [
            { name: 'member_id',      label: 'Member ID',      type: 'number', required: true },
            { name: 'customer_id',    label: 'Customer ID',    type: 'number', required: true },
            { name: 'points_balance', label: 'Points Balance', type: 'number', required: true }
        ],
        editFields: ['points_balance', 'tier'],
        note: 'Note: tier is auto-assigned by the set_loyalty_tier_insert trigger on insert.'
    },
    aircraft: {
        endpoint: '/api/aircraft',
        title: 'Aircraft',
        idField: 'tail_number',
        columns: ['tail_number', 'model', 'capacity'],
        createFields: [
            { name: 'tail_number', label: 'Tail Number', type: 'text',   required: true },
            { name: 'model',       label: 'Model',       type: 'text',   required: true },
            { name: 'capacity',    label: 'Capacity',    type: 'number', required: true }
        ],
        editFields: ['model', 'capacity']
    },
    airports: {
        endpoint: '/api/airports',
        title: 'Airports',
        idField: 'airport_code',
        columns: ['airport_code', 'city', 'country', 'name'],
        createFields: [
            { name: 'airport_code', label: 'Airport Code', type: 'text', required: true },
            { name: 'city',         label: 'City',         type: 'text', required: true },
            { name: 'country',      label: 'Country',      type: 'text', required: true },
            { name: 'name',         label: 'Airport Name', type: 'text', required: true }
        ],
        editFields: ['city', 'country', 'name']
    },
    'flight-instances': {
        endpoint: '/api/flight-instances',
        title: 'Flight Instances',
        idField: 'flight_instance_id',
        columns: ['flight_instance_id', 'flight_number', 'tail_number', 'flight_date',
                  'actual_departure_time', 'actual_arrival_time', 'status'],
        createFields: [
            { name: 'flight_instance_id',    label: 'Instance ID',     type: 'number', required: true },
            { name: 'flight_number',         label: 'Flight Number',   type: 'text',   required: true },
            { name: 'tail_number',           label: 'Tail Number',     type: 'text',   required: true },
            { name: 'flight_date',           label: 'Flight Date',     type: 'date',   required: true },
            { name: 'actual_departure_time', label: 'Actual Departure',type: 'datetime-local' },
            { name: 'actual_arrival_time',   label: 'Actual Arrival',  type: 'datetime-local' },
            { name: 'status',                label: 'Status',          type: 'text',   default: 'Scheduled' }
        ],
        editFields: ['tail_number', 'flight_date', 'actual_departure_time', 'actual_arrival_time', 'status'],
        note: 'Note: update_flight_status trigger may auto-adjust status when actual_departure_time changes.'
    },
    payments: {
        endpoint: '/api/payments',
        title: 'Payments',
        idField: 'payment_id',
        columns: ['payment_id', 'booking_reference', 'amount', 'payment_date', 'payment_status'],
        createFields: [
            { name: 'payment_id',        label: 'Payment ID',     type: 'number', required: true },
            { name: 'booking_reference', label: 'Booking Ref',    type: 'text',   required: true },
            { name: 'amount',            label: 'Amount',         type: 'number', step: '0.01', required: true },
            { name: 'payment_date',      label: 'Payment Date',   type: 'datetime-local', required: true },
            { name: 'payment_status',    label: 'Payment Status', type: 'text',   default: 'Completed' }
        ],
        editFields: ['amount', 'payment_status'],
        note: 'Note: check_payment_amount trigger flips status to "Invalid" when amount ≤ 0.'
    }
};
 
/* =============== Query metadata =============== */
const QUERIES = [
    { id: 'q1', title: 'Q1 — Flight Summary',          tags: ['VIEW'] },
    { id: 'q2', title: 'Q2 — Flight Instances + Aircraft', tags: ['JOIN'] },
    { id: 'q3', title: 'Q3 — Customer Spending Totals',     tags: ['JOIN', 'AGGREGATION'] },
    { id: 'q4', title: 'Q4 — Tickets & Revenue by Route',   tags: ['JOIN', 'AGGREGATION'] },
    { id: 'q5', title: 'Q5 — Above-Average Spenders',       tags: ['SUBQUERY'] }
];
 
/* ============================================================
   State
   ============================================================ */
let currentEntity = 'customers';
let editingRow    = null;
 
/* ============================================================
   Tab switching
   ============================================================ */
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
        btn.classList.add('tab-active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
    });
});
 
/* ============================================================
   Toast helper
   ============================================================ */
function toast(msg, kind = 'success') {
    const el = document.getElementById('toast');
    el.className = 'fixed bottom-6 right-6 z-40 max-w-sm fade-in';
    el.innerHTML = `<div class="${kind === 'success' ? 'toast-success' : 'toast-error'}">${msg}</div>`;
    setTimeout(() => el.classList.add('hidden'), 4000);
}
 
/* ============================================================
   API helper
   ============================================================ */
async function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}
 
/* ============================================================
   CRUD: entity selector
   ============================================================ */
document.querySelectorAll('.entity-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.entity-btn').forEach(b => b.classList.remove('entity-active'));
        btn.classList.add('entity-active');
        currentEntity = btn.dataset.entity;
        loadEntity();
    });
});
 
/* ============================================================
   CRUD: load and render
   ============================================================ */
async function loadEntity() {
    const e = ENTITIES[currentEntity];
    document.getElementById('entity-title').textContent = e.title;
 
    /* build create form */
    buildCreateForm(e);
 
    /* fetch and render rows */
    try {
        const rows = await api('GET', e.endpoint);
        renderTable(e, rows);
    } catch (err) {
        toast('Failed to load: ' + err.message, 'error');
    }
}
 
function buildCreateForm(e) {
    const form = document.getElementById('create-form');
    form.innerHTML = '';
 
    e.createFields.forEach(f => {
        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <label>${f.label}${f.required ? ' *' : ''}</label>
            <input type="${f.type}" name="${f.name}"
                   ${f.required ? 'required' : ''}
                   ${f.step ? `step="${f.step}"` : ''}
                   ${f.default ? `value="${f.default}"` : ''}>
        `;
        form.appendChild(wrap);
    });
 
    /* submit row */
    const submitWrap = document.createElement('div');
    submitWrap.className = 'md:col-span-3 flex items-center justify-between mt-2';
    submitWrap.innerHTML = `
        <span class="text-xs text-muted italic">${e.note || ''}</span>
        <button type="submit" class="btn-warm">Add record</button>
    `;
    form.appendChild(submitWrap);
 
    form.onsubmit = async (ev) => {
        ev.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        try {
            await api('POST', e.endpoint, data);
            toast('Record created');
            form.reset();
            loadEntity();
        } catch (err) {
            toast('Insert failed: ' + err.message, 'error');
        }
    };
}
 
function renderTable(e, rows) {
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');
    head.innerHTML = e.columns.map(c => `<th>${c}</th>`).join('') + '<th class="text-right">actions</th>';
 
    document.getElementById('row-count').textContent = `${rows.length} row${rows.length === 1 ? '' : 's'}`;
 
    if (!rows.length) {
        body.innerHTML = `<tr><td colspan="${e.columns.length + 1}" class="text-center py-8 text-muted">No records</td></tr>`;
        return;
    }
 
    body.innerHTML = rows.map(r => `
        <tr>
            ${e.columns.map(c => `<td>${formatCell(r[c])}</td>`).join('')}
            <td class="actions">
                <button class="btn-edit"  data-id="${r[e.idField]}">edit</button>
                <button class="btn-danger" data-id="${r[e.idField]}">delete</button>
            </td>
        </tr>
    `).join('');
 
    /* attach edit/delete handlers */
    body.querySelectorAll('.btn-edit').forEach(b => {
        b.onclick = () => openEditModal(rows.find(r => String(r[e.idField]) === b.dataset.id));
    });
    body.querySelectorAll('.btn-danger').forEach(b => {
        b.onclick = async () => {
            if (!confirm('Delete this record?')) return;
            try {
                await api('DELETE', `${e.endpoint}/${encodeURIComponent(b.dataset.id)}`);
                toast('Record deleted');
                loadEntity();
            } catch (err) {
                toast('Delete failed: ' + err.message, 'error');
            }
        };
    });
}
 
function formatCell(v) {
    if (v === null || v === undefined) return '<span class="text-muted/50">—</span>';
    /* Detect real ISO datetime strings (e.g. "2026-04-29T20:15:00.000Z").
       The check is strict — must start with YYYY-MM-DD then T — so names
       like "Test User" or "Tom" don't get mistaken for dates. */
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
        try { return new Date(v).toLocaleString(); } catch { return v; }
    }
    return String(v);
}
 
/* ============================================================
   Edit modal
   ============================================================ */
function openEditModal(row) {
    const e = ENTITIES[currentEntity];
    editingRow = row;
 
    const form = document.getElementById('edit-form');
    form.innerHTML = '';
 
    e.editFields.forEach(fname => {
        const fdef = e.createFields.find(c => c.name === fname);
        if (!fdef) return;
        const value = row[fname] !== null && row[fname] !== undefined ? row[fname] : '';
        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <label>${fdef.label}</label>
            <input type="${fdef.type}" name="${fname}" value="${formatForInput(fdef.type, value)}"
                   ${fdef.step ? `step="${fdef.step}"` : ''}>
        `;
        form.appendChild(wrap);
    });
 
    document.getElementById('edit-modal').classList.remove('hidden');
}
 
function formatForInput(type, value) {
    if (!value && value !== 0) return '';
    if (type === 'datetime-local') {
        const d = new Date(value);
        if (isNaN(d)) return '';
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    if (type === 'date') {
        const d = new Date(value);
        if (isNaN(d)) return value;
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    }
    return value;
}
 
document.getElementById('modal-close').onclick =
document.getElementById('modal-cancel').onclick = () => {
    document.getElementById('edit-modal').classList.add('hidden');
    editingRow = null;
};
 
document.getElementById('modal-save').onclick = async () => {
    const e = ENTITIES[currentEntity];
    const form = document.getElementById('edit-form');
    const data = Object.fromEntries(new FormData(form));
    try {
        await api('PUT', `${e.endpoint}/${encodeURIComponent(editingRow[e.idField])}`, data);
        toast('Record updated');
        document.getElementById('edit-modal').classList.add('hidden');
        loadEntity();
    } catch (err) {
        toast('Update failed: ' + err.message, 'error');
    }
};
 
/* ============================================================
   Queries tab
   ============================================================ */
function renderQueriesTab() {
    const grid = document.getElementById('queries-grid');
    grid.innerHTML = QUERIES.map(q => `
        <div class="query-card" id="card-${q.id}">
            <div class="flex items-start justify-between mb-2">
                <div>
                    <div>${q.tags.map(t => `<span class="badge">${t}</span>`).join('')}</div>
                    <h3 class="font-display text-xl font-semibold mt-1.5">${q.title}</h3>
                </div>
                <button class="btn-primary run-q" data-q="${q.id}">Run</button>
            </div>
            <p class="text-sm text-muted mb-3 desc">Click "Run" to execute and view the description.</p>
            <div class="result-area"></div>
        </div>
    `).join('');
 
    grid.querySelectorAll('.run-q').forEach(b => {
        b.onclick = () => runQuery(b.dataset.q);
    });
}
 
async function runQuery(id) {
    const card = document.getElementById(`card-${id}`);
    const area = card.querySelector('.result-area');
    const desc = card.querySelector('.desc');
    area.innerHTML = `<div class="result-box">Running…</div>`;
    try {
        const data = await api('GET', `/api/queries/${id}`);
        desc.textContent = data.description;
        area.innerHTML = renderRowsTable(data.rows);
    } catch (err) {
        area.innerHTML = `<div class="result-box error">Error: ${err.message}</div>`;
    }
}
 
function renderRowsTable(rows) {
    if (!rows || !rows.length) {
        return `<div class="result-box">No rows returned.</div>`;
    }
    const cols = Object.keys(rows[0]);
    return `
        <div class="overflow-x-auto border border-ink/10 rounded-md">
            <table class="w-full text-sm">
                <thead class="bg-ink/5 text-ink/70 text-xs uppercase tracking-wider">
                    <tr>${cols.map(c => `<th class="px-3 py-2 text-left">${c}</th>`).join('')}</tr>
                </thead>
                <tbody class="divide-y divide-ink/5">
                    ${rows.map(r => `<tr>${cols.map(c => `<td class="px-3 py-2">${formatCell(r[c])}</td>`).join('')}</tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;
}
 
/* ============================================================
   Procedure & Function tab
   ============================================================ */
document.getElementById('proc-run').onclick = async () => {
    const status = document.getElementById('proc-status').value;
    const out = document.getElementById('proc-result');
    out.innerHTML = `<div class="result-box">Running…</div>`;
    try {
        const data = await api('GET', `/api/procedure/payments-by-status/${status}`);
        out.innerHTML = `
            <p class="text-xs text-muted mb-2 italic">${data.description}</p>
            ${renderRowsTable(data.rows)}
        `;
    } catch (err) {
        out.innerHTML = `<div class="result-box error">${err.message}</div>`;
    }
};
 
document.getElementById('fn-run').onclick = async () => {
    const id = document.getElementById('fn-ticket-id').value;
    const out = document.getElementById('fn-result');
    if (!id) { out.innerHTML = `<div class="result-box error">Enter a ticket ID</div>`; return; }
    out.innerHTML = `<div class="result-box">Running…</div>`;
    try {
        const data = await api('GET', `/api/function/ticket-total/${id}`);
        const total = data.ticket_total;
        out.innerHTML = `
            <p class="text-xs text-muted mb-2 italic">${data.description}</p>
            <div class="result-box success">
                ticket_total = <strong>${total === null ? 'NULL (ticket not found)' : '$' + Number(total).toFixed(2)}</strong>
            </div>
        `;
    } catch (err) {
        out.innerHTML = `<div class="result-box error">${err.message}</div>`;
    }
};
 
/* ============================================================
   Trigger demos
   ============================================================ */
document.querySelectorAll('.trigger-btn').forEach(btn => {
    btn.onclick = async () => {
        const card = btn.parentElement;
        const out = card.querySelector('.trigger-result');
        out.innerHTML = `<div class="result-box">Running…</div>`;
        btn.disabled = true;
        try {
            const data = await api('POST', `/api/triggers/${btn.dataset.trigger}`);
            const row = data.inserted_row || data.updated_row;
            out.innerHTML = `
                <p class="text-muted mb-2 italic">${data.description}</p>
                <div class="result-box success">
                    <strong>Result row:</strong><br>
                    ${Object.entries(row).map(([k, v]) => `<div>${k}: <span class="text-warm2 font-semibold">${v ?? '—'}</span></div>`).join('')}
                </div>
            `;
        } catch (err) {
            out.innerHTML = `<div class="result-box error">${err.message}</div>`;
        } finally {
            btn.disabled = false;
        }
    };
});
 
/* ============================================================
   Boot
   ============================================================ */
async function boot() {
    /* health check */
    try {
        await api('GET', '/api/customers');
        const pill = document.getElementById('status-pill');
        pill.textContent = '● connected';
        pill.classList.remove('bg-ink/5', 'text-muted');
        pill.classList.add('pill-online');
    } catch (err) {
        const pill = document.getElementById('status-pill');
        pill.textContent = '● database offline';
        pill.classList.remove('bg-ink/5', 'text-muted');
        pill.classList.add('pill-offline');
        toast('Cannot reach database. Check your .env credentials and that MySQL is running.', 'error');
    }
 
    loadEntity();
    renderQueriesTab();
}
 
boot();