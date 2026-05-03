// utils.js - Utility functions for Paint clone (performance-optimized)

const PaintUtils = {
    // Pre-allocated buffers for bresenham (avoid GC pressure)
    _lineBuf: null,
    _lineBufSize: 0,

    // Convert hex color to RGBA object
    hexToRgba(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        }
        return {
            r: parseInt(hex.substr(0, 2), 16),
            g: parseInt(hex.substr(2, 2), 16),
            b: parseInt(hex.substr(4, 2), 16),
            a: 255
        };
    },

    // Fast hex parse (no object allocation)
    hexToRgbValues(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        return [
            parseInt(hex.substr(0, 2), 16),
            parseInt(hex.substr(2, 2), 16),
            parseInt(hex.substr(4, 2), 16)
        ];
    },

    // Convert RGBA to hex
    rgbaToHex(r, g, b) {
        return '#' + (
            ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b))
            .toString(16).slice(1)
        );
    },

    // HSL to RGB
    hslToRgb(h, s, l) {
        h /= 360; s /= 240; l /= 240;
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = PaintUtils._hue2rgb(p, q, h + 1/3);
            g = PaintUtils._hue2rgb(p, q, h);
            b = PaintUtils._hue2rgb(p, q, h - 1/3);
        }
        return {
            r: (r * 255 + 0.5) | 0,
            g: (g * 255 + 0.5) | 0,
            b: (b * 255 + 0.5) | 0
        };
    },

    _hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    },

    // RGB to HSL
    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return {
            h: Math.round(h * 360),
            s: Math.round(s * 240),
            l: Math.round(l * 240)
        };
    },

    // Bresenham's line - draws directly via callback (zero allocation)
    bresenhamLine(x0, y0, x1, y1, callback) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            callback(x0, y0);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    },

    // Scanline flood fill (much faster than pixel-by-pixel DFS)
    floodFill(imageData, startX, startY, fillColor, width, height) {
        const data = imageData.data;
        const sx = startX | 0, sy = startY | 0;
        if (sx < 0 || sx >= width || sy < 0 || sy >= height) return;

        const startIdx = (sy * width + sx) * 4;
        const targetR = data[startIdx];
        const targetG = data[startIdx + 1];
        const targetB = data[startIdx + 2];
        const targetA = data[startIdx + 3];

        const [fR, fG, fB] = PaintUtils.hexToRgbValues(fillColor);

        // Don't fill if same color
        if (targetR === fR && targetG === fG && targetB === fB && targetA === 255) return;

        const visited = new Uint8Array(width * height);
        const stack = [sx, sy]; // flat array: [x1, y1, x2, y2, ...]

        const matches = (idx) => {
            return data[idx] === targetR &&
                   data[idx + 1] === targetG &&
                   data[idx + 2] === targetB &&
                   data[idx + 3] === targetA;
        };

        while (stack.length > 0) {
            const y = stack.pop();
            const x = stack.pop();

            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            const pixelIdx = y * width + x;
            if (visited[pixelIdx]) continue;
            const idx = pixelIdx * 4;
            if (!matches(idx)) continue;

            // Scan right
            let rx = x;
            while (rx < width) {
                const ri = (y * width + rx) * 4;
                if (!matches(ri) || visited[y * width + rx]) break;
                rx++;
            }
            // Scan left
            let lx = x - 1;
            while (lx >= 0) {
                const li = (y * width + lx) * 4;
                if (!matches(li) || visited[y * width + lx]) break;
                lx--;
            }
            lx++;

            // Fill the span and push neighbors
            for (let cx = lx; cx < rx; cx++) {
                const ci = (y * width + cx) * 4;
                visited[y * width + cx] = 1;
                data[ci] = fR;
                data[ci + 1] = fG;
                data[ci + 2] = fB;
                data[ci + 3] = 255;

                // Push above and below
                if (y > 0 && !visited[(y - 1) * width + cx]) {
                    stack.push(cx, y - 1);
                }
                if (y < height - 1 && !visited[(y + 1) * width + cx]) {
                    stack.push(cx, y + 1);
                }
            }
        }
    },

    // Get pixel color at position (optimized single-pixel read)
    getPixelColor(ctx, x, y) {
        const d = ctx.getImageData(x | 0, y | 0, 1, 1).data;
        return PaintUtils.rgbaToHex(d[0], d[1], d[2]);
    },

    // Airbrush spray pattern
    airbrushSpray(ctx, x, y, radius, density, color) {
        ctx.fillStyle = color;
        const r2 = radius * radius;
        for (let i = 0; i < density; i++) {
            const angle = Math.random() * 6.2832; // 2*PI
            const dist = Math.random() * radius;
            ctx.fillRect(
                (x + Math.cos(angle) * dist) | 0,
                (y + Math.sin(angle) * dist) | 0,
                1, 1
            );
        }
    },

    // Clamp value
    clamp(val, min, max) {
        return val < min ? min : val > max ? max : val;
    },

    // DOM element cache
    _elCache: {},
    el(id) {
        return PaintUtils._elCache[id] || (PaintUtils._elCache[id] = document.getElementById(id));
    }
};
