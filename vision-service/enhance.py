"""Image-enhancement pipeline for KARIGAR SETU (Phase 2: AI Image Studio).

Classical computer vision only — NO deep-learning matting. Background separation uses
OpenCV GrabCut, which works best when the product is reasonably separated from the
background; busy backgrounds can produce imperfect masks (the UI says the same).

All processing uses packages already installed in vision-service/.venv:
opencv-python, numpy, Pillow. No new dependencies.
"""
from io import BytesIO

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from PIL import Image, ImageEnhance, ImageFilter, UnidentifiedImageError

router = APIRouter(prefix="/enhance", tags=["enhance"])

MAX_SIDE = 1600          # downscale very large photos before processing
OUTPUT_SIZE = 1080       # standard e-commerce square output
MIN_OBJECT_FRACTION = 0.02   # below this the mask is almost certainly wrong
MAX_OBJECT_FRACTION = 0.95   # above this GrabCut kept (nearly) everything
BACKGROUND_CHOICES = ("white", "gray", "transparent")


def _to_opencv(pil_image: Image.Image) -> np.ndarray:
    """PIL RGB -> BGR uint8 for OpenCV."""
    return cv2.cvtColor(np.asarray(pil_image.convert("RGB"), dtype=np.uint8), cv2.COLOR_RGB2BGR)


def _to_pil(bgr: np.ndarray, alpha: np.ndarray | None = None) -> Image.Image:
    """OpenCV BGR (+ optional alpha) -> PIL RGBA/RGB."""
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    if alpha is not None:
        return Image.fromarray(np.dstack([rgb, alpha]), mode="RGBA")
    return Image.fromarray(rgb, mode="RGB")


def _downscale(image: Image.Image) -> Image.Image:
    """Bound the largest side so GrabCut stays fast on phone photos."""
    if max(image.size) <= MAX_SIDE:
        return image
    scale = MAX_SIDE / max(image.size)
    return image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)


def _remove_background(bgr: np.ndarray) -> tuple:
    """GrabCut segmentation with a center rect + border-clearance prior.

    Returns (alpha 0..255 uint8, info dict). Never raises for a 'poor' mask; quality
    is reported via object_fraction/quality so the frontend can warn honestly.
    """
    h, w = bgr.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)

    # Center rect: the product is assumed to occupy the middle of the frame, with
    # clearance from the border (border pixels are treated as definite background).
    rect = (int(w * 0.05), int(h * 0.05), int(w * 0.9), int(h * 0.9))
    try:
        cv2.grabCut(bgr, mask, rect, bgd, fgd, 4, cv2.GC_INIT_WITH_RECT)
    except cv2.error as error:
        return np.full((h, w), 255, np.uint8), {
            "quality": "failed", "object_fraction": 1.0,
            "note": f"GrabCut failed ({error}); full frame kept",
        }

    alpha = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

    # Gentle morphological cleanup: drop specks, fill pinholes (texture-safe kernel).
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, kernel)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, kernel)

    fraction = float((alpha > 0).mean())
    info = {"object_fraction": round(fraction, 4)}
    if fraction < MIN_OBJECT_FRACTION:
        info.update({"quality": "failed", "note": "Segmentation kept almost nothing; full frame kept"})
        return np.full((h, w), 255, np.uint8), info
    if fraction > MAX_OBJECT_FRACTION:
        info.update({"quality": "weak", "note": "Segmentation kept nearly everything"})
        return alpha, info
    info["quality"] = "ok"
    return alpha, info


def _clahe_lighting(bgr: np.ndarray, clip: float = 2.0) -> np.ndarray:
    """CLAHE on the L channel in LAB space: lifts shadows, avoids hue shifts."""
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l = cv2.createCLAHE(clipLimit=clip, tileGridSize=(8, 8)).apply(l)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)


def _white_balance(bgr: np.ndarray, strength: float = 0.6) -> np.ndarray:
    """Gray-world white balance, blended by `strength` so colors stay believable."""
    result = bgr.astype(np.float32)
    means = result.reshape(-1, 3).mean(axis=0)
    gray = float(means.mean())
    gains = gray / np.maximum(means, 1e-6)
    gains = 1.0 + (gains - 1.0) * strength  # partial correction only
    return np.clip(result * gains[None, None, :], 0, 255).astype(np.uint8)


def _denoise(bgr: np.ndarray) -> np.ndarray:
    """Edge-preserving denoise, gentler than a plain blur so weaves survive."""
    return cv2.bilateralFilter(bgr, d=7, sigmaColor=45, sigmaSpace=7)


def _sharpen(pil_image: Image.Image, amount: float = 1.15) -> Image.Image:
    """Mild unsharp mask on the final formatted image."""
    filtered = pil_image.filter(ImageFilter.UnsharpMask(radius=1.4, percent=90, threshold=3))
    return ImageEnhance.Sharpness(filtered).enhance(amount)


import base64
import time


def _sharpen_rgba(pil_image: Image.Image) -> Image.Image:
    """Mild unsharp mask; the alpha channel (if any) is preserved untouched."""
    if pil_image.mode != "RGBA":
        return _sharpen(pil_image)
    r, g, b, a = pil_image.split()
    sharpened = _sharpen(Image.merge("RGB", (r, g, b)))
    return Image.merge("RGBA", (*sharpened.split(), a))


