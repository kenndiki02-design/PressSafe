# PressSafe

PressSafe is a static HTML, CSS, and JavaScript prototype for journalist verification and safety dashboards. It has no server, account system, database, AI provider, or emergency-response integration.

## Run locally

Open `index.html` in a browser. For service-worker/offline testing, serve this folder over HTTPS or from `localhost`, for example with `npx serve .`.

## Deploy to Vercel

Import the repository and leave the framework preset as **Other**. Set the project root to this folder. No build command, output directory, or environment variables are required; Vercel serves `index.html` and the static assets directly.

## Prototype limitations

- Role switching changes the preview dashboard; it is not authorization.
- Claims, incident notes, selected evidence filenames, and digests stay in page memory and are lost when the page closes.
- File digests are computed in the browser for demonstration only. Files are not uploaded or encrypted.
- SOS, check-ins, contact notifications, billing, privacy requests, review decisions, and exports do not contact external services.
- Dashboard figures and organizations are sample content, not live reporting.

Do not enter real source identities, incident details, credentials, or confidential evidence in this prototype. Do not rely on it for emergency response or legal evidence preservation.