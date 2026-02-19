// Reusable polling utility — returns a promise that resolves when predicate returns truthy

export default function pollUntil(predicate, interval, timeout) {
  return new Promise((resolve, reject) => {
    const result = predicate();
    if (result) { resolve(result); return; }

    const timer = setInterval(() => {
      const value = predicate();
      if (value) {
        clearInterval(timer);
        resolve(value);
      }
    }, interval);

    setTimeout(() => {
      clearInterval(timer);
      reject(new Error(`Poll timed out after ${timeout / 1000}s`));
    }, timeout);
  });
}
