import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMonthlyEmi,
  computeFairnessMetrics,
  computeRuleVersionDiff,
  evaluateApplication,
  validateApplicationForm,
  verifyAuditLogChain
} from './underwriting';
import {
  APPLICANT_PRESETS,
  buildInitialApplications,
  buildInitialAuditLogs,
  createDefaultConsents,
  createDocumentsForIncome,
  POLICY_VERSIONS
} from './seedData';

test('calculateMonthlyEmi computes standard mortgage EMI accurately', () => {
  // ₹45,00,000 at 8.75% for 240 months (~₹39,767)
  const emi = calculateMonthlyEmi(4500000, 8.75, 240);
  assert.ok(emi > 39500 && emi < 40000, `Expected EMI around 39767, got ${emi}`);
  assert.equal(calculateMonthlyEmi(0, 8.75, 240), 0);
});

test('validateApplicationForm catches invalid PAN, mobile, and income', () => {
  const validForm = APPLICANT_PRESETS[0].form;
  assert.deepEqual(validateApplicationForm(validForm), {});

  const invalidErrors = validateApplicationForm({
    ...validForm,
    applicantName: 'A',
    pan: 'INVALID123',
    mobile: '12345',
    netMonthlyIncome: 5000
  });
  assert.ok(invalidErrors.applicantName);
  assert.ok(invalidErrors.pan);
  assert.ok(invalidErrors.mobile);
  assert.ok(invalidErrors.netMonthlyIncome);
});

test('evaluateApplication produces APPROVED, REFERRED, and REJECTED for respective presets', () => {
  const policy = POLICY_VERSIONS[0];
  const consents = createDefaultConsents(true);

  // 1. Prime Approved
  const formApprove = APPLICANT_PRESETS[0].form;
  const docsApprove = createDocumentsForIncome(
    formApprove.netMonthlyIncome,
    formApprove.propertyValue,
    formApprove.pan,
    true
  );
  const resApprove = evaluateApplication(formApprove, policy, docsApprove, consents);
  assert.equal(resApprove.outcome, 'APPROVED');
  assert.ok(resApprove.finalScore >= 700);
  assert.equal(resApprove.fpcCompliant, true);

  // 2. Borderline Referred
  const formRefer = APPLICANT_PRESETS[1].form;
  const docsRefer = createDocumentsForIncome(
    formRefer.netMonthlyIncome,
    formRefer.propertyValue,
    formRefer.pan,
    true
  );
  const resRefer = evaluateApplication(formRefer, policy, docsRefer, consents);
  assert.equal(resRefer.outcome, 'REFERRED');
  assert.ok(resRefer.decisionNodes.some((n) => n.status === 'REFER'));

  // 3. Adverse Action Rejected
  const formReject = APPLICANT_PRESETS[2].form;
  const docsReject = createDocumentsForIncome(
    formReject.netMonthlyIncome,
    formReject.propertyValue,
    formReject.pan,
    true
  );
  const resReject = evaluateApplication(formReject, policy, docsReject, consents);
  assert.equal(resReject.outcome, 'REJECTED');
  assert.ok(resReject.reasonCodes.length >= 4);
  assert.equal(resReject.reasonCodes[0].direction, 'NEGATIVE');
});

test('unconfirmed OCR document triggers REFER in DATA_VERIFICATION node', () => {
  const policy = POLICY_VERSIONS[0];
  const formApprove = APPLICANT_PRESETS[0].form;
  const docsUnconfirmed = createDocumentsForIncome(
    formApprove.netMonthlyIncome,
    formApprove.propertyValue,
    formApprove.pan,
    false // unconfirmed OCR
  );
  const res = evaluateApplication(formApprove, policy, docsUnconfirmed, createDefaultConsents(true));
  assert.equal(res.outcome, 'REFERRED');
  const ocrNode = res.decisionNodes.find((n) => n.id === 'NODE_OCR_DOC');
  assert.equal(ocrNode?.status, 'REFER');
});

test('verifyAuditLogChain validates intact chain and detects tampering', () => {
  const apps = buildInitialApplications(POLICY_VERSIONS[0]);
  const logs = buildInitialAuditLogs(apps);

  const validCheck = verifyAuditLogChain(logs);
  assert.equal(validCheck.isValid, true);
  assert.equal(validCheck.tamperedIds.length, 0);

  // Tamper with a middle record's score without updating hashes
  const tamperedLogs = logs.map((item, idx) =>
    idx === 2 ? { ...item, score: item.score + 50 } : item
  );
  const tamperedCheck = verifyAuditLogChain(tamperedLogs);
  assert.equal(tamperedCheck.isValid, false);
  assert.ok(tamperedCheck.tamperedIds.includes(tamperedLogs[2].id));
});

test('computeFairnessMetrics and computeRuleVersionDiff return structured governance metrics', () => {
  const apps = buildInitialApplications(POLICY_VERSIONS[0]);
  const metrics = computeFairnessMetrics(apps);
  assert.equal(metrics.length, 8); // 3 Geography + 3 Loan Ticket + 2 Applicant Type
  assert.ok(metrics.every((m) => m.disparateImpactRatio >= 0 && m.disparateImpactRatio <= 1));

  const diffs = computeRuleVersionDiff(POLICY_VERSIONS[2], POLICY_VERSIONS[0]);
  assert.ok(diffs.some((d) => d.changed && d.fieldKey === 'maxFoirSalaried'));
});
