"""Remove the flat backgrounds from the two supplied logo photos.

church logo  : light badge on a solid black field  -> flood-fill the black
eparchy logo : black line art on a white field     -> darkness becomes alpha
"""
from collections import deque

import numpy as np
from PIL import Image

SRC_CHURCH = "/home/user/elmalak/photo_5828078271021649829_y.jpg"
SRC_EPARCHY = "/home/user/elmalak/photo_5814252715461251296_x.jpg"
OUT_CHURCH = "/home/user/elmalak/public/logos/church-logo.png"
OUT_EPARCHY = "/home/user/elmalak/public/logos/eparchy-logo.png"


def luminance(rgb: np.ndarray) -> np.ndarray:
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def flood_background(lum: np.ndarray, threshold: float) -> np.ndarray:
    """Mask of dark pixels reachable from the image border (4-connected)."""
    h, w = lum.shape
    dark = lum < threshold
    seen = np.zeros((h, w), dtype=bool)
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            if dark[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if dark[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))

    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and dark[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def cut_church():
    rgb = np.array(Image.open(SRC_CHURCH).convert("RGB")).astype(np.float64)
    lum = luminance(rgb)

    # Everything the black field can reach becomes fully transparent.
    background = flood_background(lum, threshold=110)

    alpha = np.where(background, 0.0, 255.0)

    # Feather the JPEG-compressed rim: dark pixels touching the background
    # fade out instead of leaving a hard black halo.
    rim = (~background) & (lum < 150)
    neighbour_bg = np.zeros_like(background)
    neighbour_bg[1:, :] |= background[:-1, :]
    neighbour_bg[:-1, :] |= background[1:, :]
    neighbour_bg[:, 1:] |= background[:, :-1]
    neighbour_bg[:, :-1] |= background[:, 1:]
    feather = rim & neighbour_bg
    alpha[feather] = np.clip((lum[feather] - 40) / 110 * 255, 0, 255)

    out = np.dstack([rgb, alpha]).astype(np.uint8)
    img = Image.fromarray(out, mode="RGBA")
    img = img.crop(img.getbbox())
    img.save(OUT_CHURCH)
    print("church:", img.size, "->", OUT_CHURCH)


def cut_eparchy():
    rgb = np.array(Image.open(SRC_EPARCHY).convert("RGB")).astype(np.float64)
    lum = luminance(rgb)

    # Black line art: darkness is opacity, so letter counters stay transparent
    # and the anti-aliased edges survive intact.
    alpha = np.clip((235.0 - lum) / 200.0 * 255.0, 0, 255)
    ink = np.zeros_like(rgb)

    out = np.dstack([ink, alpha]).astype(np.uint8)
    img = Image.fromarray(out, mode="RGBA")
    img = img.crop(img.getbbox())
    img.save(OUT_EPARCHY)
    print("eparchy:", img.size, "->", OUT_EPARCHY)


cut_church()
cut_eparchy()
