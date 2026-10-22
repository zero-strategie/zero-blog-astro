import { DIST_DIR } from './lib/dist.mjs';
import { checkWeight } from './lib/weight.mjs';

const KB = 1024;
const format = (bytes) => `${(bytes / KB).toFixed(1)} KB`;

function printReport({ pages, home }) {
	console.log('CSS par page (liée + inline), brut / gzip :');
	for (const page of pages) {
		console.log(`  ${page.path.padEnd(40)} ${format(page.cssBytes).padStart(9)} / ${format(page.cssGzipBytes).padStart(9)}`);
	}
	if (home) {
		console.log(`Accueil hors images : ${format(home.totalBytes)} brut / ${format(home.totalGzipBytes)} gzip`);
	}
}

const distDir = process.argv[2] ?? DIST_DIR;

try {
	const result = checkWeight(distDir);
	printReport(result);
	for (const { rule, detail } of result.violations) console.error(`ÉCHEC [${rule}] ${detail}`);
	if (result.violations.length > 0) process.exit(1);
	console.log('Budgets respectés.');
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
