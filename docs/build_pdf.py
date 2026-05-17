"""Build the unGhost production-readiness PDF for tech-head review."""
from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, Preformatted, ListFlowable, ListItem, HRFlowable,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfgen import canvas as _canvas

OUTPUT = "/Users/sidbhor/Downloads/Unghostt/docs/unghost-production-readiness.pdf"

# ---------- Style palette ----------
BRAND = colors.HexColor("#0191FC")
BRAND_DARK = colors.HexColor("#3454DA")
INK = colors.HexColor("#0B1626")
MUTED = colors.HexColor("#5A6478")
SOFT = colors.HexColor("#EAF4FE")
LINE = colors.HexColor("#D6DDE8")
SUCCESS = colors.HexColor("#10B981")
WARN = colors.HexColor("#D97706")
DANGER = colors.HexColor("#E11D48")
CODEBG = colors.HexColor("#F4F6FA")


def make_styles():
    base = getSampleStyleSheet()
    s = {}
    s["title"] = ParagraphStyle(
        "Title", parent=base["Title"], fontName="Helvetica-Bold",
        fontSize=34, leading=40, textColor=INK, spaceAfter=8,
    )
    s["subtitle"] = ParagraphStyle(
        "Subtitle", parent=base["Normal"], fontName="Helvetica",
        fontSize=14, leading=20, textColor=MUTED, alignment=TA_LEFT,
    )
    s["h1"] = ParagraphStyle(
        "H1", parent=base["Heading1"], fontName="Helvetica-Bold",
        fontSize=22, leading=28, textColor=BRAND, spaceBefore=18,
        spaceAfter=10, keepWithNext=True,
    )
    s["h2"] = ParagraphStyle(
        "H2", parent=base["Heading2"], fontName="Helvetica-Bold",
        fontSize=15, leading=20, textColor=INK, spaceBefore=14,
        spaceAfter=6, keepWithNext=True,
    )
    s["h3"] = ParagraphStyle(
        "H3", parent=base["Heading3"], fontName="Helvetica-Bold",
        fontSize=11.5, leading=16, textColor=BRAND_DARK, spaceBefore=10,
        spaceAfter=4, keepWithNext=True,
    )
    s["body"] = ParagraphStyle(
        "Body", parent=base["Normal"], fontName="Helvetica",
        fontSize=10.5, leading=15.5, textColor=INK,
        alignment=TA_JUSTIFY, spaceAfter=8,
    )
    s["bodyTight"] = ParagraphStyle(
        "BodyTight", parent=base["Normal"], fontName="Helvetica",
        fontSize=10.5, leading=15, textColor=INK, alignment=TA_LEFT,
        spaceAfter=4,
    )
    s["bullet"] = ParagraphStyle(
        "Bullet", parent=base["Normal"], fontName="Helvetica",
        fontSize=10.5, leading=15, textColor=INK,
        leftIndent=14, bulletIndent=2, spaceAfter=3,
    )
    s["caption"] = ParagraphStyle(
        "Caption", parent=base["Normal"], fontName="Helvetica-Oblique",
        fontSize=9, leading=12, textColor=MUTED, spaceAfter=10,
    )
    s["code"] = ParagraphStyle(
        "Code", parent=base["Code"], fontName="Courier",
        fontSize=7.4, leading=10, textColor=INK, backColor=CODEBG,
        leftIndent=6, rightIndent=6, spaceBefore=4, spaceAfter=10,
        borderPadding=6,
    )
    s["cell"] = ParagraphStyle(
        "Cell", parent=base["Normal"], fontName="Helvetica",
        fontSize=9, leading=12, textColor=INK, alignment=TA_LEFT,
        spaceBefore=0, spaceAfter=0,
    )
    s["cellHeader"] = ParagraphStyle(
        "CellHeader", parent=base["Normal"], fontName="Helvetica-Bold",
        fontSize=9.5, leading=12, textColor=colors.white, alignment=TA_LEFT,
        spaceBefore=0, spaceAfter=0,
    )
    s["callout"] = ParagraphStyle(
        "Callout", parent=base["Normal"], fontName="Helvetica",
        fontSize=10, leading=14, textColor=INK, backColor=SOFT,
        leftIndent=10, rightIndent=10, spaceBefore=6, spaceAfter=10,
        borderPadding=8,
    )
    s["tocTitle"] = ParagraphStyle(
        "TOCTitle", parent=base["Heading1"], fontName="Helvetica-Bold",
        fontSize=22, leading=26, textColor=INK, spaceAfter=14,
    )
    s["centerTitle"] = ParagraphStyle(
        "CenterTitle", parent=base["Title"], fontName="Helvetica-Bold",
        fontSize=44, leading=52, textColor=INK, alignment=TA_CENTER,
        spaceAfter=14,
    )
    s["centerSub"] = ParagraphStyle(
        "CenterSub", parent=base["Normal"], fontName="Helvetica",
        fontSize=15, leading=22, textColor=MUTED, alignment=TA_CENTER,
        spaceAfter=8,
    )
    s["centerBrand"] = ParagraphStyle(
        "CenterBrand", parent=base["Normal"], fontName="Helvetica-Bold",
        fontSize=12, leading=18, textColor=BRAND, alignment=TA_CENTER,
        spaceAfter=4,
    )
    return s


STYLES = make_styles()


def h1(text, anchor=None):
    p = Paragraph(text, STYLES["h1"])
    if anchor:
        p._bookmarkName = anchor
    return p


def h2(text):
    return Paragraph(text, STYLES["h2"])


def h3(text):
    return Paragraph(text, STYLES["h3"])


def body(text):
    return Paragraph(text, STYLES["body"])


def tight(text):
    return Paragraph(text, STYLES["bodyTight"])


def cap(text):
    return Paragraph(text, STYLES["caption"])


def callout(text):
    return Paragraph(text, STYLES["callout"])


def code(text):
    return Preformatted(text, STYLES["code"])


def bullets(items):
    flow = ListFlowable(
        [ListItem(Paragraph(t, STYLES["bullet"]), leftIndent=10) for t in items],
        bulletType="bullet",
        leftIndent=8,
        bulletColor=BRAND,
        bulletFontSize=10,
        spaceBefore=4,
        spaceAfter=8,
    )
    return flow


def numbered(items):
    return ListFlowable(
        [ListItem(Paragraph(t, STYLES["bullet"]), leftIndent=10) for t in items],
        bulletType="1",
        leftIndent=8,
        bulletColor=BRAND_DARK,
        bulletFontSize=10,
        spaceBefore=4,
        spaceAfter=8,
    )


def _wrap_cell(val, is_header):
    """Wrap a cell's value in a Paragraph so reportlab word-wraps it."""
    if isinstance(val, (Paragraph, Table)):
        return val
    style = STYLES["cellHeader"] if is_header else STYLES["cell"]
    return Paragraph(str(val), style)


def styled_table(data, col_widths=None, header_color=BRAND, zebra=True):
    wrapped = []
    for r, row in enumerate(data):
        wrapped.append([_wrap_cell(c, is_header=(r == 0)) for c in row])
    t = Table(wrapped, colWidths=col_widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), header_color),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.25, LINE),
    ]
    if zebra:
        for r in range(1, len(wrapped)):
            if r % 2 == 0:
                style.append(("BACKGROUND", (0, r), (-1, r), CODEBG))
    t.setStyle(TableStyle(style))
    return t


# ---------- Page decoration ----------
def _draw_page_chrome(canvas, doc):
    canvas.saveState()
    # Header rule
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.4)
    canvas.line(2 * cm, A4[1] - 1.6 * cm, A4[0] - 2 * cm, A4[1] - 1.6 * cm)
    # Header text
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(2 * cm, A4[1] - 1.3 * cm, "unGhost.com — Production Readiness")
    canvas.drawRightString(
        A4[0] - 2 * cm, A4[1] - 1.3 * cm, "Confidential — for tech-head review"
    )
    # Footer
    canvas.setStrokeColor(LINE)
    canvas.line(2 * cm, 1.6 * cm, A4[0] - 2 * cm, 1.6 * cm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(2 * cm, 1.2 * cm, date.today().isoformat())
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.restoreState()


def _draw_cover(canvas, doc):
    canvas.saveState()
    # Big colour block at top-left
    canvas.setFillColor(BRAND)
    canvas.rect(0, A4[1] - 5 * cm, A4[0] / 2.2, 5 * cm, fill=1, stroke=0)
    canvas.setFillColor(BRAND_DARK)
    canvas.rect(A4[0] - 4 * cm, 0, 4 * cm, 4 * cm, fill=1, stroke=0)
    # Footer rule
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.4)
    canvas.line(2 * cm, 1.6 * cm, A4[0] - 2 * cm, 1.6 * cm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(2 * cm, 1.2 * cm, "Confidential")
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, date.today().isoformat())
    canvas.restoreState()


# ---------- Cover ----------
def cover_page():
    return [
        Spacer(1, 6 * cm),
        Paragraph("unGhost.com", STYLES["centerBrand"]),
        Paragraph("Production-Readiness Plan", STYLES["centerTitle"]),
        Paragraph(
            "An honest assessment of the current build, a roadmap from prototype to enterprise application, and a detailed Cloudflare deployment guide.",
            STYLES["centerSub"],
        ),
        Spacer(1, 1.5 * cm),
        HRFlowable(width="40%", thickness=1, color=BRAND, hAlign="CENTER"),
        Spacer(1, 0.6 * cm),
        Paragraph(
            f"Version 1.0 &nbsp;·&nbsp; {date.today().strftime('%B %d, %Y')}",
            STYLES["centerSub"],
        ),
        Paragraph("Prepared for the unGhost technical leadership team.", STYLES["centerSub"]),
        PageBreak(),
    ]


# ---------- Table of contents (manual, but professional) ----------
def toc():
    return [
        Paragraph("Table of contents", STYLES["tocTitle"]),
        Spacer(1, 0.3 * cm),
        styled_table(
            [
                ["#", "Section", "Page"],
                ["", "Executive summary", "3"],
                ["1", "Current state and gaps — real business risk", "5"],
                ["2", "Enterprise scaling to 10,000 users", "10"],
                ["3", "Prototype vs production gap analysis", "14"],
                ["4", "Design system swap plan", "18"],
                ["5", "Code structure for new engineers", "21"],
                ["6", "Frontend / backend split decision", "26"],
                ["7", "Cloudflare deployment architecture", "29"],
                ["8", "CI/CD pipeline and deployment guide", "36"],
                ["9", "8-week hardening roadmap", "42"],
                ["A", "Appendix — cost matrix, service inventory, glossary", "46"],
            ],
            col_widths=[1.2 * cm, 12.2 * cm, 2 * cm],
        ),
        PageBreak(),
    ]


