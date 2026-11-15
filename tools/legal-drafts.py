"""Single source for the Privacy and Terms drafts: writes the section paragraphs into the pages (keeping the
existing markup and styles) and the same text to legal/*.md for review. Fields in [BRACKETS] are unconfirmed."""
import re, os, html

BANNER = 'Draft for legal review. This text is not yet in force. Items in [square brackets] are still to be confirmed.'

PRIVACY = {
    'intro': 'How Anchor Digital handles personal information on the AnchorIQ website.',
    's1': ['The AnchorIQ website at anchoriq.io is run by [COMPANY LEGAL NAME], trading as Anchor Digital ("we"), registered at [REGISTERED ADDRESS] under [REGISTRATION NUMBER].',
           'Contact us about privacy at hello@anchordigi.com or on +971 50 907 8947.'],
    's2': ['When you book a demo or join the 7-day trial waitlist, we collect what you enter: your name, work email, company and industry, and, if you choose, your team size, main reporting challenge and a message. We also record which of the two forms you used, the page you sent it from and the time.',
           'When you open a page, our web server records your network address, the time, the page requested and whether it loaded. We use this only to keep the website secure and working.',
           'The website sets no cookies and runs no analytics, advertising or tracking tags. Its fonts and scripts are served from our own server, so opening a page does not send your details to other companies.'],
    's3': ['We use the details you send only to reply to you, arrange a walkthrough, prepare a proposal or tell you when the trial opens.',
           'We use your network address for a few minutes to stop repeated or automated submissions. It is not stored with your request.',
           'When a request is saved, we receive an email with its details so that we can reply. You do not receive automatic emails from the website.',
           'We do not sell personal information or use it for advertising.'],
    's4': ['The AnchorIQ platform is not yet available to customers. How it handles customer data will be set out in the customer agreement, and in this section, before it is. [CONFIRM: the data processing terms offered to customers.]'],
    's5': ['The website, the details you send through its forms and the server request logs are stored on a virtual private server that we rent from Hostinger, in its data centre in Mumbai, India. Hostinger provides the server and does not use the data for its own purposes. [CONFIRM: Hostinger contracting entity and its data processing terms.]',
           'The notification email about your request is sent and stored through our existing email service, Hostinger Email. [CONFIRM: Hostinger Email data location and terms.]',
           'Only our owner can read form submissions. We do not share your details with anyone else unless the law requires it.',
           '[CONFIRM: the legal basis for storing personal data in India for visitors outside India, including the UAE.]'],
    's6': ['Demo requests and waitlist signups are deleted 12 months after you send them, or sooner if you ask. The notification emails in our mailbox are deleted on the same schedule. [CONFIRM: mailbox deletion is done by hand or by a mail rule.]',
           'Server request logs are deleted after 14 days.',
           'Deletion runs automatically every day.'],
    's7': ['You can ask us to show you, correct or delete the personal information we hold about you by writing to hello@anchordigi.com. We will reply within [RESPONSE TIME].',
           '[CONFIRM: the data protection laws that apply to us and to our visitors, and any further rights they give.]'],
    's8': ['If we change this policy, we will update this page and the effective date below.',
           'Effective date: [EFFECTIVE DATE].'],
}
TERMS = {
    'intro': None,
    's1': ['These terms apply to the AnchorIQ website at anchoriq.io, operated by [COMPANY LEGAL NAME], trading as Anchor Digital, registered at [REGISTERED ADDRESS]. By using the website you agree to them.'],
    's2': ['The website describes the AnchorIQ platform. Dashboard screens and figures shown on it use fictional demo data, not the data of any customer.',
           'Features marked Planned are not available yet and may change or be withdrawn. Features marked Demo preview can be seen in a demonstration with sample data; they are not yet available to customers.'],
    's3': ['When you book a demo or join the 7-day trial waitlist, you agree to give accurate details. We use them as described in the Privacy Policy.',
           'Joining the waitlist does not create an account or any commitment on either side. We will contact you when the trial opens.'],
    's4': ['Access to the AnchorIQ platform, its plans, fees and service terms will be set out in a separate written agreement with each customer. [CONFIRM: the name of the customer agreement.]',
           'Prices on the website are planned launch packages. Your quote confirms the price and whether VAT applies.'],
    's5': ['The AnchorIQ name, logo, website content and software belong to Anchor Digital. You may not copy or reuse them without permission.',
           'Connections are described by category, such as CRM systems or advertising accounts. Naming a category does not mean that a particular product is supported.'],
    's6': ['The website is provided for information. We work to keep it accurate but do not promise it is free of errors.',
           '[CONFIRM: limitation of liability wording.]'],
    's7': ['[CONFIRM: governing law and courts.]'],
    's8': ['Questions about these terms: hello@anchordigi.com or +971 50 907 8947.',
           'Effective date: [EFFECTIVE DATE].'],
}

def apply(page, data):
    s = open(page).read()
    s, n = re.subn(r'(<p[^>]*>)Draft for legal review\.[^<]*</p>', lambda m: m.group(1) + html.escape(BANNER, quote=False) + '</p>', s)
    assert n == 1, page
    for sid, paras in data.items():
        if sid == 'intro':
            continue
        m = re.search(rf'(<article id="{sid}"[^>]*>.*?</h2>)(.*?)(</article>)', s, re.S)
        ptag = re.search(r'<p[^>]*>', m.group(2)).group(0)
        body = ''.join(ptag + html.escape(p, quote=False) + '</p>' for p in paras)
        s = s[:m.start(2)] + body + s[m.end(2):]
    if data.get('intro'):
        s, n = re.subn(r'How Anchor Digital handles personal information on the AnchorIQ website[^<]*', data['intro'], s)
        assert n >= 1
    open(page, 'w').write(s)

def markdown(title, page, data):
    s = open(page).read()
    out = [f'# {title} (draft)', '', f'_{BANNER}_', '']
    if data.get('intro'):
        out += [data['intro'], '']
    for sid, paras in data.items():
        if sid == 'intro':
            continue
        h = re.sub(r'<[^>]+>', '', re.search(rf'<article id="{sid}"[^>]*>.*?<h2[^>]*>(.*?)</h2>', s, re.S).group(1))
        out += [f'## {h[:2]}. {h[2:]}', ''] + [p + '\n' for p in paras]
    return '\n'.join(out)

if __name__ == '__main__':
    apply('Privacy.dc.html', PRIVACY)
    apply('Terms.dc.html', TERMS)
    os.makedirs('legal', exist_ok=True)
    open('legal/privacy-draft.md', 'w').write(markdown('Privacy Policy', 'Privacy.dc.html', PRIVACY))
    open('legal/terms-draft.md', 'w').write(markdown('Terms of Service', 'Terms.dc.html', TERMS))
    fields = sorted(set(re.findall(r'\[[A-Z][A-Z ]+\]|\[CONFIRM:[^\]]+\]', ' '.join(p for d in (PRIVACY, TERMS) for k, v in d.items() if k != 'intro' for p in v))))
    print('\n'.join(fields))
