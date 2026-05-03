// utils.js - Utility functions for Paint clone

const PaintUtils = {
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

    // Convert RGBA to hex
    rgbaToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },

    // HSL to RGB
    hslToRgb(h, s, l) {
        h = h / 360;
        s = s / 240;
        l = l / 240;
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
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

    // Bresenham's line algorithm - returns array of points
    bresenhamLine(x0, y0, x1, y1) {
        const points = [];
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            points.push({ x: x0, y: y0 });
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
        return points;
    },

    // Flood fill algorithm
    floodFill(imageData, startX, startY, fillColor, width, height) {
        const data = imageData.data;
        const startIdx = (startY * width + startX) * 4;
        const targetR = data[startIdx];
        const targetG = data[startIdx + 1];
        const targetB = data[startIdx + 2];
        const targetA = data[startIdx + 3];

        const fill = PaintUtils.hexToRgba(fillColor);

        // Don't fill if same color
        if (targetR === fill.r && targetG === fill.g && targetB === fill.b && targetA === fill.a) return;

        const stack = [[startX, startY]];
        const visited = new Uint8Array(width * height);

        const matches = (idx) => {
            return data[idx] === targetR &&
                   data[idx + 1] === targetG &&
                   data[idx + 2] === targetB &&
                   data[idx + 3] === targetA;
        };

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const pixelIdx = y * width + x;

            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            if (visited[pixelIdx]) continue;

            const idx = pixelIdx * 4;
            if (!matches(idx)) continue;

            visited[pixelIdx] = 1;
            data[idx] = fill.r;
            data[idx + 1] = fill.g;
            data[idx + 2] = fill.b;
            data[idx + 3] = fill.a;

            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
    },

    // Draw rectangle outline on canvas context
    drawRectOutline(ctx, x, y, w, h, lineWidth, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.stroke();
    },

    // Draw filled rectangle
    drawRectFilled(ctx, x, y, w, h, fillColor, strokeColor, lineWidth) {
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, w, h);
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth || 1;
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.stroke();
        }
    },

    // Draw ellipse outline
    drawEllipseOutline(ctx, cx, cy, rx, ry, lineWidth, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
        ctx.stroke();
    },

    // Draw filled ellipse
    drawEllipseFilled(ctx, cx, cy, rx, ry, fillColor, strokeColor, lineWidth) {
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
        ctx.fill();
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth || 1;
            ctx.stroke();
        }
    },

    // Draw rounded rectangle
    drawRoundRect(ctx, x, y, w, h, radius, lineWidth, color, fillColor) {
        const r = Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2);
        const x1 = Math.min(x, x + w);
        const y1 = Math.min(y, y + h);
        const aw = Math.abs(w);
        const ah = Math.abs(h);

        ctx.beginPath();
        ctx.moveTo(x1 + r, y1);
        ctx.lineTo(x1 + aw - r, y1);
        ctx.arcTo(x1 + aw, y1, x1 + aw, y1 + r, r);
        ctx.lineTo(x1 + aw, y1 + ah - r);
        ctx.arcTo(x1 + aw, y1 + ah, x1 + aw - r, y1 + ah, r);
        ctx.lineTo(x1 + r, y1 + ah);
        ctx.arcTo(x1, y1 + ah, x1, y1 + ah - r, r);
        ctx.lineTo(x1, y1 + r);
        ctx.arcTo(x1, y1, x1 + r, y1, r);
        ctx.closePath();

        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    },

    // Draw a point with size
    drawPoint(ctx, x, y, size, color) {
        ctx.fillStyle = color;
        if (size <= 1) {
            ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
        } else {
            const half = size / 2;
            ctx.fillRect(Math.floor(x - half), Math.floor(y - half), size, size);
        }
    },

    // Get pixel color at position
    getPixelColor(ctx, x, y) {
        const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
        return PaintUtils.rgbaToHex(pixel[0], pixel[1], pixel[2]);
    },

    // Airbrush spray pattern
    airbrushSpray(ctx, x, y, radius, density, color) {
        ctx.fillStyle = color;
        for (let i = 0; i < density; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            const px = Math.floor(x + Math.cos(angle) * dist);
            const py = Math.floor(y + Math.sin(angle) * dist);
            ctx.fillRect(px, py, 1, 1);
        }
    },

    // Clamp value
    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }
};