# ---------- Executive summary ----------
def executive_summary():
    out = [h1("Executive summary", "summary")]
    out += [
        body(
            "unGhost.com is a 7-phase, end-to-end product build that already covers every PRD module needed to run the business: "
            "student onboarding, recruiter pipelines, embedded bootcamps, AI Coach with memory and persona, live coaching sessions, "
            "administration, moderation, audit, telemetry, and a complete payment / SLA / refund loop. The product works end-to-end today "
            "against deterministic mock data with provider keys absent."
        ),
        body(
            "However, <b>shipping this as a real business at the 10,000-user enterprise tier requires roughly 6–8 weeks of hardening</b> before "
            "any new feature work. The application is a strong prototype, not a production system. Inserting API keys for the six adapter modules "
            "covers about 60 percent of the gap. The remaining 40 percent is the difference between &quot;works on a laptop&quot; and &quot;survives a launch&quot;."
        ),
        h2("Headline findings"),
        bullets([
            "<b>Tests: zero.</b> No unit, integration, or end-to-end coverage. This is the single largest production risk.",
            "<b>In-memory state will die on a stateless deploy.</b> Mock OTPs, support tickets, email templates, the realtime ring buffer, and AI Coach token bucket all live in the Node process memory.",
            "<b>Mongoose does not run on Cloudflare Workers.</b> Going to Cloudflare Pages or Workers directly requires either a database rewrite or a different runtime. Cloudflare Containers is the correct target — full Node runtime, zero rewrite.",
            "<b>Authentication has a mock-only password path.</b> Bcrypt and secure cookie configuration must be wired before the first real user signs up.",
            "<b>Resource limits, rate limiting, structured logging, and error tracking are all absent.</b> A single bad actor on /api/coach can today exhaust the LLM budget.",
            "<b>The code is well-organised but has three god-files</b> (store.ts, types.ts, models.ts). A domain-driven folder restructure is needed before the team grows past two engineers.",
        ]),
        h2("Recommended path forward"),
        body(
            "We recommend a <b>monolith architecture deployed to Cloudflare Containers</b>, fronted by the Cloudflare edge network (CDN, WAF, DDoS, bot management). "
            "MongoDB Atlas in Mumbai for DPDP residency, Upstash Redis for cache and rate-limit, Cloudflare R2 for resume / logo storage, Sentry for error tracking, "
            "and Axiom for structured logs. CI/CD runs on GitHub Actions with three environments (preview, staging, production), automatic rollback on failed health checks, "
            "and PR-based preview deploys for every change."
        ),
        body(
            "The 8-week roadmap in section 9 walks engineering, product, and ops through the work week by week with acceptance criteria. "
            "At the end of week 8 the application should be ready for a controlled beta with real users and real payment volume."
        ),
        h2("What this document is, and is not"),
        bullets([
            "It <b>is</b> a brutal, evidence-backed engineering assessment written for an experienced tech lead.",
            "It <b>is</b> a step-by-step deployment guide for unGhost on Cloudflare.",
            "It <b>is not</b> a sales document or a roadmap of features. PRD modules are already shipped — this is about making them reliable, observable, and scaleable.",
            "It <b>is not</b> a fixed plan. Every recommendation here should be challenged on its merits.",
        ]),
        PageBreak(),
    ]
    return out


# ---------- Section 1: current state ----------
def section_current_state():
    out = [h1("1. Current state and gaps", "sec1")]
    out += [
        body(
            "The application is a Next.js 14 App Router monolith using MongoDB Atlas via Mongoose, NextAuth credentials provider, "
            "and a glass-morphism design system. Seven product phases have shipped, covering every flow required by the PRD."
        ),
        h2("1.1 What works today"),
        styled_table(
            [
                ["Capability", "Status", "Notes"],
                ["Student onboarding, resume parse, profile completeness", "Working", "AI parser uses mock without ANTHROPIC_API_KEY"],
                ["Mission browse + apply + AI gauntlet assessment", "Working", "All flows green end-to-end"],
                ["Stage advancement + SLA timer + auto-refund", "Working", "Cron route in place; needs Inngest for prod scale"],
                ["Recruiter pipelines, saved searches, job templates", "Working", "Full kanban + bulk-message"],
                ["Embedded bootcamps + sponsorships", "Working", "Mock PhonePe redirect succeeds; real PhonePe is wired"],
                ["AI Coach with cross-session memory + 4 personas", "Working", "Memory rollup is heuristic; will improve with real Claude"],
                ["Live sessions — instructor schedule + student lobby", "Working", "Room uses placeholder tiles; needs 100ms SDK swap"],
                ["Admin: students, recruiters, companies, jobs, moderation, audit, telemetry, financial, support, email templates", "Working", "Companies/jobs/financial pages live in this phase"],
                ["Integrations dashboard (live vs mock indicators)", "Working", "All 8 adapters reflected"],
            ],
            col_widths=[6.4 * cm, 2.6 * cm, 6.4 * cm],
        ),
        Spacer(1, 0.5 * cm),
        h2("1.2 What is missing"),
        body(
            "The gaps below are listed roughly in order of business risk. Items in <b>red</b> can take the site down or leak data. "
            "Items in <b>amber</b> degrade reliability or scalability. Items in green are quality-of-life but not blocking."
        ),
        styled_table(
            [
                ["Gap", "Severity", "Impact"],
                ["Zero automated tests", "RED", "Every release is a coin flip"],
                ["No bcrypt; password compared as plaintext for mock users", "RED", "Cannot accept real users"],
                ["In-memory OTP / ticket / template stores", "RED", "Data loss on every deploy or restart"],
                ["No rate-limiting on /api/coach, /api/otp, etc.", "RED", "LLM/SMS budget exhaustion attack vector"],
                ["No input validation library (zod) on most routes", "RED", "Injection, type confusion, mass-assignment risk"],
                ["No CSRF or method-allowlist beyond NextAuth defaults", "RED", "State-changing GETs partially possible"],
                ["No structured logging or correlation IDs", "AMBER", "Debugging prod is nearly impossible"],
                ["No error tracking (Sentry absent)", "AMBER", "Issues only found when users complain"],
                ["No DB index audit; basic single-field indexes only", "AMBER", "Will degrade past 2-3k users"],
                ["No Redis cache layer", "AMBER", "Every page hits Mongo"],
                ["No file storage; resume PDFs sit on app disk", "AMBER", "Breaks any stateless deploy"],
                ["No DB migration tool", "AMBER", "Schema changes are ad-hoc"],
                ["Mocked 100ms video tiles", "AMBER", "Live sessions don't actually transmit video"],
                ["Three god-files: store.ts (2.1k lines), types.ts (~500), models.ts (~500)", "AMBER", "Onboarding new engineers is slow"],
                ["No DPDP data-export / erasure pipeline", "AMBER", "Legal exposure once we have Indian PII"],
                ["No A11y audit", "GREEN", "Reduces TAM in education sector"],
                ["No i18n", "GREEN", "Limits expansion to non-English India"],
                ["No feature flags", "GREEN", "Slower experimentation"],
            ],
            col_widths=[8.2 * cm, 2.2 * cm, 5 * cm],
        ),
        Spacer(1, 0.4 * cm),
        h2("1.3 In-memory state inventory"),
        body(
            "Everything in the list below currently lives in the Node process memory and will be lost on every restart, deploy, or scale-out. "
            "Each item must be moved to either MongoDB Atlas, Redis, or a dedicated provider before launch."
        ),
        styled_table(
            [
                ["What", "Lives in", "Target store", "Pre-launch fix?"],
                ["Mock OTP codes (lib/sms)", "Module-level Map", "Redis (TTL 10 min)", "Required"],
                ["Mock email tokens (lib/email)", "Module-level Map", "MongoDB + Redis", "Required"],
                ["Realtime ring buffer (lib/realtime)", "Module-level array", "Pusher Channels", "Required when realtime keys present"],
                ["Recent job events (lib/jobs)", "Module-level array", "Inngest", "Recommended"],
                ["Support tickets (Phase-1 mock)", "Hard-coded list", "MongoDB", "Required"],
                ["Email templates (Phase-1 mock)", "Hard-coded list", "MongoDB", "Required"],
            ],
            col_widths=[5.2 * cm, 4 * cm, 3.8 * cm, 2.4 * cm],
        ),
        h2("1.4 Repository hot-spots"),
        body(
            "A quick line count of the larger files highlights where future refactor work will land. None of these are bugs, but they show "
            "the codebase is approaching the point where the domain-driven split (section 5) becomes urgent."
        ),
        styled_table(
            [
                ["File", "Lines", "Concern"],
                ["server/store.ts (currently lib/data/store.ts)", "~2,100", "Every domain mixed; refactor priority 1"],
                ["server/db/models.ts", "~600", "Mongoose schemas for every collection"],
                ["server/types.ts (currently lib/data/types.ts)", "~520", "Domain types for every collection"],
                ["app/admin/*", "~3,200 across pages", "Some pages embed business logic"],
                ["components/recruiter/KanbanBoard.tsx", "~480", "Could be split into a sub-folder"],
            ],
            col_widths=[8.5 * cm, 2 * cm, 5 * cm],
        ),
        Spacer(1, 0.4 * cm),
        h2("1.5 Honest one-line verdict"),
        callout(
            "<b>The product is shippable to a closed beta of 100 hand-picked users today.</b> It is not shippable to 10,000 strangers. "
            "Closing that gap is what this document plans, week by week."
        ),
        PageBreak(),
    ]
    return out


