// ===== 2026 TAX DATA =====

const FED_BRACKETS = {
  single: [
    [0, 12400, 0.10], [12400, 50400, 0.12], [50400, 105700, 0.22],
    [105700, 201775, 0.24], [201775, 256225, 0.32], [256225, 640600, 0.35],
    [640600, Infinity, 0.37]
  ],
  mfj: [
    [0, 24800, 0.10], [24800, 100800, 0.12], [100800, 211400, 0.22],
    [211400, 403550, 0.24], [403550, 512450, 0.32], [512450, 768700, 0.35],
    [768700, Infinity, 0.37]
  ],
  hoh: [
    [0, 17700, 0.10], [17700, 67450, 0.12], [67450, 105700, 0.22],
    [105700, 201775, 0.24], [201775, 256200, 0.32], [256200, 640600, 0.35],
    [640600, Infinity, 0.37]
  ]
};

const STD_DEDUCTION = { single: 16100, mfj: 32200, hoh: 24150 };

const SS_RATE = 0.062;
const SS_WAGE_BASE = 184500;
const MEDICARE_RATE = 0.0145;
const ADDL_MEDICARE_RATE = 0.009;
const ADDL_MEDICARE_THRESHOLD = { single: 200000, mfj: 250000, hoh: 200000 };

// State brackets: [min, max, rate]. Empty array = no income tax.
const STATE_BRACKETS = {
  TX: { type: 'none' },
  FL: { type: 'none' },
  NV: { type: 'none' },
  WA: { type: 'none' }, // wages not taxed; only capital gains
  CA: {
    type: 'bracket',
    stdDeduction: { single: 5540, mfj: 11080, hoh: 11080 },
    brackets: {
      single: [
        [0, 11079, 0.01], [11079, 26264, 0.02], [26264, 41452, 0.04],
        [41452, 57542, 0.06], [57542, 72724, 0.08], [72724, 371479, 0.093],
        [371479, 445771, 0.103], [445771, 742953, 0.113], [742953, Infinity, 0.123]
      ],
      mfj: [
        [0, 22158, 0.01], [22158, 52528, 0.02], [52528, 82904, 0.04],
        [82904, 115084, 0.06], [115084, 145448, 0.08], [145448, 742958, 0.093],
        [742958, 891542, 0.103], [891542, 1000000, 0.113], [1000000, Infinity, 0.123]
      ],
      hoh: [
        [0, 11079, 0.01], [11079, 26264, 0.02], [26264, 41452, 0.04],
        [41452, 57542, 0.06], [57542, 72724, 0.08], [72724, 371479, 0.093],
        [371479, 445771, 0.103], [445771, 742953, 0.113], [742953, Infinity, 0.123]
      ]
    }
  },
  NY: {
    type: 'bracket',
    stdDeduction: { single: 8000, mfj: 16050, hoh: 11200 },
    brackets: {
      single: [
        [0, 8500, 0.039], [8500, 11700, 0.044], [11700, 13900, 0.0515],
        [13900, 80650, 0.054], [80650, 215400, 0.059], [215400, 1077550, 0.0685],
        [1077550, 5000000, 0.0965], [5000000, 25000000, 0.103], [25000000, Infinity, 0.109]
      ],
      mfj: [
        [0, 17150, 0.039], [17150, 23600, 0.044], [23600, 27900, 0.0515],
        [27900, 161550, 0.054], [161550, 323200, 0.059], [323200, 2155350, 0.0685],
        [2155350, 5000000, 0.0965], [5000000, 25000000, 0.103], [25000000, Infinity, 0.109]
      ],
      hoh: [
        [0, 12800, 0.039], [12800, 17650, 0.044], [17650, 20900, 0.0515],
        [20900, 107650, 0.054], [107650, 269300, 0.059], [269300, 1616450, 0.0685],
        [1616450, 5000000, 0.0965], [5000000, 25000000, 0.103], [25000000, Infinity, 0.109]
      ]
    }
  }
};

// ===== HELPERS =====

function calcBracketTax(taxableIncome, brackets) {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  for (const [min, max, rate] of brackets) {
    if (taxableIncome > min) {
      tax += (Math.min(taxableIncome, max) - min) * rate;
    }
  }
  return tax;
}

function calcFederalTax(annualGross, filingStatus) {
  const taxable = Math.max(0, annualGross - STD_DEDUCTION[filingStatus]);
  return calcBracketTax(taxable, FED_BRACKETS[filingStatus]);
}

