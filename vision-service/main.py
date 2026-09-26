import os
import secrets
from functools import lru_cache
from io import BytesIO

import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from sklearn.cluster import KMeans
from transformers import CLIPModel, CLIPProcessor

from enhance import router as enhance_router

app = FastAPI(title="Karigar Setu Vision Service")

app.include_router(enhance_router)

# Audit P2-15: this service is only ever reached from the local backend hops - Express
# (POST /api/scan and /api/enhance) or the Vite dev proxy (/analyze) - never by a browser page
# calling port 8000 directly. Those hops are server-to-server, so they never trigger a CORS
# check, which means no wildcard origin is needed here. The list below is the small set of
# local frontend origins (dev server and preview server) that may be used for local
# debugging. allow_credentials is off: the service has no cookies and no browser-direct
# authenticated flow, and pairing a wildcard origin with credentials is the unsafe pattern
# this replaces.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# --- Internal service credential (audit P2-15) ------------------------------------------
# The service is meant to be reachable only from the local backend. When
# VISION_INTERNAL_TOKEN is set, /analyze and /enhance additionally require the matching
# x-vision-token header, which the Express API and the Vite dev proxy attach. A cross-origin
# web page cannot attach this header without a preflight, and the allow-list above refuses
# that preflight, so a page in the browser can no longer drive the model directly.
# When the variable is unset the service keeps the documented local-development behaviour
# (unauthenticated local calls) and says so once at start-up.
INTERNAL_TOKEN_HEADER = "x-vision-token"
INTERNAL_TOKEN = (os.environ.get("VISION_INTERNAL_TOKEN") or "").strip()
INTERNAL_TOKEN_REQUIRED = bool(INTERNAL_TOKEN)
INTERNAL_PROTECTED_PATHS = ("/analyze", "/enhance")

if not INTERNAL_TOKEN_REQUIRED:
    print(
        "[vision] VISION_INTERNAL_TOKEN is not set: /analyze and /enhance accept "
        "unauthenticated local calls (development mode).",
        flush=True,
    )


@app.middleware("http")
async def require_internal_token(request, call_next):
    if (
        INTERNAL_TOKEN_REQUIRED
        and request.method != "OPTIONS"
        and request.url.path.startswith(INTERNAL_PROTECTED_PATHS)
    ):
        provided = request.headers.get(INTERNAL_TOKEN_HEADER, "")
        if not secrets.compare_digest(provided, INTERNAL_TOKEN):
            return JSONResponse(
                status_code=401, content={"detail": "Internal service credential required"}
            )
    return await call_next(request)


CATEGORIES = [
    "Pottery", "Textiles", "Basket Weaving", "Wood Carving", "Brass or Metal Jewelry",
    "Embroidery", "Block Printing", "Paper Mache", "Lacware", "Stone Inlay",
    "Leather Craft", "Bamboo Craft", "Glasswork", "Home Decor", "Other Handicraft"
]
MATERIALS = [
    "Terracotta", "Cotton", "Wool", "Brass", "Rosewood", "Natural Fiber", "Silk",
    "Clay", "Wood", "Bamboo", "Leather", "Paper", "Stone", "Glass", "Metal"
]
TECHNIQUES = [
    "Hand-painted", "Woven", "Carved", "Molded", "Embroidered", "Block-printed",
    "Hand-forged", "Coiled", "Lac-turned", "Stone-inlaid", "Knotted", "Unknown"
]


@lru_cache(maxsize=1)
def get_model():
    model_name = "openai/clip-vit-base-patch32"
    processor = CLIPProcessor.from_pretrained(model_name)
    model = CLIPModel.from_pretrained(model_name)
    model.eval()
    return processor, model


def classify(image: Image.Image, labels: list[str], processor, model):
    prompts = [f"a close-up photo of a handmade {label.lower()} craft object" for label in labels]
    inputs = processor(text=prompts, images=image, return_tensors="pt", padding=True)
    with torch.inference_mode():
        logits = model(**inputs).logits_per_image[0]
        probabilities = logits.softmax(dim=0)
    index = int(probabilities.argmax())
    return labels[index], round(float(probabilities[index]), 4)


def dominant_colors(image: Image.Image) -> list[str]:
    pixels = np.asarray(image.convert("RGB").resize((160, 160)), dtype=np.float32).reshape(-1, 3)
    clusters = KMeans(n_clusters=3, n_init=10, random_state=42).fit(pixels)
    counts = np.bincount(clusters.labels_, minlength=3)
    colors = clusters.cluster_centers_[np.argsort(counts)[::-1]]
    return ["#{:02x}{:02x}{:02x}".format(*(np.clip(color, 0, 255).astype(int))) for color in colors]


@app.get("/health")
def health():
    return {"ok": True, "model": "openai/clip-vit-base-patch32"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    print("[vision] /analyze called, filename:", getattr(file, "filename", None), "content_type:", getattr(file, "content_type", None))
    if not file.content_type or not file.content_type.startswith("image/"):
        print("[vision] /analyze rejecting non-image content_type:", getattr(file, "content_type", None))
        raise HTTPException(status_code=415, detail="Upload an image file")
    try:
        image = Image.open(BytesIO(await file.read())).convert("RGB")
    except (UnidentifiedImageError, OSError) as error:
        print("[vision] /analyze unreadable image:", error)
        raise HTTPException(status_code=400, detail="The uploaded file is not a readable image") from error

    try:
        processor, model = get_model()
        category, category_confidence = classify(image, CATEGORIES, processor, model)
        material, material_confidence = classify(image, MATERIALS, processor, model)
        technique, technique_confidence = classify(image, TECHNIQUES, processor, model)
    except Exception as error:
        print("[vision] /analyze model error:", error)
        raise HTTPException(status_code=503, detail=f"CLIP model unavailable: {error}") from error

    print("[vision] /analyze ok:", category, material, technique)
    return {
        "category": category,
        "category_confidence": category_confidence,
        "material": material,
        "material_confidence": material_confidence,
        "dominant_colors": dominant_colors(image),
        "technique": technique,
        "technique_confidence": technique_confidence,
    }