# ---------- Section 2: scaling ----------
def section_scaling():
    out = [h1("2. Enterprise scaling to 10,000 users", "sec2")]
    out += [
        body(
            "&quot;10,000 users&quot; needs a precise definition before any engineering decision. For unGhost, the working assumption is: "
            "10,000 total registered users across student, recruiter, and instructor roles, with a daily active rate of 20 percent (2,000 DAU), "
            "a peak concurrency of 500, and a sustained throughput of 50 requests per second at p95 latency under 400 ms."
        ),
        h2("2.1 Where the current architecture breaks"),
        styled_table(
            [
                ["Layer", "Current behaviour", "Symptom at 10k", "Fix"],
                ["MongoDB", "Single primary, no replicas, single index per field", "Read amplification, slow scans on stage / job queries", "Atlas M30 with replica set, compound indexes, slow-query alerts"],
                ["Application server", "Single Node process, in-memory state", "State drift, OOM, no horizontal scale", "Stateless containers, Redis-backed session, externalised caches"],
                ["LLM calls", "Synchronous per-request to Anthropic", "Tail latency >5s, cost spikes", "Streaming responses, semantic cache, per-user budget"],
                ["Static assets", "Served by Next.js", "TTFB sensitive to origin location", "Push to Cloudflare CDN; immutable headers; image opt"],
                ["File storage", "Local disk", "Lost on restart, no horizontal scale", "Cloudflare R2 with signed URLs"],
                ["Realtime", "Polling in mock mode", "10k pollers = 10k req/s baseline", "Pusher Channels; presence with batching"],
                ["Background work", "Cron route only", "SLA sweeps stall under load", "Inngest with retry, backoff, idempotency keys"],
            ],
            col_widths=[2.8 * cm, 4 * cm, 4.4 * cm, 4.4 * cm],
        ),
        Spacer(1, 0.4 * cm),
        h2("2.2 Database sizing"),
        body(
            "At 10k users with the access patterns we know from telemetry today, MongoDB Atlas M30 in the Mumbai region is the right starting "
            "tier. The expected steady-state usage:"
        ),
        bullets([
            "<b>Storage:</b> ~12 GB year one (users, applications, jobs, bootcamp progress, audit logs, AI Coach conversations).",
            "<b>IOPS:</b> peak ~800 reads/sec, ~120 writes/sec. M30 (10 GB RAM, 3000 IOPS) gives ~4× headroom.",
            "<b>Connections:</b> default pool of 100. With three app instances each opening 30 connections, we sit at 90 — well under the M30 cap.",
            "<b>Backups:</b> Atlas continuous backup with PITR. Snapshots retained 7 days, archive monthly.",
            "<b>Indexes:</b> compound indexes on (studentId, stage), (jobId, stage), (recruiterId, createdAt), (companyId, status). See section 5 for the full audit pattern.",
        ]),
        h2("2.3 Cache strategy"),
        body(
            "Upstash Redis (Mumbai, ~30 USD/month at this scale) handles four jobs:"
        ),
        numbered([
            "<b>Session cache.</b> NextAuth session lookups go through Redis to avoid Mongo round-trips on every request.",
            "<b>Read-through cache for hot pages.</b> Bootcamp catalogue, public mission listings, company profiles — 5-minute TTL.",
            "<b>Rate-limit counters.</b> Token bucket per IP and per user-id for /api/coach, /api/otp, /api/email/forgot-password.",
            "<b>OTP / reset-token store.</b> 10-minute TTL, EX flag on write.",
        ]),
        h2("2.4 Horizontal scale plan"),
        body(
            "Cloudflare Containers is stateless by design. Three production instances should be considered minimum for redundancy. "
            "Container autoscaling kicks in when sustained CPU >70 percent. The application has no sticky-session requirement once Redis is in place."
        ),
        h2("2.5 Performance budgets"),
        body(
            "Performance budgets must be enforced in CI. Any PR that regresses below these targets should fail the build."
        ),
        styled_table(
            [
                ["Surface", "Target p50", "Target p95", "How measured"],
                ["Initial page load (landing)", "<800 ms", "<1.6 s", "Lighthouse CI on every PR"],
                ["Authenticated dashboard load", "<1.0 s", "<2.0 s", "Lighthouse + RUM (Sentry Perf)"],
                ["/api/coach chat round-trip", "<1.2 s", "<3.0 s", "Sentry Perf transactions"],
                ["/api/applications mutation", "<200 ms", "<500 ms", "Sentry Perf"],
                ["LCP across mission pages", "<2.5 s", "<4.0 s", "Web Vitals via Sentry RUM"],
                ["JS bundle (first-load on /dashboard)", "<200 KB gz", "—", "size-limit in CI"],
            ],
            col_widths=[6 * cm, 2.2 * cm, 2.2 * cm, 5.2 * cm],
        ),
        h2("2.6 Cost projection"),
        body("At 10,000 monthly active users, the steady-state monthly run-rate is roughly:"),
        styled_table(
            [
                ["Service", "Tier", "Estimated USD / month"],
                ["Cloudflare (Pro + Containers + R2 + WAF + Argo)", "Pro", "~ 220"],
                ["MongoDB Atlas M30 (Mumbai)", "M30", "~ 320"],
                ["Upstash Redis", "Pro pay-as-you-go", "~ 35"],
                ["Sentry (Team plan, errors + perf)", "Team", "~ 90"],
                ["Axiom logs", "Team", "~ 60"],
                ["Better Stack uptime + status page", "Team", "~ 30"],
                ["MSG91 (~50k OTPs + transactional SMS)", "Volume", "~ 150"],
                ["Resend (~200k emails)", "Pro", "~ 80"],
                ["Anthropic Claude (~2M tokens with cache)", "Volume", "~ 220"],
                ["PhonePe (per-transaction, 1.99% + GST)", "Variable", "Variable"],
                ["100ms (~5,000 minutes)", "Pay-as-you-go", "~ 100"],
                ["Pusher Channels", "Startup", "~ 50"],
                ["Inngest", "Hobby/Team", "~ 50"],
                ["Total fixed infra (excl. payment processor variable)", "", "~ 1,405 USD"],
            ],
            col_widths=[7.5 * cm, 4 * cm, 4.1 * cm],
        ),
        Spacer(1, 0.4 * cm),
        callout(
            "Cost grows roughly linearly with active users. At 1,000 MAU expect ~380 USD/month. At 100,000 MAU expect ~7,800 USD/month with the "
            "same architecture, plus a tier bump on Atlas (M50) and Anthropic Claude volume."
        ),
        PageBreak(),
    ]
    return out


# ---------- Section 3: prototype vs production ----------
def section_prototype_vs_prod():
    out = [h1("3. Prototype vs production gap analysis", "sec3")]
    out += [
        body(
            "The question every founder asks is: &quot;can we just paste in the API keys?&quot; This section answers honestly. The application is a "
            "<b>strong prototype</b>, approximately 60 percent of the way to a real production system. Pasting keys closes about half the remaining gap."
        ),
        h2("3.1 What inserting keys actually buys"),
        body("Once keys are inserted and the application restarted, the following swap from mock to live automatically:"),
        styled_table(
            [
                ["Adapter", "Provider", "Env keys to set"],
                ["AI Coach + JD parser + assessment grading", "Anthropic Claude", "ANTHROPIC_API_KEY"],
                ["OTP and transactional SMS", "MSG91", "MSG91_AUTH_KEY, MSG91_SENDER_ID, MSG91_OTP_TEMPLATE_ID"],
                ["Transactional email (verify, reset, etc.)", "Resend", "RESEND_API_KEY, RESEND_FROM"],
                ["Bootcamp + sponsorship payments", "PhonePe", "PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY, PHONEPE_SALT_INDEX, PHONEPE_BASE_URL"],
                ["Realtime messaging + presence", "Pusher Channels", "PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER"],
                ["Background jobs and SLA sweeps", "Inngest", "INNGEST_EVENT_KEY (and INNGEST_SIGNING_KEY for receivers)"],
                ["OAuth login (Google)", "Google", "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET"],
                ["OAuth login (LinkedIn)", "LinkedIn", "LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET"],
            ],
            col_widths=[5 * cm, 3.6 * cm, 7 * cm],
        ),
        Spacer(1, 0.4 * cm),
        h2("3.2 What inserting keys does NOT buy"),
        body(
            "These items are independent of provider credentials. They must each be built or wired up before the application accepts paying customers."
        ),
        styled_table(
            [
                ["Missing piece", "Why it matters", "Estimated effort"],
                ["bcrypt password hashing + secure cookie config", "Cannot store real user passwords safely", "1 day"],
                ["Persistent OTP / reset-token store (Redis)", "Mock store dies on restart", "1 day"],
                ["Persist support tickets to MongoDB", "Customer queries vanish on deploy", "1 day"],
                ["Persist email templates to MongoDB", "Edits vanish on deploy", "0.5 day"],
                ["Real 100ms video SDK integration", "Live sessions today are placeholder tiles", "3–4 days"],
                ["R2 file storage with signed URLs for resume PDFs", "Local disk breaks stateless deploys", "1 day"],
                ["Zod input validation on every API route", "Open injection surface", "4 days"],
                ["Rate limiting on hot endpoints", "Cost-DOS attack surface", "1 day"],
                ["Sentry error tracking + release wiring", "Blind in production otherwise", "1 day"],
                ["Pino structured logging + correlation IDs", "Cannot reconstruct a user's session", "1 day"],
                ["Test suite (Vitest + Playwright)", "Every release is unverified", "10 days"],
                ["Database migration tool (migrate-mongo)", "Schema changes today are dangerous", "0.5 day"],
                ["DPDP data-export and erasure endpoints", "Legal requirement once we have Indian PII", "3 days"],
                ["Health endpoints + readiness probes", "Auto-rollback in CI/CD depends on these", "0.5 day"],
            ],
            col_widths=[5.4 * cm, 6.6 * cm, 3.6 * cm],
        ),
        Spacer(1, 0.4 * cm),
        h2("3.3 Single-line summary"),
        callout(
            "<b>Inserting API keys turns the app from 60 percent real to about 75 percent real.</b> The remaining 25 percent is the eight-week "
            "hardening plan in section 9. After that, the application is a real production system, not a prototype with keys."
        ),
        h2("3.4 A note on shipping cadence"),
        body(
            "Once the hardening plan is complete, the team can resume feature work confident that the next feature ships into a system with tests, "
            "monitoring, audit, and rollback. Skipping hardening to ship features is the classic trap — every feature shipped on top of an unhardened "
            "stack costs about 3× more to fix afterwards. The next 8 weeks are the highest-leverage engineering work of the year."
        ),
        PageBreak(),
    ]
    return out


