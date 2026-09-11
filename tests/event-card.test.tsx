import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { EventCard } from '../src/components/features/history/EventCard';
import { createDateString } from '../src/domain/validation/validators';

test('identical and same-prefix events have unique accessible heading references', () => {
  const event = { date: createDateString('2024-01-01'), title: '共通のタイトル先頭部分 A', category: '社会', description: 'Description', relatedCountries: [] };
  const html = renderToString(createElement('section', null,
    createElement(EventCard, { event }),
    createElement(EventCard, { event }),
    createElement(EventCard, { event: { ...event, title: '共通のタイトル先頭部分 B' } }),
  ));
  const ids = [...html.matchAll(/<h3 id="([^"]+)"/g)].map((match) => match[1]);
  const references = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, 3);
  assert.equal(new Set(ids).size, 3);
  assert.deepEqual(references, ids);
  assert.ok(ids.every((id) => !/\s/.test(id)));
});
