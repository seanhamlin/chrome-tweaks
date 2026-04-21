#!/usr/bin/env python3
"""
Generate Tab Tweaks icons at 16, 48, and 128px.

Design: Rounded indigo square with a white wrench icon
        (representing "tweaks") laid diagonally across it.
"""
import struct, zlib, math

def blend(bg, fg, alpha):
    """Alpha-blend fg over bg."""
    return tuple(int(b * (1 - alpha) + f * alpha) for b, f in zip(bg, fg))

def dist(x1, y1, x2, y2):
    return math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)

def rounded_rect_sdf(px, py, w, h, r):
    """Signed distance from point to rounded rect centered at origin."""
    qx = abs(px) - w / 2 + r
    qy = abs(py) - h / 2 + r
    outside = math.sqrt(max(qx, 0) ** 2 + max(qy, 0) ** 2) - r
    inside = min(max(qx, qy), 0)
    return outside + inside

def line_segment_dist(px, py, ax, ay, bx, by):
    """Distance from point to line segment AB."""
    dx, dy = bx - ax, by - ay
    len_sq = dx * dx + dy * dy
    if len_sq == 0:
        return dist(px, py, ax, ay)
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / len_sq))
    proj_x = ax + t * dx
    proj_y = ay + t * dy
    return dist(px, py, proj_x, proj_y)