# ---------- Section 4: design ----------
def section_design():
    out = [h1("4. Design system swap plan", "sec4")]
    out += [
        body(
            "The current design system — internally called the &quot;glass system&quot; — is centralised in three places, which means swapping to a new "
            "design guide is a deterministic, mechanical operation, not a rewrite. This section explains exactly where the design lives and how to "
            "swap it without touching component logic."
        ),
        h2("4.1 Where the design tokens live"),
        styled_table(
            [
                ["File", "Contains", "Purpose"],
                ["tailwind.config.ts", "Brand colours, font families, spacing, shadows, animation timing", "Single source of truth for tokens"],
                ["app/globals.css", "Glass utility classes: .glass-panel, .glass-input, .btn-brand, .blob-*", "Atomic CSS shortcuts used everywhere"],
                ["components/glass/*", "React primitives: GlassCard, GlassButton, GlassBadge, GlassNavbar, BlobField, Logo", "Reusable building blocks; no domain logic"],
            ],
            col_widths=[5.6 * cm, 6.4 * cm, 3.6 * cm],
        ),
        Spacer(1, 0.4 * cm),
        body(
            "Every screen in the application — student, recruiter, admin, instructor — builds on these three layers. No page bypasses them. That property "
            "is why a design-guide swap is a one-week job, not a one-quarter rewrite."
        ),
        h2("4.2 The swap procedure"),
        numbered([
            "<b>Convert the new design guide into a token spec.</b> Map every colour, font, radius, shadow, motion-duration, and z-index to a key.",
            "<b>Update <i>tailwind.config.ts</i>.</b> Replace the existing brand, ink, muted, success, warn, danger palettes with the new tokens.",
            "<b>Update <i>app/globals.css</i>.</b> Adjust the glass utility classes to reference the new shadow, blur, and translucency values.",
            "<b>Rebuild atomic components in <i>components/glass/</i>.</b> If the new design is non-glass — say, neumorphic or flat — replace the implementations behind the same React API. Pages do not change.",
            "<b>Add an Accessibility checklist.</b> Verify WCAG AA contrast on every text-on-background pair using axe-core in Playwright.",
            "<b>Update the Storybook (to be set up in Week 1).</b> Every atomic component gets a story showing all variants.",
            "<b>Visual regression on every PR.</b> Chromatic or Percy diff every Storybook story; reviewers approve visual changes intentionally.",
        ]),
        h2("4.3 Accessibility standards"),
        body(
            "The new design must meet WCAG 2.2 AA at minimum. Specifically:"
        ),
        bullets([
            "Body text contrast ratio &gt;= 4.5:1; large text &gt;= 3:1.",
            "All interactive elements have a visible focus ring (not just &quot;:hover&quot;).",
            "All inputs have an associated &lt;label&gt; or aria-label.",
            "All icon-only buttons have aria-label.",
            "No information conveyed by colour alone.",
            "Animations respect <i>prefers-reduced-motion</i>; the door animation already does this.",
            "Tap targets &gt;= 44×44 px on mobile.",
        ]),
        h2("4.4 Light / dark theme"),
        body(
            "The current build is light-mode only. The token system in <i>tailwind.config.ts</i> already permits a dark theme by adding "
            "<i>darkMode: 'class'</i> and a parallel palette. If the new design guide includes dark mode, plan an extra two days to migrate utility "
            "classes to CSS custom properties so the theme switch is a single class on &lt;html&gt;."
        ),
        h2("4.5 Mobile responsiveness"),
        body(
            "Tailwind breakpoints used today: <i>sm</i> 640 px, <i>md</i> 768 px, <i>lg</i> 1024 px, <i>xl</i> 1280 px. Several admin tables are wider than "
            "fits on mobile and use horizontal scroll. The new design must specify behaviour at each breakpoint for: navigation, dense tables, "
            "modals, the AI Coach panel, and the live room. We recommend mobile-first writing — design at 375 px width then progressively enhance."
        ),
        h2("4.6 Brand assets"),
        body(
            "Logo, favicon, OG images, and PWA icons live in <i>public/</i>. Replace these as part of the swap; the &lt;Logo /&gt; component reads "
            "the SVG inline so a single SVG file controls every navbar in the app."
        ),
        PageBreak(),
    ]
    return out


# ---------- Section 5: code structure ----------
def section_code_structure():
    out = [h1("5. Code structure for new engineers", "sec5")]
    out += [
        body(
            "The codebase today follows a flat Next.js convention — <i>app/</i> for routes, <i>components/</i> for UI, <i>lib/</i> for everything else. "
            "This worked for the prototype. It does not scale to a team of four or more engineers. This section proposes a domain-driven structure "
            "that keeps Next.js conventions while imposing clear boundaries between front-end, back-end, and shared code."
        ),
        h2("5.1 Target folder layout"),
        code(
            "unghost/\n"
            "  app/                              # Next.js App Router — pages & API\n"
            "    (marketing)/                    # public, anonymous routes\n"
            "      page.tsx\n"
            "      bootcamps/...\n"
            "    (student)/                      # student-only routes (route group)\n"
            "      dashboard/\n"
            "      missions/[id]/\n"
            "      student/coach/\n"
            "    (recruiter)/                    # recruiter-only routes\n"
            "    (admin)/                        # admin-only routes\n"
            "    (instructor)/                   # instructor-only routes\n"
            "    api/                            # backend HTTP endpoints\n"
            "      auth/\n"
            "      applications/\n"
            "      coach/\n"
            "      live/\n"
            "      admin/...\n"
            "  components/                       # UI only — no business logic\n"
            "    glass/                          # design-system primitives\n"
            "    student/...\n"
            "    recruiter/...\n"
            "    admin/...\n"
            "    shared/                         # cross-role widgets\n"
            "  server/                           # backend logic, formerly lib/\n"
            "    auth/                           # NextAuth config, session helpers\n"
            "      index.ts\n"
            "      service.ts\n"
            "      bcrypt.ts\n"
            "      session.ts\n"
            "    applications/                   # one folder per domain\n"
            "      types.ts\n"
            "      model.ts                      # mongoose schema\n"
            "      service.ts                    # business rules\n"
            "      queries.ts                    # read helpers\n"
            "      validators.ts                 # zod schemas\n"
            "      tests/...\n"
            "    jobs/...\n"
            "    bootcamps/...\n"
            "    live/...\n"
            "    coach/...\n"
            "    payments/...\n"
            "    moderation/...\n"
            "    audit/...\n"
            "    integrations/                   # external adapters\n"
            "      ai/\n"
            "      sms/\n"
            "      email/\n"
            "      payments/\n"
            "      realtime/\n"
            "      jobs/\n"
            "    db/                             # connection, migrations, indexes\n"
            "      mongo.ts\n"
            "      migrate.ts\n"
            "      indexes.ts\n"
            "    lib/                            # cross-domain pure utilities\n"
            "      logger.ts\n"
            "      rate-limit.ts\n"
            "      errors.ts\n"
            "  shared/                           # types & constants used by both layers\n"
            "    types/\n"
            "    constants/\n"
            "  scripts/                          # one-off CLIs: seed, backfill, etc.\n"
            "  tests/\n"
            "    e2e/                            # Playwright\n"
            "    integration/                    # API-level\n"
            "  docs/                             # this folder\n"
            "  .github/workflows/                # GitHub Actions\n"
            "  Dockerfile\n"
            "  fly.toml or wrangler.toml         # deploy manifest\n"
        ),
        h2("5.2 Module template"),
        body(
            "Every domain folder under <i>server/</i> follows the same five-file pattern. Below is the canonical example for the <i>applications</i> domain."
        ),
        code(
            "server/applications/types.ts\n"
            "  // Domain types — no implementation\n"
            "  export type Stage = 'new_matches' | 'screening' | ...;\n"
            "  export interface Application { ... }\n"
            "\n"
            "server/applications/model.ts\n"
            "  // Mongoose schema + Model export\n"
            "  export const ApplicationModel = ...\n"
            "\n"
            "server/applications/validators.ts\n"
            "  // Zod schemas used by every API route in this domain\n"
            "  export const applyToJobInput = z.object({ jobId: z.string() });\n"
            "\n"
            "server/applications/queries.ts\n"
            "  // Read helpers — pure, cacheable, side-effect free\n"
            "  export async function listApplicationsByStudent(studentId: string) { ... }\n"
            "\n"
            "server/applications/service.ts\n"
            "  // Business rules — writes, transitions, side-effects (audit, notify)\n"
            "  export async function applyToJob(input, ctx) { ... }\n"
            "\n"
            "server/applications/tests/applyToJob.test.ts\n"
            "  // Vitest unit tests with an in-memory Mongo\n"
        ),
        h2("5.3 Boundary rules enforced by ESLint"),
        body(
            "The biggest risk in a monolith is unintentional coupling. ESLint with <i>eslint-plugin-boundaries</i> blocks the bad imports at compile-time."
        ),
        code(
            "// .eslintrc — element definitions\n"
            "settings: {\n"
            "  'boundaries/elements': [\n"
            "    { type: 'app',        pattern: 'app/*' },\n"
            "    { type: 'components', pattern: 'components/*' },\n"
            "    { type: 'server',     pattern: 'server/*' },\n"
            "    { type: 'shared',     pattern: 'shared/*' },\n"
            "  ]\n"
            "}\n"
            "rules: {\n"
            "  'boundaries/element-types': ['error', {\n"
            "    default: 'disallow',\n"
            "    rules: [\n"
            "      { from: 'app',        allow: ['components', 'server', 'shared'] },\n"
            "      { from: 'components', allow: ['components', 'shared'] },   // UI cannot import server\n"
            "      { from: 'server',     allow: ['server', 'shared'] },       // server cannot import UI\n"
            "      { from: 'shared',     allow: ['shared'] },                 // shared is pure\n"
            "    ]\n"
            "  }]\n"
            "}\n"
        ),
        h2("5.4 Naming conventions"),
        styled_table(
            [
                ["Kind", "Convention", "Example"],
                ["Files (route segments)", "kebab-case directories", "app/student/applications/[id]/page.tsx"],
                ["React components", "PascalCase per file", "components/glass/GlassButton.tsx"],
                ["Server functions", "camelCase verbs", "applyToJob, listApplicationsByStudent"],
                ["Types & interfaces", "PascalCase", "interface Application, type Stage"],
                ["Env vars", "UPPER_SNAKE_CASE", "ANTHROPIC_API_KEY"],
                ["Mongo collections", "camelCase plural", "applications, supportTickets"],
                ["DB indexes", "ix_{collection}_{fields}", "ix_applications_studentId_stage"],
                ["API routes", "REST-ish nouns", "/api/applications/[id]/stage"],
                ["Tests", "<unit>.test.ts adjacent to source", "applications/tests/applyToJob.test.ts"],
            ],
            col_widths=[3.6 * cm, 5 * cm, 7 * cm],
        ),
        Spacer(1, 0.4 * cm),
        h2("5.5 File-size discipline"),
        body(
            "Set ESLint warnings at 350 lines per file and errors at 500. The current 2,100-line store.ts file would have lit up four times over. "
            "Whenever a file approaches the threshold, it is a signal to split — usually by domain."
        ),
        h2("5.6 Service-function contract"),
        body(
            "Every server function follows the same shape. This makes calling code, testing, and tracing all uniform."
        ),
        code(
            "export async function applyToJob(\n"
            "  input: z.infer<typeof applyToJobInput>,\n"
            "  ctx: RequestContext,            // userId, role, requestId, logger\n"
            "): Promise<Result<Application, AppError>> {\n"
            "  ctx.log.info({ jobId: input.jobId }, 'apply.start');\n"
            "  // 1. authorisation\n"
            "  // 2. business validation (profile completeness, duplicate check)\n"
            "  // 3. write\n"
            "  // 4. side-effects: audit log, notification fan-out\n"
            "  // 5. return Result.ok(application) or Result.err(error)\n"
            "}\n"
        ),
        h2("5.7 CONTRIBUTING.md outline"),
        body("A short CONTRIBUTING.md will be checked into the repo, covering:"),
        bullets([
            "Local setup: clone, .env, Docker Mongo, npm install, npm run seed, npm run dev.",
            "Commit conventions: conventional commits (feat:, fix:, chore:).",
            "Branch strategy: trunk-based with short-lived feature branches.",
            "PR template: summary, screenshots, test plan, risk level.",
            "Code-review SLA: first review &lt;= 4 business hours.",
            "Deployment cadence: staging on every merge, prod on tagged release.",
        ]),
        h2("5.8 ADRs"),
        body(
            "Significant architectural decisions go into <i>docs/adr/NNNN-title.md</i>. Required for: data model changes, new external service, new "
            "framework or library, performance trade-offs, security trade-offs. Format is the standard Michael Nygard template: context, decision, "
            "consequences, alternatives considered."
        ),
        PageBreak(),
    ]
    return out


