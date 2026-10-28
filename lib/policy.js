// Synthetic retail health policy and insurer package master. Fictional insurer; structure follows
// IRDAI standard wordings (room-rent caps, proportionate deduction, waiting periods, non-payables).

export const POLICY = {
  id: 'SGI-ASP-2025',
  insurer: 'Sahyog General Insurance (fictional)',
  tpa: 'Sahyog TPA desk (simulated)',
  product: 'Arogya Shield Plus',
  sumInsured: 500000,
  clauses: {
    'C3.1': {
      title: 'Room rent limit',
      text: 'Room rent is payable up to 1% of the Sum Insured per day (Rs 5,000). If a higher room category is chosen, associated medical expenses are payable in the same proportion, except pharmacy, consumables, implants and diagnostics.'
    },
    'C3.2': { title: 'ICU limit', text: 'ICU charges are payable up to 2% of the Sum Insured per day (Rs 10,000).' },
    'C4.1': { title: 'Pre-existing disease waiting period', text: 'Pre-existing diseases are covered after 36 months of continuous coverage.' },
    'C4.2': { title: 'Specific waiting period', text: 'Hernia, cataract, gallstones and joint replacement are covered after 24 months of continuous coverage.' },
    'C5.4': { title: 'Co-payment', text: 'Insured persons aged 61 or above at admission bear 10% of every admissible claim.' },
    'C6.3': { title: 'Non-payable items', text: 'Items in the IRDAI list of non-medical expenses (for example gloves, admission kits, toiletries, attendant charges) are not payable.' },
    'C7.1': { title: 'Package billing', text: 'For network packages, the agreed package rate applies. Items included in the package (surgeon, OT, anaesthesia, routine surgical consumables, ward stay) may not be billed separately.' },
    'C8.2': { title: 'Documents for cashless claims', text: 'Discharge summary, itemised final bill, itemised pharmacy bill, reports supporting every billed investigation, ICU notes for each ICU day, and the pre-authorisation approval.' },
    'FL-1': { title: 'Fast-lane auto-approval (insurer rule)', text: 'Claims up to Rs 75,000 with all checks passed, every bill line linked to evidence and no flags are approved automatically. Others go to an adjudicator.' }
  }
};

export const FAST_LANE_CAP = 75000;

// Insurer package master: the closed list the code mapper may choose from.
export const PACKAGES = [
  { code: 'PKG-APPX-LAP', name: 'Laparoscopic appendectomy', rate: 45000, includes: ['surgeon', 'OT', 'anaesthesia', 'routine surgical consumables', 'ward stay up to 2 days'] },
  { code: 'PKG-CHOL-LAP', name: 'Laparoscopic cholecystectomy', rate: 55000, includes: ['surgeon', 'OT', 'anaesthesia', 'routine surgical consumables', 'ward stay up to 3 days'] },
  { code: 'PKG-HERN-LAP', name: 'Laparoscopic inguinal hernia repair', rate: 52000, includes: ['surgeon', 'OT', 'anaesthesia', 'mesh', 'routine surgical consumables', 'ward stay up to 2 days'] },
  { code: 'PKG-CAT-PHACO', name: 'Phacoemulsification with foldable IOL', rate: 40000, includes: ['surgeon', 'OT', 'lens', 'consumables'] }
];

// Hospital charge codes already mapped in the hospital master (what a mature desk would have).
export const HOSPITAL_CODE_MAP = {
  'PKG-APPX-LAP': 'PKG-APPX-LAP'
};

// Items from the IRDAI non-payable list that appear in our demo bills.
export const NON_PAYABLE_KEYWORDS = ['gloves', 'admission kit', 'toiletries', 'attendant'];