def create_icon(size):
    """Render the icon at the given size."""
    pixels = []
    center = size / 2
    scale = size / 128.0  # design at 128, scale down

    # Colors
    bg_top = (79, 70, 229)      # #4F46E5 indigo-600
    bg_bot = (67, 56, 202)      # #4338CA indigo-700
    accent = (129, 120, 248)    # lighter indigo highlight
    white = (255, 255, 255)
    shadow = (55, 48, 163)

    # Background corner radius
    bg_radius = 24 * scale

    for y in range(size):
        row = []
        for x in range(size):
            # Normalized to design space
            dx = x / scale
            dy = y / scale

            # --- Background rounded square with gradient ---
            sdf_bg = rounded_rect_sdf(x - center, y - center, size, size, bg_radius)

            if sdf_bg > 1.0:
                row.append((0, 0, 0, 0))
                continue

            # Vertical gradient for background
            t = y / size
            bg = blend(bg_top, bg_bot, t)

            # Subtle inner glow at top
            glow_d = rounded_rect_sdf(x - center, y - center, size - 8 * scale, size - 8 * scale, bg_radius - 2 * scale)
            if glow_d < 0 and dy < 40:
                glow_alpha = min(1, max(0, -glow_d / (6 * scale))) * (1 - dy / 40) * 0.15
                bg = blend(bg, (255, 255, 255), glow_alpha)

            # --- Wrench icon ---
            # Wrench is drawn diagonally from bottom-left to top-right
            # It consists of: a shaft (line) and two open-jaw heads

            # Transform to wrench-local coords (rotated -45 degrees, centered)
            cx, cy = 64, 64  # design center
            angle = -math.pi / 4
            cos_a, sin_a = math.cos(angle), math.sin(angle)
            lx = (dx - cx) * cos_a - (dy - cy) * sin_a
            ly = (dx - cx) * sin_a + (dy - cy) * cos_a

            wrench_alpha = 0.0

            # Shaft: vertical line in local coords
            shaft_half_len = 28
            shaft_width = 6.5
            if abs(lx) < shaft_width and abs(ly) < shaft_half_len:
                d = max(abs(lx) - shaft_width, 0)
                wrench_alpha = max(wrench_alpha, 1.0 - d)

            # Head 1 (top): open circular jaw
            head1_cy = -shaft_half_len - 2
            head1_r_outer = 14
            head1_r_inner = 7
            d1 = dist(lx, ly, 0, head1_cy)
            # Ring shape
            if abs(d1 - (head1_r_outer + head1_r_inner) / 2) < (head1_r_outer - head1_r_inner) / 2 + 1:
                ring_d = abs(d1 - (head1_r_outer + head1_r_inner) / 2) - (head1_r_outer - head1_r_inner) / 2
                # Open jaw: cut out a wedge (gap at top-right in local)
                jaw_angle = math.atan2(ly - head1_cy, lx)
                if not (-0.4 < jaw_angle < 0.7):
                    wrench_alpha = max(wrench_alpha, 1.0 - max(ring_d, 0))
            # Fill the connection between shaft and head
            if d1 < head1_r_inner + 1 and ly < head1_cy + 5 and abs(lx) < shaft_width + 1:
                conn_d = max(abs(lx) - shaft_width, 0)
                wrench_alpha = max(wrench_alpha, 1.0 - conn_d)

            # Head 2 (bottom): open circular jaw (mirror)
            head2_cy = shaft_half_len + 2
            head2_r_outer = 14
            head2_r_inner = 7
            d2 = dist(lx, ly, 0, head2_cy)
            if abs(d2 - (head2_r_outer + head2_r_inner) / 2) < (head2_r_outer - head2_r_inner) / 2 + 1:
                ring_d = abs(d2 - (head2_r_outer + head2_r_inner) / 2) - (head2_r_outer - head2_r_inner) / 2
                jaw_angle = math.atan2(ly - head2_cy, lx)
                if not (math.pi - 0.7 < jaw_angle or jaw_angle < -math.pi + 0.4):
                    wrench_alpha = max(wrench_alpha, 1.0 - max(ring_d, 0))
            if d2 < head2_r_inner + 1 and ly > head2_cy - 5 and abs(lx) < shaft_width + 1:
                conn_d = max(abs(lx) - shaft_width, 0)
                wrench_alpha = max(wrench_alpha, 1.0 - conn_d)

            wrench_alpha = min(1.0, max(0.0, wrench_alpha))

            # Shadow under wrench
            shadow_offset = 2 * scale
            slx = (dx - cx) * cos_a - (dy - cy - shadow_offset) * sin_a
            sly = (dx - cx) * sin_a + (dy - cy - shadow_offset) * cos_a
            shadow_alpha = 0.0
            if abs(slx) < shaft_width + 2 and abs(sly) < shaft_half_len + 2:
                shadow_alpha = 0.15

            sd1 = dist(slx, sly, 0, head1_cy)
            if sd1 < head1_r_outer + 2:
                shadow_alpha = 0.15
            sd2 = dist(slx, sly, 0, head2_cy)
            if sd2 < head2_r_outer + 2:
                shadow_alpha = 0.15

            # Compose: shadow first, then wrench
            color = blend(bg, shadow, shadow_alpha * (1 - wrench_alpha))
            color = blend(color, white, wrench_alpha * 0.95)

            # Edge anti-aliasing for background
            if sdf_bg > -1.0:
                aa = max(0, min(1, 0.5 - sdf_bg))
                row.append((*color, int(aa * 255)))
            else:
                row.append((*color, 255))

        pixels.append(row)

    return pixels


def encode_png(pixels, size):
    """Encode RGBA pixels to PNG bytes."""
    raw_rows = []
    for row in pixels:
        raw = b'\x00'  # filter: none
        for r, g, b, a in row:
            raw += struct.pack('BBBB', r, g, b, a)
        raw_rows.append(raw)

    raw_data = b''.join(raw_rows)

    def chunk(ctype, data):
        c = ctype + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack('>I', len(data)) + c + crc

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)

    out = b'\x89PNG\r\n\x1a\n'
    out += chunk(b'IHDR', ihdr)
    out += chunk(b'IDAT', zlib.compress(raw_data, 9))
    out += chunk(b'IEND', b'')
    return out


if __name__ == '__main__':
    for s in [16, 48, 128]:
        print(f'Rendering {s}x{s}...')
        px = create_icon(s)
        data = encode_png(px, s)
        with open(f'icon{s}.png', 'wb') as f:
            f.write(data)
        print(f'  -> icon{s}.png ({len(data)} bytes)')
    print('Done!')