# ---------- Section 6: split decision ----------
def section_split():
    out = [h1("6. Frontend / backend split decision", "sec6")]
    out += [
        body(
            "The original ask was to split the code into two folders, frontend and backend, so each can be worked on independently. After examining the "
            "trade-offs we recommend a <b>monolith with strict internal boundaries</b> rather than a process-level split. This section explains why."
        ),
        h2("6.1 The three options"),
        styled_table(
            [
                ["Option", "What it means", "Pros", "Cons"],
                ["A. Cosmetic split (recommended)", "Keep one Next.js codebase. Reorganise so app/ + components/ is the front-end, server/ is the back-end, shared/ is the contract. Enforce boundaries with ESLint.", "Zero ops cost. Keeps RSC, image opt, middleware. Onboarding stays simple. Deploys as one Cloudflare Container.", "Still one deploy unit. Not suitable if mobile native joins later."],
                ["B. Hybrid split", "Next.js for the front-end on Cloudflare Pages. Standalone Hono / Fastify back-end on Cloudflare Containers or Workers.", "Real separation of concerns. Each layer scales independently. Backend reusable for mobile.", "Lose RSC. Need API-client lib. Two deploys, two CI lanes. Mongoose breaks on Workers — needs Atlas Data API rewrite (~1 week)."],
                ["C. Full split", "React (Vite) front-end + Node back-end. Two separate repos or one monorepo with separate deploys.", "Cleanest. Maximum flexibility. Suits very large teams.", "Largest rewrite. Lose every Next.js benefit. Slower to ship."],
            ],
            col_widths=[2.8 * cm, 5 * cm, 4 * cm, 4.4 * cm],
        ),
        Spacer(1, 0.4 * cm),
        h2("6.2 Why option A wins for unGhost today"),
        bullets([
            "<b>Mongoose does not run on Workers.</b> Cloudflare Workers run a V8 isolate, not Node. Going to Workers requires either swapping to Atlas Data API or to Prisma with HTTP transport. That is a one-week rewrite with new bugs.",
            "<b>RSC is unGhost's secret weapon for performance.</b> Server-rendered admin tables, student dashboards, recruiter pipelines all benefit from streaming, partial pre-render, and zero hydration cost.",
            "<b>One deploy unit means one CI/CD pipeline, one secret store, one monitoring view.</b> At a team size below eight engineers, this is faster and safer.",
            "<b>The 10k-user scaling problem is not solved by splitting.</b> It is solved by Mongo replicas, Redis, CDN, and horizontal container scaling — all available to a monolith.",
            "<b>The boundary problem is solved by ESLint rules</b> (section 5.3), not by separate processes.",
            "<b>Mobile native is not on the near-term roadmap.</b> When it is, we revisit. Until then, splitting is premature.",
        ]),
        h2("6.3 What 'cosmetic split' actually looks like"),
        body(
            "Concretely, the difference between today's structure and the recommended structure is mechanical:"
        ),
        styled_table(
            [
                ["Layer", "Today", "Target"],
                ["UI pages", "app/", "app/ (same)"],
                ["UI components", "components/", "components/ (same)"],
                ["Server logic", "lib/", "server/"],
                ["DB schemas", "lib/db/models.ts", "server/{domain}/model.ts"],
                ["Types", "lib/data/types.ts", "server/{domain}/types.ts + shared/types/"],
                ["External adapters", "lib/{ai,sms,email,...}", "server/integrations/{ai,sms,email,...}"],
                ["Pure utilities", "lib/utils/", "server/lib/"],
            ],
            col_widths=[3.6 * cm, 6 * cm, 6 * cm],
        ),
        Spacer(1, 0.4 * cm),
        h2("6.4 When to revisit"),
        body("Move from option A to option B as soon as any one of the following becomes true:"),
        bullets([
            "Mobile native app launches and would share a back-end.",
            "Backend hits CPU or memory limits the Next.js runtime cannot give.",
            "Engineering grows past ~8 contributors and a backend specialism emerges.",
            "We expose a public API to partners with versioning + rate-limiting requirements distinct from the web app.",
        ]),
        h2("6.5 Documentation deliverable"),
        body(
            "The folder restructure described in section 5 plus the ESLint boundary rules from section 5.3 plus the contribution guide from section "
            "5.7 together deliver the spirit of &quot;separated frontend and backend&quot; without the operational cost. Tech-head review of this decision is "
            "explicitly invited."
        ),
        PageBreak(),
    ]
    return out


