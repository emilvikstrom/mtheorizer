#!/usr/bin/env python3
"""Draws the PNG app icons into public/ (same design as public/icon.svg).

Plain Python, no packages: run `python3 tools/make-icons.py` from the repo root.
The maskable icon keeps the keys inside the central 80 % so Android can crop it.
"""
import struct
import zlib

BG = (0x16, 0x15, 0x14)
KEY = (0xF4, 0xF1, 0xEA)


def png(path, size, scale, round_corners):
    """A square icon; the design (a 512 grid) is drawn at `scale` around the centre."""
    off = size * (1 - scale) / 2
    unit = size * scale / 512

    def inside(x, y, rx, ry, rw, rh):
        return rx <= (x - off) / unit < rx + rw and ry <= (y - off) / unit < ry + rh

    def in_rounded_square(x, y):
        r = size * 96 / 512
        cx = min(max(x, r), size - 1 - r)
        cy = min(max(y, r), size - 1 - r)
        return (x - cx) ** 2 + (y - cy) ** 2 <= r * r

    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            if round_corners and not in_rounded_square(x, y):
                row += bytes((0, 0, 0, 0))
                continue
            colour = BG
            for kx in (76, 164, 252, 340):
                if inside(x, y, kx, 116, 76, 280):
                    colour = KEY
            for kx in (128, 216, 304):
                if inside(x, y, kx, 116, 48, 170):
                    colour = BG
            row += bytes(colour) + b"\xff"
        rows.append(bytes(row))

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
    data += chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b"")
    with open(path, "wb") as out:
        out.write(data)


png("public/icon-192.png", 192, 1.0, True)
png("public/icon-512.png", 512, 1.0, True)
png("public/icon-maskable-512.png", 512, 0.8, False)
