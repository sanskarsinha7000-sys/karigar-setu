# Karigar Setu - Artisan Bridge

Karigar Setu is a local React/Vite frontend with a small Express API, a SQLite auth database, and a local FastAPI vision service for image analysis and enhancement. Artisan, product, and inquiry data remains frontend mock data for now; the backend intentionally exposes no CRUD routes for those resources.

## Local services

Development runs three local services:

- Frontend / Vite: `http://localhost:5173`
- Express API: `http://localhost:4000`
- FastAPI vision service: `http://localhost:8000`

The Vite development proxy forwards `/api/*` requests to Express (`http://localhost:4000`) and `/analyze` requests to the vision service (`http://127.0.0.1:8000`).

## Run the app

Install Node.js 22 or newer, then run the frontend and API in separate terminals:

```bash
npm install
npm run dev:server
npm run dev:client
```

The frontend runs at `http://localhost:5173` and the API at `http://localhost:4000`. The Vite proxy forwards `/api/*` requests to Express. Auth uses phone or email/password, development OTP login, signup, and an httpOnly JWT cookie. OTPs are printed in the API terminal as `[DEV OTP] Code for <identifier>: 123456`.

The Express API surface is limited to:

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/otp/request`
- `POST /api/auth/otp/verify`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Feature endpoints:

- AI Scanner: `POST /analyze` — the frontend calls `/analyze` directly; in the current development setup the Vite proxy forwards it to the FastAPI vision service at `http://127.0.0.1:8000`, which expects an image form field named `file`.
- Image Studio: `POST /api/enhance` — Express endpoint taking a multipart image field named `image` plus enhancement option fields; it forwards the image to the vision service at `http://localhost:8000/enhance`.
- Dynamic Pricing: `POST /api/pricing/suggest` — JSON cost inputs and product details; a transparent cost-plus computation anchored on the median of matching listings from the project's 25-product reference dataset (`src/data/mockProducts.json`). No database, persistence, or authentication changes.
- Auto-Cataloger (Express):
  - `GET /api/cataloger/capabilities` — reports transcription providers and their configuration state.
  - `POST /api/cataloger/transcribe` — multipart audio field `audio` plus a `language` field; uses a configured backend provider when available, otherwise returns an honest not-configured response pointing to the browser speech-recognition fallback.
  - `POST /api/cataloger/describe` — JSON product/transcript fields; returns catalog copy generated from deterministic templates and a glossary (the response labels it as not an LLM output).

`POST /api/scan` still exists in the Express backend as a legacy route (it forwards an `image` field to the vision service), but the frontend AI Scanner no longer calls it; the active scanner flow is `POST /analyze` through the Vite proxy.

## Local vision service

The scanner uses a local FastAPI service with CLIP zero-shot classification and real pixel color clustering. Bind it to the loopback interface with `--host 127.0.0.1` (shown below) so the model is not reachable from other machines on the network.

The service is only meant to be called by the local backend: the Express API (`/api/scan`, `/api/enhance`) and the Vite dev proxy (`/analyze`) reach it server-to-server, and no browser page calls port 8000 directly. Its CORS allow-list therefore covers only the local frontend origins instead of a wildcard, and it accepts no cross-origin page at all. As an optional second layer, set `VISION_INTERNAL_TOKEN` (see `.env.example`): when present, `/analyze` and `/enhance` require the matching `x-vision-token` header, which Express and the Vite proxy attach automatically. Leave it unset for the documented local-development mode, where the service accepts unauthenticated local calls and prints a start-up notice. `/health` stays open so it can be used as a liveness probe.

Use Python 3.11 or newer in a virtual environment:

```bash
cd vision-service
python -m venv .venv
.venv\\Scripts\\activate       # Windows
source .venv/bin/activate       # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

The first analysis downloads `openai/clip-vit-base-patch32` from Hugging Face and caches it locally. Start this service alongside Express and Vite. The service endpoint is `POST http://localhost:8000/analyze` with an image form field named `file`; the AI Scanner frontend calls `POST /analyze` with the same `file` field, and the Vite development proxy forwards that request to `http://127.0.0.1:8000`.

For sample validation, collect four or five real craft images (for example, a pot, woven basket, textile, and jewelry) and run:

```bash
python test_samples.py samples\\pot.jpg samples\\basket.jpg samples\\textile.jpg samples\\jewelry.jpg
```

Compare the returned category/material/technique labels and confidence scores against the image; confidence thresholds should be tuned only after this real-image evaluation. This repository currently contains no craft sample-image set and the Python dependencies/model weights are not installed in the checkout, so those model results cannot be honestly reported here.

## Deployment status

The project is currently configured and tested as a LOCAL DEMO: three services on one machine, a development-only Vite proxy, development OTPs printed to the API console, and model weights installed only where the vision service was set up. Production deployment is not configured and requires additional work, including:

- Reverse-proxy/routing: there is no Vite dev proxy in production, so `/analyze` must be routed to the vision service and `/api/*` to Express by the deployment's reverse proxy (the Express backend has no `/analyze` route of its own).
- Environment/secrets: set real values for environment variables such as `JWT_SECRET` (the code falls back to a development default), and optionally `PORT`, `VISION_URL`, and `VISION_ENHANCE_URL`.
- CORS/authentication: the vision service currently allows all origins, and authentication/OTP handling is development-grade; review and harden both for production.
- HTTPS: required for production cookie/session use (the session cookie is marked secure only when `NODE_ENV=production`).
- Model deployment: the Python environment and the CLIP model weights must be installed and served on the target host.

Auto-Cataloger transcription is not backed by external services in this checkout: `GET /api/cataloger/capabilities` reports the Bhashini and Google providers as not configured because their credentials are absent. The browser speech-recognition fallback is used where the browser supports the language and is not offline.

## Checks

```bash
npm run build
python -m py_compile vision-service/main.py
```