# ---------- Section 7: Cloudflare deployment ----------
def section_cloudflare():
    out = [h1("7. Cloudflare deployment architecture", "sec7")]
    out += [
        body(
            "Cloudflare is the user's chosen deployment platform. This section specifies the exact services, configuration, and rollout sequence. "
            "Where Cloudflare's own product offers a choice, the recommended option is highlighted and the trade-offs explained."
        ),
        h2("7.1 The high-level architecture"),
        body(
            "Public traffic terminates at Cloudflare's edge. Cloudflare CDN caches all static and immutable assets. Dynamic requests pass through "
            "WAF, bot management, and rate-limiting rules, then hit a Cloudflare Container running the Next.js application. The application talks "
            "to MongoDB Atlas in Mumbai, Upstash Redis in Mumbai, and Cloudflare R2 for object storage. External providers (Anthropic, MSG91, "
            "Resend, PhonePe, 100ms, Pusher, Inngest) are called from the application server."
        ),
        code(
            "                                       Internet\n"
            "                                          |\n"
            "                              [ Cloudflare Anycast Edge ]\n"
            "                                          |\n"
            "                +-------------------------+---------------------------+\n"
            "                |  CDN  ·  WAF  ·  Bot mgmt  ·  Rate limit  ·  DDoS   |\n"
            "                +-------------------------+---------------------------+\n"
            "                                          |\n"
            "                            [ Cloudflare Container — region: Mumbai ]\n"
            "                            Next.js 14 (App Router) — 3+ instances\n"
            "                                          |\n"
            "    +----------+-----------+-----------+--+----+-----------+-----------+--------------+\n"
            "    |          |           |           |       |           |           |              |\n"
            " Atlas    Upstash      Cloudflare    Sentry   Axiom    Anthropic    MSG91 etc.    Better Stack\n"
            " (Mongo)   Redis           R2        (errors)  (logs)   Claude API  3rd-party     (uptime)\n"
        ),
        h2("7.2 Service-by-service setup"),
        h3("7.2.1 Cloudflare account preparation"),
        numbered([
            "Register the domain on Cloudflare (or transfer it). Use a dedicated Cloudflare account for production.",
            "Subscribe to Cloudflare Pro plan (USD 25/month) — enables WAF managed rules and image optimisation.",
            "Enable Cloudflare Containers in the dashboard. Create a project named <i>unghost-app</i> with region <i>auto</i> set to Mumbai-preferred.",
            "Create Cloudflare R2 buckets: <i>unghost-uploads</i> (production), <i>unghost-uploads-staging</i>, <i>unghost-uploads-preview</i>.",
            "Create an API Token with scopes: Containers:Edit, R2:Read+Write, Workers Routes:Edit, DNS:Edit. Store in 1Password and as <i>CLOUDFLARE_API_TOKEN</i> in GitHub Secrets.",
        ]),
        h3("7.2.2 MongoDB Atlas"),
        numbered([
            "Create a Project named <i>unghost-prod</i>. Region: Asia/Mumbai (ap-south-1). Tier: M30 dedicated cluster.",
            "Create two databases: <i>unghost_production</i> and <i>unghost_staging</i>. Preview environments share <i>unghost_staging</i> with a per-PR collection prefix.",
            "Enable continuous backup with point-in-time recovery (PITR). Retain snapshots 7 days; archive monthly snapshots for one year.",
            "IP allowlist: only the Cloudflare Container egress IPs. Use Cloudflare Tunnel or Atlas peering for VPC-level isolation if available.",
            "Create three database users: <i>app-rw</i> (read/write, used by the app), <i>migrator</i> (DDL only, used by CI), <i>readonly</i> (analytics).",
            "Enable Atlas slow-query alerts at 500 ms; alerts go to PagerDuty.",
        ]),
        h3("7.2.3 Upstash Redis"),
        numbered([
            "Create a Redis database in region <i>ap-south-1</i>. TLS only.",
            "Take note of the REST URL and token — exposed to the app as <i>UPSTASH_REDIS_REST_URL</i> and <i>UPSTASH_REDIS_REST_TOKEN</i>.",
            "Configure eviction policy <i>allkeys-lru</i>.",
            "Set max memory limit to 1 GB initially; alert at 80% utilisation.",
        ]),
        h3("7.2.4 Sentry"),
        numbered([
            "Create org <i>unghost</i>. Create two projects: <i>unghost-server</i> (Node) and <i>unghost-browser</i> (Next.js client).",
            "Wire <i>@sentry/nextjs</i> via the official Sentry wizard.",
            "Set sampleRate=1.0 for errors. Set tracesSampleRate=0.2 for performance traces. Set profilesSampleRate=0.1.",
            "Wire releases to Git commits — see CI/CD section.",
            "Configure alerts: error spike >10/min to PagerDuty; new issue type to Slack #engineering.",
        ]),
        h3("7.2.5 Axiom (structured logs)"),
        numbered([
            "Create dataset <i>unghost-prod</i> and <i>unghost-staging</i>.",
            "Generate ingest token; expose as <i>AXIOM_TOKEN</i>.",
            "Configure pino transport in the app to ship logs in batches (1000 lines or 5s).",
            "Saved queries: top errors last 1h; 5xx by endpoint last 24h; SLA-breach events last 7d.",
        ]),
        h3("7.2.6 External providers"),
        body("Each external provider needs the same five steps: create account, generate API key, store in Cloudflare environment variables, restart staging, verify on integrations dashboard."),
        styled_table(
            [
                ["Provider", "Plan to start", "Notes"],
                ["Anthropic Claude", "Build tier", "Enable prompt caching for system prompts"],
                ["MSG91", "Volume", "Submit DLT templates for OTP + transactional"],
                ["Resend", "Pro", "Verify domain DKIM + SPF; warm IP for 14 days"],
                ["PhonePe", "Standard merchant", "Complete onboarding (KYC, agreement); use sandbox first"],
                ["100ms", "Pay-as-you-go", "Region: India South; create one room template"],
                ["Pusher Channels", "Startup", "Cluster: ap2 (Mumbai)"],
                ["Inngest", "Hobby/Team", "Create separate event keys for staging and prod"],
                ["Better Stack", "Team", "Configure status page on status.unghost.com"],
            ],
            col_widths=[3.4 * cm, 3 * cm, 9 * cm],
        ),
        Spacer(1, 0.4 * cm),
        h2("7.3 DNS layout"),
        styled_table(
            [
                ["Host", "Points to", "Purpose"],
                ["unghost.com (apex)", "301 → www.unghost.com", "Marketing redirect"],
                ["www.unghost.com", "Cloudflare Container (production)", "Production app"],
                ["staging.unghost.com", "Cloudflare Container (staging)", "Internal QA"],
                ["preview-*.unghost.com (wildcard)", "Cloudflare Container (preview)", "PR previews"],
                ["status.unghost.com", "Better Stack", "Public status page"],
                ["docs.unghost.com", "Cloudflare Pages (static)", "Public documentation"],
                ["api.unghost.com", "Reserved", "Future, if option B is adopted"],
            ],
            col_widths=[5 * cm, 5 * cm, 5 * cm],
        ),
        Spacer(1, 0.4 * cm),
        body("All hosts use Cloudflare Universal SSL with TLS 1.3 minimum and HSTS preload (after 90-day verification)."),
        h2("7.4 Environment variable matrix"),
        body("The application reads a single &quot;env profile&quot; at startup. Cloudflare Containers manages secrets per environment. The full surface:"),
        styled_table(
            [
                ["Variable", "Local", "Preview", "Staging", "Production"],
                ["NODE_ENV", "development", "production", "production", "production"],
                ["MONGODB_URI", "Docker Mongo", "Atlas staging w/ PR prefix", "Atlas staging", "Atlas prod"],
                ["NEXTAUTH_SECRET", "dev secret", "preview secret", "staging secret", "prod secret"],
                ["NEXT_PUBLIC_APP_URL", "http://localhost:3000", "preview-{n}.unghost.com", "staging.unghost.com", "www.unghost.com"],
                ["UPSTASH_REDIS_REST_URL", "—", "shared staging Redis", "shared staging Redis", "prod Redis"],
                ["UPSTASH_REDIS_REST_TOKEN", "—", "set", "set", "set"],
                ["R2_*", "—", "preview bucket", "staging bucket", "prod bucket"],
                ["SENTRY_DSN_SERVER", "—", "set", "set", "set"],
                ["SENTRY_DSN_BROWSER", "—", "set", "set", "set"],
                ["AXIOM_TOKEN", "—", "set", "set", "set"],
                ["ANTHROPIC_API_KEY", "(blank to mock)", "sandbox", "sandbox", "live"],
                ["MSG91_*", "(blank to mock)", "sandbox", "sandbox", "live"],
                ["RESEND_API_KEY", "(blank to mock)", "test domain", "test domain", "live"],
                ["PHONEPE_*", "(blank to mock)", "sandbox", "sandbox", "live"],
                ["PUSHER_*", "(blank to mock)", "staging app", "staging app", "prod app"],
                ["INNGEST_EVENT_KEY", "(blank to mock)", "preview env", "staging env", "prod env"],
                ["100MS_*", "(blank to mock)", "dev", "dev", "live"],
                ["GOOGLE_CLIENT_ID/SECRET", "(blank)", "test app", "test app", "live"],
                ["LINKEDIN_CLIENT_ID/SECRET", "(blank)", "test app", "test app", "live"],
                ["CRON_SECRET", "dev", "preview", "staging", "prod (rotated quarterly)"],
            ],
            col_widths=[4.4 * cm, 2.6 * cm, 2.8 * cm, 2.4 * cm, 2.8 * cm],
        ),
        Spacer(1, 0.4 * cm),
        h2("7.5 Dockerfile"),
        body(
            "The application packages as a standard Next.js standalone build. Below is the production Dockerfile, written for multi-stage cache "
            "reuse so subsequent builds are fast in CI."
        ),
        code(
            "# syntax=docker/dockerfile:1.7\n"
            "FROM node:20-alpine AS deps\n"
            "WORKDIR /app\n"
            "COPY package.json package-lock.json ./\n"
            "RUN npm ci --omit=optional\n"
            "\n"
            "FROM node:20-alpine AS build\n"
            "WORKDIR /app\n"
            "COPY --from=deps /app/node_modules ./node_modules\n"
            "COPY . .\n"
            "ENV NEXT_TELEMETRY_DISABLED=1\n"
            "RUN npm run build  # next build, output: 'standalone'\n"
            "\n"
            "FROM node:20-alpine AS runtime\n"
            "WORKDIR /app\n"
            "ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000\n"
            "RUN addgroup -g 1001 nodejs \\\n"
            " && adduser -S nextjs -u 1001 -G nodejs\n"
            "COPY --from=build --chown=nextjs:nodejs \\\n"
            "     /app/.next/standalone ./\n"
            "COPY --from=build --chown=nextjs:nodejs \\\n"
            "     /app/.next/static ./.next/static\n"
            "COPY --from=build --chown=nextjs:nodejs \\\n"
            "     /app/public ./public\n"
            "USER nextjs\n"
            "EXPOSE 3000\n"
            "HEALTHCHECK --interval=15s --timeout=3s \\\n"
            "            --start-period=20s --retries=3 \\\n"
            "  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1\n"
            "CMD [\"node\", \"server.js\"]\n"
        ),
        h2("7.6 Health endpoint"),
        body(
            "<i>/api/health</i> returns 200 only when Mongo and Redis are both reachable and the app version matches the deployed image. This endpoint "
            "is read by Cloudflare Containers for liveness, by GitHub Actions for post-deploy smoke, and by Better Stack for external uptime checks."
        ),
        h2("7.7 Region selection rationale"),
        body(
            "Mumbai (Atlas <i>ap-south-1</i>, Cloudflare Mumbai PoP, Pusher <i>ap2</i>, MSG91 India) is chosen for three reasons: (1) DPDP Act prefers in-country "
            "PII storage, (2) the target market is India-first, (3) PhonePe processes faster against India-resident merchants. The application code "
            "is region-agnostic; switching to another region in the future is a configuration change."
        ),
        h2("7.8 Secret rotation policy"),
        bullets([
            "Database passwords: rotate every 90 days. Atlas supports rolling rotation without downtime.",
            "NEXTAUTH_SECRET: rotate every 180 days. Forces session invalidation — schedule a maintenance window.",
            "Third-party API keys: rotate when an engineer with access leaves the company, immediately.",
            "All rotation events logged in <i>docs/runbooks/rotation-log.md</i>.",
        ]),
        PageBreak(),
    ]
    return out


