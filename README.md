# Aqui Estoy Venezuela

Static web application for registering and searching missing/found people.

## Local Configuration

Copy the example config file and fill it with your own values:

```bash
cp static/js/config.example.js static/js/config.js
```

`static/js/config.js` is ignored by Git because it may contain project-specific keys.

## Production API

The deployed production API is expected under:

```text
/api/
```

## Do Not Commit

- `.env` files
- PEM/certificate/private key files
- production backups
- real API keys or database credentials
- real personal records used for testing