CANVAS_COLORS = {"white": (255, 255, 255), "gray": (238, 238, 238)}


def _compose_on_canvas(pil_image: Image.Image, background: str, size: int = OUTPUT_SIZE) -> Image.Image:
    """Contain the image on a square e-commerce canvas. Never crops the product."""
    width, height = pil_image.size
    scale = min(size / width, size / height)
    new_size = (max(1, round(width * scale)), max(1, round(height * scale)))
    resized = pil_image.resize(new_size, Image.LANCZOS)
    left, top = (size - new_size[0]) // 2, (size - new_size[1]) // 2

    if background == "transparent":
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        canvas.alpha_composite(resized.convert("RGBA"), (left, top))
        return canvas

    canvas = Image.new("RGB", (size, size), CANVAS_COLORS[background])
    mask = resized if resized.mode == "RGBA" else None
    canvas.paste(resized.convert("RGB"), (left, top), mask)
    return canvas


def _encode_output(pil_image: Image.Image) -> dict:
    """JPEG for opaque output, PNG where transparency is required; base64 data URL."""
    transparent = pil_image.mode == "RGBA"
    buffer = BytesIO()
    if transparent:
        pil_image.save(buffer, format="PNG", optimize=True)
        mime, fmt = "image/png", "png"
    else:
        pil_image.convert("RGB").save(buffer, format="JPEG", quality=92, optimize=True)
        mime, fmt = "image/jpeg", "jpeg"
    payload = buffer.getvalue()
    encoded = base64.b64encode(payload).decode("ascii")
    return {
        "data_url": f"data:{mime};base64,{encoded}",
        "mime": mime,
        "format": fmt,
        "bytes": len(payload),
    }


MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # mirrors the Express 10 MB limit


def _load_upload(upload: UploadFile) -> Image.Image:
    """Decode the uploaded bytes; raise 400/413 for bad or oversized files."""
    data = upload.file.read() if hasattr(upload, "file") else b""
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded file is empty")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds the 10 MB limit")
    try:
        return Image.open(BytesIO(data))
    except (UnidentifiedImageError, OSError) as error:
        raise HTTPException(status_code=400, detail="The uploaded file is not a readable image") from error


@router.post("")
async def enhance(
    file: UploadFile = File(...),
    remove_background: bool = Form(True),
    lighting: bool = Form(True),
    white_balance: bool = Form(True),
    denoise: bool = Form(False),
    sharpen: bool = Form(True),
    ecommerce_format: bool = Form(True),
    background: str = Form("white"),
):
    """Classical-CV product-photo enhancement. NOT deep-learning matting.

    Quality of the GrabCut mask is reported (never faked) so the UI can warn when a
    busy background likely produced an imperfect cut.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Upload an image file")
    if background not in BACKGROUND_CHOICES:
        raise HTTPException(status_code=400, detail=f"background must be one of: {', '.join(BACKGROUND_CHOICES)}")

    image = _load_upload(file)
    started = time.perf_counter()
    input_width, input_height = image.size
    operations: list[str] = []
    warnings: list[str] = []
    segmentation: dict = {}

    try:
        working = _downscale(image)
        bgr = _to_opencv(working)
        alpha: np.ndarray | None = None

        if remove_background:
            alpha, segmentation = _remove_background(bgr)
            operations.append("background_removal")
            if segmentation.get("quality") == "failed":
                warnings.append(segmentation.get("note", "Segmentation failed; full frame kept"))
            elif float(segmentation.get("object_fraction", 0)) < 0.08 or float(segmentation.get("object_fraction", 1)) > 0.85:
                warnings.append("Complex or low-contrast background: the cut-out may be imperfect. Review the result.")

        if white_balance:
            bgr = _white_balance(bgr)
            operations.append("white_balance")
        if denoise:
            bgr = _denoise(bgr)
            operations.append("denoise")
        if lighting:
            bgr = _clahe_lighting(bgr)
            operations.append("lighting_correction")

        result_image = _to_pil(bgr, alpha)

        if sharpen:
            result_image = _sharpen_rgba(result_image)
            operations.append("sharpen")

        if ecommerce_format:
            if background == "transparent" and alpha is None:
                warnings.append("Transparent background needs background removal; a white background was used instead.")
                background = "white"
            result_image = _compose_on_canvas(result_image, background)
            operations.append("ecommerce_format")
        elif background == "transparent" and result_image.mode != "RGBA":
            result_image = result_image.convert("RGB")

        encoded = _encode_output(result_image)
    except HTTPException:
        raise
    except Exception as error:  # pragma: no cover - defensive; never fake a result
        print("[vision] /enhance processing error:", error)
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {error}") from error

    output = {
        "input": {"width": input_width, "height": input_height},
        "operations": operations,
        "background": background if ecommerce_format else None,
        "segmentation": segmentation,
        "warnings": warnings,
        "processing_ms": round((time.perf_counter() - started) * 1000),
        "method": "classical CV (GrabCut + CLAHE + gray-world); not deep-learning matting",
        "image": {**encoded, "width": result_image.width, "height": result_image.height},
    }
    print("[vision] /enhance ok:", operations, f"{output['processing_ms']}ms")
    return output