# ---------- Section 8: CI/CD ----------
def section_cicd():
    out = [h1("8. CI/CD pipeline and deployment guide", "sec8")]
    out += [
        body(
            "CI/CD is the most leveraged engineering investment after testing. A good pipeline catches bugs in minutes, deploys safely without human "
            "intervention, and rolls back automatically when a deploy is bad. This section specifies the GitHub Actions workflow, environment matrix, "
            "and deployment procedures."
        ),
        h2("8.1 Branch and environment strategy"),
        body(
            "Trunk-based development with short-lived feature branches. Every PR opens a preview environment. Merging to <i>main</i> deploys to staging. "
            "Tagging a release (Git tag <i>v*.*.*</i>) deploys to production. There are no long-lived develop / release branches."
        ),
        styled_table(
            [
                ["Action", "Trigger", "Deploys to"],
                ["Open PR / push to PR branch", "GitHub PR event", "Preview env (preview-{pr-num}.unghost.com)"],
                ["Merge to main", "Push to main", "Staging (staging.unghost.com)"],
                ["Create tag v*.*.*", "Tag push", "Production (www.unghost.com) — with approval gate"],
                ["Manual rollback", "GitHub Actions workflow_dispatch", "Re-deploys previous image SHA"],
            ],
            col_widths=[5 * cm, 5 * cm, 5 * cm],
        ),
        Spacer(1, 0.4 * cm),
        h2("8.2 Pipeline stages"),
        body("Every PR runs the full pipeline. Stages are ordered fastest-failing-first so feedback is quick:"),
        numbered([
            "<b>Lint</b> — ESLint, including boundaries rules.",
            "<b>Typecheck</b> — tsc --noEmit.",
            "<b>Unit tests</b> — Vitest, parallel, with coverage.",
            "<b>Bundle-size check</b> — size-limit.",
            "<b>Build</b> — next build --output=standalone.",
            "<b>Integration tests</b> — API-level tests using an ephemeral mongodb-memory-server.",
            "<b>End-to-end tests</b> — Playwright against a freshly built Docker image, with seeded data.",
            "<b>Visual regression</b> — Chromatic diff for Storybook stories.",
            "<b>Deploy to preview</b> — Build and push Docker image; deploy to Cloudflare Containers preview slot.",
            "<b>Post-deploy smoke</b> — curl health endpoints on the live preview URL.",
            "<b>Comment on PR</b> — Post preview URL into the PR description.",
        ]),
        h2("8.3 GitHub Actions workflow — main file"),
        code(
            "# .github/workflows/ci.yml\n"
            "name: ci\n"
            "on:\n"
            "  pull_request:\n"
            "  push:\n"
            "    branches: [main]\n"
            "    tags: ['v*']\n"
            "\n"
            "concurrency:\n"
            "  group: ci-${{ github.ref }}\n"
            "  cancel-in-progress:\n"
            "    ${{ github.event_name == 'pull_request' }}\n"
            "\n"
            "jobs:\n"
            "  verify:\n"
            "    runs-on: ubuntu-latest\n"
            "    steps:\n"
            "      - uses: actions/checkout@v4\n"
            "      - uses: actions/setup-node@v4\n"
            "        with: { node-version: 20, cache: npm }\n"
            "      - run: npm ci\n"
            "      - run: npm run lint\n"
            "      - run: npm run typecheck\n"
            "      - run: npm run test:unit -- --coverage\n"
            "      - uses: codecov/codecov-action@v4\n"
            "      - run: npm run size\n"
            "      - run: npm run build\n"
            "      - run: npm run test:integration\n"
            "\n"
            "  e2e:\n"
            "    needs: verify\n"
            "    runs-on: ubuntu-latest\n"
            "    services:\n"
            "      mongo:\n"
            "        image: mongo:7\n"
            "        ports: [27017:27017]\n"
            "    steps:\n"
            "      - uses: actions/checkout@v4\n"
            "      - uses: actions/setup-node@v4\n"
            "        with: { node-version: 20, cache: npm }\n"
            "      - run: npm ci\n"
            "      - run: |\n"
            "          npx playwright install --with-deps chromium\n"
            "      - run: npm run seed:test\n"
            "      - run: npm run build\n"
            "      - run: npm run test:e2e\n"
            "      - if: failure()\n"
            "        uses: actions/upload-artifact@v4\n"
            "        with:\n"
            "          name: playwright-report\n"
            "          path: playwright-report\n"
            "\n"
            "  deploy-preview:\n"
            "    if: github.event_name == 'pull_request'\n"
            "    needs: [verify, e2e]\n"
            "    runs-on: ubuntu-latest\n"
            "    permissions:\n"
            "      pull-requests: write\n"
            "      contents: read\n"
            "    env:\n"
            "      PR: ${{ github.event.number }}\n"
            "      IMG: registry.cloudflare.com/unghost-app\n"
            "    steps:\n"
            "      - uses: actions/checkout@v4\n"
            "      - uses: docker/setup-buildx-action@v3\n"
            "      - run: |\n"
            "          docker build -t $IMG:pr-$PR .\n"
            "          docker push $IMG:pr-$PR\n"
            "        env:\n"
            "          CLOUDFLARE_API_TOKEN:\n"
            "            ${{ secrets.CLOUDFLARE_API_TOKEN }}\n"
            "      - run: |\n"
            "          npx wrangler containers deploy \\\n"
            "            --name=unghost-preview-$PR \\\n"
            "            --image=$IMG:pr-$PR\n"
            "      - uses: actions/github-script@v7\n"
            "        with:\n"
            "          script: |\n"
            "            const url =\n"
            "              `https://preview-${context.issue.number}` +\n"
            "              `.unghost.com`;\n"
            "            github.rest.issues.createComment({\n"
            "              ...context.repo,\n"
            "              issue_number: context.issue.number,\n"
            "              body: `Preview ready: ${url}`,\n"
            "            });\n"
            "\n"
            "  deploy-staging:\n"
            "    if: github.event_name == 'push'\n"
            "        && github.ref == 'refs/heads/main'\n"
            "    needs: [verify, e2e]\n"
            "    runs-on: ubuntu-latest\n"
            "    environment: staging\n"
            "    env:\n"
            "      IMG: registry.cloudflare.com/unghost-app\n"
            "    steps:\n"
            "      - uses: actions/checkout@v4\n"
            "      - run: npm ci && npm run migrate:up\n"
            "        env:\n"
            "          MONGODB_URI:\n"
            "            ${{ secrets.STAGING_MONGODB_URI }}\n"
            "      - run: docker build -t $IMG:${{ github.sha }} .\n"
            "      - run: docker push $IMG:${{ github.sha }}\n"
            "      - run: |\n"
            "          npx wrangler containers deploy \\\n"
            "            --name=unghost-staging \\\n"
            "            --image=$IMG:${{ github.sha }}\n"
            "      - run: ./scripts/smoke.sh https://staging.unghost.com\n"
            "      - if: failure()\n"
            "        run: |\n"
            "          npx wrangler containers rollback unghost-staging\n"
            "\n"
            "  deploy-production:\n"
            "    if: startsWith(github.ref, 'refs/tags/v')\n"
            "    needs: [verify, e2e]\n"
            "    runs-on: ubuntu-latest\n"
            "    environment: production   # requires manual approval\n"
            "    env:\n"
            "      IMG: registry.cloudflare.com/unghost-app\n"
            "      TAG: ${{ github.ref_name }}\n"
            "    steps:\n"
            "      - uses: actions/checkout@v4\n"
            "      - run: npm ci && npm run migrate:up\n"
            "        env:\n"
            "          MONGODB_URI:\n"
            "            ${{ secrets.PROD_MONGODB_URI }}\n"
            "      - run: docker build -t $IMG:$TAG .\n"
            "      - run: docker push $IMG:$TAG\n"
            "      - run: |\n"
            "          npx wrangler containers deploy \\\n"
            "            --name=unghost-prod \\\n"
            "            --image=$IMG:$TAG \\\n"
            "            --strategy=blue-green\n"
            "      - run: ./scripts/smoke.sh https://www.unghost.com\n"
            "      - if: failure()\n"
            "        run: npx wrangler containers rollback unghost-prod\n"
            "      - name: Notify Sentry release\n"
            "        run: |\n"
            "          npx sentry-cli releases new $TAG\n"
            "          npx sentry-cli releases finalize $TAG\n"
        ),
        h2("8.4 Database migrations"),
        body("Migrations use <i>migrate-mongo</i> and are part of the deploy job, not a manual step."),
        bullets([
            "Folder: <i>server/db/migrations/</i>.",
            "File name: <i>YYYYMMDD_HHmm_description.js</i>.",
            "Every migration has both <i>up</i> and <i>down</i>. The <i>down</i> must be tested in staging.",
            "Migrations run before the new image is promoted to receive traffic. Failure blocks the deploy.",
            "Long-running migrations (>30 seconds) use a feature flag — deploy the code first behind a flag, run the migration out-of-band, flip the flag.",
        ]),
        h2("8.5 Rollback playbook"),
        body("Rollbacks are a one-command operation; the runbook lives in <i>docs/runbooks/rollback.md</i>."),
        code(
            "# Roll the production app back to the previous image SHA\n"
            "npx wrangler containers rollback unghost-prod\n"
            "\n"
            "# Or pin to a specific known-good SHA\n"
            "npx wrangler containers deploy --name=unghost-prod --image=...:v1.4.2\n"
            "\n"
            "# Roll a migration back (rarely — destructive)\n"
            "MONGODB_URI=$PROD_URI npm run migrate:down -- --count=1\n"
        ),
        h2("8.6 Smoke-test script"),
        code(
            "#!/usr/bin/env bash\n"
            "# scripts/smoke.sh — runs after every deploy\n"
            "set -euo pipefail\n"
            "BASE=$1\n"
            "echo \"Smoke testing $BASE\"\n"
            "\n"
            "# 1. health endpoint\n"
            "curl -fsS \"$BASE/api/health\" | jq -e '.ok == true'\n"
            "\n"
            "# 2. login page renders\n"
            "curl -fsS \"$BASE/login\" | grep -q 'Welcome back'\n"
            "\n"
            "# 3. public API responds\n"
            "curl -fsS \"$BASE/api/bootcamps\" | jq -e '. | length > 0'\n"
            "\n"
            "# 4. version header matches deployed SHA\n"
            "test \"$(curl -sI \"$BASE\" | grep -i x-app-version | tr -d '\\r' | awk '{print $2}')\" = \"$GITHUB_SHA\"\n"
            "\n"
            "echo \"Smoke OK\"\n"
        ),
        h2("8.7 Secrets management"),
        bullets([
            "<b>GitHub Secrets</b> — pipeline-time secrets (registry creds, Cloudflare API token, Sentry DSN for sourcemaps, Atlas migrator URI).",
            "<b>Cloudflare environment variables</b> — runtime app secrets, per environment.",
            "<b>1Password</b> — canonical home for every secret with sharing controls; engineers pull into local <i>.env</i> via <i>op</i> CLI.",
            "<b>Never commit</b> any <i>.env*</i> file. <i>.gitignore</i> covers them; CI rejects PRs that contain new env-like files.",
        ]),
        h2("8.8 Approval gates"),
        body(
            "Production deploys require two human approvals via GitHub Environments protection rules. Approvers are configured in the <i>production</i> "
            "environment in repo settings. Staging deploys have no approval requirement to keep iteration fast."
        ),
        h2("8.9 Observability around deploys"),
        bullets([
            "Every Sentry release is tagged with the Git SHA; errors auto-link to commits.",
            "Axiom logs include <i>app.version</i>, <i>app.environment</i>, <i>app.region</i> fields on every line.",
            "Better Stack receives a heartbeat after every successful deploy. Missed heartbeat means the deploy script crashed mid-flight.",
            "Slack #deploys gets one message per environment per deploy with the SHA, author, and link to the run.",
        ]),
        PageBreak(),
    ]
    return out


