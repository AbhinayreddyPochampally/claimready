// Six synthetic cashless claims at a 140-bed Tier-2 hospital. Each one carries a different problem
// from the Round 1 query mix (code mismatch, pharmacy not itemised, report missing) plus a clean claim,
// a room-rent deduction and a suspicious claim. All names and documents are fictional.

export const HOSPITAL = { name: 'Shree Sai Multispeciality Hospital (fictional)', city: 'Nashik', beds: 140 };

export const CLAIMS = [
  {
    id: 'C-101',
    patient: { name: 'Ravi Kumar', age: 34, gender: 'M' },
    policyStart: '2022-03-10',
    admission: '2026-10-24', discharge: '2026-10-26',
    diagnosis: 'Acute appendicitis', icd: 'K35.80', procedure: 'Laparoscopic appendectomy',
    room: { category: 'General ward', ratePerDay: 3500, days: 2 },
    preauthAmount: 50000,
    deskNote: 'Planned discharge 11:30 today',
    bill: [
      { id: 'L1', code: 'PKG-APPX-LAP', desc: 'Laparoscopic appendectomy package', category: 'package', amount: 44000, needs: ['OPERATIVE_NOTE'] },
      { id: 'L2', code: 'PHA-OP-221', desc: 'Pharmacy, post-operative medicines', category: 'pharmacy', amount: 2850, needs: ['PHARMACY_ITEMISED'] },
      { id: 'L3', code: 'RAD-USG-ABD', desc: 'USG abdomen', category: 'investigation', amount: 1900, needs: ['USG_ABDOMEN'] }
    ],
    documents: [
      { id: 'D1', type: 'PREAUTH', title: 'Pre-authorisation approval', supports: ['PREAUTH'], text: 'Pre-auth PA-55120 approved Rs 50,000 for laparoscopic appendectomy, package PKG-APPX-LAP. Valid 24-10-2026 to 30-10-2026.' },
      { id: 'D2', type: 'DISCHARGE_SUMMARY', title: 'Discharge summary', supports: ['DISCHARGE_SUMMARY', 'ROOM_DAYS', 'PROGRESS_NOTES'], text: 'Mr Ravi Kumar, 34 M. Admitted 24-10-2026 with right iliac fossa pain, fever. USG: inflamed appendix. Diagnosis: acute appendicitis (K35.80). Laparoscopic appendectomy on 24-10-2026, uneventful. General ward, 2 days. Discharged stable on 26-10-2026 on oral antibiotics.' },
      { id: 'D3', type: 'OPERATIVE_NOTE', title: 'Operative note', supports: ['OPERATIVE_NOTE'], text: 'Procedure: laparoscopic appendectomy. Surgeon: Dr A. Kulkarni. Findings: inflamed, non-perforated appendix. Duration 55 min. No complications.' },
      { id: 'D4', type: 'REPORT', title: 'USG abdomen report', supports: ['USG_ABDOMEN'], hash: 'u7c2e1', text: 'USG abdomen 24-10-2026: tubular non-compressible structure in RIF, 9 mm, suggestive of acute appendicitis.' },
      { id: 'D5', type: 'PHARMACY_BILL', title: 'Pharmacy bill (itemised)', supports: ['PHARMACY_ITEMISED'], text: 'Inj ceftriaxone 1g x4 Rs 960; Inj pantoprazole x4 Rs 420; Tab paracetamol x10 Rs 70; IV fluids RL x4 Rs 600; Inj ondansetron x4 Rs 300; Tab amox-clav x10 Rs 500. Total Rs 2,850.' },
      { id: 'D6', type: 'FINAL_BILL', title: 'Final bill', supports: ['FINAL_BILL'], text: 'Final bill FB-90311, total Rs 48,750.' }
    ],
    his: []
  },
  {
    id: 'C-102',
    patient: { name: 'Sunita Desai', age: 52, gender: 'F' },
    policyStart: '2019-07-01',
    admission: '2026-10-21', discharge: '2026-10-25',
    diagnosis: 'Dengue fever with thrombocytopenia', icd: 'A90', procedure: 'Medical management',
    room: { category: 'General ward', ratePerDay: 4000, days: 4 },
    preauthAmount: 45000,
    deskNote: 'Family waiting at billing counter',
    bill: [
      { id: 'L1', code: 'ROOM-GW', desc: 'General ward, 4 days', category: 'room', amount: 16000, needs: ['ROOM_DAYS'] },
      { id: 'L2', code: 'PRF-VISIT', desc: 'Physician visits x4', category: 'professional', amount: 3200, needs: ['PROGRESS_NOTES'] },
      { id: 'L3', code: 'LAB-NS1-PLT', desc: 'Dengue NS1 + serial platelet counts', category: 'investigation', amount: 4600, needs: ['DENGUE_NS1', 'PLATELET_SERIAL'] },
      { id: 'L4', code: 'PHA-IP-SUM', desc: 'Pharmacy charges (summary)', category: 'pharmacy', amount: 18450, needs: ['PHARMACY_ITEMISED'] }
    ],
    documents: [
      { id: 'D1', type: 'PREAUTH', title: 'Pre-authorisation approval', supports: ['PREAUTH'], text: 'Pre-auth PA-55087 approved Rs 45,000 for medical management of dengue fever.' },
      { id: 'D2', type: 'DISCHARGE_SUMMARY', title: 'Discharge summary', supports: ['DISCHARGE_SUMMARY', 'ROOM_DAYS', 'PROGRESS_NOTES'], text: 'Mrs Sunita Desai, 52 F. Fever 4 days, myalgia. NS1 positive. Platelets fell to 38,000 on day 2, recovered to 1,12,000. Managed with IV fluids and supportive care. General ward 4 days. Discharged 25-10-2026.' },
      { id: 'D3', type: 'REPORT', title: 'Dengue NS1 antigen report', supports: ['DENGUE_NS1'], hash: 'n5d8a2', text: 'Dengue NS1 antigen: POSITIVE (21-10-2026). Lab: hospital pathology.' },
      { id: 'D4', type: 'REPORT', title: 'Platelet trend chart', supports: ['PLATELET_SERIAL'], hash: 'p3b911', text: 'Platelets: 21-10 82,000; 22-10 38,000; 23-10 54,000; 24-10 86,000; 25-10 1,12,000.' },
      { id: 'D5', type: 'PHARMACY_SUMMARY', title: 'Pharmacy summary (not itemised)', supports: ['PHARMACY_SUMMARY'], text: 'Pharmacy charges for IP stay: Rs 18,450. Itemised statement available from pharmacy on request.' },
      { id: 'D6', type: 'FINAL_BILL', title: 'Final bill', supports: ['FINAL_BILL'], text: 'Final bill FB-90298, total Rs 42,250.' }
    ],
    his: [
      { id: 'H1', type: 'PHARMACY_BILL', title: 'Pharmacy bill (itemised) from pharmacy system', source: 'Hospital pharmacy system', supports: ['PHARMACY_ITEMISED'], text: 'IV fluids NS/RL x22 Rs 3,520; Inj paracetamol x12 Rs 1,440; Inj pantoprazole x8 Rs 840; Platelet-rich plasma unit x1 Rs 9,800; Tab paracetamol x20 Rs 140; ORS x10 Rs 220; IV sets and cannula Rs 1,800; Gloves 2 boxes Rs 240; Admission kit Rs 450. Total Rs 18,450.', nonPayable: [{ item: 'Gloves 2 boxes', amount: 240 }, { item: 'Admission kit', amount: 450 }] }
    ]
  },
  {
    id: 'C-103',
    patient: { name: 'Imran Shaikh', age: 45, gender: 'M' },
    policyStart: '2021-01-15',
    admission: '2026-10-23', discharge: '2026-10-25',
    diagnosis: 'Symptomatic cholelithiasis', icd: 'K80.20', procedure: 'Laparoscopic cholecystectomy',
    room: { category: 'General ward', ratePerDay: 3500, days: 2 },
    preauthAmount: 60000,
    deskNote: 'Bill raised with hospital surgery code',
    bill: [
      { id: 'L1', code: 'SURG-LAPCHOL-02', desc: 'Lap cholecystectomy (hospital surgery code)', category: 'package', amount: 53000, needs: ['OPERATIVE_NOTE'] },
      { id: 'L2', code: 'CONS-SURGKIT-07', desc: 'Surgical consumables kit', category: 'consumable', amount: 6200, needs: ['OPERATIVE_NOTE'] },
      { id: 'L3', code: 'PHA-OP-198', desc: 'Pharmacy, post-operative medicines', category: 'pharmacy', amount: 3100, needs: ['PHARMACY_ITEMISED'] },
      { id: 'L4', code: 'RAD-USG-ABD', desc: 'USG abdomen', category: 'investigation', amount: 1900, needs: ['USG_ABDOMEN'] }
    ],
    documents: [
      { id: 'D1', type: 'PREAUTH', title: 'Pre-authorisation approval', supports: ['PREAUTH'], text: 'Pre-auth PA-55102 approved Rs 60,000 for laparoscopic cholecystectomy, network package PKG-CHOL-LAP.' },
      { id: 'D2', type: 'DISCHARGE_SUMMARY', title: 'Discharge summary', supports: ['DISCHARGE_SUMMARY', 'ROOM_DAYS', 'PROGRESS_NOTES'], text: 'Mr Imran Shaikh, 45 M. Recurrent biliary colic. USG: multiple gallstones. Laparoscopic cholecystectomy 23-10-2026. Uneventful recovery. General ward 2 days.' },
      { id: 'D3', type: 'OPERATIVE_NOTE', title: 'Operative note', supports: ['OPERATIVE_NOTE'], text: 'Laparoscopic cholecystectomy, 4 ports. Standard surgical kit used. Surgeon Dr P. Joshi. No drain.' },
      { id: 'D4', type: 'REPORT', title: 'USG abdomen report', supports: ['USG_ABDOMEN'], hash: 'u91c04', text: 'Multiple calculi in gall bladder, largest 12 mm. CBD normal.' },
      { id: 'D5', type: 'PHARMACY_BILL', title: 'Pharmacy bill (itemised)', supports: ['PHARMACY_ITEMISED'], text: 'Inj cefuroxime x4 Rs 1,120; Inj tramadol x4 Rs 360; Inj pantoprazole x4 Rs 420; IV fluids x6 Rs 900; Tab paracetamol x10 Rs 70; Tab ursodiol x10 Rs 230. Total Rs 3,100.' },
      { id: 'D6', type: 'FINAL_BILL', title: 'Final bill', supports: ['FINAL_BILL'], text: 'Final bill FB-90305, total Rs 64,200.' }
    ],
    his: []
  },
  {
    id: 'C-104',
    patient: { name: 'Meena Iyer', age: 67, gender: 'F' },
    policyStart: '2017-11-02',
    admission: '2026-10-20', discharge: '2026-10-25',
    diagnosis: 'Community-acquired pneumonia', icd: 'J18.9', procedure: 'Medical management, ICU',
    room: { category: 'General ward', ratePerDay: 4500, days: 2 },
    icu: { ratePerDay: 9000, days: 3 },
    preauthAmount: 90000,
    deskNote: 'ICU stay, senior citizen',
    bill: [
      { id: 'L1', code: 'ICU-MED', desc: 'Medical ICU, 3 days', category: 'icu', amount: 27000, needs: ['ICU_NOTES_DAY_1', 'ICU_NOTES_DAY_2', 'ICU_NOTES_DAY_3'] },
      { id: 'L2', code: 'ROOM-GW', desc: 'General ward, 2 days', category: 'room', amount: 9000, needs: ['ROOM_DAYS'] },
      { id: 'L3', code: 'RAD-CT-CHEST', desc: 'CT chest', category: 'investigation', amount: 6500, needs: ['CT_CHEST'] },
      { id: 'L4', code: 'LAB-ABG-CBC', desc: 'ABG, CBC, cultures', category: 'investigation', amount: 4300, needs: ['LAB_PANEL'] },
      { id: 'L5', code: 'PHA-IP-221', desc: 'Pharmacy (itemised)', category: 'pharmacy', amount: 38600, needs: ['PHARMACY_ITEMISED'] },
      { id: 'L6', code: 'PRF-VISIT', desc: 'Physician and intensivist visits', category: 'professional', amount: 7500, needs: ['PROGRESS_NOTES'] }
    ],
    documents: [
      { id: 'D1', type: 'PREAUTH', title: 'Pre-authorisation approval', supports: ['PREAUTH'], text: 'Pre-auth PA-55061 approved Rs 90,000 for pneumonia with ICU care. Enhancement allowed on request.' },
      { id: 'D2', type: 'DISCHARGE_SUMMARY', title: 'Discharge summary', supports: ['DISCHARGE_SUMMARY', 'ROOM_DAYS', 'PROGRESS_NOTES'], text: 'Mrs Meena Iyer, 67 F. Fever, breathlessness, SpO2 86%. CT chest: right lower lobe consolidation. ICU 20-22 Oct on NIV, shifted to ward 23 Oct. Discharged 25-10-2026 on oral antibiotics.' },
      { id: 'D3', type: 'ICU_NOTES', title: 'ICU notes, day 1', supports: ['ICU_NOTES_DAY_1'], text: '20-10: NIV started, IV antibiotics, SpO2 90% on NIV.' },
      { id: 'D4', type: 'ICU_NOTES', title: 'ICU notes, day 2', supports: ['ICU_NOTES_DAY_2'], text: '21-10: improving, NIV weaned to intermittent.' },
      { id: 'D5', type: 'REPORT', title: 'CT chest report', supports: ['CT_CHEST'], hash: 'c22e7f', text: 'Consolidation right lower lobe with air bronchogram. No effusion.' },
      { id: 'D6', type: 'REPORT', title: 'Lab panel (ABG, CBC, cultures)', supports: ['LAB_PANEL'], hash: 'l84b30', text: 'ABG on admission: pH 7.36, pO2 58. TLC 16,200. Sputum culture: Streptococcus pneumoniae.' },
      { id: 'D7', type: 'PHARMACY_BILL', title: 'Pharmacy bill (itemised)', supports: ['PHARMACY_ITEMISED'], text: 'Inj piperacillin-tazobactam x15 Rs 22,500; Inj azithromycin x5 Rs 2,100; nebulisation Rs 3,400; IV fluids Rs 2,600; NIV consumables Rs 6,200; others Rs 1,800. Total Rs 38,600.' },
      { id: 'D8', type: 'FINAL_BILL', title: 'Final bill', supports: ['FINAL_BILL'], text: 'Final bill FB-90280, total Rs 92,900.' }
    ],
    his: [
      { id: 'H1', type: 'ICU_NOTES', title: 'ICU notes, day 3 (from Dr S. Rao, intensivist)', source: 'Dr S. Rao via ICU nursing station', supports: ['ICU_NOTES_DAY_3'], text: '22-10: off NIV since morning, SpO2 95% on 2 L oxygen. Plan: shift to ward tomorrow.' }
    ]
  },
  {
    id: 'C-105',
    patient: { name: 'Arjun Mehta', age: 41, gender: 'M' },
    policyStart: '2020-05-20',
    admission: '2026-10-22', discharge: '2026-10-25',
    diagnosis: 'Acute gastroenteritis with dehydration', icd: 'A09', procedure: 'Medical management',
    room: { category: 'Deluxe single room', ratePerDay: 8000, days: 3 },
    preauthAmount: 40000,
    deskNote: 'Patient upgraded to deluxe room on request',
    bill: [
      { id: 'L1', code: 'ROOM-DLX', desc: 'Deluxe single room, 3 days', category: 'room', amount: 24000, needs: ['ROOM_DAYS'] },
      { id: 'L2', code: 'PRF-VISIT', desc: 'Physician visits x3', category: 'professional', amount: 2400, needs: ['PROGRESS_NOTES'] },
      { id: 'L3', code: 'NUR-CHG', desc: 'Nursing charges', category: 'professional', amount: 1500, needs: ['ROOM_DAYS'] },
      { id: 'L4', code: 'LAB-STOOL-CBC', desc: 'Stool routine, CBC, electrolytes', category: 'investigation', amount: 2800, needs: ['LAB_PANEL'] },
      { id: 'L5', code: 'PHA-IP-305', desc: 'Pharmacy (itemised)', category: 'pharmacy', amount: 7900, needs: ['PHARMACY_ITEMISED'] }
    ],
    documents: [
      { id: 'D1', type: 'PREAUTH', title: 'Pre-authorisation approval', supports: ['PREAUTH'], text: 'Pre-auth PA-55094 approved Rs 40,000. Note: eligible room rent Rs 5,000 per day.' },
      { id: 'D2', type: 'DISCHARGE_SUMMARY', title: 'Discharge summary', supports: ['DISCHARGE_SUMMARY', 'ROOM_DAYS', 'PROGRESS_NOTES'], text: 'Mr Arjun Mehta, 41 M. Vomiting and loose stools, moderate dehydration. IV fluids, antiemetics. Deluxe room 3 days at patient request. Discharged 25-10-2026.' },
      { id: 'D3', type: 'REPORT', title: 'Lab panel', supports: ['LAB_PANEL'], hash: 'l19d52', text: 'Stool: pus cells 8-10/hpf. Na 132, K 3.3. TLC 11,400.' },
      { id: 'D4', type: 'PHARMACY_BILL', title: 'Pharmacy bill (itemised)', supports: ['PHARMACY_ITEMISED'], text: 'IV fluids x10 Rs 1,500; Inj ondansetron x6 Rs 450; Inj ciprofloxacin x6 Rs 1,350; Inj pantoprazole x6 Rs 630; KCl supplements Rs 320; ORS Rs 250; IV sets Rs 3,400. Total Rs 7,900.' },
      { id: 'D5', type: 'FINAL_BILL', title: 'Final bill', supports: ['FINAL_BILL'], text: 'Final bill FB-90301, total Rs 38,600.' }
    ],
    his: []
  },
  {
    id: 'C-106',
    patient: { name: 'Kiran Patil', age: 29, gender: 'M' },
    policyStart: '2025-12-01',
    admission: '2026-10-22', discharge: '2026-10-25',
    diagnosis: 'Viral fever', icd: 'B34.9', procedure: 'Medical management',
    room: { category: 'General ward', ratePerDay: 3000, days: 3 },
    preauthAmount: 30000,
    deskNote: 'Bill finalised late last night',
    bill: [
      { id: 'L1', code: 'ROOM-GW', desc: 'General ward, 3 days', category: 'room', amount: 9000, needs: ['ROOM_DAYS'] },
      { id: 'L2', code: 'PRF-VISIT', desc: 'Physician visits x3', category: 'professional', amount: 2400, needs: ['PROGRESS_NOTES'] },
      { id: 'L3', code: 'LAB-FEVER-PNL', desc: 'Fever panel: CBC, malaria, dengue NS1', category: 'investigation', amount: 2100, needs: ['DENGUE_NS1'] },
      { id: 'L4', code: 'RAD-MRI-BRAIN', desc: 'MRI brain (plain)', category: 'investigation', amount: 9500, needs: ['MRI_BRAIN'] },
      { id: 'L5', code: 'PHA-IP-412', desc: 'Pharmacy (itemised)', category: 'pharmacy', amount: 5200, needs: ['PHARMACY_ITEMISED'] }
    ],
    documents: [
      { id: 'D1', type: 'PREAUTH', title: 'Pre-authorisation approval', supports: ['PREAUTH'], text: 'Pre-auth PA-55099 approved Rs 30,000 for viral fever, medical management.' },
      { id: 'D2', type: 'DISCHARGE_SUMMARY', title: 'Discharge summary', supports: ['DISCHARGE_SUMMARY', 'ROOM_DAYS', 'PROGRESS_NOTES'], text: 'Mr Kiran Patil, 29 M. Fever 3 days with body ache. No neurological complaints, no headache, conscious and oriented throughout. Treated symptomatically. Discharged 25-10-2026.' },
      { id: 'D3', type: 'REPORT', title: 'Dengue NS1 antigen report', supports: ['DENGUE_NS1'], hash: 'x4f7e9', text: 'Dengue NS1 antigen: NEGATIVE. Malaria antigen: negative. CBC: TLC 6,800, platelets 1,90,000.' },
      { id: 'D4', type: 'PHARMACY_BILL', title: 'Pharmacy bill (itemised)', supports: ['PHARMACY_ITEMISED'], text: 'IV fluids x6 Rs 900; Inj paracetamol x6 Rs 720; Tab paracetamol x15 Rs 105; multivitamin IV x3 Rs 1,275; IV sets Rs 2,200. Total Rs 5,200.' },
      { id: 'D5', type: 'FINAL_BILL', title: 'Final bill', supports: ['FINAL_BILL'], text: 'Final bill FB-90319, total Rs 28,200.' }
    ],
    his: []
  }
];

// Prior-claims document index used by the duplicate-document check (fingerprints of report images).
export const PRIOR_DOC_INDEX = [
  { hash: 'x4f7e9', claimRef: 'CLM-2026-08812', patient: 'R. Shinde', hospital: 'Sai Krupa Nursing Home, Nashik', docType: 'Dengue NS1 report', date: '2026-09-14' },
  { hash: 'q11a07', claimRef: 'CLM-2026-07730', patient: 'A. Pawar', hospital: 'City Care Hospital, Pune', docType: 'X-ray chest', date: '2026-08-02' }
];

export function getClaim(id) {
  return CLAIMS.find(c => c.id === id) || null;
}

// What the desk sees before the agent runs: everything except the hidden HIS store.
export function publicClaim(c) {
  const { his, ...rest } = c;
  return rest;
}

export function billTotal(bill) {
  return bill.reduce((s, l) => s + l.amount, 0);
}
