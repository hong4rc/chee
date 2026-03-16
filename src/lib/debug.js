// Lightweight ESM debug logger
// Enable via: localStorage.debug = 'chee:*'
// Specific: localStorage.debug = 'chee:engine,chee:panel'
// Disable: localStorage.removeItem('debug')

import { includes, some } from 'lodash-es';

const PREFIX = 'chee';

let enabledNamespaces = null;

function parseDebugFlag() {
  try {
    const flag = localStorage.getItem('debug') || '';
    enabledNamespaces = flag ? flag.split(',').map((p) => p.trim()) : [];
  } catch { enabledNamespaces = []; }
}

parseDebugFlag();
try { window.addEventListener('storage', parseDebugFlag); } catch { /* no window */ }

function isEnabled(namespace) {
  if (!enabledNamespaces || enabledNamespaces.length === 0) return false;
  return some(enabledNamespaces, (p) => {
    if (p === '*' || p === `${PREFIX}:*`) return true;
    return includes(namespace, p) || p === namespace;
  });
}

const LOG_BUFFER_SIZE = 200;
const logBuffer = [];

function pushLog(level, tag, args) {
  const entry = `${new Date().toISOString().slice(11, 23)} ${level} ${tag} ${args.map(String).join(' ')}`;
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) logBuffer.shift();
}

export function getLogBuffer() {
  return logBuffer.slice();
}

export function refreshDebugFlag() {
  parseDebugFlag();
}

const cache = new Map();

export default function createDebug(namespace) {
  if (cache.has(namespace)) return cache.get(namespace);

  const tag = `[${namespace}]`;

  const log = (...args) => {
    pushLog('DBG', tag, args);
    if (!isEnabled(namespace)) return;
    console.log(tag, ...args); // eslint-disable-line no-console
  };

  log.info = (...args) => {
    pushLog('INF', tag, args);
    if (!isEnabled(namespace)) return;
    console.info(tag, ...args); // eslint-disable-line no-console
  };

  log.warn = (...args) => {
    pushLog('WRN', tag, args);
    if (!isEnabled(namespace)) return;
    console.warn(tag, ...args); // eslint-disable-line no-console
  };

  log.error = (...args) => {
    pushLog('ERR', tag, args);
    if (!isEnabled(namespace)) return;
    console.error(tag, ...args); // eslint-disable-line no-console
  };

  log.enabled = () => isEnabled(namespace);

  cache.set(namespace, log);
  return log;
}
