"""Replace company-specific words in the mobile-app mockups with the fictional demo's names, keeping the design.

For each edit: find the original text's ink inside a box, derive the Inter size from the ink height and the
weight (or, for tracked capitals, the letter spacing) from the ink width, sample text and background colours,
erase with a per-row fill between the left and right edges, and draw the new text at the same baseline.
Run: python3 tools/retext-mockups.py <source assets dir> <output dir>
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT = os.path.expanduser('~/Desktop/AnchorIQ/node_modules/.pnpm/@fontsource-variable+inter@5.3.0/node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')

def font(size, weight):
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_axes([weight])
    return f

def dist(a, b):
    return sum(abs(x - y) for x, y in zip(a[:3], b[:3]))

def ink_bbox(im, box, bg):
    x0, y0, x1, y1 = box
    px = im.load(); xs, ys = [], []
    # half of this text's own contrast: JPEG halos and anti-aliasing stay outside the box
    thr = 0.5 * max(dist(px[x, y], bg) for y in range(y0, y1) for x in range(x0, x1))
    for y in range(y0, y1):
        for x in range(x0, x1):
            if dist(px[x, y], bg) > thr:
                xs.append(x); ys.append(y)
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1

def text_ink(f, s, track=0.0):
    """Ink bbox of s drawn at baseline (0,0), with optional extra spacing per character."""
    if not track:
        return f.getbbox(s, anchor='ls')
    x = 0; l = t = 10**6; r = b = -10**6
    for ch in s:
        bb = f.getbbox(ch, anchor='ls')
        if ch.strip():
            l, t, r, b = min(l, x + bb[0]), min(t, bb[1]), max(r, x + bb[2]), max(b, bb[3])
        x += f.getlength(ch) + track
    return l, t, r, b

def draw_text(d, xy, s, f, fill, track=0.0):
    if not track:
        d.text(xy, s, font=f, fill=fill, anchor='ls'); return
    x, y = xy
    for ch in s:
        d.text((x, y), ch, font=f, fill=fill, anchor='ls'); x += f.getlength(ch) + track

def edit(im, box, old, new, align='left', weight=None, tracked=False, size=None):
    x0, y0, x1, y1 = box
    px = im.load()
    bg = px[x0 + 1, y0 + 1]
    l, t, r, b = ink_bbox(im, box, bg)
    # size from ink height of the original string (measured at 100 px, then scaled)
    probe = font(100, weight or 500)
    pb = text_ink(probe, old)
    if size is None:   # weight known: the ink width (~200 px) pins the size far better than the height (~14 px)
        size = 100 * (r - l) / (pb[2] - pb[0]) if not tracked else 100 * (b - t) / (pb[3] - pb[1])
    track = 0.0
    if tracked:
        weight = weight or 600
        f = font(size, weight)
        w0 = text_ink(f, old)[2] - text_ink(f, old)[0]
        track = ((r - l) - w0) / max(1, len(old) - 1)
    elif weight is None:
        weight = min(range(300, 801, 50), key=lambda w: abs((lambda bb: bb[2] - bb[0])(text_ink(font(size, w), old)) - (r - l)))
    f = font(size, weight)
    ob = text_ink(f, old, track)
    baseline = t - ob[1]
    # text colour: the ink pixel furthest from the background
    colour = max((px[x, y] for y in range(t, b) for x in range(l, r)), key=lambda c: dist(c, bg))
    # erase: per-row interpolation between the columns just outside the ink
    el, er = l - 3, r + 3
    for y in range(t - 3, b + 3):
        avg = lambda xs: tuple(round(sum(px[x, y][i] for x in xs) / len(xs)) for i in range(3))
        a, c = avg(range(el - 6, el - 3)), avg(range(er + 4, er + 7))   # clear of anti-aliasing
        for x in range(el, er + 1):
            k = (x - el) / max(1, er - el)
            px[x, y] = tuple(round(a[i] + (c[i] - a[i]) * k) for i in range(3))
    nb = text_ink(f, new, track)
    if align == 'left':
        x = l - nb[0]
    else:  # centre on the original's centre (or on a given x)
        cx = (l + r) / 2 if align == 'center' else align
        x = cx - (nb[0] + nb[2]) / 2
    d = ImageDraw.Draw(im)
    draw_text(d, (x, baseline), new, f, colour, track)
    return dict(size=round(size, 1), weight=weight, height_ratio=round((b - t) / (ob[3] - ob[1]), 3), track=round(track, 2), new_right=round(x + nb[2]))

PF, LB = 'HomeFinder', 'Lighthouse Bay'
EDITS = {
    '0eab5107b7ddacdc07e46140b1796d2e': [((150, 270, 405, 302), 'Pakistan · Property Finder', 'Pakistan · ' + PF, {'weight': 400}),
                                          ((255, 490, 385, 522), 'WhatsApp', 'Message', {'align': 'center', 'weight': 600}),
                                          ((218, 785, 548, 815), 'Villa · Palm Jumeirah · AED 10M+', 'Villa · ' + LB + ' · AED 10M+', {'weight': 400}),
                                          ((218, 826, 378, 856), 'Property Finder', PF, {'weight': 400})],
    '63d4b0f57bb58e30b720775667043094': [((28, 99, 280, 124), 'DUBAI · LIVE PIPELINE', 'MARINA · LIVE PIPELINE', {'tracked': True})],
    'e3711ed3d5b8e2f9ad6175ff988d5dd3': [((160, 224, 398, 253), 'Marina Residence 3', 'Kings Wharf 3', {'weight': 700}),
                                          ((160, 257, 415, 285), 'Sofia Rossi · Dubai Marina', 'Sofia Rossi · Marina District', {'weight': 400}),
                                          ((160, 366, 330, 395), 'Golden Mile 5', 'Harbour Point 5', {'weight': 700}),
                                          ((160, 399, 430, 428), 'Daniel Reid · Palm Jumeirah', 'Daniel Reid · ' + LB, {'weight': 400}),
                                          ((160, 508, 430, 537), 'Garden Homes Frond E', 'Cedar Park Villas E', {'weight': 700}),
                                          ((160, 541, 422, 570), 'Ravi Saleh · Palm Jumeirah', 'Ravi Saleh · ' + LB, {'weight': 400})],
    '1a8ca1ead543c19fcc8e087e13caa903': [((28, 99, 200, 124), 'DUBAI · LEADS', 'MARINA · LEADS', {'tracked': True}),
                                          ((135, 490, 462, 519), 'Russia · Property Finder · 559999', 'Russia · ' + PF + ' · 559999', {'weight': 400}),
                                          ((135, 590, 370, 619), 'Russia · Bayut · 559998', 'Russia · Nestly · 559998', {'weight': 400}),
                                          ((135, 690, 392, 719), 'Germany · Bayut · 559995', 'Germany · Nestly · 559995', {'weight': 400}),
                                          ((135, 790, 428, 819), 'UK · Property Finder · 559994', 'UK · ' + PF + ' · 559994', {'weight': 400}),
                                          ((135, 890, 497, 919), 'Saudi Arabia · Property Finder · 559', 'Saudi Arabia · ' + PF + ' · 559992', {'weight': 400, 'size': 19.7}),  # original ends in an ellipsis
                                          ((135, 990, 444, 1019), 'India · Property Finder · 559989', 'India · ' + PF + ' · 559989', {'weight': 400}),
                                          ((135, 1090, 444, 1119), 'Pakistan · Property Finder · 55', 'Pakistan · ' + PF + ' · 559987', {'weight': 400, 'size': 19.7})],  # original ends in an ellipsis
    '4f0036ea70fb7f083be84f073c9df68a': [((80, 728, 440, 757), 'Bayut sync failed: credentials missing', 'Nestly sync failed: credentials missing', {'weight': 400})],
    'b477187c2134d2e1246711712b4747a4': [((110, 427, 368, 455), 'New lead · Property Finder', 'New lead · ' + PF, {'weight': 400}),
                                          ((110, 672, 452, 702), 'Viewing · Marina Residence 3', 'Viewing · Kings Wharf 3', {'weight': 700}),
                                          ((110, 847, 358, 875), 'Qualified · Palm Jumeirah', 'Qualified · ' + LB, {'weight': 400})],
    'd8761e60cb19e7b9fc65a885d058d050': [((50, 963, 315, 994), 'Leads · Palm Jumeirah', 'Leads · ' + LB, {'weight': 700})],
    'eada25da5f8f31503f3f0318f71ea88c': [((50, 376, 520, 403), 'September 2026 · Dubai · summary of 4 changes', 'September 2026 · Marina · summary of 4 changes', {'weight': 400}),
                                          ((93, 482, 530, 511), 'Leads up 18% after the Meta off-plan', 'Leads up 18% after the social off-plan', {'weight': 700})],
}
# Home: the whole workspace pill label is redrawn centred in its pill (the original ends in a ▾ glyph).
HOME = '639f14dd63442d729a4f5f6f8a539639'

def main(src, out):
    os.makedirs(out, exist_ok=True)
    report = {}
    for h, edits in EDITS.items():
        im = Image.open(f'{src}/{h}.jpg').convert('RGB')
        report[h] = [edit(im, box, old, new, **kw) for box, old, new, kw in edits]
        im.save(f'{out}/{h}.png')
    # Home pill: "Dubai workspace ▾" -> "All workspaces ▾" (the demo's default view), centred in the pill
    im = Image.open(f'{src}/{HOME}.jpg').convert('RGB')
    info = edit(im, (48, 110, 252, 146), 'Dubai workspace', 'All workspaces', align=148, weight=500)
    d = ImageDraw.Draw(im); px = im.load()
    # the original ends in a small down-pointing triangle: redraw it after the label
    tx, ty = info['new_right'] + 9, 128
    d.polygon([(tx, ty - 3), (tx + 10, ty - 3), (tx + 5, ty + 3)], fill=(244, 245, 247))
    report[HOME] = [info]
    im.save(f'{out}/{HOME}.png')
    # Record outcome: the blurred lead card behind the sheet repeats "Pakistan · Property Finder".
    # Rebuild that strip from the edited lead detail, blurred and dimmed to match the original backdrop.
    lead_old = Image.open(f'{src}/0eab5107b7ddacdc07e46140b1796d2e.jpg').convert('RGB')
    lead_new = Image.open(f'{out}/0eab5107b7ddacdc07e46140b1796d2e.png').convert('RGB')
    rec = Image.open(f'{src}/a95d859458f86d4c4bf7ad13e8633016.jpg').convert('RGB')
    region = (140, 262, 420, 308)
    best = None
    for radius in (4, 5, 6, 7, 8, 9, 10):
        bo = lead_old.filter(ImageFilter.GaussianBlur(radius)).crop((40, 180, 600, 440))
        tgt = rec.crop((40, 180, 600, 440))
        # per-channel linear fit tgt = a*bo + c over the patch
        fit = []
        for ch in range(3):
            xs = list(bo.get_flattened_data(band=ch)); ys = list(tgt.get_flattened_data(band=ch)); n = len(xs)
            mx, my = sum(xs) / n, sum(ys) / n
            a = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / max(1e-6, sum((x - mx) ** 2 for x in xs)); fit.append((a, my - a * mx))
        err = sum(abs(fit[ch][0] * x + fit[ch][1] - y) for ch in range(3) for x, y in zip(bo.get_flattened_data(band=ch), tgt.get_flattened_data(band=ch)))
        if best is None or err < best[0]:
            best = (err, radius, fit)
    _, radius, fit = best
    bn = lead_new.filter(ImageFilter.GaussianBlur(radius)).crop(region)
    bn = Image.merge('RGB', [bn.getchannel(c).point(lambda v, c=c: max(0, min(255, round(fit[c][0] * v + fit[c][1])))) for c in range(3)])
    rec.paste(bn, region[:2])
    rec.save(f'{out}/a95d859458f86d4c4bf7ad13e8633016.png')
    report['a95d859458f86d4c4bf7ad13e8633016'] = [{'blur_radius': radius}]
    for h, r in report.items():
        print(h[:8], r)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
