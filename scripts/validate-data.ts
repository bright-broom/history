import { resolve } from 'node:path';
import { DATA_DIR_PATH } from '../src/config/constants';
import { validateHistoryData } from './lib/validate-history-data';

const root = process.argv[2] ? resolve(process.argv[2]) : resolve(...DATA_DIR_PATH);
validateHistoryData(root)
  .then(({ years, files, events }) => console.log(`Validated ${files} YAML files, ${years} years and ${events} monthly events.`))
  .catch((error) => { console.error(error); process.exitCode = 1; });
