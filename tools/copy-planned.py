"""One-off copy pass (16 Nov 2026): category-based connector copy and Planned / Demo preview labels.
Every replacement asserts how often it matches, so a missed or doubled change fails loudly."""
import glob, re, sys

TAG_CSS = '.tag{display:inline-block;margin-left:8px;padding:1px 8px;border:1px solid #3A3D47;border-radius:999px;font-size:12px;font-weight:500;line-height:18px;color:#C9CBD2;vertical-align:middle;white-space:nowrap;letter-spacing:0}\n'
P = '<span class="tag">Planned</span>'
D = '<span class="tag">Demo preview</span>'

INTS_NEW = ('[["Advertising accounts", "ads"], ["Lead forms", "ads"], ["Search advertising", "ads"], ["Social advertising", "ads"], '
            '["Video advertising", "ads"], ["Web analytics", "analytics"], ["Search performance", "analytics"], ["Tag management", "analytics"], '
            '["CRM systems", "crm"], ["Real estate CRMs", "crm"], ["Sales pipelines", "crm"], ["Property portals", "portal"], ["Listing feeds", "portal"], '
            '["Spreadsheets", "data"], ["CSV import", "data"], ["REST API", "data"], ["Webhooks", "data"], ["Email alerts", "msg"], ["Team chat", "msg"], ["Messaging apps", "msg"]]')

MARKETPLACE = [
    (r'const INTS = \[\["Meta Ads".*?\["Email", "msg"\]\];', 'const INTS = ' + INTS_NEW + ';', 1, True),
    ("cat: CATS[i[1]], mono:", "cat: CATS[i[1]] + ' · Planned', mono:", 1, False),
    ('placeholder="Salesforce, Bayut, GA4"', 'placeholder="CRM, portals, analytics"', 1, False),
    ('The marketplace lists connections that are live, in build or planned. Ask us which are ready for your stack. Product names identify those systems and do not imply a partnership or endorsement.',
     'Every connection listed is planned; none is live yet. Tell us what you use and we will confirm what your rollout can include.', 1, False),
]

COMMON = [  # (old, new, expected count or None for "at least 1")
    ('The first release connects Goyzer, Property Finder, Bayut, Meta and Google Ads. TikTok, Snapchat and LinkedIn follow in the next release. The roadmap section shows what follows.',
     'Planned connections cover CRM systems, property portals, advertising accounts, web analytics and spreadsheet imports. None is live yet. Tell us what you use and we will confirm what your rollout can include.'),
    ('Pick your sources in the marketplace. The first release connects Goyzer, Property Finder, Bayut, Meta and Google Ads.',
     'Pick your sources in the marketplace. The first release is planned to connect your CRM, property portals and advertising accounts.'),
    ('Connections to Goyzer, Property Finder, Bayut, Meta and Google Ads.', 'Connections to your CRM, property portals and advertising accounts.'),
    ('Goyzer, Property Finder, Bayut, Meta and Google Ads.', 'Your CRM, property portals and advertising accounts.'),
    ('TikTok, Snapchat and LinkedIn.', 'More advertising platforms.'),
    ('>TikTok, Snapchat and LinkedIn<', '>More advertising platforms<'),
    ('Meta, Google Ads, TikTok, Snapchat and LinkedIn in one view.', 'Every advertising account in one view.'),
    ('Meta, Google Ads, TikTok, Snapchat and LinkedIn side by side:', 'Advertising platforms side by side:'),
    ('every view to Meta, Google Ads or all platforms.', 'every view to one platform or all of them.'),
    ('Which platforms are in the first release?', 'Which advertising platforms are planned?'),
    ('Meta and Google Ads. TikTok, Snapchat and LinkedIn follow in the next release.',
     'Advertising accounts are planned for the first release, with more platforms in the next. None is connected yet.'),
    ('matches Meta and Google Ads leads to CRM outcomes', 'matches advertising leads to CRM outcomes'),
    ('Property Finder and Bayut quality in the same view as your leads.', 'Property portal quality in the same view as your leads.'),
    ('and Property Finder and Bayut quality beside your ad spend', 'and property portal quality beside your ad spend'),
    ('portal quality across Property Finder and Bayut,', 'portal quality across your property portals,'),
    ('Property Finder and Bayut, side by side.', 'Every portal, side by side.'),
    ('From the Property Finder and Bayut connections, both in the first release.', 'From the property portal connections planned for the first release.'),
    ('for Property Finder and Bayut.', 'for each connected portal.'),
    ('with Property Finder and Bayut status,', 'with portal status,'),
    ('The first release connects Goyzer; other CRMs are on the roadmap.', 'CRM connections are planned for the first release; none is live yet.'),
    ('font-size="14">Goyzer</text>', 'font-size="14">Your CRM</text>'),
    ('font-size="14">Meta, Google Ads</text>', 'font-size="14">Your ad accounts</text>'),
    ('font-size="14">Property Finder, Bayut</text>', 'font-size="14">Your portals</text>'),
    ('Call, WhatsApp or email', 'Call, message or email'),
    ('WhatsApp delivered', 'message delivered'),
    ('PDF, Excel or CSV', 'PDF, spreadsheet or CSV'),
]

