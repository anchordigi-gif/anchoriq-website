"""Take the Privacy and Terms pages off the public site while they are unfinished, or put them back.

    python3 tools/policy-pages.py unpublish   # move both pages to legal/drafts/ (not served), remove their links
                                              # from every footer and form, and their sitemap entries
    python3 tools/policy-pages.py publish     # reverse it exactly (after the bracketed fields are filled)

What was removed is saved in legal/drafts/policy-links.json so publish restores the same markup.
Forms that collect personal data must not open without a published Privacy page (the release check enforces it).
"""
import glob, json, os, re, sys

PAGES = ['Privacy.dc.html', 'Terms.dc.html']
DRAFTS = 'legal/drafts'
STATE = f'{DRAFTS}/policy-links.json'
FOOTER = '<a class="nl" href="Privacy.dc.html">Privacy Policy</a><a class="nl" href="Terms.dc.html">Terms of Service</a>'
SENTENCE = re.compile(r' See the <a href="Privacy\.dc\.html"[^>]*>Privacy Policy</a>\.')
SITEMAP = [f'  <url><loc>https://anchoriq.io/{p}</loc><lastmod>2026-11-14</lastmod></url>\n' for p in PAGES]


def unpublish():
    assert all(os.path.exists(p) for p in PAGES), 'policy pages are not published'
    os.makedirs(DRAFTS, exist_ok=True)
    sentences = {}
    for f in sorted(glob.glob('*.html')):
        if f in PAGES:
            continue
        s = open(f).read()
        m = SENTENCE.findall(s)
        if m:
            sentences[f] = m
        s2 = SENTENCE.sub('', s.replace(FOOTER, ''))
        if s2 != s:
            open(f, 'w').write(s2)
    for p in PAGES:
        os.replace(p, f'{DRAFTS}/{p}')
    sm = open('sitemap.xml').read()
    for line in SITEMAP:
        assert line in sm, line
        sm = sm.replace(line, '')
    open('sitemap.xml', 'w').write(sm)
    json.dump({'sentences': sentences}, open(STATE, 'w'), indent=1)
    print(f'unpublished: {PAGES} -> {DRAFTS}/; footer links removed; {sum(len(v) for v in sentences.values())} form sentences removed; sitemap entries removed')


def publish():
    assert all(os.path.exists(f'{DRAFTS}/{p}') for p in PAGES), 'no drafts to publish'
    state = json.load(open(STATE))
    for f in sorted(glob.glob('*.html')):
        s = open(f).read()
        # the footer link pair sits right before the phone link in every footer
        tel = '<a class="nl" href="tel:+971509078947">'
        if FOOTER not in s and tel in s:
            i = s.rfind(tel)
            s = s[:i] + FOOTER + s[i:]
        for sent in state['sentences'].get(f, []):
            anchor = 'We use your details only to respond to this request.'
            if sent not in s:
                s = s.replace(anchor, anchor + sent, 1)
        open(f, 'w').write(s)
    for p in PAGES:
        os.replace(f'{DRAFTS}/{p}', p)
    sm = open('sitemap.xml').read()
    sm = sm.replace('</urlset>', ''.join(SITEMAP) + '</urlset>')
    open('sitemap.xml', 'w').write(sm)
    os.remove(STATE)
    if not os.listdir(DRAFTS):
        os.rmdir(DRAFTS)
    print('published: policy pages, footer links, form sentences and sitemap entries restored')


if __name__ == '__main__':
    {'unpublish': unpublish, 'publish': publish}[sys.argv[1]]()
