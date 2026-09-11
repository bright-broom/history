import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { FileSystemHistoryRepository } from '../../src/infrastructure/repositories/history-repository';
import { isValidYear, isValidMonth } from '../../src/domain/validation/validators';

/** Audit the disk inventory, including files that the display repository intentionally ignores. */
export async function validateHistoryData(root: string) {
  const repository = new FileSystemHistoryRepository(root);
  const errors: Error[] = [];
  const years = new Set<number>();
  let files = 0;
  let events = 0;

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const name = relative(root, path).replaceAll('\\', '/');
      if (entry.isSymbolicLink()) {
        errors.push(new Error(`${name}: symbolic links are not supported in history data`));
        continue;
      }
      if (entry.isDirectory()) {
        await visit(path);
        continue;
      }
      if (!/\.ya?ml$/i.test(entry.name)) continue;
      files++;
      const match = /^(\d{4})\/(\d{4})(?:-(\d{2}))?\.yaml$/.exec(name);
      const year = Number(match?.[1]);
      const month = match?.[3] === undefined ? undefined : Number(match[3]);
      if (!match || match[1] !== match[2] || !isValidYear(year) ||
          (month !== undefined && !isValidMonth(month))) {
        errors.push(new Error(`${name}: expected {year}/{year}.yaml or {year}/{year}-{month:02}.yaml within the supported range`));
        continue;
      }
      try {
        if (month === undefined) {
          if (!await repository.getYearData(year)) throw new Error('File disappeared during validation');
        } else if (isValidMonth(month)) {
          const data = await repository.getMonthData(year, month);
          if (!data) throw new Error('File disappeared during validation');
          events += data.events.length;
        }
        years.add(year);
      } catch (error) {
        errors.push(new Error(`${name}: ${error instanceof Error ? error.message : String(error)}`, { cause: error }));
      }
    }
  }

  await visit(root);
  if (errors.length) throw new AggregateError(errors, `History validation failed for ${errors.length} entries`);
  return { years: years.size, files, events };
}
