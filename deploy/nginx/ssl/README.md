# SSL/TLS Placeholder Structure

This directory is intentionally limited to certificate assets and bootstrap helpers.

- `certbot/`: mount point placeholder for Let's Encrypt `live/`, `archive/`, and challenge assets.
- `self-signed/`: local testing assets generated with `generate-self-signed-cert.sh`.

Example test certificate command:

```bash
bash deploy/nginx/ssl/self-signed/generate-self-signed-cert.sh \
  --domain your-domain.test \
  --output-dir deploy/nginx/ssl/self-signed/live/your-domain.test
```

The generated files are:

- `fullchain.pem`
- `privkey.pem`
- `cert.pem`
- `chain.pem`
