import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const expectIncludes = (content: string, needle: string, label: string) => {
  if (!content.includes(needle)) throw new Error(`${label}: missing ${needle}`);
};
const expectNotIncludes = (content: string, needle: string, label: string) => {
  if (content.includes(needle)) throw new Error(`${label}: found ${needle}`);
};

const billingCard = read('src/components/TrialCountdown.tsx');
const dashboard = read('src/pages/dashboard/school-admin/Dashboard.tsx');

expectNotIncludes(billingCard, 'Free Trial:', 'visible trial count');
expectNotIncludes(billingCard, 'daysRemaining', 'trial-day calculation in billing card');
expectNotIncludes(billingCard, 'progressPercent', 'trial progress bar');
expectNotIncludes(billingCard, 'Trial started:', 'trial start date in billing card');
expectNotIncludes(billingCard, 'Trial ends:', 'trial end date in billing card');
expectIncludes(billingCard, 'Subscription &amp; billing', 'replacement billing heading');
expectIncludes(billingCard, 'PaystackButton', 'paid subscription payment control');
expectIncludes(billingCard, 'annualPricePerLearner', 'annual pricing support');
expectIncludes(dashboard, '<TrialCountdown />', 'dashboard billing entry point');

console.log('Trial-count removal regression checks passed.');
