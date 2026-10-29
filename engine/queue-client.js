const http = require('http');

// Queue endpoints return short JSON or text responses; bound both time and size.
module.exports = function queueRequest(path, headers = {}, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: process.env.QUEUE_HOST || '127.0.0.1',
      port: Number(process.env.QUEUE_PORT || 8092), path, headers }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; if (body.length > 16384) req.destroy(new Error('Queue result too large')); });
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => req.destroy(new Error('Queue request timed out')));
    req.end();
  });
};
