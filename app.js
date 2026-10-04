(function () {
  'use strict';

  const loginStorageKey = 'cityvet.prototype.demoAccount';
  const loginSessionKey = 'cityvet.prototype.demoSession';
  const chatMessagesKey = 'cityvet.prototype.chatMessages';
  const chatOpenKey = 'cityvet.prototype.chatOpen';
  const currentPage = decodeURIComponent(location.pathname.split(/[\\/]/).pop());
  const pageMap = {
    'index.html': 'index.html',
    'records.html': 'pet-records.html',
    'pet-records.html': 'pet-records.html',
    'clients.html': 'clients.html',
    'pet-records.html': 'pet-records.html',
    'pet-records.html': 'pet-records.html',
    'program-day.html': 'program-day.html',
    'paravet.html': 'paravet.html',
    'pet-records.html': 'pet-records.html',
    'aftercare.html': 'aftercare.html',
    'reports.html': 'reports.html',
    'admin-settings.html': 'admin-settings.html'
  };

  if (currentPage === 'login.html') {
    document.addEventListener('DOMContentLoaded', wireLoginPage);
    return;
  }
  if (!sessionStorage.getItem(loginSessionKey) || !localStorage.getItem(loginStorageKey)) {
    location.replace(`login.html?next=${encodeURIComponent(currentPage || 'index.html')}`);
    return;
  }

  const storageKey = 'cityvet.prototype.records.v2';
  let state = {};
  try {
    state = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (!state || typeof state !== 'object' || Array.isArray(state)) state = {};
  } catch (error) {
    state = {};
    console.warn('CityVet prototype storage could not be read; starting with an empty local state.', error);
  }
  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error('CityVet prototype state could not be saved.', error);
      toast('Local prototype storage is full or unavailable.');
      return false;
    }
  };
  const collectionConfigs = {
    clients: {
      key: 'clients',
      title: 'Owner / participant records',
      singular: 'owner',
      publicIdPrefix: 'CL',
      publicIdField: 'userId',
      idLabel: 'User ID',
      fields: [
        { name: 'firstName', label: 'First name', required: true },
        { name: 'lastName', label: 'Last name', required: true },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Female', 'Male', 'Non-binary', 'Prefer not to say'] },
        { name: 'address', label: 'Address' },
        { name: 'email', label: 'Email / Gmail', type: 'email' },
        { name: 'phone', label: 'Phone number', type: 'tel', required: true },
        { name: 'notes', label: 'Notes', type: 'textarea' }
      ],
      columns: [
        { name: 'userId', label: 'User ID' },
        { name: 'firstName', label: 'First name' },
        { name: 'lastName', label: 'Last name' },
        { name: 'gender', label: 'Gender' },
        { name: 'address', label: 'Address' },
        { name: 'email', label: 'Email / Gmail' },
        { name: 'phone', label: 'Phone number' }
      ]
    },
    medicines: {
      key: 'medicines',
      title: 'Medicine catalog',
      singular: 'medicine',
      publicIdPrefix: 'MED',
      idLabel: 'Medicine ID',
      fields: [
        { name: 'name', label: 'Medicine name', required: true },
        { name: 'activeIngredient', label: 'Active ingredient' },
        { name: 'strength', label: 'Strength' },
        { name: 'form', label: 'Dosage form', required: true },
        { name: 'stock', label: 'Quantity in stock', type: 'number', required: true, min: '0' },
        { name: 'unit', label: 'Unit', required: true },
        { name: 'expiryDate', label: 'Expiry date', type: 'date' },
        { name: 'notes', label: 'Notes', type: 'textarea' }
      ]
    },
    inventory: {
      key: 'inventory',
      title: 'Inventory records',
      singular: 'item',
      fields: [
        { name: 'item', label: 'Item name', required: true },
        { name: 'category', label: 'Category', required: true },
        { name: 'quantity', label: 'Quantity', type: 'number', required: true, min: '0' },
        { name: 'unit', label: 'Unit', required: true },
        { name: 'location', label: 'Storage location' },
        { name: 'reorderLevel', label: 'Reorder level', type: 'number', min: '0' },
        { name: 'notes', label: 'Notes', type: 'textarea' }
      ]
    },
    aftercareContent: {
      key: 'aftercareContent',
      title: 'Approved content library',
      singular: 'content item',
      fields: [
        { name: 'title', label: 'Title', required: true },
        { name: 'content', label: 'Approved guidance', type: 'textarea', required: true },
        { name: 'approvedBy', label: 'Approved by', required: true },
        { name: 'reviewDate', label: 'Review date', type: 'date', required: true }
      ],
      initial: [
        { title: 'Medication and feeding after sterilization', content: 'Follow veterinarian-approved medication and feeding instructions. Escalate clinical questions to staff.', approvedBy: 'City Vet', reviewDate: '2026-09-20' },
        { title: 'Wound care, activity restrictions, and warning signs', content: 'Follow the veterinarian-approved wound-care and activity instructions. Contact staff about warning signs.', approvedBy: 'City Vet', reviewDate: '2026-09-20' }
      ]
    },
    savedReports: {
      key: 'savedReports',
      title: 'Saved reports',
      singular: 'report',
      publicIdPrefix: 'RPT',
      idLabel: 'Report ID',
      description: 'Save, edit, and delete named report snapshots. Summary metrics above are read-only generated views.',
      fields: [
        { name: 'title', label: 'Report title', required: true },
        { name: 'period', label: 'Reporting period', required: true },
        { name: 'barangay', label: 'Barangay', required: true },
        { name: 'notes', label: 'Notes', type: 'textarea' }
      ],
      onCreate: (item, isNew) => {
        if (!isNew) return;
        item.snapshot = `Registered pets: 1,847; queue served today: 21; Paravet slots in Barangay Muzon: 176 / ${state.paravetCapacityByBarangay.Muzon}; impounded awaiting claim: 7; aftercare review queue: 3.`;
        item.createdAt = new Date().toISOString();
      },
      columns: [
        { name: 'publicId', label: 'Report ID' },
        { name: 'title', label: 'Report' },
        { name: 'period', label: 'Period' },
        { name: 'barangay', label: 'Barangay' },
        { name: 'snapshot', label: 'Saved snapshot' }
      ]
    },
    paravetRequests: {
      key: 'paravetRequests',
      title: 'Paravet visit requests',
      singular: 'Paravet request',
      onCreate: item => { item.barangay = 'Barangay Muzon'; },
      fields: [
        { name: 'visitDate', label: 'Requested date', type: 'date', required: true },
        { name: 'requestedBy', label: 'Requesting official', required: true },
        { name: 'letterRef', label: 'Request letter reference', required: true },
        { name: 'notes', label: 'Request notes', type: 'textarea' }
      ],
      columns: [
        { name: 'visitDate', label: 'Visit date' },
        { name: 'barangay', label: 'Location' },
        { name: 'requestedBy', label: 'Requested by' },
        { name: 'letterRef', label: 'Reference' }
      ]
    },
    removalRequests: {
      key: 'removalRequests',
      title: 'Record or account removal requests',
      singular: 'removal request',
      addLabel: 'File removal request',
      description: 'Requests are stored locally for authorized review; no record or account is deleted automatically.',
      fields: [
        { name: 'category', label: 'Removal request type', type: 'select', options: ['Pet record removal request', 'Client record removal request', 'Appointment / queue record removal request', 'Impounded animal record removal request', 'Medicine record removal request', 'Inventory record removal request', 'Account removal request'], required: true },
        { name: 'target', label: 'Record or account identifier', required: true },
        { name: 'reason', label: 'Reason for removal', type: 'textarea', required: true },
        { name: 'requester', label: 'Requester name', required: true },
        { name: 'email', label: 'Contact email', type: 'email', required: true }
      ],
      columns: [
        { name: 'category', label: 'Request type' },
        { name: 'target', label: 'Target' },
        { name: 'reason', label: 'Reason' },
        { name: 'email', label: 'Contact' }
      ]
    },
    supportRequests: {
      key: 'supportRequests',
      title: 'Technical support requests',
      singular: 'support request',
      addLabel: 'Request technical support',
      description: 'Requests are stored in this browser prototype and are not sent to a support team.',
      fields: [
        { name: 'issueType', label: 'Issue type', type: 'select', options: ['Bug or unexpected behavior', 'Sign-in or access', 'Data or record issue', 'Performance or loading', 'Other technical issue'], required: true },
        { name: 'priority', label: 'Priority', type: 'select', options: ['Normal', 'High — work is blocked', 'Urgent — service unavailable'], required: true },
        { name: 'module', label: 'Affected page or feature', required: true },
        { name: 'summary', label: 'Short issue summary', required: true },
        { name: 'requester', label: 'Requester name', required: true },
        { name: 'email', label: 'Contact email', type: 'email', required: true },
        { name: 'environment', label: 'Device and browser' },
        { name: 'description', label: 'What happened?', type: 'textarea', required: true },
        { name: 'steps', label: 'Steps to reproduce', type: 'textarea' }
      ],
      columns: [
        { name: 'summary', label: 'Issue' },
        { name: 'priority', label: 'Priority' },
        { name: 'module', label: 'Affected feature' },
        { name: 'email', label: 'Contact' }
      ]
    },
    paravetScreenings: {
      key: 'paravetScreenings',
      title: 'Paravet screening records',
      singular: 'screening record',
      fields: [
        { name: 'petOwner', label: 'Pet / owner', required: true },
        { name: 'outcome', label: 'Outcome', type: 'select', options: ['For screening', 'Qualified', 'Not qualified', 'Requires further assessment'], required: true },
        { name: 'notes', label: 'Screening notes', type: 'textarea', required: true }
      ],
      columns: [
        { name: 'petOwner', label: 'Pet / owner' },
        { name: 'outcome', label: 'Outcome' },
        { name: 'notes', label: 'Screening notes' }
      ]
    },
    aftercareMessages: {
      key: 'aftercareMessages',
      title: 'Flagged messages awaiting review',
      singular: 'flagged message',
      fields: [
        { name: 'petOwner', label: 'Client and pet', required: true },
        { name: 'message', label: 'Message', type: 'textarea', required: true },
        { name: 'receivedAt', label: 'Received', required: true },
        { name: 'status', label: 'Review status', type: 'select', options: ['Awaiting review', 'Under review', 'Resolved'], required: true }
      ],
      initial: [
        { petOwner: 'Marasigan, J. — Bantay', message: 'The wound looks more red today and Bantay is not eating.', receivedAt: 'Today', status: 'Awaiting review' },
        { petOwner: 'Reyes, A. — Mochi', message: 'Can I give another dose if she vomited?', receivedAt: 'Today', status: 'Awaiting review' },
        { petOwner: 'Santos, M. — Buddy', message: 'Buddy is restless after the procedure.', receivedAt: 'Yesterday', status: 'Awaiting review' }
      ],
      columns: [
        { name: 'petOwner', label: 'Client / pet' },
        { name: 'message', label: 'Message' },
        { name: 'receivedAt', label: 'Received' },
        { name: 'status', label: 'Status' }
      ]
    },
    scheduleEvents: {
      key: 'scheduleEvents',
      title: 'Schedule events',
      singular: 'schedule event',
      fields: [
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'eventType', label: 'Event type', type: 'select', required: true, options: ['Census visit', 'Anti-rabies', 'Kapon program', 'Microchip'] },
        { name: 'title', label: 'Event title', required: true },
        { name: 'notes', label: 'Notes', type: 'textarea' }
      ],
      initial: [
        { date: '2026-10-10', eventType: 'Census visit', title: 'Census visit · Gaya-gaya', notes: '' },
        { date: '2026-10-17', eventType: 'Kapon program', title: 'Kapon · Muzon Proper', notes: '' },
        { date: '2026-10-24', eventType: 'Kapon program', title: 'Kapon · San Isidro', notes: '' },
        { date: '2026-11-07', eventType: 'Kapon program', title: 'Kapon · San Rafael I (pending)', notes: '' },
        { date: '2026-11-14', eventType: 'Anti-rabies', title: 'Anti-rabies · Tungkong Mangga', notes: '' }
      ],
      onCreate: item => {
        const eventDate = new Date(`${item.date}T00:00:00`);
        item.type = { 'Census visit': 'paravet', 'Anti-rabies': 'vaccination', 'Kapon program': 'clinic', 'Microchip': 'followup' }[item.eventType] || 'clinic';
        item.day = eventDate.getDate();
      }
    },
    pets: {
      key: 'pets',
      title: 'Pet and owner records',
      singular: 'pet record',
      publicIdPrefix: 'PET',
      idLabel: 'Pet ID',
      table: '#pet-table',
      columns: [
        { name: 'name', label: 'Pet' },
        { name: 'speciesBreed', label: 'Species / breed' },
        { name: 'owner', label: 'Owner' },
        { name: 'barangay', label: 'Barangay' },
        { name: 'sterilization', label: 'Sterilization' },
        { name: 'vaccination', label: 'Vaccination' },
        { name: 'qrCode', label: 'Reference' }
      ],
      fields: [
        { name: 'name', label: 'Pet name', required: true },
        { name: 'species', label: 'Species', type: 'select', options: ['Dog', 'Cat'], required: true },
        { name: 'breed', label: 'Breed' },
        { name: 'owner', label: 'Owner name', required: true },
        { name: 'contact', label: 'Owner contact' },
        { name: 'barangay', label: 'Barangay', type: 'select', options: CV.BR, required: true },
        { name: 'sterilization', label: 'Sterilization', type: 'select', options: ['Sterilized', 'Not sterilized'], required: true },
        { name: 'vaccination', label: 'Vaccination status / due date' },
        { name: 'qrCode', label: 'Pet reference ID', required: true }
      ],
      readRow: row => ({
        name: row.cells[0].textContent.trim(),
        speciesBreed: row.cells[1].textContent.trim(),
        species: row.cells[1].textContent.split('·')[0].trim(),
        breed: row.cells[1].textContent.split('·').slice(1).join('·').trim(),
        owner: row.cells[2].textContent.trim(),
        barangay: row.cells[3].textContent.trim(),
        sterilization: row.cells[4].textContent.trim(),
        vaccination: row.cells[5].textContent.trim(),
        qrCode: row.cells[6].textContent.trim()
      }),
      renderRow: (entry, row) => {
        const speciesBreed = [entry.species || entry.speciesBreed?.split('·')[0]?.trim(), entry.breed || entry.speciesBreed?.split('·').slice(1).join('·').trim()].filter(Boolean).join(' · ');
        const values = [entry.name, speciesBreed, entry.owner, entry.barangay, entry.sterilization || 'Not recorded', entry.vaccination || 'Not recorded', entry.qrCode];
        values.forEach((value, index) => {
          const cell = row.insertCell();
          cell.textContent = value || '—';
          if (index === 0) cell.className = 'pet-name';
          if (index === 5) cell.className = 'muted';
        });
        if (entry.qrCode) {
          const tag = document.createElement('code');
          tag.textContent = entry.qrCode;
          row.cells[6].replaceChildren(tag);
        }
      }
    },
    appointments: {
      key: 'appointments',
      title: 'Queue and appointments',
      singular: 'queue entry',
      publicIdPrefix: 'QUE',
      idLabel: 'Queue ID',
      table: '#queue-table',
      fields: [
        { name: 'petOwner', label: 'Pet / owner', required: true },
        { name: 'reason', label: 'Reason', required: true },
        { name: 'type', label: 'Type', type: 'select', options: ['Emergency', 'Follow-up', 'Appointment', 'Walk-in'], required: true },
        { name: 'status', label: 'Status', type: 'select', options: ['Waiting', 'In progress', 'Completed', 'Cancelled'], required: true },
        { name: 'assignedTo', label: 'Assigned to' },
        { name: 'scheduledAt', label: 'Scheduled time', type: 'datetime-local' }
      ],
      readRow: row => ({
        petOwner: row.cells[0].textContent.trim(),
        reason: row.cells[1].textContent.trim(),
        type: row.dataset.type || row.cells[2].textContent.trim(),
        status: row.cells[3].textContent.trim().replace(/ · #\d+$/, '').startsWith('Queued')
          ? 'Waiting'
          : row.cells[3].textContent.trim().replace(/ · #\d+$/, ''),
        assignedTo: row.cells[4].textContent.trim()
      }),
      renderRow: (entry, row) => {
        row.dataset.type = entry.type || '';
        [entry.petOwner, entry.reason].forEach(value => {
          const cell = row.insertCell();
          cell.textContent = value || '—';
        });
        const type = row.insertCell();
        const tag = document.createElement('span');
        tag.className = `tag${entry.type === 'Emergency' ? ' emergency' : entry.type === 'Follow-up' ? ' followup' : ''}`;
        tag.textContent = entry.type || '—';
        type.appendChild(tag);
        const status = row.insertCell();
        status.className = `status ${entry.status === 'Completed' ? 'done' : entry.status === 'In progress' ? 'progress' : 'waiting'}`;
        status.textContent = entry.status || 'Waiting';
        const assigned = row.insertCell();
        assigned.className = entry.assignedTo ? '' : 'muted';
        assigned.textContent = entry.assignedTo || 'Unassigned';
      }
    },
    impounds: {
      key: 'impounds',
      title: 'Impounded animals',
      singular: 'impound record',
      publicIdPrefix: 'IMP',
      idLabel: 'Impound ID',
      table: '#impound-table',
      fields: [
        { name: 'description', label: 'Animal description', required: true },
        { name: 'location', label: 'Capture location', required: true },
        { name: 'capturedAt', label: 'Capture date', type: 'date', required: true },
        { name: 'vaccination', label: 'Vaccination status', type: 'select', options: ['Unknown', 'Vaccinated', 'Unvaccinated'], required: true },
        { name: 'status', label: 'Status', type: 'select', options: ['Impounded', 'Claimed', 'Unclaimed'], required: true }
      ],
      readRow: row => {
        const displayedDate = row.cells[2].textContent.trim();
        const parsedDate = new Date(displayedDate);
        return {
          description: row.cells[0].textContent.trim(),
          location: row.cells[1].textContent.trim(),
          capturedAt: Number.isNaN(parsedDate.getTime()) ? '' : new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000).toISOString().slice(0, 10),
          vaccination: row.cells[3].textContent.trim(),
          status: row.dataset.status || row.cells[4].textContent.trim().split(' — ')[0]
        };
      },
      renderRow: (entry, row) => {
        row.dataset.status = (entry.status || 'Impounded').toLowerCase();
        const description = row.insertCell();
        description.className = 'who';
        description.textContent = entry.description || '—';
        const values = [entry.location, entry.capturedAt, entry.vaccination];
        values.forEach(value => {
          const cell = row.insertCell();
          cell.className = 'muted';
          cell.textContent = value || '—';
        });
        const status = row.insertCell();
        const tag = document.createElement('span');
        const normalized = (entry.status || 'Impounded').toLowerCase();
        tag.className = `tag ${normalized}`;
        tag.textContent = entry.status || 'Impounded';
        status.appendChild(tag);
      }
    }
  };

  const queuePriority = {
    Emergency: 4,
    'Follow-up': 3,
    Appointment: 2,
    'Walk-in': 1
  };

  function newId() {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  const philippinesPhonePattern = /^09\d{9}$/;

  function normalizePhilippinesPhone(value) {
    const digits = String(value || '').trim().replace(/\D/g, '');
    return /^639\d{9}$/.test(digits) ? `09${digits.slice(3)}` : digits;
  }

  function validatePhilippinesPhone(value) {
    const digits = String(value || '').trim();
    return digits.length === 11 && philippinesPhonePattern.test(digits) ? digits : '';
  }

  function recordSearchText(record) {
    return Object.entries(record)
      .filter(([key, value]) => key !== 'id' && key !== 'createdAt' && typeof value !== 'object')
      .map(([, value]) => String(value ?? ''))
      .join(' ')
      .toLowerCase();
  }

  function normalizedSearchText(value) {
    return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function queryTokens(query) {
    return normalizedSearchText(query).split(/\s+/).filter(Boolean);
  }

  function editDistanceWithin(left, right, limit) {
    if (Math.abs(left.length - right.length) > limit) return false;
    let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let row = 1; row <= left.length; row += 1) {
      const current = [row];
      let rowMinimum = row;
      for (let column = 1; column <= right.length; column += 1) {
        const cost = left[row - 1] === right[column - 1] ? 0 : 1;
        current[column] = Math.min(
          current[column - 1] + 1,
          previous[column] + 1,
          previous[column - 1] + cost
        );
        rowMinimum = Math.min(rowMinimum, current[column]);
      }
      if (rowMinimum > limit) return false;
      previous = current;
    }
    return previous[right.length] <= limit;
  }

  function tokenMatchesText(token, text) {
    if (text.includes(token)) return true;
    if (token.length < 3) return false;
    const distanceLimit = token.length >= 7 ? 2 : 1;
    return text.split(/[^a-z0-9]+/).some(word =>
      word && Math.abs(word.length - token.length) <= distanceLimit &&
      editDistanceWithin(token, word, distanceLimit)
    );
  }

  function recordMatchesQuery(record, query) {
    const text = normalizedSearchText(recordSearchText(record));
    const tokens = queryTokens(query);
    return tokens.length > 0 && tokens.every(token => tokenMatchesText(token, text));
  }

  function matchingSuggestionValues(values, query) {
    const normalizedQuery = normalizedSearchText(query);
    if (normalizedQuery.length < 2) return [];
    const tokens = queryTokens(normalizedQuery);
    return Array.from(new Set(values))
      .map(value => ({ value: String(value).trim(), normalized: normalizedSearchText(value) }))
      .filter(entry => entry.value && tokens.every(token => tokenMatchesText(token, entry.normalized)))
      .sort((left, right) => {
        const leftStarts = left.normalized.startsWith(normalizedQuery) ? 1 : 0;
        const rightStarts = right.normalized.startsWith(normalizedQuery) ? 1 : 0;
        return rightStarts - leftStarts || left.value.localeCompare(right.value, undefined, { sensitivity: 'base' });
      })
      .slice(0, 8)
      .map(entry => entry.value);
  }

  const suggestionRefreshers = new WeakMap();

  function wireDynamicSuggestions(input, getValues, prefix = 'suggestions') {
    const datalist = document.createElement('datalist');
    datalist.id = `${prefix}-${newId()}`;
    input.setAttribute('list', datalist.id);
    const refresh = () => {
      datalist.replaceChildren();
      matchingSuggestionValues(getValues(), input.value).forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        datalist.appendChild(option);
      });
    };
    input.addEventListener('input', refresh);
    input.addEventListener('focus', refresh);
    suggestionRefreshers.set(input, refresh);
    refresh();
    return { datalist, refresh };
  }

  function alphabeticRecordValue(record, kind) {
    if (kind === 'clients') return `${record.lastName || ''} ${record.firstName || record.name || ''}`;
    return record.name || record.title || record.item || record.petOwner || record.description ||
      record.firstName || record.requestedBy || record.eventType || record.content || '';
  }

  function sortedRecords(records, kind, criterion, direction) {
    const sorted = [...records];
    const multiplier = direction === 'desc' ? -1 : 1;
    sorted.sort((left, right) => {
      if (criterion === 'priority' && kind === 'appointments') {
        const statusRank = value => value === 'Completed' || value === 'Cancelled' ? 0 : 1;
        const statusDiff = statusRank(right.status) - statusRank(left.status);
        return multiplier * (statusDiff || (queuePriority[right.type] || 0) - (queuePriority[left.type] || 0));
      }
      if (criterion === 'created') {
        return multiplier * (new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime());
      }
      return multiplier * String(alphabeticRecordValue(left, kind)).localeCompare(String(alphabeticRecordValue(right, kind)), undefined, { sensitivity: 'base' });
    });
    return sorted;
  }

  function updateRecordSearchUrl(value) {
    const url = new URL(location.href);
    if (value) url.searchParams.set('search', value);
    else url.searchParams.delete('search');
    url.searchParams.delete('record');
    history.replaceState(null, '', url);
  }

  let staticRecordIndex = [];
  let staticRecordIndexPromise;

  function loadStaticRecordIndex() {
    if (staticRecordIndexPromise) return staticRecordIndexPromise;
    staticRecordIndexPromise = (async () => {
      const sources = [];
      const indexed = [];
      for (const source of sources) {
        try {
          const response = await fetch(source.file);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const markup = await response.text();
          const parsed = new DOMParser().parseFromString(markup, 'text/html');
          const config = collectionConfigs[source.kind];
          parsed.querySelectorAll(`${config.table} tbody tr`).forEach(row => {
            indexed.push({
              kind: source.kind,
              text: row.textContent.toLowerCase(),
              values: Array.from(row.cells, cell => cell.textContent.trim()).filter(Boolean),
              record: config.readRow(row)
            });
          });
        } catch (error) {
          console.error(`CityVet could not load search suggestions from ${source.file}.`, error);
        }
      }
      staticRecordIndex = indexed;
      const dashboardSearch = document.querySelector('.dashboard-search input');
      if (dashboardSearch) suggestionRefreshers.get(dashboardSearch)?.();
      document.querySelectorAll('.cv-modal-body').forEach(root => wireValueSuggestions(root));
      return indexed;
    })();
    return staticRecordIndexPromise;
  }

  function wireAccountSettings() {
    const formNode = document.querySelector('[data-account-settings]');
    if (!formNode) return;
    const account = readDemoAccount();
    if (!account) {
      location.replace('login.html');
      return;
    }
    formNode.elements.namedItem('username').value = account.username;
    formNode.elements.namedItem('displayName').value = account.displayName;
    const feedback = formNode.querySelector('[data-account-feedback]');
    formNode.querySelectorAll('[data-toggle-password]').forEach(button => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.togglePassword);
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
        button.textContent = input.type === 'password' ? 'Show' : 'Hide';
        button.setAttribute('aria-label', input.type === 'password' ? 'Show password' : 'Hide password');
      });
    });
    formNode.addEventListener('submit', event => {
      event.preventDefault();
      feedback.textContent = '';
      const data = new FormData(formNode);
      const username = String(data.get('username') || '').trim();
      const displayName = String(data.get('displayName') || '').trim();
      const currentPassword = String(data.get('currentPassword') || '');
      const newPassword = String(data.get('newPassword') || '');
      const confirmPassword = String(data.get('confirmPassword') || '');
      if (username.length < 3 || !/^[a-zA-Z0-9._-]+$/.test(username)) {
        feedback.textContent = 'Use at least 3 letters or numbers; dots, underscores, and hyphens are also allowed.';
        return;
      }
      if (displayName.length < 2) {
        feedback.textContent = 'Enter a display name with at least 2 characters.';
        return;
      }
      if ((newPassword || confirmPassword) && currentPassword !== account.password) {
        feedback.textContent = 'Enter the current password to change your password.';
        return;
      }
      if (newPassword && newPassword.length < 8) {
        feedback.textContent = 'Use a new password with at least 8 characters.';
        return;
      }
      if (newPassword !== confirmPassword) {
        feedback.textContent = 'The new passwords do not match.';
        return;
      }
      const updatedAccount = {
        ...account,
        username,
        displayName,
        password: newPassword || account.password
      };
      try {
        localStorage.setItem(loginStorageKey, JSON.stringify(updatedAccount));
        sessionStorage.setItem(loginSessionKey, username);
        document.querySelector('.role-pill').textContent = `Signed in as ${displayName}`;
        formNode.elements.namedItem('currentPassword').value = '';
        formNode.elements.namedItem('newPassword').value = '';
        formNode.elements.namedItem('confirmPassword').value = '';
        feedback.textContent = 'Account details saved in this browser.';
      } catch (error) {
        console.error('CityVet demo account changes could not be saved.', error);
        feedback.textContent = 'Account details could not be saved in this browser.';
      }
    });
  }

  function recordTools(container, kind, onChange, includeSearch = true) {
    const tools = document.createElement('div');
    tools.className = 'record-tools';
    let search;
    const params = new URLSearchParams(location.search);
    if (includeSearch) {
      search = document.createElement('input');
      search.type = 'search';
      search.className = 'record-search';
      search.setAttribute('aria-label', `Search ${collectionConfigs[kind].title}`);
      search.placeholder = `Search ${collectionConfigs[kind].title.toLowerCase()} (2+ characters)…`;
      search.value = params.get('search') || state._recordSearch?.[kind] || '';
      search.addEventListener('input', () => {
        state._recordSearch = state._recordSearch || {};
        state._recordSearch[kind] = search.value;
        updateRecordSearchUrl(search.value.trim());
        state._pagination = state._pagination || {};
        state._pagination[kind] = 1;
        const selectionStart = search.selectionStart;
        const selectionEnd = search.selectionEnd;
        onChange();
        const replacement = container.querySelector('.record-search');
        replacement?.focus();
        if (replacement && selectionStart !== null && selectionEnd !== null) replacement.setSelectionRange(selectionStart, selectionEnd);
      });
      const suggestions = wireDynamicSuggestions(search, () => {
        const values = [];
        (state[collectionConfigs[kind].key] || []).forEach(entry => {
          Object.entries(entry).forEach(([key, value]) => {
            if (key !== 'id' && key !== 'createdAt' && typeof value === 'string' && value.trim()) values.push(value.trim());
          });
        });
        return values;
      }, `record-suggestions-${kind}`);
      tools.append(search, suggestions.datalist);
      tools.appendChild(search);
    }
    const sortBy = document.createElement('select');
    sortBy.className = 'record-sort-by';
    sortBy.setAttribute('aria-label', 'Sort records by');
    sortBy.innerHTML = '<option value="alphabetical">Alphabetical</option><option value="created">Date created</option>';
    if (kind === 'appointments') sortBy.insertAdjacentHTML('beforeend', '<option value="priority">Queue priority</option>');
    const sortOrder = document.createElement('select');
    sortOrder.className = 'record-sort-order';
    sortOrder.setAttribute('aria-label', 'Sort order');
    sortOrder.innerHTML = '<option value="asc">Ascending</option><option value="desc">Descending</option>';
    const preferences = state._sortPreferences?.[kind] || {};
    sortBy.value = preferences.by || (kind === 'appointments' ? 'priority' : 'alphabetical');
    sortOrder.value = preferences.order || 'asc';
    const update = () => {
      state._sortPreferences = state._sortPreferences || {};
      state._sortPreferences[kind] = { by: sortBy.value, order: sortOrder.value };
      save();
      state._pagination = state._pagination || {};
      state._pagination[kind] = 1;
      onChange();
    };
    sortBy.addEventListener('change', update);
    sortOrder.addEventListener('change', update);
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'cv-btn clear-filters-button';
    clear.textContent = 'Clear filters';
    clear.addEventListener('click', () => {
      if (search) search.value = '';
      state._recordSearch = state._recordSearch || {};
      state._recordSearch[kind] = '';
      sortBy.value = kind === 'appointments' ? 'priority' : 'alphabetical';
      sortOrder.value = 'asc';
      state._sortPreferences = state._sortPreferences || {};
      state._sortPreferences[kind] = { by: sortBy.value, order: sortOrder.value };
      state._pagination = state._pagination || {};
      state._pagination[kind] = 1;
      const externalSearch = kind === 'pets' ? document.querySelector('#search') : null;
      if (externalSearch) externalSearch.value = '';
      const barangay = document.querySelector('#barangayFilter');
      if (kind === 'pets' && barangay) barangay.value = '';
      const statusFilter = kind === 'impounds' ? document.querySelector('#statusFilter') : null;
      if (statusFilter) statusFilter.value = '';
      if (kind === 'appointments') {
        document.querySelectorAll('#tabs .tab').forEach(tab => tab.classList.toggle('active', tab.dataset.type === 'all'));
      }
      updateRecordSearchUrl('');
      onChange();
      if (kind === 'pets') applyPetFilters();
    });
    tools.append(sortBy, sortOrder, clear);
    container.appendChild(tools);
    return { tools, search, sortBy, sortOrder };
  }

  function renderPagination(container, kind, count, onChange, pageSize = 10) {
    const pageCount = Math.max(1, Math.ceil(count / pageSize));
    state._pagination = state._pagination || {};
    const page = Math.min(Math.max(1, Number(state._pagination[kind]) || 1), pageCount);
    state._pagination[kind] = page;
    const navigation = document.createElement('nav');
    navigation.className = 'record-pagination';
    navigation.setAttribute('aria-label', `${collectionConfigs[kind].title} pages`);
    const summary = document.createElement('span');
    const firstItem = count ? (page - 1) * pageSize + 1 : 0;
    const lastItem = Math.min(page * pageSize, count);
    summary.textContent = `${firstItem}–${lastItem} of ${count}`;
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'cv-btn';
    previous.textContent = 'Previous';
    previous.disabled = page <= 1;
    previous.addEventListener('click', () => changePage(page - 1));
    const pageLabel = document.createElement('span');
    pageLabel.textContent = `Page ${page} of ${pageCount}`;
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'cv-btn';
    next.textContent = 'Next';
    next.disabled = page >= pageCount;
    next.addEventListener('click', () => changePage(page + 1));
    const pageSizeSelect = document.createElement('select');
    pageSizeSelect.setAttribute('aria-label', 'Records per page');
    [10, 25, 50].forEach(size => {
      const option = document.createElement('option');
      option.value = String(size);
      option.textContent = `${size} per page`;
      option.selected = size === pageSize;
      pageSizeSelect.append(option);
    });
    pageSizeSelect.addEventListener('change', () => {
      state._pageSize = state._pageSize || {};
      state._pageSize[kind] = Number(pageSizeSelect.value);
      state._pagination[kind] = 1;
      save();
      onChange();
    });
    const changePage = nextPage => {
      state._pagination[kind] = nextPage;
      onChange();
    };
    navigation.append(summary, previous, pageLabel, next, pageSizeSelect);
    container.appendChild(navigation);
    return { page, pageSize, start: (page - 1) * pageSize };
  }

  function paginationWindow(kind, count, pageSize) {
    const pageCount = Math.max(1, Math.ceil(count / pageSize));
    state._pagination = state._pagination || {};
    const page = Math.min(Math.max(1, Number(state._pagination[kind]) || 1), pageCount);
    state._pagination[kind] = page;
    return { page, pageCount, pageSize, start: (page - 1) * pageSize };
  }

  function renderSearchPrompt(container, title) {
    const prompt = document.createElement('div');
    prompt.className = 'empty-state record-search-prompt';
    const heading = document.createElement('h2');
    heading.textContent = title;
    const message = document.createElement('p');
    message.textContent = 'Enter a name, identifier, or value above to view matching sample records.';
    prompt.append(heading, message);
    container.appendChild(prompt);
  }

  function wireDashboardSearch() {
    if (!document.querySelector('.topbar h1')?.textContent.toLowerCase().includes('dashboard')) return;
    const titleBlock = document.querySelector('.topbar > div:first-child');
    if (!titleBlock || titleBlock.querySelector('.dashboard-search')) return;
    const form = document.createElement('form');
    form.className = 'dashboard-search';
    form.setAttribute('role', 'search');
    const input = document.createElement('input');
    input.type = 'search';
    input.name = 'q';
    input.placeholder = 'Search records, pets, clients (2+ characters)…';
    input.setAttribute('aria-label', 'Search all records');
    input.value = new URLSearchParams(location.search).get('search') || '';
    const getDashboardSuggestionValues = () => {
      const values = [];
      Object.values(collectionConfigs).forEach(config => {
        (state[config.key] || []).forEach(record => {
          Object.entries(record).forEach(([key, value]) => {
            if (key === 'id' || key === 'createdAt' || typeof value !== 'string' || !value.trim() || value.length > 120) return;
            values.push(value.trim());
          });
        });
      });
      staticRecordIndex.forEach(entry => values.push(...entry.values));
      return values;
    };
    const suggestions = wireDynamicSuggestions(input, getDashboardSuggestionValues, 'dashboard-search-suggestions');
    input.addEventListener('change', () => {
      if (matchingSuggestionValues(getDashboardSuggestionValues(), input.value)
        .some(value => normalizedSearchText(value) === normalizedSearchText(input.value))) form.requestSubmit();
    });
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'cv-btn primary';
    submit.textContent = 'Search';
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'cv-btn';
    clear.textContent = 'Clear';
    clear.addEventListener('click', () => { input.value = ''; input.focus(); });
    form.append(input, suggestions.datalist, submit, clear);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const query = input.value.trim();
      if (!query) return;
      if (query.length < 2) return toast('Enter at least 2 characters to search records.');
      await loadStaticRecordIndex();
      const routes = {
        clients: 'clients.html',
        pets: 'pet-records.html',
        appointments: 'program-day.html',
        impounds: 'pet-records.html',
        medicines: 'pet-records.html',
        inventory: 'pet-records.html',
        savedReports: 'reports.html',
        aftercareMessages: 'aftercare.html',
        aftercareContent: 'aftercare.html',
        paravetRequests: 'paravet.html',
        paravetScreenings: 'paravet.html',
        scheduleEvents: 'index.html'
      };
      const normalizedQuery = normalizedSearchText(query);
      let destination;
      let record;
      for (const [kind, config] of Object.entries(collectionConfigs)) {
        (state[config.key] || []).forEach(entry => {
          const score = recordMatchScore(entry, normalizedQuery, config.publicIdField || 'publicId');
          if (score > (record?.searchScore || 0)) {
            destination = routes[kind];
            record = { ...entry, searchScore: score };
          }
        });
      }
      staticRecordIndex.forEach(entry => {
        const score = recordMatchScore(entry.record, normalizedQuery);
        if (score > (record?.searchScore || 0)) {
          destination = routes[entry.kind];
          record = { ...entry.record, searchScore: score };
        }
      });
      if (!destination) {
        const prefixRoutes = [
          [/^CL-/i, 'clients.html'],
          [/^PET-/i, 'pet-records.html'],
          [/^QUE-/i, 'program-day.html'],
          [/^IMP-/i, 'pet-records.html'],
          [/^MED-/i, 'pet-records.html'],
          [/^RPT-/i, 'reports.html']
        ];
        destination = prefixRoutes.find(([pattern]) => pattern.test(query))?.[1];
      }
      if (!destination) {
        const sampleRecordRoutes = [
          [/\b(bantay|mochi|buddy|whiskers|luna|tom|REF-\d+|aspin|puspin)\b/i, 'pet-records.html'],
          [/\b(marasigan|reyes|santos|cruz|torres|de leon|poisoning|post-op|x-ray|vaccination|walk-in)\b/i, 'program-day.html'],
          [/\b(collar|purok \d|brown male dog|black & white dog|unclaimed animal)\b/i, 'pet-records.html']
        ];
        destination = sampleRecordRoutes.find(([pattern]) => pattern.test(query))?.[1];
      }
      if (!destination) {
        const fallbackRoutes = [
          [/\b(client|owner|user|gmail|phone)\b/i, 'clients.html'],
          [/\b(pet|dog|cat|qr)\b/i, 'pet-records.html'],
          [/\b(queue|appointment|emergency|walk-in)\b/i, 'program-day.html'],
          [/\b(impound|captured|claim)\b/i, 'pet-records.html'],
          [/\b(medicine|medication|drug)\b/i, 'pet-records.html'],
          [/\b(inventory|stock|supply)\b/i, 'pet-records.html'],
          [/\b(report|snapshot)\b/i, 'reports.html'],
          [/\b(paravet|screening)\b/i, 'paravet.html']
        ];
        destination = fallbackRoutes.find(([pattern]) => pattern.test(query))?.[1];
      }
      if (!destination) return toast('No matching record was found. Try a record ID, name, or record type.');
      const params = new URLSearchParams({ search: query });
      if (record?.id) params.set('record', record.id);
      const hashes = { 'clients.html': 'masterlist', 'pet-records.html': 'masterlist', 'reports.html': 'reports', 'aftercare.html': 'aftercare', 'paravet.html': 'paravet', 'program-day.html': 'program-day' };
      location.href = `index.html?${params.toString()}#/${hashes[destination] || 'dashboard'}`;
    });
    titleBlock.appendChild(form);
  }

  function wireValueSuggestions(root) {
    const suggestions = new Map();
    root.querySelectorAll('datalist[id^="suggestions-"]').forEach(list => list.remove());
    root.querySelectorAll('input[list^="suggestions-"]').forEach(input => input.removeAttribute('list'));
    Object.values(collectionConfigs).forEach(config => {
      (state[config.key] || []).forEach(record => {
        Object.entries(record).forEach(([key, value]) => {
          if (key === 'id' || key === 'createdAt' || typeof value !== 'string' || !value.trim() || value.length > 120) return;
          if (!suggestions.has(key)) suggestions.set(key, new Set());
          suggestions.get(key).add(value.trim());
        });
      });
      staticRecordIndex.forEach(entry => {
        Object.entries(entry.record).forEach(([key, value]) => {
          if (typeof value !== 'string' || !value.trim() || value.length > 120) return;
          if (!suggestions.has(key)) suggestions.set(key, new Set());
          suggestions.get(key).add(value.trim());
        });
      });
    });
    root.querySelectorAll('input:not([type]), input[type="text"], input[type="email"], input[type="tel"]').forEach(input => {
      if (input.readOnly || input.disabled || input.type === 'tel') return;
      const fieldName = input.name.toLowerCase();
      const keys = fieldName.includes('pet') || fieldName.includes('owner') ? ['name', 'petOwner', 'owner', 'firstName', 'lastName'] :
        fieldName.includes('barangay') ? ['barangay'] :
        fieldName.includes('assigned') ? ['assignedTo'] :
        fieldName.includes('medicine') ? ['name', 'activeIngredient'] :
        fieldName.includes('item') ? ['item', 'category'] : [input.name];
      const values = keys.flatMap(key => [...(suggestions.get(key) || [])]);
      if (!values.length) return;
      const dynamicSuggestions = wireDynamicSuggestions(input, () => values);
      root.appendChild(dynamicSuggestions.datalist);
    });
  }

  function recordMatchScore(record, query, publicIdField) {
    const primaryFields = ['name', 'firstName', 'lastName', 'petOwner', 'owner', 'description', 'title', 'item', 'pet', 'requestedBy'];
    const fields = Object.entries(record).filter(([key, value]) =>
      key !== 'id' && key !== 'createdAt' && typeof value === 'string' && value.trim()
    );
    const normalizedQuery = normalizedSearchText(query);
    const tokens = queryTokens(normalizedQuery);
    if (!tokens.length || !recordMatchesQuery(record, normalizedQuery)) return 0;
    let score = 0;
    fields.forEach(([key, value]) => {
      const normalized = normalizedSearchText(value);
      if (normalized === normalizedQuery) score = Math.max(score, key === publicIdField || key === 'qrCode' ? 120 : primaryFields.includes(key) ? 110 : 90);
      else if (normalized.startsWith(normalizedQuery)) score = Math.max(score, primaryFields.includes(key) ? 70 : 55);
      else if (tokens.every(token => normalized.includes(token))) score = Math.max(score, primaryFields.includes(key) ? 45 : 20);
    });
    if (record.firstName && record.lastName && normalizedSearchText(`${record.firstName} ${record.lastName}`) === normalizedQuery) {
      score = Math.max(score, 115);
    }
    if (!score) score = 10;
    return score;
  }

  function recordIdentifierInUse(identifier, exceptId) {
    return Object.values(collectionConfigs).some(recordConfig => {
      if (!recordConfig.publicIdPrefix) return false;
      const idField = recordConfig.publicIdField || 'publicId';
      const records = Array.isArray(state[recordConfig.key]) ? state[recordConfig.key] : [];
      return records.some(record => record.id !== exceptId && record[idField] === identifier);
    });
  }

  function ensureRecordIdentifier(kind, record, except = record) {
    const config = collectionConfigs[kind];
    if (!config?.publicIdPrefix) return;
    const idField = config.publicIdField || 'publicId';
    if (record[idField] && !recordIdentifierInUse(record[idField], except?.id)) return;
    let identifier;
    do {
      identifier = `${config.publicIdPrefix}-${newId().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
    } while (recordIdentifierInUse(identifier, except?.id));
    record[idField] = identifier;
  }

  function migrateClientDetails(client) {
    if (!client.firstName || !client.lastName) {
      const legacyName = String(client.name || '').trim();
      const comma = legacyName.indexOf(',');
      if (comma >= 0) {
        client.lastName = client.lastName || legacyName.slice(0, comma).trim();
        client.firstName = client.firstName || legacyName.slice(comma + 1).trim();
      } else {
        const parts = legacyName.split(/\s+/).filter(Boolean);
        client.firstName = client.firstName || parts.shift() || '';
        client.lastName = client.lastName || parts.join(' ');
      }
    }
    client.gender = client.gender || '';
  }

  Object.values(collectionConfigs).forEach(config => {
    if (!Array.isArray(state[config.key])) {
      let initialItems = config.initial || [];
      if (config.key === 'aftercareContent' && typeof state[config.key] === 'string' && state[config.key].trim()) {
        initialItems = [{
          title: 'Previously saved approved guidance',
          content: state[config.key],
          approvedBy: 'Not recorded',
          reviewDate: new Date().toISOString().slice(0, 10)
        }];
      }
      state[config.key] = initialItems.map(item => {
        const entry = { ...item, id: newId() };
        if (config.onCreate) config.onCreate(entry, true);
        return entry;
      });
    } else {
      state[config.key] = state[config.key].map(item => ({ ...item, id: item.id || newId() }));
    }
    state[config.key].forEach(item => {
      if (config.key === 'clients') migrateClientDetails(item);
      ['phone', 'contact'].forEach(field => {
        if (!item[field]) return;
        item[field] = normalizePhilippinesPhone(item[field]);
        const phone = validatePhilippinesPhone(item[field]);
        if (phone) item[field] = phone;
      });
      ensureRecordIdentifier(config.key, item);
    });
    state[config.key].forEach((item, index) => {
      if (!item.createdAt) item.createdAt = new Date(Date.now() - index).toISOString();
    });
  });
  state.paravetCapacityByBarangay = state.paravetCapacityByBarangay && typeof state.paravetCapacityByBarangay === 'object'
    ? state.paravetCapacityByBarangay
    : { 'San Isidro': 200, Muzon: 200, 'San Rafael': 200 };
  CV.BR.forEach(barangay => {
    const capacity = Number(state.paravetCapacityByBarangay[barangay]);
    state.paravetCapacityByBarangay[barangay] = Number.isInteger(capacity) && capacity > 0 ? capacity : 200;
  });
  save();

  function toast(message) {
    const node = document.createElement('div');
    node.className = 'cv-toast';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2600);
  }

  function readDemoAccount() {
    try {
      const raw = localStorage.getItem(loginStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('CityVet demo account could not be read.', error);
      return null;
    }
  }

  function wireLoginPage() {
    const setup = document.querySelector('[data-account-setup]');
    const login = document.querySelector('[data-account-login]');
    const account = readDemoAccount();
    const errorNode = document.querySelector('[data-login-error]');
    const note = document.querySelector('[data-login-note]');
    const nextPage = new URLSearchParams(location.search).get('next');
    const validNextPage = Object.prototype.hasOwnProperty.call(pageMap, nextPage) ? nextPage : pageMap['index.html'];
    if (sessionStorage.getItem(loginSessionKey) && account) {
      location.replace(validNextPage);
      return;
    }

    const showError = message => { errorNode.textContent = message; };
    document.querySelectorAll('[data-toggle-password]').forEach(button => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.togglePassword);
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
        button.textContent = input.type === 'password' ? 'Show' : 'Hide';
        button.setAttribute('aria-label', input.type === 'password' ? 'Show password' : 'Hide password');
      });
    });

    if (!account) {
      setup.hidden = false;
      login.hidden = true;
      note.textContent = 'Create the first local demo account to continue.';
      setup.addEventListener('submit', event => {
        event.preventDefault();
        showError('');
        const data = new FormData(setup);
        const username = String(data.get('username') || '').trim();
        const displayName = String(data.get('displayName') || '').trim();
        const password = String(data.get('password') || '');
        const confirmation = String(data.get('confirmPassword') || '');
        if (username.length < 3 || !/^[a-zA-Z0-9._-]+$/.test(username)) return showError('Use at least 3 letters or numbers; dots, underscores, and hyphens are also allowed.');
        if (displayName.length < 2) return showError('Enter a display name with at least 2 characters.');
        if (password.length < 8) return showError('Use a password with at least 8 characters.');
        if (password !== confirmation) return showError('The passwords do not match.');
        try {
          localStorage.setItem(loginStorageKey, JSON.stringify({ username, displayName, password }));
          sessionStorage.setItem(loginSessionKey, username);
          location.replace(validNextPage);
        } catch (error) {
          console.error('CityVet demo account could not be saved.', error);
          showError('The demo account could not be stored in this browser.');
        }
      });
      return;
    }

    setup.hidden = true;
    login.hidden = false;
    note.textContent = 'Sign in to the City Veterinary Office prototype.';
    login.addEventListener('submit', event => {
      event.preventDefault();
      showError('');
      const data = new FormData(login);
      const username = String(data.get('username') || '').trim();
      const password = String(data.get('password') || '');
      const savedAccount = readDemoAccount();
      if (!savedAccount || username.toLowerCase() !== String(savedAccount.username).toLowerCase() || password !== savedAccount.password) {
        showError('The username or password is incorrect.');
        return;
      }
      try {
        sessionStorage.setItem(loginSessionKey, savedAccount.username);
        location.replace(validNextPage);
      } catch (error) {
        console.error('CityVet demo session could not be started.', error);
        showError('The demo session could not be started in this browser.');
      }
    });
  }

  function openModal(title, content, onSubmit) {
    const backdrop = document.createElement('div');
    backdrop.className = 'cv-modal-backdrop open';
    backdrop.innerHTML = `<div class="cv-modal" role="dialog" aria-modal="true" aria-labelledby="cv-modal-title">
      <div class="cv-modal-head"><h2 id="cv-modal-title"></h2><button class="cv-modal-close" type="button" aria-label="Close"><img src="close.png" alt=""/></button></div>
      <div class="cv-modal-body"></div>
    </div>`;
    backdrop.querySelector('h2').textContent = title;
    backdrop.querySelector('.cv-modal-body').appendChild(content);
    wireValueSuggestions(content);
    content.querySelectorAll('input[type="tel"], input[name="phone"], input[name="contact"]').forEach(input => {
      input.type = 'tel';
      input.inputMode = 'tel';
      input.autocomplete = 'tel';
      input.placeholder = '09XXXXXXXXX';
      input.maxLength = 11;
      input.pattern = '09[0-9]{9}';
      input.title = 'Enter an 11-digit Philippine mobile number starting with 09.';
      const validate = () => {
        const digits = input.value.replace(/\D/g, '').slice(0, 11);
        if (input.value !== digits) input.value = digits;
        input.setCustomValidity(!input.value || (input.value.length === 11 && philippinesPhonePattern.test(input.value)) ? '' : 'Enter an 11-digit Philippine mobile number starting with 09.');
      };
      input.addEventListener('input', validate);
    });
    const previouslyFocused = document.activeElement;
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', escape);
      document.body.classList.remove('modal-open');
      backdrop.remove();
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
    const escape = event => { if (event.key === 'Escape') close(); };
    backdrop.querySelector('.cv-modal-close').addEventListener('click', close);
    backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });
    document.addEventListener('keydown', escape);
    if (onSubmit) content.addEventListener('submit', async event => {
      event.preventDefault();
      const submit = content.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      try { await onSubmit(new FormData(content), close); }
      catch (error) {
        console.error(error);
        const errorBox = content.querySelector('.cv-error');
        if (errorBox) errorBox.textContent = 'Something went wrong. Please try again.';
      }
      finally { if (submit && !closed) submit.disabled = false; }
    });
    document.body.appendChild(backdrop);
    document.body.classList.add('modal-open');
    const first = content.querySelector('input,select,textarea,button');
    if (first) first.focus();
  }

  function wireChatAssistant() {
    if (document.querySelector('.chat-assistant')) return;
    const widget = document.createElement('aside');
    widget.className = 'chat-assistant';
    widget.setAttribute('aria-label', 'CityVet sample AI Assist');

    const launcher = document.createElement('button');
    launcher.className = 'chat-assistant-launcher';
    launcher.type = 'button';
    launcher.setAttribute('aria-label', 'Open AI Assist sample support');
    launcher.setAttribute('aria-controls', 'chat-assistant-panel');
    launcher.setAttribute('aria-expanded', 'false');
    const launcherImage = document.createElement('img');
    launcherImage.src = 'chat.png';
    launcherImage.alt = '';
    launcher.appendChild(launcherImage);

    const panel = document.createElement('section');
    panel.className = 'chat-assistant-panel';
    panel.id = 'chat-assistant-panel';
    panel.setAttribute('aria-label', 'AI Assist sample support chat');
    panel.hidden = sessionStorage.getItem(chatOpenKey) !== 'true';

    const header = document.createElement('header');
    header.className = 'chat-assistant-header';
    const logo = document.createElement('img');
    logo.src = 'chat.png';
    logo.alt = '';
    const heading = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = 'AI Assist';
    const subtitle = document.createElement('span');
    subtitle.textContent = 'Sample support only';
    heading.append(title, subtitle);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'chat-assistant-close';
    close.setAttribute('aria-label', 'Close AI Assist');
    close.textContent = '×';
    header.append(logo, heading, close);

    const disclaimer = document.createElement('p');
    disclaimer.className = 'chat-assistant-disclaimer';
    disclaimer.textContent = 'Demo replies only. This assistant is not connected to clinic staff or patient records.';
    const messagesNode = document.createElement('div');
    messagesNode.className = 'chat-assistant-messages';
    messagesNode.setAttribute('role', 'log');
    messagesNode.setAttribute('aria-live', 'polite');
    messagesNode.setAttribute('aria-relevant', 'additions');

    let messages = [];
    try {
      const stored = JSON.parse(sessionStorage.getItem(chatMessagesKey) || '[]');
      if (Array.isArray(stored)) {
        messages = stored.filter(message =>
          message && ['assistant', 'user'].includes(message.role) &&
          typeof message.text === 'string' && message.text.length <= 2000
        ).slice(-40);
      }
    } catch (error) {
      console.error('CityVet sample assistant conversation could not be read.', error);
    }
    if (!messages.length) {
      messages = [{
        role: 'assistant',
        text: 'Hello. I can point you to a section or explain how to use this demo. Try “How do I find a client?”'
      }];
    }

    const formNode = document.createElement('form');
    formNode.className = 'chat-assistant-form';
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'message';
    input.maxLength = 500;
    input.autocomplete = 'off';
    input.placeholder = 'Ask for sample help…';
    input.setAttribute('aria-label', 'Message AI Assist');
    const send = document.createElement('button');
    send.type = 'submit';
    send.className = 'cv-btn primary';
    send.textContent = 'Send';
    formNode.append(input, send);
    panel.append(header, disclaimer, messagesNode, formNode);

    const persist = () => {
      try {
        sessionStorage.setItem(chatMessagesKey, JSON.stringify(messages.slice(-40)));
      } catch (error) {
        console.error('CityVet sample assistant conversation could not be saved.', error);
      }
    };
    const render = () => {
      messagesNode.replaceChildren();
      messages.forEach(message => {
        const bubble = document.createElement('p');
        bubble.className = `chat-message ${message.role}`;
        bubble.textContent = message.text;
        messagesNode.appendChild(bubble);
      });
      messagesNode.scrollTop = messagesNode.scrollHeight;
    };
    const sampleReply = message => {
      const query = normalizedSearchText(message);
      if (/\b(urgent|emergency|sick|symptom|medicine|dose|diagnos|medical|injur)\b/.test(query)) {
        return 'I cannot assess symptoms or recommend treatment. Please contact a veterinarian or the City Veterinary Office directly, especially for urgent concerns.';
      }
      if (/\b(client|owner|user)\b/.test(query)) {
        return 'Open Clients from the sidebar, then search by a name, user ID, address, email, or phone number. You can add or edit a profile there.';
      }
      if (/\b(pet|animal|dog|cat)\b/.test(query)) {
        return 'Open Pet & owner records and search by the pet name, owner, barangay, or record ID. Use the filters to narrow results.';
      }
      if (/\b(queue|appointment|booking)\b/.test(query)) {
        return 'Open Queue & appointments to review matching entries or filter by queue category.';
      }
      if (/\b(password|login|account|sign in)\b/.test(query)) {
        return 'Open Admin settings to update the local demo name, username, or password. This browser-only prototype is not production authentication.';
      }
      if (/\b(search|find|look up)\b/.test(query)) {
        return 'Enter at least two characters in a record search. Matching records stay hidden until you search or choose a filter; suggestions appear only when related to your typed text.';
      }
      return 'I can offer sample navigation help for this prototype, but I do not provide real AI responses or contact clinic staff. Try asking how to find a client, pet, or queue record.';
    };
    const setOpen = open => {
      panel.hidden = !open;
      launcher.setAttribute('aria-expanded', String(open));
      try {
        sessionStorage.setItem(chatOpenKey, String(open));
      } catch (error) {
        console.error('CityVet sample assistant visibility could not be saved.', error);
      }
      if (open) input.focus();
    };
    launcher.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => {
      setOpen(false);
      launcher.focus();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) {
        setOpen(false);
        launcher.focus();
      }
    });
    formNode.addEventListener('submit', event => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      messages.push({ role: 'user', text: text.slice(0, 500) });
      messages = messages.slice(-40);
      input.value = '';
      render();
      persist();
      send.disabled = true;
      window.setTimeout(() => {
        messages.push({ role: 'assistant', text: sampleReply(text) });
        messages = messages.slice(-40);
        send.disabled = false;
        render();
        persist();
      }, 250);
    });
    widget.append(panel, launcher);
    document.body.appendChild(widget);
    launcher.setAttribute('aria-expanded', String(!panel.hidden));
    render();
    persist();
  }

  function wireNotifications() {
    const topbar = document.querySelector('.topbar');
    const rolePill = topbar?.querySelector('.role-pill');
    if (!topbar || !rolePill) return;

    const notifications = [
      { id: 'clinic-email', channel: 'Email', sender: 'Dr. Maria Santos', subject: 'Vaccination schedule confirmed', message: 'The vaccination team confirmed the Barangay Muzon schedule for Friday.', time: 'Today, 9:42 AM' },
      { id: 'owner-message', channel: 'Message', sender: 'Ana Reyes', subject: 'Follow-up for Mochi', message: 'Mochi is eating normally after yesterday’s visit. Please let the clinic know if anything changes.', time: 'Today, 8:15 AM' },
      { id: 'barangay-update', channel: 'Update', sender: 'Barangay San Isidro Team', subject: 'Outreach venue updated', message: 'The community outreach desk will be set up beside the barangay hall entrance.', time: 'Yesterday, 4:30 PM' },
      { id: 'inventory-email', channel: 'Email', sender: 'Joel Cruz, Supply Officer', subject: 'Medicine stock report ready', message: 'The weekly medicine stock report is available for review.', time: 'Yesterday, 2:05 PM' },
      { id: 'paravet-message', channel: 'Message', sender: 'Liza Mendoza, Paravet', subject: 'Visit request received', message: 'A new household visit request came in for Purok 3.', time: 'Sep 24, 11:20 AM' }
    ];
    const previouslyRead = Array.isArray(state.notificationsRead) ? state.notificationsRead : [];
    const readIds = new Set(previouslyRead.filter(id => notifications.some(notification => notification.id === id)));
    const actions = document.createElement('div');
    actions.className = 'topbar-actions';
    const trigger = document.createElement('button');
    trigger.className = 'notification-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Notifications');
    trigger.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span>Notifications</span><span class="notification-count" aria-hidden="true"></span>';
    const account = readDemoAccount();
    rolePill.textContent = `Signed in as ${account?.displayName || account?.username || 'Administrator'}`;
    const signOut = document.createElement('button');
    signOut.type = 'button';
    signOut.className = 'cv-btn sign-out-button';
    signOut.textContent = 'Sign out';
    signOut.addEventListener('click', () => {
      sessionStorage.removeItem(loginSessionKey);
      sessionStorage.removeItem(chatMessagesKey);
      sessionStorage.removeItem(chatOpenKey);
      sessionStorage.removeItem(chatMessagesKey);
      sessionStorage.removeItem(chatOpenKey);
      location.replace('login.html');
    });
    actions.append(trigger, rolePill, signOut);
    topbar.append(actions);

    const updateCount = () => {
      const unreadCount = notifications.filter(notification => !readIds.has(notification.id)).length;
      const badge = trigger.querySelector('.notification-count');
      badge.textContent = unreadCount ? String(unreadCount) : '';
      badge.hidden = unreadCount === 0;
      trigger.setAttribute('aria-label', unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications');
    };

    const renderNotifications = container => {
      const groupsContainer = container.querySelector('.notification-groups');
      groupsContainer.replaceChildren();
      const groups = [
        { title: 'Unread', items: notifications.filter(notification => !readIds.has(notification.id)) },
        { title: 'Read', items: notifications.filter(notification => readIds.has(notification.id)) }
      ];

      groups.forEach(group => {
        const section = document.createElement('section');
        section.className = 'notification-group';
        const heading = document.createElement('h3');
        heading.textContent = `${group.title} (${group.items.length})`;
        section.append(heading);
        if (!group.items.length) {
          const empty = document.createElement('p');
          empty.className = 'notification-empty';
          empty.textContent = group.title === 'Unread' ? 'You’re all caught up.' : 'No read notifications yet.';
          section.append(empty);
        } else {
          const list = document.createElement('ul');
          list.className = 'notification-list';
          group.items.forEach(notification => {
            const item = document.createElement('li');
            item.className = `notification-item${group.title === 'Unread' ? ' unread' : ''}`;
            const meta = document.createElement('div');
            meta.className = 'notification-meta';
            const channel = document.createElement('span');
            channel.className = 'notification-channel';
            channel.textContent = notification.channel;
            const time = document.createElement('time');
            time.textContent = notification.time;
            meta.append(channel, time);
            const subject = document.createElement('h4');
            subject.textContent = notification.subject;
            const sender = document.createElement('p');
            sender.className = 'notification-sender';
            sender.textContent = notification.sender;
            const message = document.createElement('p');
            message.className = 'notification-message';
            message.textContent = notification.message;
            item.append(meta, subject, sender, message);
            list.append(item);
          });
          section.append(list);
        }
        groupsContainer.append(section);
      });
      container.querySelector('[data-mark-notifications-read]').disabled =
        !notifications.some(notification => !readIds.has(notification.id));
    };

    trigger.addEventListener('click', () => {
      const content = document.createElement('div');
      content.className = 'notification-content';
      const groups = document.createElement('div');
      groups.className = 'notification-groups';
      const actionsRow = document.createElement('div');
      actionsRow.className = 'cv-modal-actions';
      const markReadButton = document.createElement('button');
      markReadButton.className = 'cv-btn primary';
      markReadButton.type = 'button';
      markReadButton.dataset.markNotificationsRead = '';
      markReadButton.textContent = 'Mark as read';
      actionsRow.append(markReadButton);
      content.append(groups, actionsRow);
      renderNotifications(content);
      openModal('Notifications', content);
      markReadButton.addEventListener('click', () => {
        const previousReadIds = new Set(readIds);
        notifications.forEach(notification => readIds.add(notification.id));
        state.notificationsRead = Array.from(readIds);
        if (!save()) {
          readIds.clear();
          previousReadIds.forEach(id => readIds.add(id));
          state.notificationsRead = Array.from(previousReadIds);
          return;
        }
        updateCount();
        renderNotifications(content);
      });
    });

    updateCount();
  }

  function form(fields, submitLabel) {
    const wrapper = document.createElement('form');
    wrapper.className = 'cv-form';
    wrapper.innerHTML = fields + `<div class="cv-error" aria-live="polite"></div><div class="cv-modal-actions"><button class="cv-btn" type="button" data-cancel>Cancel</button><button class="cv-btn primary" type="submit">${submitLabel}</button></div>`;
    wrapper.querySelector('[data-cancel]').addEventListener('click', () => wrapper.closest('.cv-modal-backdrop').remove());
    return wrapper;
  }

  function openCollectionForm(kind, item = null) {
    const config = collectionConfigs[kind];
    const fields = config.fields.map(field => {
      const required = field.required ? ' required' : '';
      const min = field.min ? ` min="${field.min}"` : '';
      if (field.type === 'textarea') return `<label>${field.label}<textarea name="${field.name}"${required}></textarea></label>`;
      if (field.type === 'select') {
        const options = field.options.map(option => `<option>${option}</option>`).join('');
        return `<label>${field.label}<select name="${field.name}"${required}><option value="">Select</option>${options}</select></label>`;
      }
      return `<label>${field.label}<input name="${field.name}" type="${field.type || 'text'}"${required}${min}></label>`;
    }).join('');
    const content = form(`<div class="cv-form-grid">${fields}</div>`, item ? 'Save changes' : `Add ${config.singular}`);
    content.querySelectorAll('input[name="phone"], input[name="contact"]').forEach(input => {
      input.inputMode = 'numeric';
      input.maxLength = 11;
      input.minLength = 11;
      input.pattern = '09[0-9]{9}';
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(0, 11);
      });
    });
    if (kind === 'clients') {
      const identifier = document.createElement('p');
      identifier.className = 'record-id-display';
      const value = document.createElement('code');
      value.textContent = item?.userId || 'Generated when saved';
      identifier.append('User ID: ', value);
      content.prepend(identifier);
    }
    if (item) config.fields.forEach(field => {
      const control = content.elements.namedItem(field.name);
      if (control) control.value = item[field.name] || '';
    });
    openModal(`${item ? 'Edit' : 'Add'} ${config.singular}`, content, (data, close) => {
      const values = Object.fromEntries(config.fields.map(field => {
        const value = data.get(field.name);
        return [field.name, typeof value === 'string' ? value.trim() : value];
      }));
      for (const fieldName of ['phone', 'contact']) {
        if (values[fieldName]) {
          const normalizedPhone = validatePhilippinesPhone(values[fieldName]);
          if (!normalizedPhone) return content.querySelector('.cv-error').textContent = 'Enter an 11-digit Philippine mobile number starting with 09.';
          values[fieldName] = normalizedPhone;
        }
      }
      if (values.date) {
        const date = new Date(`${values.date}T00:00:00`);
        if (Number.isNaN(date.getTime())) return content.querySelector('.cv-error').textContent = 'Enter a valid date.';
      }
      if (kind === 'pets') {
        if (!/^REF-[A-Z0-9-]+$/i.test(values.qrCode)) return content.querySelector('.cv-error').textContent = 'QR identifier must start with REF-.';
        if (state.pets.some(entry => entry.qrCode && entry.qrCode.toLowerCase() === values.qrCode.toLowerCase() && entry.id !== item?.id)) {
          return content.querySelector('.cv-error').textContent = 'This QR identifier is already in use.';
        }
      }
      if (['inventory', 'medicines'].includes(kind) && Number(values.stock ?? values.quantity) < 0) {
        return content.querySelector('.cv-error').textContent = 'Quantity cannot be negative.';
      }
      const savedItem = { ...(item || {}), ...values, id: item ? item.id : newId(), createdAt: item?.createdAt || new Date().toISOString() };
      if (kind === 'clients') {
        savedItem.name = [savedItem.firstName, savedItem.lastName].filter(Boolean).join(' ');
      }
      ensureRecordIdentifier(kind, savedItem, item);
      if (kind === 'pets') {
        savedItem.speciesBreed = [savedItem.species, savedItem.breed].filter(Boolean).join(' · ');
      }
      if (config.onCreate) config.onCreate(savedItem, !item);
      if (item) {
        const index = state[config.key].findIndex(entry => entry.id === item.id);
        if (index < 0) return content.querySelector('.cv-error').textContent = 'This record no longer exists. Refresh the page and try again.';
        state[config.key][index] = savedItem;
      } else {
        state[config.key].push(savedItem);
      }
      save();
      renderCollection(kind);
      renderManagedTable(kind);
      if (kind === 'scheduleEvents') renderScheduleCalendar();
      close();
      toast(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} ${item ? 'updated' : 'added'} locally.`);
    });
  }

  function renderCollection(kind) {
    const config = collectionConfigs[kind];
    const container = document.querySelector(`[data-crud-manager="${kind}"]`);
    if (!container || !config) return;
    container.replaceChildren();

    const heading = document.createElement('div');
    heading.className = 'crud-heading';
    const title = document.createElement('h2');
    title.textContent = config.title;
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'btn';
    add.textContent = `+ ${config.addLabel || `Add ${config.singular}`}`;
    add.addEventListener('click', () => openCollectionForm(kind));
    heading.append(title, add);
    container.appendChild(heading);
    if (config.description) {
      const description = document.createElement('p');
      description.className = 'muted';
      description.textContent = config.description;
      container.appendChild(description);
    }

    const controls = recordTools(container, kind, () => renderCollection(kind));
    const query = normalizedSearchText(controls.search.value);
    let entries = sortedRecords(state[config.key], kind, controls.sortBy.value, controls.sortOrder.value);
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const heading = document.createElement('h2');
      heading.textContent = `No ${config.title.toLowerCase()} yet`;
      const message = document.createElement('p');
      message.textContent = `Add the first ${config.singular} to begin managing this section.`;
      empty.append(heading, message);
      container.appendChild(empty);
      return;
    }
    if (!query) {
      renderSearchPrompt(container, `${config.title} are hidden until you search`);
      return;
    }
    if (query.length < 2) {
      renderSearchPrompt(container, `Enter at least 2 characters to search ${config.title.toLowerCase()}`);
      return;
    }
    if (query && !entries.some(entry => recordMatchesQuery(entry, query))) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const heading = document.createElement('h2');
      heading.textContent = 'No matching records';
      const message = document.createElement('p');
      message.textContent = 'Try a different name, identifier, or value.';
      empty.append(heading, message);
      container.appendChild(empty);
      return;
    }
    entries = entries.filter(entry => recordMatchesQuery(entry, query));
    const pageSize = Number(state._pageSize?.[kind]) || 10;
    const page = paginationWindow(kind, entries.length, pageSize);
    entries = entries.slice(page.start, page.start + page.pageSize);

    const columns = [...(config.columns || config.fields.map(field => ({ name: field.name, label: field.label })))];
    if (config.publicIdPrefix) {
      const idField = config.publicIdField || 'publicId';
      if (!columns.some(column => column.name === idField)) {
        columns.unshift({ name: idField, label: config.idLabel || 'Record ID' });
      }
    }
    const wrap = document.createElement('div');
    wrap.className = 'crud-table-wrap';
    const table = document.createElement('table');
    table.className = 'crud-table';
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    columns.forEach(column => {
      const th = document.createElement('th');
      th.textContent = column.label;
      headRow.appendChild(th);
    });
    const actionsHeader = document.createElement('th');
    actionsHeader.textContent = 'Actions';
    headRow.appendChild(actionsHeader);
    head.appendChild(headRow);
    const body = document.createElement('tbody');
    entries.forEach(entry => {
      const row = document.createElement('tr');
      row.dataset.recordId = entry.id;
      columns.forEach(column => {
        const cell = document.createElement('td');
        const value = entry[column.name];
        cell.textContent = value === undefined || value === null || value === '' ? '—' : String(value);
        row.appendChild(cell);
      });
      const actions = document.createElement('td');
      actions.className = 'crud-actions';
      if (kind === 'aftercareMessages') {
        const review = document.createElement('button');
        review.type = 'button';
        review.className = 'cv-btn';
        review.textContent = 'Review';
        review.dataset.managedAction = 'review-message';
        review.addEventListener('click', () => {
          entry.status = 'Under review';
          save();
          renderCollection(kind);
          reviewModal('Aftercare message review', `Review message from ${entry.petOwner} and route clinical questions to a veterinarian.`, 'Save review');
        });
        actions.appendChild(review);
      }
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'cv-btn';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => openCollectionForm(kind, entry));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'cv-btn danger';
      remove.textContent = 'Delete';
      remove.addEventListener('click', async () => {
        if (!(await CVDialog.confirm('Delete ' + config.singular, `Delete this ${config.singular}? This cannot be undone.`, { danger: true, okLabel: 'Delete' }))) return;
        state[config.key] = state[config.key].filter(record => record.id !== entry.id);
        save();
        renderCollection(kind);
        if (kind === 'scheduleEvents') renderScheduleCalendar();
        toast(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} deleted locally.`);
      });
      actions.append(edit, remove);
      row.appendChild(actions);
      body.appendChild(row);
    });
    table.append(head, body);
    wrap.appendChild(table);
    container.appendChild(wrap);
    renderPagination(container, kind, sortedRecords(state[config.key], kind, controls.sortBy.value, controls.sortOrder.value)
      .filter(entry => recordMatchesQuery(entry, query)).length,
    () => renderCollection(kind), pageSize);
    const selectedRecordId = new URLSearchParams(location.search).get('record');
    if (selectedRecordId) {
      const selected = body.querySelector(`[data-record-id="${CSS.escape(selectedRecordId)}"]`);
      selected?.classList.add('record-search-match');
      selected?.scrollIntoView({ block: 'center' });
    }
  }

  function renderManagedTable(kind) {
    const config = collectionConfigs[kind];
    const table = document.querySelector(config.table);
    if (!table) return;
    const body = table.tBodies[0];
    if (!body) return;

    state._crudSeeded = state._crudSeeded || {};
    if (!state._crudSeeded[kind]) {
      if (!state[config.key].length) state[config.key] = Array.from(body.rows, config.readRow);
      state._crudSeeded[kind] = true;
      state[config.key] = state[config.key].map(item => ({ ...item, id: item.id || newId() }));
      state[config.key].forEach((item, index) => {
        if (!item.createdAt) item.createdAt = new Date(Date.now() - index).toISOString();
      });
      save();
    }
    state[config.key].forEach(item => ensureRecordIdentifier(kind, item));

    let tableWrap = table.closest('.crud-table-wrap');
    if (!tableWrap) {
      tableWrap = document.createElement('div');
      tableWrap.className = 'crud-table-wrap';
      table.parentElement.insertBefore(tableWrap, table);
      tableWrap.appendChild(table);
    }
    const tableManager = tableWrap.parentElement;
    tableWrap.hidden = true;

    const headingRow = table.tHead && table.tHead.rows[0];
    if (headingRow && config.publicIdPrefix && !Array.from(headingRow.cells).some(cell => cell.textContent === config.idLabel)) {
      const idHeading = document.createElement('th');
      idHeading.textContent = config.idLabel;
      headingRow.insertBefore(idHeading, headingRow.firstChild);
    }
    if (headingRow && !Array.from(headingRow.cells).some(cell => cell.textContent === 'Actions')) {
      const actionsHeading = document.createElement('th');
      actionsHeading.textContent = 'Actions';
      headingRow.appendChild(actionsHeading);
    }
    body.replaceChildren();
    tableManager.querySelector(':scope > .record-search-prompt')?.remove();
    tableManager.querySelector(':scope > .record-pagination')?.remove();
    const previousTools = tableManager.querySelector(`:scope > .record-tools[data-record-tools="${kind}"]`);
    previousTools?.remove();
    const existingSearch = kind === 'pets' ? document.querySelector('#search') : null;
    const controls = recordTools(tableManager, kind, () => renderManagedTable(kind), !existingSearch);
    controls.tools.dataset.recordTools = kind;
    if (existingSearch && !existingSearch.dataset.suggestionsWired) {
      const suggestions = wireDynamicSuggestions(existingSearch, () => {
        const values = [];
        (state[config.key] || []).forEach(entry => {
          Object.entries(entry).forEach(([key, value]) => {
            if (key !== 'id' && key !== 'createdAt' && typeof value === 'string' && value.trim()) values.push(value.trim());
          });
        });
        return values;
      }, 'pet-search-suggestions');
      existingSearch.parentElement.appendChild(suggestions.datalist);
      existingSearch.dataset.suggestionsWired = 'true';
    }
    if (existingSearch) {
      const requestedSearch = new URLSearchParams(location.search).get('search');
      if (requestedSearch && !existingSearch.value) existingSearch.value = requestedSearch;
    }
    tableManager.insertBefore(controls.tools, tableWrap);
    const query = normalizedSearchText((existingSearch || controls.search)?.value || '');
    const barangay = kind === 'pets' ? document.querySelector('#barangayFilter') : null;
    const selectedBarangay = (barangay?.value || '').trim().toLowerCase();
    const queueType = kind === 'appointments' ? document.querySelector('#tabs .tab.active')?.dataset.type || 'all' : 'all';
    const selectedStatus = kind === 'impounds' ? document.querySelector('#statusFilter')?.value || '' : '';
    const activeQuery = query.length >= 2 ? query : '';
    const hasFilter = Boolean(activeQuery || selectedBarangay || (queueType !== 'all') || selectedStatus);
    const allEntries = sortedRecords(state[config.key], kind, controls.sortBy.value, controls.sortOrder.value);
    const matchingEntries = allEntries.filter(entry => {
      if (activeQuery && !recordMatchesQuery(entry, activeQuery)) return false;
      if (selectedBarangay && !String(entry.barangay || '').toLowerCase().includes(selectedBarangay)) return false;
      if (queueType !== 'all' && entry.type !== queueType) return false;
      if (selectedStatus && (entry.status || '').toLowerCase() !== selectedStatus.toLowerCase()) return false;
      return true;
    });
    if (!hasFilter) {
      renderSearchPrompt(tableManager, query
        ? `Enter at least 2 characters to search ${config.title.toLowerCase()}`
        : `${config.title} are hidden until you search or filter`);
      return;
    }
    const pageSize = Number(state._pageSize?.[kind]) || 10;
    const page = paginationWindow(kind, matchingEntries.length, pageSize);
    const entries = matchingEntries.slice(page.start, page.start + page.pageSize);
    entries.forEach(entry => {
      const row = document.createElement('tr');
      row.dataset.recordId = entry.id;
      config.renderRow(entry, row);
      if (config.publicIdPrefix) {
        const identifier = document.createElement('td');
        const code = document.createElement('code');
        code.textContent = entry[config.publicIdField || 'publicId'];
        identifier.appendChild(code);
        row.insertBefore(identifier, row.firstChild);
      }
      const actions = row.insertCell();
      actions.className = 'crud-actions';
      if (kind === 'appointments') {
        const consultation = document.createElement('button');
        consultation.type = 'button';
        consultation.className = 'cv-btn';
        consultation.textContent = 'Record consultation';
        consultation.addEventListener('click', () => consultationModal(row));
        actions.appendChild(consultation);
      }
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'cv-btn';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => openCollectionForm(kind, entry));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'cv-btn danger';
      remove.textContent = 'Delete';
      remove.addEventListener('click', async () => {
        if (!(await CVDialog.confirm('Delete ' + config.singular, `Delete this ${config.singular}? This cannot be undone.`, { danger: true, okLabel: 'Delete' }))) return;
        state[config.key] = state[config.key].filter(record => record.id !== entry.id);
        save();
        renderManagedTable(kind);
        toast(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} deleted locally.`);
      });
      actions.append(edit, remove);
      body.appendChild(row);
    });
    if (!matchingEntries.length) {
      renderSearchPrompt(tableManager, 'No matching records');
      tableManager.querySelector('.record-search-prompt p').textContent = 'Try a different search value or clear the active filters.';
    } else {
      tableWrap.hidden = false;
      renderPagination(tableManager, kind, matchingEntries.length, () => renderManagedTable(kind), pageSize);
    }
    const selectedRecordId = new URLSearchParams(location.search).get('record');
    if (selectedRecordId) {
      const selected = body.querySelector(`[data-record-id="${CSS.escape(selectedRecordId)}"]`);
      selected?.classList.add('record-search-match');
      selected?.scrollIntoView({ block: 'center' });
    }
  }

  function renderCrudManagers() {
    ['pets', 'appointments', 'impounds'].forEach(renderManagedTable);
    seedPilotData();
    Object.keys(collectionConfigs).forEach(renderCollection);
    ['pets', 'appointments', 'impounds'].forEach(renderManagedTable);
  }

  function seedPilotData() {
    if (state._pilotDataSeeded) return;
    const firstNames = ['Alex', 'Avery', 'Bea', 'Carlo', 'Dani', 'Elena', 'Francis', 'Gia', 'Hana', 'Ivan', 'Jamie', 'Kai', 'Lara', 'Marco', 'Nina', 'Omar', 'Paolo', 'Quinn', 'Rosa', 'Sam'];
    const lastNames = ['Aguilar', 'Bautista', 'Castillo', 'Dela Cruz', 'Evangelista', 'Flores', 'Garcia', 'Hernandez', 'Ibarra', 'Jimenez', 'Lopez', 'Mendoza', 'Navarro', 'Ortega', 'Reyes', 'Santiago', 'Torres', 'Uy', 'Valdez', 'Yap'];
    const barangays = CV.BR;
    const pets = ['Bantay', 'Mochi', 'Buddy', 'Whiskers', 'Luna', 'Tom', 'Coco', 'Pepper', 'Nala', 'Puti', 'Brownie', 'Mingming'];
    const medicineNames = ['Amoxicillin', 'Cephalexin', 'Doxycycline', 'Metronidazole', 'Carprofen', 'Meloxicam', 'Cetirizine', 'Dewormer', 'Vitamin B Complex', 'Oral Rehydration Salts'];
    const targetCounts = {
      clients: 60, pets: 120, appointments: 90, impounds: 50,
      medicines: 50, inventory: 60, savedReports: 30,
      paravetRequests: 30, paravetScreenings: 30,
      aftercareMessages: 35, aftercareContent: 12,
      scheduleEvents: 0, removalRequests: 10, supportRequests: 10
    };
    const ensureCount = (kind, target, makeRecord) => {
      const records = state[collectionConfigs[kind].key];
      while (records.length < target) {
        const index = records.length;
        const record = makeRecord(index);
        record.id = newId();
        if (collectionConfigs[kind].onCreate) collectionConfigs[kind].onCreate(record, true);
        record.createdAt = new Date(Date.now() - (index + 1) * 86400000).toISOString();
        ensureRecordIdentifier(kind, record);
        records.push(record);
      }
    };

    ensureCount('clients', targetCounts.clients, index => {
      const firstName = firstNames[index % firstNames.length];
      const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
      const emailPrefix = `${firstName}.${lastName}.${String(index + 1).padStart(3, '0')}`.toLowerCase().replace(/[^a-z0-9.]/g, '');
      return {
        firstName, lastName, name: `${firstName} ${lastName}`,
        gender: ['Female', 'Male', 'Prefer not to say'][index % 3],
        address: `${10 + index} ${['Sampaguita', 'Rizal', 'Mabini', 'Kalayaan'][index % 4]} Street, ${barangays[index % barangays.length]}`,
        email: `${emailPrefix}@example.invalid`,
        phone: `09${String(100000000 + index).slice(-9)}`,
        notes: index % 5 === 0 ? 'Pilot sample client record.' : ''
      };
    });
    ensureCount('pets', targetCounts.pets, index => {
      const client = state.clients[index % state.clients.length];
      const name = pets[index % pets.length];
      const species = index % 2 ? 'Cat' : 'Dog';
      const breed = species === 'Cat' ? ['Puspin', 'Siamese mix', 'Domestic shorthair'][index % 3] : ['Aspin', 'Beagle mix', 'Shih Tzu mix'][index % 3];
      return {
        name: `${name}${index >= pets.length ? ` ${Math.floor(index / pets.length) + 1}` : ''}`,
        species, breed, speciesBreed: `${species} · ${breed}`,
        owner: `${client.lastName}, ${client.firstName[0]}.`,
        contact: client.phone, barangay: barangays[index % barangays.length],
        sterilization: index % 2 ? 'Not sterilized' : 'Sterilized',
        vaccination: index % 4 ? 'Up to date' : 'Due for review',
        qrCode: `REF-PILOT-${String(index + 301).padStart(5, '0')}`
      };
    });
    ensureCount('appointments', targetCounts.appointments, index => {
      const pet = state.pets[index % state.pets.length];
      const type = ['Emergency', 'Follow-up', 'Appointment', 'Walk-in'][index % 4];
      return {
        petOwner: `${pet.owner} — ${pet.name}`,
        reason: ['Vaccination', 'Skin consultation', 'Post-op check', 'General wellness'][index % 4],
        type, status: ['Waiting', 'In progress', 'Completed'][index % 3],
        assignedTo: index % 4 ? ['Dr. Santos', 'Dr. Villanueva'][index % 2] : '',
        scheduledAt: new Date(Date.now() + (index % 14) * 86400000).toISOString()
      };
    });
    ensureCount('impounds', targetCounts.impounds, index => {
      const species = index % 2 ? 'Cat' : 'Dog';
      return {
        description: `${['Brown', 'Black and white', 'Tan', 'Gray'][index % 4]} ${species.toLowerCase()}, ${['small', 'medium', 'large'][index % 3]}`,
        species, location: `Purok ${(index % 8) + 1}, ${barangays[index % barangays.length]}`,
        capturedAt: new Date(Date.now() - (index + 2) * 86400000).toISOString().slice(0, 10),
        barangay: barangays[index % barangays.length],
        vaccination: ['Unknown', 'Vaccinated', 'Unvaccinated'][index % 3],
        status: ['Impounded', 'Claimed', 'Unclaimed'][index % 3]
      };
    });
    ensureCount('medicines', targetCounts.medicines, index => ({
      name: `${medicineNames[index % medicineNames.length]} ${Math.floor(index / medicineNames.length) + 1}`,
      activeIngredient: medicineNames[index % medicineNames.length],
      strength: ['10 mg', '25 mg', '50 mg'][index % 3],
      form: ['Tablet', 'Capsule', 'Oral suspension'][index % 3],
      stock: String(15 + (index * 7) % 120), unit: ['tablets', 'capsules', 'bottles'][index % 3],
      expiryDate: new Date(Date.now() + (index + 90) * 86400000).toISOString().slice(0, 10),
      notes: index % 6 === 0 ? 'Pilot sample stock entry.' : ''
    }));
    ensureCount('inventory', targetCounts.inventory, index => ({
      item: `${['Exam gloves', 'Gauze pads', 'Syringes', 'Disinfectant', 'Suture kits'][index % 5]} ${Math.floor(index / 5) + 1}`,
      category: ['Medical supply', 'Clinic equipment', 'Cleaning supply'][index % 3],
      quantity: String(20 + (index * 11) % 100),
      unit: ['boxes', 'packs', 'pieces'][index % 3],
      location: `Storage ${String.fromCharCode(65 + index % 5)}-${(index % 8) + 1}`,
      reorderLevel: String(10 + (index % 10)),
      notes: index % 7 === 0 ? 'Sample inventory record.' : ''
    }));
    ensureCount('savedReports', targetCounts.savedReports, index => ({
      title: `${['Monthly pilot summary', 'Barangay activity report', 'Service utilization'][index % 3]} ${String(index + 1).padStart(2, '0')}`,
      period: `2026-${String((index % 12) + 1).padStart(2, '0')}`,
      barangay: barangays[index % barangays.length],
      notes: 'Generated pilot sample report.'
    }));
    ensureCount('paravetRequests', targetCounts.paravetRequests, index => ({
      visitDate: new Date(Date.now() + (index % 45) * 86400000).toISOString().slice(0, 10),
      requestedBy: `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`,
      letterRef: `BRGY-${String(2026)}-${String(index + 1).padStart(4, '0')}`,
      notes: 'Sample barangay visit request.'
    }));
    ensureCount('paravetScreenings', targetCounts.paravetScreenings, index => ({
      petOwner: `${state.clients[index % state.clients.length].lastName}, ${state.clients[index % state.clients.length].firstName}`,
      outcome: ['For screening', 'Qualified', 'Not qualified', 'Requires further assessment'][index % 4],
      notes: 'Sample pilot screening; verify details with staff.'
    }));
    ensureCount('aftercareMessages', targetCounts.aftercareMessages, index => ({
      petOwner: `${state.clients[index % state.clients.length].lastName} — ${state.pets[index % state.pets.length].name}`,
      message: `Sample aftercare follow-up message ${index + 1}.`,
      receivedAt: new Date(Date.now() - index * 3600000).toLocaleDateString(),
      status: ['Awaiting review', 'Under review', 'Resolved'][index % 3]
    }));
    ensureCount('aftercareContent', targetCounts.aftercareContent, index => ({
      title: `Approved aftercare guide ${String(index + 1).padStart(2, '0')}`,
      content: 'Follow the veterinarian-approved care instructions and contact clinic staff with concerns.',
      approvedBy: 'City Vet',
      reviewDate: new Date(Date.now() - index * 86400000).toISOString().slice(0, 10)
    }));
    ensureCount('scheduleEvents', targetCounts.scheduleEvents, index => ({
      date: new Date(Date.now() + (index % 60) * 86400000).toISOString().slice(0, 10),
      eventType: ['Paravet', 'Vaccination', 'Clinic / appointment', 'Follow-up'][index % 4],
      title: `Pilot ${['outreach visit', 'vaccination clinic', 'clinic appointments', 'follow-up consultations'][index % 4]} ${index + 1}`,
      notes: 'Sample schedule event.'
    }));
    ensureCount('removalRequests', targetCounts.removalRequests, index => ({
      category: 'Pet record removal request',
      target: `PET-SAMPLE-${String(index + 1).padStart(4, '0')}`,
      reason: 'Sample request pending authorized review.',
      requester: 'Pilot administrator',
      email: `admin${index + 1}@example.invalid`
    }));
    ensureCount('supportRequests', targetCounts.supportRequests, index => ({
      issueType: 'Data or record issue',
      priority: 'Normal',
      module: ['Pet records', 'Queue', 'Reports'][index % 3],
      summary: `Pilot sample support request ${index + 1}`,
      requester: 'Pilot administrator',
      email: `support${index + 1}@example.invalid`,
      environment: 'Prototype',
      description: 'Sample support request for pilot workflow testing.',
      steps: ''
    }));
    state._pilotDataSeeded = true;
    save();
  }

  function wireParavetCapacity() {
    const editor = document.querySelector('[data-paravet-capacity-editor]');
    const capacities = state.paravetCapacityByBarangay;
    const updateMuzonDisplays = () => {
      const capacity = capacities.Muzon;
      const remaining = capacity - 176;
      document.querySelectorAll('[data-paravet-capacity-summary]').forEach(node => { node.textContent = `176 / ${capacity}`; });
      document.querySelectorAll('[data-paravet-capacity-value]').forEach(node => { node.textContent = String(capacity); });
      document.querySelectorAll('[data-paravet-slots-remaining]').forEach(node => { node.textContent = String(remaining); });
      document.querySelectorAll('[data-muzon-capacity]').forEach(node => { node.textContent = String(capacity); });
      document.querySelectorAll('[data-paravet-capacity-detail]').forEach(node => { node.textContent = `176 / ${capacity} slots`; });
      document.querySelectorAll('[data-paravet-progress-text]').forEach(node => { node.textContent = `176 of ${capacity} slots used · ${remaining} slots remaining`; });
      document.querySelectorAll('[data-paravet-capacity-bar]').forEach(node => {
        node.style.width = `${Math.min(100, (176 / capacity) * 100)}%`;
      });
    };
    updateMuzonDisplays();
    if (!editor) return;
    const formNode = editor.querySelector('form');
    const barangay = formNode.elements.namedItem('barangay');
    const capacity = formNode.elements.namedItem('capacity');
    const feedback = editor.querySelector('[data-capacity-feedback]');
    const loadSelectedCapacity = () => {
      capacity.value = String(state.paravetCapacityByBarangay[barangay.value] || 200);
      capacity.min = barangay.value === 'Muzon' ? '176' : '1';
    };
    barangay.addEventListener('change', loadSelectedCapacity);
    loadSelectedCapacity();
    formNode.addEventListener('submit', event => {
      event.preventDefault();
      const value = Number(capacity.value);
      const minimum = barangay.value === 'Muzon' ? 176 : 1;
      if (!Number.isInteger(value) || value < minimum || value > 100000) {
        feedback.textContent = `Enter a whole-number capacity between ${minimum} and 100,000.`;
        return;
      }
      const previousCapacity = state.paravetCapacityByBarangay[barangay.value];
      state.paravetCapacityByBarangay[barangay.value] = value;
      if (!save()) {
        state.paravetCapacityByBarangay[barangay.value] = previousCapacity;
        return;
      }
      updateMuzonDisplays();
      feedback.textContent = `${barangay.value} capacity saved: ${value} slots.`;
    });
  }

  function petModal() {
    const content = form(`<div class="cv-form-grid">
      <label>Owner name<input name="owner" required maxlength="100"></label>
      <label>Contact number<input name="contact" required maxlength="30"></label>
      <label>Pet name<input name="name" required maxlength="80"></label>
      <label>Species<select name="species" required><option value="">Select species</option><option>Dog</option><option>Cat</option></select></label>
      <label>Sex<select name="sex" required><option value="">Select sex</option><option>Male</option><option>Female</option></select></label>
      <label>Barangay<select name="barangay" required><option value="">Select barangay</option><option>San Isidro</option><option>Muzon</option><option>San Rafael</option></select></label>
      <label>Breed<input name="breed" maxlength="80"></label>
      <label>QR identifier<input name="qrCode" required maxlength="40" placeholder="REF-NEW"></label>
    </div>`, 'Register pet');
    openModal('Register pet and owner', content, (data, close) => {
      if (!/^REF-[A-Z0-9-]+$/i.test(data.get('qrCode'))) return content.querySelector('.cv-error').textContent = 'QR identifier must start with REF-.';
      state.pets = state.pets || [];
      const pet = Object.fromEntries(data.entries());
      const phone = validatePhilippinesPhone(pet.contact);
      if (!phone) return content.querySelector('.cv-error').textContent = 'Enter an 11-digit Philippine mobile number starting with 09.';
      pet.contact = phone;
      pet.id = newId();
      pet.createdAt = new Date().toISOString();
      ensureRecordIdentifier('pets', pet);
      pet.sterilization = 'Not sterilized';
      pet.vaccination = 'Not recorded';
      pet.speciesBreed = `${pet.species} · ${pet.breed || 'Unknown breed'}`;
      state.pets.push(pet);
      save(); renderManagedTable('pets'); close(); toast('Pet record registered.');
    });
  }

  function appointmentModal() {
    const content = form(`<div class="cv-form-grid">
      <label>Pet / owner<input name="petOwner" required maxlength="120"></label>
      <label>Type<select name="type" required><option value="">Select type</option><option>Emergency</option><option>Follow-up</option><option>Appointment</option><option>Walk-in</option></select></label>
      <label>Reason<input name="reason" required maxlength="160"></label>
      <label>Scheduled time<input name="scheduledAt" type="datetime-local"></label>
    </div>`, 'Add to queue');
    openModal('Add appointment or walk-in', content, (data, close) => {
      const type = data.get('type');
      if (type === 'Walk-in' && !data.get('reason')) return content.querySelector('.cv-error').textContent = 'A reason is required.';
      const appointment = Object.fromEntries(data.entries());
      appointment.status = 'Waiting';
      appointment.assignedTo = '';
      appointment.id = newId();
      appointment.createdAt = new Date().toISOString();
      ensureRecordIdentifier('appointments', appointment);
      state.appointments = state.appointments || [];
      state.appointments.push(appointment);
      save(); renderManagedTable('appointments'); close(); toast('Queue entry added with priority rules applied.');
    });
  }

  function paravetModal() {
    const content = form(`<div class="cv-form-grid">
      <label>Paravet location<input value="Barangay Muzon" readonly></label>
      <label>Requested date<input name="visitDate" type="date" required></label>
      <label>Requesting official<input name="requestedBy" required maxlength="100"></label>
      <label>Request letter reference<input name="letterRef" required maxlength="100"></label>
    </div><label>Request notes<textarea name="notes" maxlength="500"></textarea></label><p class="muted">Each barangay has its own editable Paravet slot capacity.</p>`, 'Submit request');
    openModal('Request a Paravet visit in Barangay Muzon', content, (data, close) => {
      state.paravetRequests = state.paravetRequests || [];
      state.paravetRequests.push({ ...Object.fromEntries(data.entries()), barangay: 'Barangay Muzon', id: newId() });
      save(); renderCollection('paravetRequests'); close(); toast('Paravet visit request submitted for City Vet review.');
    });
  }

  function impoundModal() {
    const content = form(`<div class="cv-form-grid">
      <label>Animal description<input name="description" required maxlength="180"></label>
      <label>Animal type<select name="species" required><option value="">Select type</option><option>Dog</option><option>Cat</option></select></label>
      <label>Capture location<input name="location" required maxlength="180"></label>
      <label>Barangay<select name="barangay" required><option value="">Select barangay</option><option>San Isidro</option><option>Muzon</option><option>San Rafael</option></select></label>
      <label>Capture date<input name="capturedAt" type="date" required></label>
      <label>Vaccination status<select name="vaccination" required><option>Unknown</option><option>Vaccinated</option><option>Unvaccinated</option></select></label>
    </div><label>Photo<input name="photo" type="file" accept="image/*"></label><p class="muted">Prototype note: the selected file name is retained locally. Production images should use Supabase Storage.</p>`, 'Log animal');
    openModal('Log captured animal', content, (data, close) => {
      const impound = Object.fromEntries(data.entries());
      const file = data.get('photo');
      impound.photoName = file instanceof File && file.name ? file.name : '';
      delete impound.photo;
      impound.status = 'Impounded';
      impound.id = newId();
      impound.createdAt = new Date().toISOString();
      ensureRecordIdentifier('impounds', impound);
      state.impounds = state.impounds || [];
      state.impounds.push(impound);
      save(); renderManagedTable('impounds'); close(); toast('Animal logged; barangay notification task recorded locally.');
    });
  }

  function reviewModal(title, message, submitLabel) {
    const content = form(`<p>${message}</p><label>Staff note<textarea name="note" required maxlength="500"></textarea></label>`, submitLabel);
    openModal(title, content, (data, close) => { state.reviews = state.reviews || []; state.reviews.push({ title, note: data.get('note'), reviewedAt: new Date().toISOString() }); save(); close(); toast('Review saved for staff follow-up.'); });
  }

  function consultationModal(row) {
    const content = form(`<label>Consultation result<textarea name="result" required maxlength="1000"></textarea></label>
      <div class="cv-form-grid"><label><span><input name="xray" type="checkbox"> X-ray performed</span></label><label><span><input name="minorSurgery" type="checkbox"> Minor surgery performed</span></label></div>`, 'Save consultation');
    openModal('Record consultation', content, (data, close) => {
      const appointment = state.appointments.find(entry => entry.id === row.dataset.recordId);
      if (appointment) appointment.status = 'Completed';
      state.consultations = state.consultations || [];
      state.consultations.push({ ...Object.fromEntries(data.entries()), appointmentId: row.dataset.recordId, createdAt: new Date().toISOString() });
      save(); renderManagedTable('appointments'); close(); toast('Consultation recorded and queue entry marked served.');
    });
  }

  function claimModal() {
    const candidates = (state.impounds || []).filter(item => ['Impounded', 'Unclaimed'].includes(item.status));
    if (!candidates.length) return toast('There are no animals currently available for claim review.');
    const options = candidates.map(item => `<option value="${item.id}">${String(item.description || 'Unnamed animal').replace(/</g, '&lt;')} — ${String(item.location || 'Unknown location').replace(/</g, '&lt;')}</option>`).join('');
    const content = form(`<div class="cv-form-grid"><label>Animal to review<select name="impoundId" required><option value="">Select animal</option>${options}</select></label><label>Claimant name<input name="claimant" required maxlength="100"></label><label>Contact number<input name="contact" required maxlength="30"></label><label>Evidence reference<input name="evidence" required maxlength="120"></label><label>Fee status<select name="fee" required><option>Pending</option><option>Settled</option><option>Waived by authorized staff</option></select></label></div><label>Verification note<textarea name="note" required maxlength="500"></textarea></label>`, 'Save claim review');
    openModal('Verify owner claim', content, (data, close) => {
      const values = Object.fromEntries(data.entries());
      const animal = state.impounds.find(item => item.id === values.impoundId);
      if (!animal) return content.querySelector('.cv-error').textContent = 'Select a valid impounded animal.';
      const contact = validatePhilippinesPhone(values.contact);
      if (!contact) return content.querySelector('.cv-error').textContent = 'Enter an 11-digit Philippine mobile number starting with 09.';
      values.contact = contact;
      values.id = newId();
      values.reviewedAt = new Date().toISOString();
      values.createdAt = values.reviewedAt;
      state.claims = state.claims || [];
      state.claims.push(values);
      if (values.fee === 'Settled' || values.fee === 'Waived by authorized staff') {
        animal.status = 'Claimed';
        animal.claimedAt = values.reviewedAt;
        animal.claimant = values.claimant;
      }
      save(); renderManagedTable('impounds'); close(); toast(values.fee === 'Pending' ? 'Claim review saved; release remains pending.' : 'Claim verified and animal marked as claimed.');
    });
  }

  function screeningModal() {
    const content = form(`<div class="cv-form-grid"><label>Paravet location<input name="barangay" value="Barangay Muzon" readonly></label><label>Pet / owner<input name="petOwner" required maxlength="120"></label><label>Outcome<select name="outcome" required><option value="">Select outcome</option><option>For screening</option><option>Qualified</option><option>Not qualified</option><option>Requires further assessment</option></select></label></div><label>Screening reason or preparation notes<textarea name="notes" required maxlength="600"></textarea></label>`, 'Save screening');
    openModal('Record Paravet screening', content, (data, close) => {
      if (data.get('outcome') === 'Not qualified' && !data.get('notes').trim()) return content.querySelector('.cv-error').textContent = 'A reason is required for a terminal outcome.';
      state.paravetScreenings = state.paravetScreenings || [];
      state.paravetScreenings.push({ ...Object.fromEntries(data.entries()), id: newId(), barangay: 'Barangay Muzon' });
      save(); renderCollection('paravetScreenings'); close(); toast('Paravet screening outcome saved.');
    });
  }

  function addContactFooter() {
    const footer = document.querySelector('main footer') || document.querySelector('footer') || (() => {
      const node = document.createElement('footer');
      document.querySelector('main')?.appendChild(node);
      return node;
    })();
    if (footer.querySelector('.site-footer-contact')) return;

    const contact = document.createElement('section');
    contact.className = 'site-footer-contact';
    contact.setAttribute('aria-labelledby', 'site-footer-title');
    contact.innerHTML = `
      <div class="site-footer-heading">
        <h2 id="site-footer-title">City Veterinary Office</h2>
        <p>Sample contact details — replace with verified office information.</p>
      </div>
      <div class="site-footer-details">
        <p><strong>Address</strong><span>City Hall Compound, Poblacion, City of San Jose del Monte, Bulacan (sample)</span></p>
        <p><strong>Location</strong><span>San Jose del Monte, Bulacan, Philippines (sample)</span></p>
        <p><strong>Email</strong><a href="mailto:cityvet@example.invalid">cityvet@example.invalid</a></p>
        <p><strong>Phone</strong><a href="tel:+630000000000">+63 (000) 000-0000</a></p>
        <p><strong>Socials</strong><span>Facebook: @CityVetSJDM · Instagram: @cityvet.sjdm (sample)</span></p>
      </div>`;
    footer.prepend(contact);
  }

  function renderScheduleCalendar() {
    const calendar = document.querySelector('[data-schedule-calendar]');
    const monthLabel = document.querySelector('[data-calendar-month]');
    if (!calendar || !monthLabel) return;

    let displayedMonth = new Date();
    displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    function render() {
      monthLabel.textContent = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(displayedMonth);
      calendar.replaceChildren();

      weekdays.forEach(day => {
        const heading = document.createElement('div');
        heading.className = 'calendar-weekday';
        heading.setAttribute('role', 'columnheader');
        heading.textContent = day;
        calendar.appendChild(heading);
      });

      const firstWeekday = displayedMonth.getDay();
      const daysInMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 0).getDate();
      for (let index = 0; index < firstWeekday; index += 1) {
        const blank = document.createElement('div');
        blank.className = 'calendar-day empty';
        blank.setAttribute('role', 'gridcell');
        blank.setAttribute('aria-hidden', 'true');
        calendar.appendChild(blank);
      }

      for (let day = 1; day <= daysInMonth; day += 1) {
        const dateCell = document.createElement('div');
        const today = new Date();
        const isToday = day === today.getDate() && displayedMonth.getMonth() === today.getMonth() && displayedMonth.getFullYear() === today.getFullYear();
        dateCell.className = `calendar-day${isToday ? ' today' : ''}`;
        dateCell.setAttribute('role', 'gridcell');
        const dateLabel = document.createElement('span');
        dateLabel.className = 'calendar-day-number';
        dateLabel.textContent = String(day);
        dateCell.appendChild(dateLabel);

        const dateKey = `${displayedMonth.getFullYear()}-${String(displayedMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        state.scheduleEvents.filter(event => event.date === dateKey).forEach(event => {
          const item = document.createElement('span');
          item.className = `calendar-event ${event.type}`;
          item.textContent = event.title;
          if (event.notes) item.title = event.notes;
          dateCell.appendChild(item);
        });
        calendar.appendChild(dateCell);
      }
    }

    document.querySelector('[data-calendar-prev]')?.addEventListener('click', () => {
      displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1);
      render();
    });
    document.querySelector('[data-calendar-next]')?.addEventListener('click', () => {
      displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1);
      render();
    });
    render();
  }

  function applyPetFilters() {
    renderManagedTable('pets');
  }

  function applyQueueFilter() {
    renderManagedTable('appointments');
  }

  function applyImpoundFilter() {
    renderManagedTable('impounds');
  }

  function wireMobileNavigation() {
    const sidebar = document.querySelector('.sidebar');
    const toggle = document.querySelector('.sidebar-toggle');
    if (!sidebar || !toggle) return;
    toggle.addEventListener('click', () => {
      const open = sidebar.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nav-open', open);
    });
    sidebar.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => {
      sidebar.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
    }));
  }

  function wire() {
    const current = decodeURIComponent(location.pathname.split(/[\\/]/).pop());
    addContactFooter();
    renderScheduleCalendar();
    renderCrudManagers();
    wireMobileNavigation();
    wireParavetCapacity();
    wireAccountSettings();
    loadStaticRecordIndex();

    document.querySelectorAll('.sidebar nav a').forEach(link => {
      const target = link.getAttribute('href');
      link.classList.toggle('active', target === current || (current === 'records.html' && target === 'pet-records.html'));
    });

    const search = document.querySelector('#search');
    const barangayFilter = document.querySelector('#barangayFilter');
    if (search) {
      const requestedSearch = new URLSearchParams(location.search).get('search');
      if (requestedSearch) search.value = requestedSearch;
    }
    search?.addEventListener('input', () => {
      state._pagination = state._pagination || {};
      state._pagination.pets = 1;
      updateRecordSearchUrl(search.value.trim());
      applyPetFilters();
    });
    barangayFilter?.addEventListener('change', () => {
      state._pagination = state._pagination || {};
      state._pagination.pets = 1;
      applyPetFilters();
    });
    applyPetFilters();

    const tabs = document.querySelector('#tabs');
    tabs?.addEventListener('click', event => {
      const button = event.target.closest('.tab');
      if (!button) return;
      tabs.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      button.classList.add('active');
      state._pagination = state._pagination || {};
      state._pagination.appointments = 1;
      applyQueueFilter();
    });
    applyQueueFilter();

    const statusFilter = document.querySelector('#statusFilter');
    statusFilter?.addEventListener('change', () => {
      state._pagination = state._pagination || {};
      state._pagination.impounds = 1;
      applyImpoundFilter();
    });
    applyImpoundFilter();
    document.querySelectorAll('[data-clear-filter-controls]').forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll(button.dataset.clearFilterControls || '').forEach(control => {
        if (control instanceof HTMLSelectElement) control.selectedIndex = 0;
        else if (control instanceof HTMLInputElement) control.value = '';
      });
      const petSearch = document.querySelector('#search');
      if (petSearch) petSearch.value = '';
      const activeTab = document.querySelector('#tabs .tab[data-type="all"]');
      if (activeTab) {
        document.querySelectorAll('#tabs .tab').forEach(tab => tab.classList.toggle('active', tab === activeTab));
      }
      updateRecordSearchUrl('');
      state._pagination = state._pagination || {};
      Object.keys(collectionConfigs).forEach(kind => { state._pagination[kind] = 1; });
      document.querySelectorAll('[data-crud-manager]').forEach(container => {
        const kind = container.dataset.crudManager;
        if (kind) {
          state._recordSearch = state._recordSearch || {};
          state._recordSearch[kind] = '';
          renderCollection(kind);
        }
      });
      applyPetFilters();
      applyQueueFilter();
      applyImpoundFilter();
    }));

    document.querySelectorAll('button').forEach(button => {
      if (button.dataset.managedAction || button.classList.contains('sidebar-toggle') || button.classList.contains('tab') || button.dataset.calendarPrev !== undefined || button.dataset.calendarNext !== undefined) return;
      const text = button.textContent.trim().toLowerCase();
      if (text.includes('register pet')) button.addEventListener('click', petModal);
      else if (text.includes('log captured')) button.addEventListener('click', impoundModal);
      else if (text.includes('request paravet')) button.addEventListener('click', paravetModal);
      else if (text.includes('add to queue')) button.addEventListener('click', appointmentModal);
      else if (text === 'review') button.addEventListener('click', () => reviewModal('Aftercare review queue', 'Review the flagged message, record the concern, and route any clinical question to a veterinarian.', 'Save review'));
      else if (text.includes('export report')) button.addEventListener('click', () => {
        const pets = state.pets?.length || 0;
        const queueWaiting = (state.appointments || []).filter(item => ['Waiting', 'In progress'].includes(item.status)).length;
        const completed = (state.appointments || []).filter(item => item.status === 'Completed').length;
        const impounded = (state.impounds || []).filter(item => item.status === 'Impounded').length;
        const aftercare = (state.aftercareMessages || []).filter(item => item.status !== 'Resolved').length;
        const reportRecord = {};
        ensureRecordIdentifier('savedReports', reportRecord);
        const report = ['e-Kapon program report (sample data)', `Report ID: ${reportRecord.publicId}`, `Generated: ${new Date().toISOString()}`, ...Array.from(document.querySelectorAll('#report-table tbody tr:not([hidden])'), r => Array.from(r.cells, c => c.textContent.trim()).join(' | ')), ''].join('\n');
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'cityvet-program-report.txt';
        anchor.click();
        URL.revokeObjectURL(url);
        toast('Report exported from the current prototype dataset.');
      });
      else if (text.includes('review rule')) button.addEventListener('click', () => reviewModal('Paravet screening rule', 'Not Qualified is terminal for the current Paravet cycle. A disqualified pet cannot reapply until a later cycle.', 'Acknowledge'));
      else if (text.includes('process claim')) button.addEventListener('click', claimModal);
      else if (text.includes('record screening')) button.addEventListener('click', screeningModal);
    });

    document.querySelectorAll('a').forEach(link => {
      const text = link.textContent.trim().toLowerCase();
      if (text === 'review' || text.includes('review queue')) link.addEventListener('click', event => {
        event.preventDefault();
        const sighting = link.closest('.sighting');
        if (sighting) return reviewModal('Review sighting report', sighting.querySelector('.desc')?.textContent || 'Review this sighting report.', 'Save disposition');
        reviewModal('Aftercare review queue', 'Review the flagged message, record the concern, and route any clinical question to a veterinarian.', 'Save review');
      });
    });
    document.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => toast(b.dataset.demo)));
    document.documentElement.classList.remove('app-pending');
  }

  document.addEventListener('DOMContentLoaded', wire);
})();
