import { FileSystemHistoryRepository } from '../src/infrastructure/repositories/history-repository';

const repository = new FileSystemHistoryRepository();
async function main() {
  const years = await repository.getAvailableYears();
  let events = 0;
  for (const year of years) {
    await repository.getYearData(year);
    events += (await repository.getAllEventsForYear(year)).length;
  }
  console.log(`Validated ${years.length} years and ${events} monthly events.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
