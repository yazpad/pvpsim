import { defineConfig } from 'vite';
import { appendFile } from 'node:fs/promises';

// Acknowledged disk writes preserve diagnostic progress across native browser crashes.
export default defineConfig({
  plugins: [{
    name: 'gpu-diagnostic-log',
    configureServer(server) {
      server.middlewares.use('/__gpu_diagnostic', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let body = '';
        req.on('data', chunk => {
          body += chunk;
          if (body.length > 16384) req.destroy();
        });
        req.on('end', async () => {
          try {
            const event = JSON.parse(body);
            await appendFile('/tmp/pvp-gpu-diagnostic.jsonl', JSON.stringify({
              recordedAt: new Date().toISOString(), ...event,
            }) + '\n');
            res.end('saved');
          } catch {
            res.statusCode = 500;
            res.end('Could not save diagnostic stage');
          }
        });
      });
    },
  }],
});
