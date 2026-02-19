// Lightweight ESM debug logger
// Enable via: localStorage.debug = 'chee:*'
// Specific: localStorage.debug = 'chee:engine,chee:panel'
// Disable: localStorage.removeItem('debug')

import { includes, some } from 'lodash-es';

const PREFIX = 'chee';

function isEnabled(namespace) {
  try {
    const flag = localStorage.getItem('debug') || '';
    if (!flag) return false;
    const patterns = flag.split(',').map((p) => p.trim());
    return some(patterns, (p) => {
      if (p === '*' || p === `${PREFIX}:*`) return true;
      return includes(namespace, p) || p === namespace;
    });
  } catch {
    return false;
  }
}

const cache = new Map();

export default function createDebug(namespace) {
  if (cache.has(namespace)) return cache.get(namespace);

  const tag = `[${namespace}]`;

  const log = (...args) => {
    if (!isEnabled(namespace)) return;
    console.log(tag, ...args); // eslint-disable-line no-console
  };

  log.info = (...args) => {
    if (!isEnabled(namespace)) return;
    console.info(tag, ...args); // eslint-disable-line no-console
  };

  log.warn = (...args) => {
    if (!isEnabled(namespace)) return;
    console.warn(tag, ...args); // eslint-disable-line no-console
  };

  log.error = (...args) => {
    if (!isEnabled(namespace)) return;
    console.error(tag, ...args); // eslint-disable-line no-console
  };

  log.enabled = () => isEnabled(namespace);

  cache.set(namespace, log);
  return log;
}
