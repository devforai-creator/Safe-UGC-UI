import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, statSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const publishablePackages = [
  'packages/types',
  'packages/schema',
  'packages/validator',
  'packages/react',
];

function stripLeadingDotSlash(value) {
  return value.replace(/^\.\//, '');
}

function collectExportTargets(value, targets) {
  if (typeof value === 'string') {
    targets.add(stripLeadingDotSlash(value));
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectExportTargets(item, targets);
    }
    return;
  }

  if (value && typeof value === 'object') {
    for (const nestedValue of Object.values(value)) {
      collectExportTargets(nestedValue, targets);
    }
  }
}

function listTarEntries(tarballPath) {
  const output = execFileSync('tar', ['-tf', tarballPath], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function findTarball(packDir) {
  const tarballs = readdirSync(packDir).filter((entry) => entry.endsWith('.tgz'));
  if (tarballs.length !== 1) {
    throw new Error(`Expected exactly one tarball in ${packDir}, found ${tarballs.length}.`);
  }

  return path.join(packDir, tarballs[0]);
}

function verifyPackageTarball(packageDir, tempRoot) {
  const manifestPath = path.join(repoRoot, packageDir, 'package.json');
  const packageRoot = path.join(repoRoot, packageDir);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const packDir = mkdtempSync(
    path.join(tempRoot, `${manifest.name.replaceAll('/', '-').replaceAll('@', '')}-`),
  );

  execFileSync('pnpm', ['pack', '--pack-destination', packDir], {
    cwd: packageRoot,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  const tarballPath = findTarball(packDir);
  const tarEntries = listTarEntries(tarballPath);
  const entrySet = new Set(tarEntries);
  const missing = [];

  if (!entrySet.has('package/package.json')) {
    missing.push('package/package.json');
  }

  const expectedFiles = new Set();

  if (typeof manifest.main === 'string') {
    expectedFiles.add(stripLeadingDotSlash(manifest.main));
  }

  if (typeof manifest.types === 'string') {
    expectedFiles.add(stripLeadingDotSlash(manifest.types));
  }

  collectExportTargets(manifest.exports, expectedFiles);

  for (const target of expectedFiles) {
    const tarPath = `package/${target}`;
    if (!entrySet.has(tarPath)) {
      missing.push(tarPath);
    }
  }

  if (Array.isArray(manifest.files)) {
    for (const fileEntry of manifest.files) {
      const normalized = stripLeadingDotSlash(fileEntry).replace(/\/$/, '');
      const tarPrefix = `package/${normalized}`;
      const hasMatch = tarEntries.some(
        (entry) => entry === tarPrefix || entry.startsWith(`${tarPrefix}/`),
      );

      if (!hasMatch) {
        missing.push(`${tarPrefix}/**`);
      }
    }
  }

  const tarballStats = statSync(tarballPath);

  return {
    name: manifest.name,
    tarballPath,
    tarballSizeBytes: tarballStats.size,
    expectedFileCount: expectedFiles.size,
    missing,
  };
}

function main() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'safe-ugc-ui-pack-check-'));

  try {
    const results = publishablePackages.map((packageDir) =>
      verifyPackageTarball(packageDir, tempRoot),
    );
    const failures = results.filter((result) => result.missing.length > 0);

    for (const result of results) {
      console.log(
        `verified ${result.name}: ${path.basename(result.tarballPath)} (${result.tarballSizeBytes} bytes, ${result.expectedFileCount} export targets checked)`,
      );
    }

    if (failures.length > 0) {
      for (const failure of failures) {
        console.error(`missing expected tarball entries for ${failure.name}:`);
        for (const missingEntry of failure.missing) {
          console.error(`  - ${missingEntry}`);
        }
      }

      process.exitCode = 1;
      return;
    }

    console.log('release pack check passed');
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

main();
