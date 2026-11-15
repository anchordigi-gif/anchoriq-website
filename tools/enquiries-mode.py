"""Switch the website's enquiry buttons and forms between closed (marketing-only release) and open.

    python3 tools/enquiries-mode.py closed   # buttons say when enquiries open; forms show a notice and never submit
    python3 tools/enquiries-mode.py open     # original labels; forms submit to /api/forms/*

The server has its own switch (FORMS_OPEN=1 in deploy/compose.yaml); keep both the same.
"""
import glob, re, sys

# open label -> closed label (button and link text only)
LABELS = {
    'Book a demo': 'Demos open soon',
    'Join the 7-day trial waitlist': 'Trial waitlist opens soon',
    'Talk to sales': 'Sales enquiries open soon',
}

# open sentence -> closed sentence (running text, the homepage tour step, and the About title and description)
SENTENCES = {
    'By the size of your teams and the modules and connections you need. Book a demo and we will send a tailored proposal.':
        'By the size of your teams and the modules and connections you need. Once demo requests open, we will send a tailored proposal.',
    '["Book a demo", "", "", "See it on a call, with your own questions."]':
        '["Demos open soon", "", "", "See it on a call, with your own questions, once requests open."]',
    'Book a demo to see the current product and confirm which features and connections will be available for your rollout.':
        'Once demo requests open, we can show you the current product and confirm which features and connections will be available for your rollout.',
    'Book a demo to confirm which are available for your rollout.':
        'Once demo requests open, we can confirm which are available for your rollout.',
    'Join the waitlist and we will tell you when it opens.':
        'The waitlist opens soon; you will be able to join it on this page.',
    '>Tell us what you need to report on. We will show you AnchorIQ on a call and send a proposal sized to your teams, workspaces and connections.<':
        '>Once demo requests open, tell us what you need to report on. We will show you AnchorIQ on a call and send a proposal sized to your teams, workspaces and connections.<',
    'Tell us what you use when you book a demo.':
        'Once demo requests open, tell us what you use.',
    '<title>About AnchorIQ and book a demo | AnchorIQ</title>':
        '<title>About AnchorIQ | AnchorIQ</title>',
    'Read what we are building and book a demo.':
        'Read what we are building and when demo requests open.',
}

HEADER = r'(<a [^>]*class="btn"[^>]*min-height: 40px;[^>]*>)'

def main(mode):
    assert mode in ('open', 'closed')
    pairs = LABELS.items() if mode == 'closed' else [(c, o) for o, c in LABELS.items()]
    changed = 0
    for f in sorted(glob.glob('*.html')) + sorted(glob.glob('assets/pages/*.js')):  # templates and page components
        s = open(f).read(); o = s
        for a, b in (SENTENCES.items() if mode == 'closed' else [(c, o) for o, c in SENTENCES.items()]):
            s = s.replace(a, b)
        if mode == 'open':
            s = re.sub(HEADER + 'Demos soon(?=<)', r'\1Book a demo', s)
        for a, b in pairs:
            # only element text: ">Label<" (with or without a following arrow span)
            s = re.sub(r'>' + re.escape(a) + r'(?=<)', '>' + b, s)
        if mode == 'closed':
            # the header button (the only 40px .btn) has room for ~11 characters on a 360 px phone
            s = re.sub(HEADER + 'Demos open soon(?=<)', r'\1Demos soon', s)
        if s != o:
            open(f, 'w').write(s); changed += 1
    open('assets/site-config.js', 'w').write(
        '// Enquiry mode, set by tools/enquiries-mode.py. false: the demo and waitlist forms show a notice and never submit.\n'
        f'window.AIQ_ENQUIRIES_OPEN = {"true" if mode == "open" else "false"};\n')
    counts = {lbl: sum(open(f).read().count('>' + lbl) for f in glob.glob('*.html')) for pair in LABELS.items() for lbl in pair}
    print(f'mode={mode}; pages changed={changed}; label counts={counts}')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '')