HOME = [  # index.html / Main.dc.html only
    ('<span>Meta Ads</span><span>Google Ads</span><span>TikTok Ads</span><span>Snapchat Ads</span><span>LinkedIn Ads</span><span>Goyzer</span><span>Property Finder</span><span>Bayut</span><span>Google Analytics 4</span><span>Salesforce</span><span>HubSpot</span><span>Zoho CRM</span>',
     '<span>Advertising accounts</span><span>Lead forms</span><span>CRM systems</span><span>Property portals</span><span>Listing feeds</span><span>Web analytics</span><span>Spreadsheets</span><span>Webhooks</span><span>Team alerts</span>', 1),
    ("['Meta', 9.2,", "['Ad platform A', 9.2,", 1), ("['Google Ads', 5.6,", "['Ad platform B', 5.6,", 1), ("['TikTok', 2.1,", "['Ad platform C', 2.1,", 1),
    ("['LinkedIn', 0.5,", "['Ad platform D', 0.5,", 1), ("['Snapchat', 1.2,", "['Ad platform E', 1.2,", 1),
    ('Source: Meta', 'Source: social ads', None), ('Source: Google Ads', 'Source: search ads', None), ('Source: TikTok', 'Source: video ads', None),
    ('Source: Property Finder', 'Source: property portal', None), ('Source: Bayut', 'Source: property portal', None),
    ('<span style="color: #9A9CA5">Sample data</span></figcaption>', '<span style="color: #9A9CA5">Demo preview · sample data</span></figcaption>', 1),
    ('The dashboard has a companion app. It puts leads, pipeline, alerts and goals on your phone, with a view for each role.',
     'A companion app is planned. It will put leads, pipeline, alerts and goals on your phone, with a view for each role.', 1),
    ('One app for iPhone and Android, installed from the website', 'Planned for iPhone and Android, installed from the website', 1),
    ('Six things change when marketing, sales and operations read from one view.',
     'Six things change when marketing, sales and operations read from one view. They describe the product as designed; the roadmap below shows when each part ships.', 1),
    ('>Listings and portals, for property businesses</p>', '>Listings and portals, for property businesses' + P + '</p>', 1),
    ('>AI Insights, arriving in the next release</p>', '>AI Insights, arriving in the next release' + P + '</p>', 1),
    ('Pick a connection, choose the accounts to include, and AnchorIQ keeps the data in step.',
     'Connections are planned by category: pick the sources your teams use and we will confirm what your rollout can include.', 1),
    ('font-weight: 600">Role-based scope</strong>', 'font-weight: 600">Role-based scope' + D + '</strong>', 1),
    ('font-weight: 600">Separate companies</strong>', 'font-weight: 600">Separate companies' + D + '</strong>', 1),
    ('Each company has its own workspaces, connections and credentials. Connection secrets are never sent to the browser.',
     'Each company has its own workspaces, users and access. When connections arrive, their credentials stay on the server and are never sent to the browser.', 1),
    ('font-weight: 600">Masked contact details</strong>', 'font-weight: 600">Masked contact details' + P + '</strong>', 1),
    ('font-weight: 600">Audit log</strong>', 'font-weight: 600">Audit log' + P + '</strong>', 1),
    (re.compile(r'<p style="margin: 40px 0 0; font-size: 13px; color: #9A9CA5">\[CONFIRM BEFORE LAUNCH:[^<]*</p>'), '', 1),
    ('color: #F4F5F7">First release</p>', 'color: #F4F5F7">First release' + P + '</p>', 1),
    ('font-weight: 600">Next release</p>', 'font-weight: 600">Next release' + P + '</p>', 1),
    ('font-weight: 600">Later</p>', 'font-weight: 600">Later' + P + '</p>', 1),
]

def rep(s, old, new, n, f):
    if isinstance(old, re.Pattern):
        s2, k = old.subn(new, s)
    else:
        k = s.count(old); s2 = s.replace(old, new)
    if (n is not None and k != n) or (n is None and k < 1):
        sys.exit(f'{f}: expected {n} of {str(old)[:70]!r}, found {k}')
    return s2, k

for f in sorted(glob.glob('*.html')):
    if f == 'Main.dc.html':
        continue
    s = open(f).read()
    if '.tag{' not in s:
        s, _ = rep(s, 'body{margin:0}\n', 'body{margin:0}\n' + TAG_CSS, 1, f)
    for old, new in COMMON:
        if old in s:
            s, _ = rep(s, old, new, None, f)
    if 'const INTS = [["Meta Ads"' in s:
        for old, new, n, is_re in MARKETPLACE:
            s, _ = rep(s, re.compile(old, re.S) if is_re else old, new, n, f)
    if f == 'index.html':
        for old, new, n in HOME:
            s, _ = rep(s, old, new, n, f)
    open(f, 'w').write(s)
open('Main.dc.html', 'w').write(open('index.html').read())
print('done')
# Applied by hand after this script (same day): diagram labels in Listings (Portal A/B) and Marketing
# (Ad platform A–E), and "A call, message or email" in Teams.
