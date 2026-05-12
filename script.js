/* =============================================
   GEEK SQUAD DEVICE TRIAGE SYSTEM — LOGIC
   Realistic Geek Squad workflow simulation
   ============================================= */

// ── CONSTANTS ──────────────────────────────────────────────
const STORAGE_KEY = 'gs_triage_tickets';

const SEVERITY_ETA = {
  low:      '5–7 business days',
  medium:   '2–4 business days',
  critical: 'Same day / next business day',
};

const DEVICE_LABELS = {
  laptop: 'Laptop / Notebook', desktop: 'Desktop / Tower',
  phone: 'Smartphone', tablet: 'Tablet', tv: 'Television',
  printer: 'Printer', console: 'Gaming Console',
  wearable: 'Wearable / Smartwatch', other: 'Other',
};

const PROTECTION_LABELS = {
  none: 'None', gsp: 'Geek Squad Protection (GSP)', tpa: 'Third-Party Warranty',
};

const CONDITION_LABELS = {
  'like-new': 'Like New', 'minor-wear': 'Minor Wear',
  cracked: 'Cracked / Dented', liquid: 'Liquid Damage',
};

const SERVICE_LABELS = {
  'in-store': 'In-Store', 'send-in': 'Send-In (Mail)',
  'in-home': 'In-Home Visit', remote: 'Remote Support',
};

const DISCLAIMER = `By leaving your device for service, you authorize Geek Squad to diagnose and repair the device as described above. You acknowledge that Geek Squad is not responsible for data loss; it is your responsibility to maintain backups of your data. Devices not picked up within 30 days of completion notice may be subject to storage fees or disposal per store policy. Estimated repair times are subject to change based on parts availability. A Geek Squad agent will contact you when your device is ready or if a change in estimate occurs.`;

// ── CLOCK ──────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  document.getElementById('live-clock').textContent =
    now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// ── TICKET ID GENERATOR ────────────────────────────────────
function generateTicketID() {
  const prefix = 'GS';
  const date = new Date();
  const datePart = [
    String(date.getFullYear()).slice(-2),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  const rand = String(Math.floor(10000 + Math.random() * 90000));
  return `${prefix}-${datePart}-${rand}`;
}

// ── FORMAT TIMESTAMP ───────────────────────────────────────
function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ── LOCALSTORAGE ───────────────────────────────────────────
function loadTickets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}
function saveTickets(tickets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

// ── AGENT INFO PERSISTENCE ─────────────────────────────────
function loadAgent() {
  const agent = localStorage.getItem('gs_agent_name') || '';
  const store = localStorage.getItem('gs_store_id') || '';
  if (agent) document.getElementById('agent-name').value = agent;
  if (store) document.getElementById('store-id').value = store;
  document.getElementById('agent-display').textContent = agent || '---';
}
document.getElementById('agent-name').addEventListener('input', function () {
  localStorage.setItem('gs_agent_name', this.value);
  document.getElementById('agent-display').textContent = this.value || '---';
});
document.getElementById('store-id').addEventListener('input', function () {
  localStorage.setItem('gs_store_id', this.value);
});

// ── FORM VALUE HELPERS ────────────────────────────────────
function getRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}
function val(id) {
  return document.getElementById(id).value.trim();
}
function checked(id) {
  return document.getElementById(id).checked;
}

// ── FORM VALIDATION ────────────────────────────────────────
function validateForm() {
  const required = [
    { id: 'agent-name', label: 'Agent Name' },
    { id: 'store-id',   label: 'Store #' },
    { id: 'cust-first', label: 'Customer First Name' },
    { id: 'cust-last',  label: 'Customer Last Name' },
    { id: 'cust-phone', label: 'Phone Number' },
    { id: 'device-type',label: 'Device Type' },
    { id: 'device-brand',label: 'Device Brand' },
    { id: 'issue-category', label: 'Issue Category' },
    { id: 'issue-desc', label: 'Issue Description' },
  ];
  for (const f of required) {
    const el = document.getElementById(f.id);
    if (!el.value.trim()) {
      el.focus();
      el.style.borderColor = '#ef4444';
      setTimeout(() => el.style.borderColor = '', 2000);
      alert(`Please fill in: ${f.label}`);
      return false;
    }
  }
  if (!getRadio('severity')) {
    alert('Please select a Severity / Priority level.');
    return false;
  }
  return true;
}

