import { existsSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const IGNORED_NAMES = new Set(['.gitkeep', '.DS_Store']);
const MEDIA_REF_RE = /(["'(=\s`])\/media\//g;

function hasMedia(mediaDir) {
  if (!existsSync(mediaDir)) return false;

  return readdirSync(mediaDir, { withFileTypes: true }).some(
    (entry) => !IGNORED_NAMES.has(entry.name)
  );
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      reject(Object.assign(error, { stdout, stderr }));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(Object.assign(new Error(`${command} exited with code ${code}`), {
        code,
        stdout,
        stderr,
      }));
    });
  });
}

function explainAwsError(error) {
  const stderr = error.stderr || '';

  if (/Unable to locate credentials|NoCredentialProviders|Could not load credentials/i.test(stderr)) {
    return 'AWS credentials are missing. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or AWS_PROFILE.';
  }

  if (/AccessDenied|Forbidden/i.test(stderr)) {
    return 'Access denied. Check s3:ListBucket and s3:PutObject for MEDIA_BUCKET.';
  }

  if (/NoSuchBucket/i.test(stderr)) {
    return 'Bucket not found. Check MEDIA_BUCKET and MEDIA_ENDPOINT_URL.';
  }

  if (/Could not connect|EndpointConnectionError|getaddrinfo|ECONNREFUSED/i.test(stderr)) {
    return 'Cannot reach MEDIA_ENDPOINT_URL. Check the URL, region, and network.';
  }

  if (/region/i.test(stderr)) {
    return 'AWS region is missing. Set AWS_REGION or AWS_DEFAULT_REGION.';
  }

  return '';
}

function rewriteMediaBase(code, mediaCdnUrl) {
  if (!mediaCdnUrl) return code;
  return code.replace(MEDIA_REF_RE, `$1${mediaCdnUrl}/media/`);
}

export function mediaAssets(env, mode) {
  const readEnv = (key) => process.env[key] ?? env[key];
  const mediaCdnUrl = (readEnv('MEDIA_CDN_URL') || '').trim().replace(/\/+$/, '');

  return {
    name: 'vite-plugin-media-assets',
    apply: 'build',
    enforce: 'pre',

    async buildStart() {
      // CI never uploads media.
      if (process.env.CI) return;

      // Explicit local escape hatch.
      if (String(readEnv('MEDIA_SYNC') ?? '1') === '0') return;

      const mediaDir = path.resolve(process.cwd(), 'media');
      if (!hasMedia(mediaDir)) return;

      const bucket = (readEnv('MEDIA_BUCKET') || '')
        .trim()
        .replace(/^s3:\/\//, '')
        .replace(/\/.*$/, '');

      const endpoint = (readEnv('MEDIA_ENDPOINT_URL') || '').trim().replace(/\/+$/, '');

      const missing = [];
      if (!bucket) missing.push('MEDIA_BUCKET');
      if (!endpoint) missing.push('MEDIA_ENDPOINT_URL');

      if (missing.length > 0) {
        this.error(
          `[media] Local media/ files found, but required config is missing: ${missing.join(', ')}.\n` +
          'MEDIA_BUCKET goes in .env.development/.env.production. MEDIA_ENDPOINT_URL goes in .env.\n' +
          'Default mode: MEDIA_BUCKET is the site bucket.\n' +
          'Optional public media mode: MEDIA_BUCKET is the public media bucket.\n' +
          'Set MEDIA_SYNC=0 to skip automatic upload.'
        );
      }

      if (!/^https?:\/\//i.test(endpoint)) {
        this.error(
          `[media] MEDIA_ENDPOINT_URL must start with http:// or https://. Received: ${endpoint}`
        );
      }

      try {
        await run('aws', ['--version'], process.cwd());
      } catch (error) {
        if (error.code === 'ENOENT') {
          this.error(
            '[media] AWS CLI not found.\n' +
            'Install AWS CLI v2, or set MEDIA_SYNC=0 to skip automatic upload.'
          );
        }

        this.error(`[media] Could not run AWS CLI: ${error.message}`);
      }

      const args = [
        's3', 'sync', './media', `s3://${bucket}/media`,
        '--endpoint-url', endpoint,
        '--exclude', '.gitkeep',
        '--exclude', '.DS_Store',
        '--exclude', '*/.DS_Store',
        '--only-show-errors',
      ];

      console.log(`[media] Syncing media/ to s3://${bucket}/media ...`);

      try {
        await run('aws', args, process.cwd());
      } catch (error) {
        const hint = explainAwsError(error);
        const details = error.stderr || error.message;

        this.error(
          `[media] Upload failed.\n${details}${hint ? `\nReason: ${hint}` : ''}`
        );
      }
    },

    transform(code, id) {
      if (!mediaCdnUrl) return null;
      if (!/\.(css|js|mjs)$/.test(id)) return null;

      return {
        code: rewriteMediaBase(code, mediaCdnUrl),
        map: null,
      };
    },

    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return rewriteMediaBase(html, mediaCdnUrl);
      },
    },
  };
}
