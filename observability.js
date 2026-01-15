function createObserver(serviceName, options) {
  const counters = {};
  const flushIntervalSec = (options && options.flushIntervalSec) || 60;

  function log(level, event, fields) {
    const entry = {
      ts: new Date().toISOString(),
      level: level,
      service: serviceName,
      event: event,
    };
    if (fields && typeof fields === 'object') {
      Object.keys(fields).forEach((key) => {
        entry[key] = fields[key];
      });
    }
    console.log(JSON.stringify(entry));
  }

  function count(name, value) {
    counters[name] = (counters[name] || 0) + (value || 1);
  }

  function flush() {
    const snapshot = {};
    Object.keys(counters).forEach((key) => {
      snapshot[key] = counters[key];
      counters[key] = 0;
    });
    log('info', 'counters', { counters: snapshot });
  }

  function installProcessHandlers() {
    process.on('uncaughtException', (err) => {
      count('uncaughtException');
      log('error', 'uncaughtException', {
        error: err && err.stack ? err.stack : String(err),
      });
    });
    process.on('unhandledRejection', (reason) => {
      count('unhandledRejection');
      log('error', 'unhandledRejection', {
        error: reason && reason.stack ? reason.stack : String(reason),
      });
    });
  }

  if (flushIntervalSec > 0) {
    const timer = setInterval(flush, flushIntervalSec * 1000);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  }

  return {
    log: log,
    count: count,
    flush: flush,
    installProcessHandlers: installProcessHandlers,
  };
}

module.exports = {
  createObserver: createObserver,
};