// ── BUILD TICKET OBJECT ────────────────────────────────────
function buildTicket() {
  return {
    id: generateTicketID(),
    createdAt: new Date().toISOString(),
    resolved: false,
    // agent
    agentName: val('agent-name'),
    storeId: val('store-id'),
    // customer
    custFirst: val('cust-first'),
    custLast: val('cust-last'),
    custPhone: val('cust-phone'),
    custEmail: val('cust-email'),
    protection: getRadio('protection'),
    // device
    deviceType: val('device-type'),
    deviceBrand: val('device-brand'),
    deviceModel: val('device-model'),
    deviceSerial: val('device-serial'),
    condition: getRadio('condition'),
    dataBackup: checked('data-backup'),
    passwordProvided: checked('password-provided'),
    // issue
    issueCategory: val('issue-category'),
    issueDesc: val('issue-desc'),
    agentNotes: val('agent-notes'),
    severity: getRadio('severity'),
    repairEstimate: val('repair-estimate'),
    serviceType: getRadio('service-type'),
  };
}

// ── RENDER RECEIPT ─────────────────────────────────────────
function renderReceipt(t) {
  const custName = `${t.custFirst} ${t.custLast}`;
  const deviceLabel = `${t.deviceBrand} ${DEVICE_LABELS[t.deviceType] || t.deviceType}${t.deviceModel ? ' · ' + t.deviceModel : ''}`;
  const sevClass = t.severity;
  const sevLabel = t.severity.toUpperCase();

  const repairLabels = {
    'same-day': 'Same Day (4–6 hrs)', 'next-day': 'Next Business Day',
    '2-3-days': '2–3 Business Days', '5-7-days': '5–7 Business Days',
    'pending-parts': 'Pending Parts / TBD', 'send-in': 'Send-In (10–14 days)',
  };

  const rows = [
    // TICKET INFO
    ['TICKET ID', `<strong>${t.id}</strong>`],
    ['DATE / TIME', formatTimestamp(t.createdAt)],
    ['AGENT', `${t.agentName} · Store #${t.storeId}`],
    ['SERVICE TYPE', SERVICE_LABELS[t.serviceType] || t.serviceType],
    null, // section break
    // CUSTOMER
    ['__SECTION__', 'CUSTOMER INFORMATION'],
    ['NAME', custName],
    ['PHONE', t.custPhone],
    t.custEmail ? ['EMAIL', t.custEmail] : null,
    ['PROTECTION', PROTECTION_LABELS[t.protection] || t.protection],
    null,
    // DEVICE
    ['__SECTION__', 'DEVICE'],
    ['DEVICE', deviceLabel],
    t.deviceSerial ? ['SERIAL / IMEI', t.deviceSerial] : null,
    ['CONDITION', CONDITION_LABELS[t.condition] || t.condition],
    ['DATA BACKUP ADVISED', t.dataBackup ? '✔ Yes' : '✘ Not confirmed'],
    ['PASSWORD PROVIDED', t.passwordProvided ? '✔ Yes' : '✘ No'],
    null,
    // ISSUE
    ['__SECTION__', 'ISSUE'],
    ['CATEGORY', t.issueCategory.replace(/-/g, ' ').toUpperCase()],
    ['REPORTED ISSUE', `<em>${t.issueDesc}</em>`],
    t.agentNotes ? ['AGENT NOTES', `<em>${t.agentNotes}</em>`] : null,
    null,
    // TRIAGE
    ['__SECTION__', 'TRIAGE ASSESSMENT'],
    ['PRIORITY', `<span class="sev-badge ${sevClass}">${sevLabel}</span>`],
    ['EST. TURNAROUND', repairLabels[t.repairEstimate] || t.repairEstimate],
    ['SLA TARGET', SEVERITY_ETA[t.severity]],
  ].filter(r => r !== null);

  let html = `
    <div class="receipt-header">
      <div class="receipt-title">GEEK SQUAD</div>
      <div class="receipt-id">WORK ORDER / CUSTOMER RECEIPT · ${t.id}</div>
    </div>
  `;

  for (const row of rows) {
    if (row[0] === '__SECTION__') {
      html += `<div class="receipt-section-title">${row[1]}</div>`;
    } else {
      html += `
        <div class="receipt-row">
          <span class="receipt-row-label">${row[0]}</span>
          <span class="receipt-row-value">${row[1]}</span>
        </div>`;
    }
  }

  html += `
    <div class="receipt-disclaimer">
      <strong>AUTHORIZATION & TERMS:</strong><br/>
      ${DISCLAIMER}
    </div>
    <div style="margin-top:12px;font-size:10px;color:var(--text-muted);border-top:1px solid var(--border);padding-top:10px">
      Thank you for choosing Geek Squad. For service status, call 1-800-GEEKSQUAD or visit bestbuy.com/geeksquad.<br/>
      Keep this receipt for your records.
    </div>
  `;

  document.getElementById('receipt-card').innerHTML = html;
  document.getElementById('receipt-area').classList.remove('hidden');
  document.getElementById('receipt-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── RENDER QUEUE ───────────────────────────────────────────
function renderQueue() {
  const tickets = loadTickets();
  const container = document.getElementById('ticket-queue');
  const openCount = tickets.filter(t => !t.resolved).length;

  document.getElementById('queue-count').textContent =
    `${openCount} open · ${tickets.length} total`;

  if (tickets.length === 0) {
    container.innerHTML = '<div class="empty-state">No tickets yet. Submit an intake form to get started.</div>';
    return;
  }

  // Sort: unresolved first, then by createdAt desc
  const sorted = [...tickets].sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  container.innerHTML = sorted.map(t => {
    const custName = `${t.custFirst} ${t.custLast}`;
    const deviceLabel = `${t.deviceBrand} ${DEVICE_LABELS[t.deviceType] || t.deviceType}`;
    const protTag = t.protection !== 'none' ?
      `<span class="protection-tag">${t.protection.toUpperCase()}</span>` : '';
    const resolvedAt = t.resolvedAt ? ` · Resolved ${formatTimestamp(t.resolvedAt)}` : '';
    return `
      <div class="ticket-card${t.resolved ? ' resolved' : ''}" id="tc-${t.id}">
        <div class="ticket-top">
          <span class="ticket-id">${t.id}</span>
          <span class="ticket-time">${formatTimestamp(t.createdAt)}${resolvedAt}</span>
        </div>
        <div class="ticket-customer">${custName}</div>
        <div class="ticket-device">${deviceLabel}${t.deviceModel ? ' · ' + t.deviceModel : ''} · ${t.issueCategory.replace(/-/g,' ')}</div>
        <div class="ticket-issue">"${t.issueDesc}"</div>
        <div class="ticket-footer">
          <span class="ticket-sev ${t.severity}">${t.severity.toUpperCase()}</span>
          ${protTag}
          <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">
            ${SERVICE_LABELS[t.serviceType] || t.serviceType}
          </span>
          ${t.resolved
            ? `<span class="resolved-badge">✔ RESOLVED</span>`
            : `<button class="resolve-btn" data-id="${t.id}">✔ MARK RESOLVED</button>`}
        </div>
      </div>
    `;
  }).join('');

  // Attach resolve listeners
  container.querySelectorAll('.resolve-btn').forEach(btn => {
    btn.addEventListener('click', () => resolveTicket(btn.dataset.id));
  });
}

// ── RESOLVE TICKET ─────────────────────────────────────────
function resolveTicket(ticketId) {
  const tickets = loadTickets();
  const t = tickets.find(t => t.id === ticketId);
  if (!t) return;
  t.resolved = true;
  t.resolvedAt = new Date().toISOString();
  saveTickets(tickets);
  renderQueue();
}

// ── CLEAR RESOLVED ─────────────────────────────────────────
document.getElementById('clear-resolved-btn').addEventListener('click', () => {
  if (!confirm('Remove all resolved tickets from the queue?')) return;
  const active = loadTickets().filter(t => !t.resolved);
  saveTickets(active);
  renderQueue();
});

// ── PRINT ──────────────────────────────────────────────────
document.getElementById('print-btn').addEventListener('click', () => window.print());

// ── FORM SUBMIT ────────────────────────────────────────────
document.getElementById('triage-form').addEventListener('submit', function (e) {
  e.preventDefault();
  if (!validateForm()) return;

  const ticket = buildTicket();
  const tickets = loadTickets();
  tickets.unshift(ticket);
  saveTickets(tickets);

  renderReceipt(ticket);
  renderQueue();

  // Reset form (but keep agent info)
  const agentName = val('agent-name');
  const storeId = val('store-id');
  this.reset();
  document.getElementById('agent-name').value = agentName;
  document.getElementById('store-id').value = storeId;
  document.querySelector('input[name="protection"][value="none"]').checked = true;
  document.querySelector('input[name="condition"][value="like-new"]').checked = true;
  document.querySelector('input[name="service-type"][value="in-store"]').checked = true;
});

// ── INIT ───────────────────────────────────────────────────
loadAgent();
renderQueue();