# ---------- Section 9: roadmap ----------
def section_roadmap():
    out = [h1("9. 8-week hardening roadmap", "sec9")]
    out += [
        body(
            "The plan below converts everything in sections 1–8 into a week-by-week execution sequence. Each week has acceptance criteria; a week is "
            "&quot;done&quot; only when every criterion passes. The plan assumes two full-time engineers and access to ops support for provider setup."
        ),
        h2("Week 1 — Foundations: structure, design, contributing"),
        body("Goal: every new contributor can clone, run, and find their way around in an hour."),
        bullets([
            "Folder restructure to <i>app/ · components/ · server/ · shared/</i> per section 5.",
            "Add ESLint <i>boundaries</i> rules and a CONTRIBUTING.md.",
            "Apply the new design guide tokens (assuming it lands this week).",
            "Set up Storybook with a story per atomic component.",
            "Open initial 5 ADRs: monolith, Cloudflare Containers, Atlas Mumbai, Redis cache, design swap.",
        ]),
        cap("Acceptance: a new engineer can clone, run npm run dev, and ship a hello-world PR within 90 minutes."),
        h2("Week 2 — Security and persistence"),
        body("Goal: no in-memory state, no plaintext passwords, no unbounded inputs."),
        bullets([
            "Bcrypt password path + secure cookie config (httpOnly, secure, sameSite=lax) wired into NextAuth.",
            "Persist OTP and email reset tokens in Redis with TTL.",
            "Persist support tickets and email templates to MongoDB collections.",
            "Add zod validators to every <i>app/api/**/*.ts</i> route; reject unknown fields.",
            "Add CSRF protection on state-changing routes via NextAuth's built-in token where applicable.",
        ]),
        cap("Acceptance: zod schema present on 100 percent of POST/PUT/PATCH/DELETE routes; e2e auth flow uses bcrypt-hashed seed users."),
        h2("Week 3 — Test suite"),
        body("Goal: every critical user flow is covered by an automated test."),
        bullets([
            "Vitest unit suite for every <i>server/{domain}/service.ts</i>.",
            "Playwright e2e flows: signup, login, apply to mission, stage advance, bootcamp enrol, AI Coach chat, recruiter post-job, admin moderation.",
            "Mongoose tests use <i>mongodb-memory-server</i> for isolation.",
            "Coverage gate in CI: fail the build below 70 percent statement coverage on changed files.",
        ]),
        cap("Acceptance: green CI on a 30-PR rolling window; flake rate below 2 percent."),
        h2("Week 4 — Observability and limits"),
        body("Goal: when something breaks, we know within 60 seconds."),
        bullets([
            "Sentry SDK in server and browser; release wiring tied to CI.",
            "Pino structured logs with correlation-id middleware on every request.",
            "Axiom transport for logs; saved queries created.",
            "Upstash Redis rate-limit middleware on /api/coach, /api/otp, /api/email/*, /api/auth/*.",
            "R2 file storage with presigned URLs for resume PDF uploads.",
        ]),
        cap("Acceptance: a synthetic 5xx in staging shows up in Sentry + Axiom + Slack #engineering within 60 seconds."),
        h2("Week 5 — Database and caching"),
        body("Goal: queries are fast at 10x today's data and cache hit-rate is measurable."),
        bullets([
            "Audit every read path and add compound indexes as needed; document in <i>server/db/indexes.ts</i>.",
            "Run an EXPLAIN audit script in CI on every PR that touches a model.",
            "Add a read-through cache wrapper around the four highest-traffic queries (bootcamp catalogue, public missions, company profile, dashboard counts).",
            "Wire migrate-mongo with a <i>migrate:up</i> script.",
            "Atlas slow-query alerts to PagerDuty at &gt;500 ms.",
        ]),
        cap("Acceptance: p95 of any indexed query &lt;= 80 ms at 10x current data volume; cache hit-rate &gt;= 80 percent on the four wrapped queries."),
        h2("Week 6 — Cloudflare and Docker"),
        body("Goal: staging.unghost.com is live, healthy, and reachable from the public internet."),
        bullets([
            "Productionised Dockerfile per section 7.5.",
            "Cloudflare account, Containers project, DNS, R2 buckets all provisioned per section 7.",
            "MongoDB Atlas M30 in Mumbai, Upstash Redis, Sentry, Axiom, Better Stack all online.",
            "Staging environment fully deployed with sandbox provider keys.",
            "Health endpoint and smoke script working end-to-end.",
        ]),
        cap("Acceptance: staging.unghost.com serves the application using sandbox keys; uptime &gt;= 99.5 percent for 5 consecutive days."),
        h2("Week 7 — CI/CD and PR previews"),
        body("Goal: every PR gets a live URL; staging auto-deploys; rollback is one click."),
        bullets([
            "GitHub Actions workflow per section 8.3, including preview, staging, and production jobs.",
            "Approval gate configured on the production environment.",
            "Sentry release tracking wired into prod deploys.",
            "Smoke + auto-rollback in production deploy job.",
            "Documentation: rollback.md, incident-response.md, on-call.md runbooks.",
        ]),
        cap("Acceptance: a contrived bad deploy auto-rolls-back within 90 seconds and reaches Slack #prod with a link to the run."),
        h2("Week 8 — Real keys, load, launch readiness"),
        body("Goal: live providers, 10k-user load test passes, go/no-go meeting held."),
        bullets([
            "Swap sandbox keys for live Anthropic, MSG91, Resend, PhonePe, Pusher, 100ms, Inngest.",
            "Real 100ms SDK integrated in the live room.",
            "Load test with k6 simulating 10,000 concurrent sessions; results documented; capacity tuned.",
            "DPDP data-export and erasure endpoints implemented.",
            "Go-live runbook: pre-cutover, cutover, post-cutover checklists.",
            "Production deploy at the end of the week — soft launch to invited beta users.",
        ]),
        cap("Acceptance: 10k-user k6 test holds error rate &lt; 0.1 percent and p95 &lt;= 800 ms; legal sign-off on DPDP; production live."),
        h2("Risk register"),
        styled_table(
            [
                ["Risk", "Likelihood", "Impact", "Mitigation"],
                ["Provider onboarding (MSG91 DLT, PhonePe KYC) slower than expected", "High", "Schedule slip", "Start Week 1 in parallel; sandbox covers dev"],
                ["Design guide late or vague", "Medium", "Week 1 slip", "Apply guide token-by-token; UI logic untouched"],
                ["Test backfill slower than 10 days", "Medium", "Weak coverage", "Prioritise critical paths; ship at 50 percent then 70 percent"],
                ["Atlas/Cloudflare regional issue", "Low", "Outage", "Better Stack alerts; Atlas cross-region read replica when scale warrants"],
                ["Mongoose performance surprise at 10k load", "Medium", "Scaling rework", "Index audit in Week 5; replicas + cache in Week 5"],
                ["Live 100ms minutes cost spike", "Medium", "Cost", "Per-room time cap + monthly budget alert"],
            ],
            col_widths=[5.6 * cm, 1.8 * cm, 1.8 * cm, 5.8 * cm],
        ),
        PageBreak(),
    ]
    return out


# ---------- Appendix ----------
def appendix():
    out = [h1("Appendix", "appendix")]
    out += [
        h2("A1. Service inventory"),
        styled_table(
            [
                ["Service", "Purpose", "Owner"],
                ["Cloudflare (CDN/WAF/Containers/R2/DNS)", "Edge, runtime, object storage", "DevOps"],
                ["MongoDB Atlas (Mumbai, M30)", "Primary OLTP database", "Backend"],
                ["Upstash Redis (Mumbai)", "Cache, rate-limit, sessions, OTP store", "Backend"],
                ["Sentry", "Error tracking + performance traces", "Eng leadership"],
                ["Axiom", "Structured logs", "Eng leadership"],
                ["Better Stack", "External uptime + status page", "Eng leadership"],
                ["Anthropic Claude", "LLM provider", "Product"],
                ["MSG91", "SMS + OTP delivery", "Product"],
                ["Resend", "Transactional email", "Product"],
                ["PhonePe", "Payment gateway", "Finance"],
                ["100ms", "Video / live sessions", "Product"],
                ["Pusher Channels", "Realtime messaging", "Product"],
                ["Inngest", "Background jobs", "Backend"],
                ["GitHub + Actions", "Source control + CI/CD", "DevOps"],
                ["1Password", "Secret storage", "All engineers"],
            ],
            col_widths=[5.6 * cm, 6.4 * cm, 3.6 * cm],
        ),
        Spacer(1, 0.4 * cm),
        h2("A2. Cost roll-up (10k MAU)"),
        body("Approximate steady-state monthly cost in USD, excluding payment-processor variable fees:"),
        styled_table(
            [
                ["Bucket", "USD / month"],
                ["Infrastructure (CF, Atlas, Redis, R2)", "~ 575"],
                ["Observability (Sentry, Axiom, Better Stack)", "~ 180"],
                ["Product providers (Claude, MSG91, Resend, 100ms, Pusher, Inngest)", "~ 650"],
                ["Total fixed", "~ 1,405 USD"],
                ["Variable (PhonePe transaction fees)", "~ 1.99% + GST per txn"],
            ],
            col_widths=[10 * cm, 5 * cm],
        ),
        Spacer(1, 0.4 * cm),
        h2("A3. Glossary"),
        styled_table(
            [
                ["Term", "Meaning"],
                ["DPDP", "Digital Personal Data Protection Act 2023 — India's GDPR-equivalent. Drives data residency + erasure rights."],
                ["SLA", "Service-Level Agreement. unGhost's anti-ghost guarantee: recruiter responds within a stated number of hours or student gets a refund."],
                ["RSC", "React Server Components — Next.js App Router feature; renders components on the server."],
                ["MAU", "Monthly active users."],
                ["RUM", "Real-User Monitoring — performance data collected from real user browsers."],
                ["WAF", "Web Application Firewall."],
                ["PITR", "Point-In-Time Recovery — database backup feature."],
                ["ADR", "Architecture Decision Record."],
                ["PR preview", "An ephemeral environment built for an in-progress pull request."],
            ],
            col_widths=[3.6 * cm, 11.4 * cm],
        ),
        Spacer(1, 0.4 * cm),
        h2("A4. Open questions for tech-head review"),
        bullets([
            "Is Cloudflare Containers the right runtime, or would the team prefer Fly.io / Railway / Render given familiarity?",
            "Do we add a separate read replica from week 1, or wait for the load test in week 8 to confirm need?",
            "Should we co-locate the team for the first two weeks of the hardening sprint?",
            "What is the launch GTM plan, and does it suggest a different DAU/peak ratio than the 20%/500 assumed here?",
            "Are there compliance requirements beyond DPDP (e.g. SOC 2 for enterprise recruiter contracts) we should plan for now rather than later?",
        ]),
        Spacer(1, 1 * cm),
        Paragraph("End of document.", STYLES["caption"]),
    ]
    return out


# ---------- Compose ----------
def build():
    story = []
    story += cover_page()
    story += toc()
    story += executive_summary()
    story += section_current_state()
    story += section_scaling()
    story += section_prototype_vs_prod()
    story += section_design()
    story += section_code_structure()
    story += section_split()
    story += section_cloudflare()
    story += section_cicd()
    story += section_roadmap()
    story += appendix()

    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="unGhost — Production Readiness",
        author="unGhost engineering",
        subject="Production-readiness plan and Cloudflare deployment guide",
    )

    def on_first(canvas, doc):
        _draw_cover(canvas, doc)

    def on_later(canvas, doc):
        _draw_page_chrome(canvas, doc)

    doc.build(story, onFirstPage=on_first, onLaterPages=on_later)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    build()