function calcStateTax(annualGross, filingStatus, stateCode) {
  const state = STATE_BRACKETS[stateCode];
  if (!state || state.type === 'none') return 0;
  if (state.type === 'bracket') {
    const ded = state.stdDeduction[filingStatus] || 0;
    const taxable = Math.max(0, annualGross - ded);
    return calcBracketTax(taxable, state.brackets[filingStatus]);
  }
  return 0;
}

function calcFICA(annualGross, filingStatus) {
  const ssTaxable = Math.min(annualGross, SS_WAGE_BASE);
  const ss = ssTaxable * SS_RATE;
  const medicare = annualGross * MEDICARE_RATE;
  const threshold = ADDL_MEDICARE_THRESHOLD[filingStatus] || 200000;
  const addlMedicare = Math.max(0, annualGross - threshold) * ADDL_MEDICARE_RATE;
  return { ss, medicare, addlMedicare };
}

const fmt = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ===== DOM =====

const payTypeBtns = document.querySelectorAll('#payTypeBtns .tip-btn');
const salaryField = document.getElementById('salaryField');
const hourlyField = document.getElementById('hourlyField');
const hoursField = document.getElementById('hoursField');
const salaryInput = document.getElementById('salaryInput');
const hourlyInput = document.getElementById('hourlyInput');
const hoursInput = document.getElementById('hoursInput');
const payFrequency = document.getElementById('payFrequency');
const filingStatus = document.getElementById('filingStatus');
const stateSelect = document.getElementById('stateSelect');
const otherStateNote = document.getElementById('otherStateNote');

let payType = 'salary';

payTypeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    payTypeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    payType = btn.dataset.val;
    salaryField.style.display = payType === 'salary' ? 'block' : 'none';
    hourlyField.style.display = payType === 'hourly' ? 'block' : 'none';
    hoursField.style.display = payType === 'hourly' ? 'block' : 'none';
    calc();
  });
});

function getAnnualGross() {
  if (payType === 'salary') {
    return parseFloat(salaryInput.value) || 0;
  } else {
    const hourly = parseFloat(hourlyInput.value) || 0;
    const hours = parseFloat(hoursInput.value) || 40;
    return hourly * hours * 52;
  }
}

function calc() {
  const annualGross = getAnnualGross();
  const fs = filingStatus.value;
  const state = stateSelect.value;
  const periods = parseFloat(payFrequency.value);

  otherStateNote.style.display = (state === 'other') ? 'block' : 'none';

  const fedTaxAnnual = calcFederalTax(annualGross, fs);
  const stateTaxAnnual = state === 'other' ? 0 : calcStateTax(annualGross, fs, state);
  const fica = calcFICA(annualGross, fs);

  const totalTaxAnnual = fedTaxAnnual + stateTaxAnnual + fica.ss + fica.medicare + fica.addlMedicare;
  const takeHomeAnnual = annualGross - totalTaxAnnual;

  document.getElementById('grossPerPeriod').textContent = fmt(annualGross / periods);
  document.getElementById('fedTax').textContent = fmt(fedTaxAnnual / periods);
  document.getElementById('stateTax').textContent = fmt(stateTaxAnnual / periods);
  document.getElementById('ssTax').textContent = fmt(fica.ss / periods);
  document.getElementById('medTax').textContent = fmt((fica.medicare + fica.addlMedicare) / periods);
  document.getElementById('takeHome').textContent = fmt(takeHomeAnnual / periods);
  document.getElementById('takeHomeAnnual').textContent = fmt(takeHomeAnnual);
}

[salaryInput, hourlyInput, hoursInput, payFrequency, filingStatus, stateSelect].forEach(el => {
  el.addEventListener('input', calc);
  el.addEventListener('change', calc);
});

document.getElementById('resetBtn').addEventListener('click', () => {
  salaryInput.value = '';
  hourlyInput.value = '';
  hoursInput.value = 40;
  payFrequency.value = '26';
  filingStatus.value = 'single';
  stateSelect.value = 'NY';
  payType = 'salary';
  payTypeBtns.forEach(b => b.classList.remove('active'));
  document.querySelector('[data-val="salary"]').classList.add('active');
  salaryField.style.display = 'block';
  hourlyField.style.display = 'none';
  hoursField.style.display = 'none';
  calc();
});

calc();
