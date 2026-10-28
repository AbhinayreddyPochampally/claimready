// What each synthetic demo claim is designed to show. Used by the home page, desk queue and claim workspace.
export const STATIONS = [
  { key: 'policy', name: 'Policy rules' },
  { key: 'evidence', name: 'Evidence links' },
  { key: 'fix', name: 'Agent fixes' },
  { key: 'desk', name: 'Desk approval' },
  { key: 'insurer', name: 'Insurer re-check' }
];

export const DEMO = {
  'C-101': {
    issue: 'Clean claim (control)',
    detail: 'Nothing to fix. Shows that a complete file passes straight through.',
    marks: {},
    expect: 'Auto-approved', expectKind: 'ok', order: 6
  },
  'C-102': {
    issue: 'Pharmacy bill not itemised',
    detail: 'Clause C8.2 needs an itemised pharmacy bill. The agent fetches it and finds Rs 690 of non-payable items.',
    marks: { evidence: 'Missing itemised bill', fix: 'Fetches itemised bill' },
    expect: 'Auto-approved; patient told about Rs 690', expectKind: 'ok', order: 2
  },
  'C-103': {
    issue: 'Hospital code and a kit billed outside the package',
    detail: 'Clause C7.1. The agent maps the surgery code to the insurer package, then asks the desk before removing a Rs 6,200 consumables kit.',
    marks: { policy: 'Hospital code not in package list', fix: 'Maps code from closed list', desk: 'Desk approves removing Rs 6,200 kit' },
    expect: 'Auto-approved after desk approval', expectKind: 'ok', order: 1
  },
  'C-104': {
    issue: 'ICU note missing; senior citizen co-pay',
    detail: 'The day-3 ICU note is in hospital systems but not in the file. Age 67 triggers a 10% co-pay (C5.4).',
    marks: { policy: '10% co-pay (C5.4)', evidence: 'Day-3 ICU note missing', fix: 'Fetches ICU note', insurer: 'Above fast-lane cap' },
    expect: 'Clean, above Rs 75,000 cap: adjudicator', expectKind: 'hold', order: 4
  },
  'C-105': {
    issue: 'Deluxe room above the room-rent cap',
    detail: 'Rs 8,000 a day against a Rs 5,000 cap (C3.1). The agent computes the proportionate deduction and tells the desk before discharge.',
    marks: { policy: 'Room rent over cap (C3.1)', fix: 'Tells desk the deduction' },
    expect: 'Auto-approved; Rs 10,463 deduction disclosed', expectKind: 'ok', order: 5
  },
  'C-106': {
    issue: 'MRI with no record; reused lab report',
    detail: 'An Rs 9,500 MRI has no order or report, and a lab report matches another patient’s claim. The agent flags both and does not try to fix them.',
    marks: { evidence: 'MRI has no record; lab report reused', fix: 'Flags both; does not fix', insurer: 'Routed to adjudicator' },
    expect: 'Flagged to adjudicator', expectKind: 'flag', order: 3
  }
};
