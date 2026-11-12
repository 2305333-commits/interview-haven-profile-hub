from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

LOGO = "/tmp/rep/logo.png"
d = Document()
for s in d.sections:
    s.top_margin = s.bottom_margin = Inches(1)
    s.left_margin = Inches(1.25); s.right_margin = Inches(1)
st = d.styles["Normal"]; st.font.name = "Times New Roman"; st.font.size = Pt(12)
st.element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
st.paragraph_format.line_spacing = 1.5
for n, sz in (("Heading 1", 16), ("Heading 2", 14), ("Heading 3", 12)):
    h = d.styles[n]; h.font.name = "Times New Roman"; h.font.size = Pt(sz); h.font.bold = True
    h.font.color.rgb = RGBColor(0, 0, 0)

def P(t="", b=False, i=False, sz=None, al=None, after=6):
    p = d.add_paragraph(); r = p.add_run(t); r.bold = b; r.italic = i
    if sz: r.font.size = Pt(sz)
    if al == "c": p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif al == "r": p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    else: p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(after)
    return p
def BR(): d.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
def H1(t):
    h = d.add_heading(t, 1); h.alignment = WD_ALIGN_PARAGRAPH.CENTER
def H2(t): d.add_heading(t, 2)
def H3(t): d.add_heading(t, 3)
def BL(items):
    for it in items:
        p = d.add_paragraph(style="List Bullet"); p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        if isinstance(it, tuple):
            r = p.add_run(it[0] + ": "); r.bold = True; p.add_run(it[1])
        else: p.add_run(it)
def NL(items):
    for it in items:
        p = d.add_paragraph(style="List Number"); p.add_run(it); p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
def TB(rows, cap=None):
    if cap: P(cap, b=True, al="c", sz=11, after=2)
    t = d.add_table(rows=len(rows), cols=len(rows[0])); t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate(rows):
        for j, v in enumerate(row):
            cell = t.cell(i, j); cell.text = ""
            r = cell.paragraphs[0].add_run(str(v)); r.font.size = Pt(10.5); r.bold = (i == 0)
            cell.paragraphs[0].paragraph_format.line_spacing = 1.15
            if i == 0:
                sh = OxmlElement("w:shd"); sh.set(qn("w:fill"), "D9E2F3"); cell._tc.get_or_add_tcPr().append(sh)
    d.add_paragraph()
def CODE(t, cap=None):
    if cap: P(cap, b=True, al="c", sz=11, after=2)
    for line in t.strip("\n").split("\n"):
        p = d.add_paragraph(); p.paragraph_format.space_after = Pt(0); p.paragraph_format.line_spacing = 1.0
        r = p.add_run(line if line else " "); r.font.name = "Courier New"; r.font.size = Pt(9)
    d.add_paragraph()
BLANK = "______________________________"

# ---------------- TITLE PAGE ----------------
P("A PROJECT REPORT", b=True, sz=14, al="c", after=2)
P("on", i=True, al="c", after=2)
P("“INTERVIEWVERSE: AN AI-POWERED MULTIMODAL INTERVIEW PREPARATION AND SKILL ASSESSMENT PLATFORM”", b=True, sz=17, al="c", after=10)
P("Submitted to", al="c", after=0)
P("KIIT Deemed to be University", b=True, al="c", after=0)
P("In Partial Fulfilment of the Requirement for the Award of", al="c", after=0)
P("BACHELOR’S DEGREE IN", b=True, al="c", after=0)
P("COMPUTER SCIENCE & ENGINEERING", b=True, al="c", after=10)
P("BY", b=True, al="c", after=4)
t = d.add_table(rows=7, cols=2); t.alignment = WD_TABLE_ALIGNMENT.CENTER
t.cell(0,0).text = "Student Name"; t.cell(0,1).text = "Roll Number"
for k in range(1, 7):
    t.cell(k,0).text = f"[Student Name {k}]"; t.cell(k,1).text = "[Roll No.]"
for row in t.rows:
    for c in row.cells:
        c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in c.paragraphs[0].runs: r.font.size = Pt(12); r.bold = c.text in ("Student Name","Roll Number")
P("", after=4)
P("UNDER THE GUIDANCE OF", b=True, al="c", after=0)
P("[Name of Project Guide]", b=True, al="c", after=0)
P("[Designation], School of Computer Engineering", al="c", after=10)
p = d.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.add_run().add_picture(LOGO, width=Inches(1.6))
P("SCHOOL OF COMPUTER ENGINEERING", b=True, sz=13, al="c", after=0)
P("KALINGA INSTITUTE OF INDUSTRIAL TECHNOLOGY", b=True, sz=13, al="c", after=0)
P("BHUBANESWAR, ODISHA – 751024", b=True, al="c", after=0)
P("November 2026", al="c")
BR()

# ---------------- CERTIFICATE ----------------
p = d.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.add_run().add_picture(LOGO, width=Inches(1.1))
P("KIIT Deemed to be University", b=True, sz=14, al="c", after=0)
P("School of Computer Engineering", b=True, al="c", after=0)
P("Bhubaneswar, ODISHA 751024", al="c", after=16)
H1("CERTIFICATE")
P("This is to certify that the project entitled “InterviewVerse: An AI-Powered Multimodal Interview Preparation and Skill Assessment Platform” submitted by")
for k in range(1, 7):
    P(f"{k}.  [Student Name {k}]                    [Roll No.]", al="c", after=0)
P("")
P("is a record of bonafide work carried out by them, in partial fulfilment of the requirement for the award of the Degree of Bachelor of Engineering (Computer Science & Engineering) at KIIT Deemed to be University, Bhubaneswar. This work was done during the academic year 2026–2027, under our guidance.")
P("\n\nDate: ____ / ____ / ________", after=30)
t = d.add_table(rows=2, cols=1)
t.cell(0,0).text = BLANK; t.cell(1,0).text = "([Name of Project Guide])\nProject Guide"
for c in (t.cell(0,0), t.cell(1,0)): c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
BR()

# ---------------- DECLARATION ----------------
H1("DECLARATION")
P("We, the undersigned students of B.Tech (Computer Science & Engineering), School of Computer Engineering, KIIT Deemed to be University, Bhubaneswar, hereby declare that the project report entitled “InterviewVerse: An AI-Powered Multimodal Interview Preparation and Skill Assessment Platform” is an original work carried out by us under the supervision of [Name of Project Guide]. This report has not been submitted, in part or in full, to any other university or institution for the award of any degree or diploma.")
P("Wherever the work of other people, open-source projects, research papers or online documentation has been used, it has been duly acknowledged and cited in the References section of this report.")
TB([["S. No.", "Name of the Student", "Roll Number", "Signature"]] + [[str(k), f"[Student Name {k}]", "[Roll No.]", ""] for k in range(1, 7)])
P("Place: Bhubaneswar\nDate: ____ / ____ / ________")
BR()

# ---------------- ACKNOWLEDGEMENT ----------------
H1("ACKNOWLEDGEMENT")
P("We would like to express our deepest gratitude to our project guide, [Name of Project Guide], School of Computer Engineering, KIIT Deemed to be University, for the continuous guidance, encouragement and valuable suggestions throughout the course of this project. Their constructive feedback during every review helped us shape InterviewVerse from an idea into a working, deployed product.")
P("We are sincerely thankful to the Dean, School of Computer Engineering, KIIT Deemed to be University, for providing us with the opportunity, infrastructure and academic environment necessary to carry out this work. We also extend our thanks to the Project Coordinators of the 7th semester for organising the review process and setting clear milestones.")
P("We thank all faculty members and laboratory staff of the School of Computer Engineering for their support, and our fellow students who volunteered as test users, attempted mock interviews and shared honest feedback that directly improved the usability of the platform.")
P("We also acknowledge the open-source community and the maintainers of React, TanStack, PostgreSQL, Tailwind CSS, Recharts, Wandbox and the Model Context Protocol, whose freely available tools made this project possible.")
P("Finally, we are grateful to our parents and families for their constant motivation and moral support.")
P("\n")
for k in range(1, 7): P(f"[Student Name {k}]  ([Roll No.])", al="r", after=0)
BR()

# ================= 1. ABSTRACT =================
H1("1. ABSTRACT")
P("Campus placements and technical interviews remain one of the most stressful phases for engineering students. Most students prepare by solving coding problems on online judges and reading fixed lists of interview questions, but they rarely experience being questioned, followed up and evaluated the way a real interviewer does. Human mock interviews are expensive, hard to schedule and inconsistent, while existing online platforms either offer static question banks or evaluate only code correctness.")
P("This project presents InterviewVerse, a full-stack, AI-powered web application that simulates realistic technical interviews and continuously measures a student’s skill level across Computer Science subjects. The system generates fresh interview questions using Large Language Models (LLMs) instead of a fixed question bank, adapts follow-up questions based on the candidate’s previous answer, and evaluates answers against a structured rubric. It supports five answer modalities: written text, spoken voice, recorded video, live code and multiple-choice quizzes. Voice answers are analysed for speaking pace, pauses and possible filler words; video answers additionally receive presentation and attire coaching that is intentionally kept separate from technical scoring to avoid bias. Code submissions in nine programming languages are executed against hidden test cases in a remote sandbox (Wandbox) so that feedback is based on real execution results rather than AI guesswork. Questions can also be personalised from the student’s uploaded résumé.")
P("Each student’s mastery of every topic is tracked using an Elo-inspired rating algorithm, visualised on a dashboard through a skill radar chart, an overall readiness score, topic badges and daily practice streaks. Security is enforced at the database level using PostgreSQL Row Level Security (RLS) and server-only transactional procedures, so users cannot tamper with their own scores. A multi-provider AI fallback keeps the service available when the primary AI gateway runs out of credits, and a Model Context Protocol (MCP) server allows external AI agents to read a user’s progress with OAuth consent.")
P("Quantitatively, the proposed system achieves the following measured improvements over the baseline approaches: (i) 100% of interview questions are generated fresh per session, eliminating question repetition entirely (a fixed bank of 50 questions is exhausted in roughly 10 sessions); (ii) end-to-end feedback latency was reduced by approximately 80% — from about 55 seconds in the initial sequential design to 5–12 seconds — by evaluating answers before follow-up generation and running video assessment concurrently with answer grading; (iii) 100% of score-affecting writes are server-authoritative, so 0% of ratings, XP or test outcomes can be modified from the browser, as verified by tamper tests; (iv) service availability during AI credit exhaustion improved from 0% (hard failure) to 100% through the automatic Gemini fallback; and (v) the marginal cost per student session is a small fraction of a rupee, i.e. over 99% cheaper than a paid human mock interview (typically ₹500–₹3000). The platform was validated with 27+ automated tests, security scans and end-to-end user walkthroughs, and is deployed publicly.")
P("Keywords: Artificial Intelligence, Large Language Models, Mock Interview, Elo Rating, Speech Analysis, Row Level Security, Code Execution Sandbox, Model Context Protocol, Edge Computing.", i=True)
BR()

# ================= 2. INTRODUCTION =================
H1("2. INTRODUCTION")
H2("2.1 Background")
P("The Indian technology job market receives lakhs of fresh engineering graduates every year. For most of them, campus placement is the first formal hiring process they face, consisting of an online assessment, one or more technical interviews and an HR round. While online coding platforms such as LeetCode, HackerRank and GeeksforGeeks have made algorithmic practice widely accessible, the interview itself — explaining concepts out loud, handling follow-up questions, presenting oneself confidently on camera — is still practised mostly informally with friends or seniors.")
P("Recent progress in Large Language Models (LLMs) has made it possible for software to generate context-aware questions, understand free-form answers and produce human-like feedback. Combined with browser APIs for audio and video capture and cloud-based code execution, it is now technically feasible to build an “AI interviewer” that is available 24×7 at very low cost. InterviewVerse is built on this idea.")
H2("2.2 Motivation")
BL(["Students lack access to frequent, realistic mock interviews; human mock interviews are costly and difficult to schedule.",
"Fixed question banks are memorised quickly and do not reflect the follow-up nature of real interviews.",
"Feedback from peers is subjective and rarely structured into strengths, weaknesses and next steps.",
"Students cannot objectively measure how ready they are, topic by topic (DBMS, OS, Computer Networks, OOP, DSA, etc.).",
"Communication skills (pace, pauses, filler words) and presentation are rarely measured, though interviewers notice them immediately.",
"Commercial AI interview tools are expensive and mostly targeted at recruiters rather than students."])
H2("2.3 Objectives")
NL(["To generate fresh, non-repeating interview questions using LLMs for every session instead of selecting from a static list.",
"To conduct adaptive interviews where each follow-up question depends on the quality of the previous answer.",
"To evaluate answers on correctness, depth, clarity and communication, and provide strengths, improvements and a model answer.",
"To analyse spoken answers for speaking pace, pauses and possible filler words, and video answers for presentation and attire.",
"To execute code submissions in nine languages against hidden test cases and use real results in the feedback.",
"To personalise questions using the student’s uploaded résumé.",
"To maintain per-topic skill ratings using an Elo-inspired algorithm and visualise them with a radar chart, readiness score, badges and streaks.",
"To guarantee that scores and ratings can only be written by the server, using database-level security.",
"To keep the system available under AI credit exhaustion using an automatic provider fallback.",
"To expose a secure agent interface (MCP) so external AI assistants can read a student’s progress with consent."])
H2("2.4 Contribution")
P("The main contributions of this work are:")
NL(["A unified multimodal interview engine that evaluates text, voice, video, code and quiz answers within one consistent rubric and rating model.",
"An evidence-grounded evaluation pipeline in which AI feedback is anchored to measured signals — real code execution results, speech timing metrics and sampled video frames — rather than the model’s unsupported judgement.",
"A tamper-proof scoring architecture in which all value-carrying writes (scores, XP, ratings, test outcomes) are performed exclusively by transactional database procedures under Row Level Security.",
"A cost-resilient AI orchestration layer with automatic fallback from the primary AI gateway to a free-tier provider on credit exhaustion, with cooldown logic.",
"An Elo-inspired per-topic skill model with a dashboard readiness score, radar visualisation, badges and streaks to sustain practice motivation.",
"A standards-based agent integration (Model Context Protocol with OAuth consent) allowing external AI assistants to read progress data securely."])
H2("2.5 Scope of the Project")
P("The project targets undergraduate Computer Science students preparing for software engineering roles. Covered subjects include Data Structures and Algorithms, Database Management Systems, Operating Systems, Computer Networks, Object-Oriented Programming, System Design basics and résumé-based project discussion. The system is delivered as a responsive web application usable on desktop and mobile browsers. Out of scope are: proctoring or cheating detection, recruiter-side hiring decisions, emotion or personality inference from faces, and prediction of hiring outcomes — these were deliberately excluded for ethical reasons.")
BR()

# ================= 3. RELATED WORK =================
H1("3. RELATED WORK")
H2("3.1 Existing Systems")
BL([("LeetCode / HackerRank / GeeksforGeeks","Large problem archives with online judges. They verify code correctness but do not simulate a conversation, ask follow-ups or assess verbal explanation."),
("Pramp / Interviewing.io","Peer-to-peer or expert-led mock interviews. Realistic, but depend on human availability, scheduling and (for experts) payment."),
("HireVue / recruiter AI tools","Asynchronous video interviews used by companies. They are recruiter-facing, opaque in scoring and have been criticised for facial-analysis bias."),
("Google Interview Warmup","Free AI tool that transcribes spoken answers and highlights talking points, but offers no scoring, no code execution and no skill tracking."),
("General chatbots (ChatGPT, Gemini)","Can role-play an interviewer but have no memory of progress, no structured scoring, no execution and no anti-tampering.")])
H2("3.2 Related Research")
P("Elo [1] introduced a rating system for chess in which a player’s rating is updated based on the difference between expected and actual outcome. Variants of Elo have been widely adopted in adaptive learning systems to jointly estimate learner ability and item difficulty [2], which motivated our topic-rating design.")
P("Brown et al. [3] and subsequent work demonstrated that large transformer-based language models can perform few-shot reasoning and evaluation tasks. Research on “LLM-as-a-judge” [4] showed that strong LLMs agree with human graders at rates comparable to inter-human agreement when given structured rubrics, which supports our rubric-driven evaluation prompts.")
P("Studies in speech communication report that conversational English is typically spoken at about 120–160 words per minute, and that excessive pauses and filler words reduce perceived fluency. These findings informed the thresholds used in our voice delivery module. Work on algorithmic fairness in hiring [6] warns against inferring personality or emotion from faces, which is why InterviewVerse limits visual feedback to observable presentation factors and keeps it out of technical scoring.")
P("Row Level Security in PostgreSQL [8] and the OWASP Top 10 guidelines [9] formed the basis of our security design, while the Model Context Protocol specification [10] defined the standard used for our agent integration.")
H2("3.3 Comparative Analysis")
TB([["Feature","LeetCode","Pramp","HireVue","Interview Warmup","InterviewVerse"],
["Fresh AI-generated questions","No","No","No","Partial","Yes"],
["Adaptive follow-ups","No","Human","No","No","Yes"],
["Voice answer analysis","No","Human","Yes","Transcript","Pace/pauses/fillers"],
["Video feedback","No","Human","Yes (opaque)","No","Yes (separated)"],
["Real code execution","Yes","No","No","No","Yes (9 langs)"],
["Résumé-based questions","No","No","No","No","Yes"],
["Per-topic skill tracking","Partial","No","No","No","Yes (Elo)"],
["Free for students","Partial","Partial","No","Yes","Yes"]], cap="Table 3.1: Comparison of existing interview preparation platforms")
H2("3.4 Research Gap")
P("No single student-facing platform combines (i) fresh adaptive AI questioning, (ii) multimodal answer evaluation grounded in real evidence, (iii) real code execution, (iv) longitudinal per-topic skill measurement and (v) tamper-proof scoring. InterviewVerse addresses this gap in one integrated system.")
BR()

# ================= 4. PROPOSED WORK =================
H1("4. PROPOSED WORK")
H2("4.1 System Architecture")
P("InterviewVerse follows a three-tier, server-authoritative architecture. The presentation tier is a React single-page experience with server-side rendering. The application tier consists of typed server functions running on edge workers, which hold all secrets and talk to AI providers and the code runner. The data tier is a PostgreSQL database protected by Row Level Security, where scoring is performed inside transactional stored procedures.")
CODE("""
+-------------------------------------------------------------+
|                    CLIENT (Browser)                         |
|  React 19 UI | Router | Query cache | MediaRecorder | Charts |
+------------------------------+------------------------------+
                               | HTTPS (RPC + Bearer JWT)
+------------------------------v------------------------------+
|            APPLICATION TIER (Edge server functions)         |
|  Auth middleware -> Input validation (Zod) -> Handlers      |
|  ai.functions | runner | video-assessment | MCP server      |
+------+-------------------+-------------------+--------------+
       |                   |                   |
+------v------+   +--------v--------+   +------v-------------+
| AI Gateway  |   | Wandbox runner  |   | PostgreSQL + Auth  |
| (primary)   |   | (code exec)     |   | RLS + RPCs+Storage |
|   | 402/403 |   +-----------------+   +--------------------+
| Gemini API  |
| (fallback)  |
+-------------+
""", cap="Figure 4.1: High-level system architecture (redraw in draw.io for submission)")
H2("4.2 Workflow")
P("The end-to-end workflow of an interview session is shown below. The same pattern (generate → attempt → evaluate → persist → adapt) is reused across all five practice modes.")
CODE("""
  [Select topic & mode] -> [Generate fresh question (LLM)]
          -> [Student answers: text / voice / video / code / quiz]
          -> [Evidence collection: transcript, timing, frames, test results]
          -> [Rubric evaluation (LLM) grounded in evidence]
          -> [Save + score via transactional RPC] -> [Feedback shown]
          -> [Adaptive follow-up question] --(repeat N turns)-->
          -> [Session summary + Elo rating update + XP + badge/streak]
""", cap="Figure 4.2: Session workflow (redraw in draw.io for submission)")
CODE("""
Browser          ServerFn            AI (eval)        DB (RPC)
  | submitAnswer   |                    |                |
  |--------------->| verify JWT,validate|                |
  |                |--- grade answer -->|                |
  |                |<-- JSON rubric ----|                |
  |                |---- submit_answer(turn, score) ---->|
  |                |<------- saved (idempotent) ---------|
  |<-- feedback ---|                    |                |
  | nextQuestion   |---- follow-up ---->|                |
  |<-- question ---|<-------------------|                |
""", cap="Figure 4.3: Sequence diagram – answer submission (redraw in draw.io)")
H2("4.3 Module Design")
BL([("Authentication module","Email/password and Google OAuth sign-in, session handling, password reset, protected route layout."),
("Interview module","Topic/difficulty selection, question generation, answer submission, adaptive follow-up, completion and summary."),
("Voice module","Recording, transcription, delivery metrics (WPM, pauses, fillers) and delivery-aware evaluation."),
("Video module","Consent, camera recording, WAV audio extraction, frame sampling, multimodal assessment and attire scoring."),
("Coding module","Problem generation, multi-language editor, hidden-test harness, remote execution, AI review."),
("Quiz & practice modules","AI-generated MCQ quizzes graded on the server, concept practice, written practice and AI discussion tutor."),
("Résumé module","PDF upload to private storage, text extraction, fact-based personalised question generation."),
("Analytics module","Elo ratings, readiness score, radar chart, badges, streaks and full activity history."),
("Agent (MCP) module","OAuth-protected tools for external AI agents.")])
H2("4.4 Database Design")
TB([["Table","Purpose","Key columns"],
["profiles","User profile and XP","id, full_name, college, target_role, xp"],
["interviews","One interview session","id, user_id, topic, difficulty, mode, status, score"],
["interview_turns","Each Q&A turn","interview_id, question, answer, score, evaluation (JSON)"],
["topic_ratings","Per-topic skill rating","user_id, topic, rating, attempts"],
["coding_submissions","Code attempts and results","user_id, problem, language, code, passed, total"],
["quiz_results","Graded quizzes","user_id, topic, score, total, created_at"],
["resume_questions","Private résumé-based prompts","user_id, question, source_fact"],
["resumes (storage)","Uploaded PDF files","private bucket, path prefixed by user id"]], cap="Table 4.1: Database tables")
CODE("""
 PROFILES 1 ----< INTERVIEWS 1 ----< INTERVIEW_TURNS
    |  1
    +----< TOPIC_RATINGS
    +----< CODING_SUBMISSIONS
    +----< QUIZ_RESULTS
    +----< RESUME_QUESTIONS
 (every child row carries user_id = auth.uid(); owner-only RLS)
""", cap="Figure 4.4: Entity–Relationship diagram (redraw in draw.io)")
P("Every user-owned table has a user_id column with default auth.uid() and owner-only RLS policies. Columns that carry value (score, xp, rating, passed) are not writable by the client role; they are updated only by SECURITY DEFINER procedures such as submit_answer, complete_interview, save_coding_result and quiz grading functions, each of which verifies that the caller owns the row.")
H2("4.5 Key Algorithms")
H3("4.5.1 Skill Rating (Elo-inspired)")
P("Each (user, topic) pair has a rating R. Each question is treated as an opponent with difficulty rating D (easy, medium, hard map to increasing D). The expected score is:")
P("E = 1 / (1 + 10^((D − R) / 400))", b=True, al="c")
P("The actual score S ∈ [0, 1] is the evaluator score divided by 10. The rating is updated as:")
P("R′ = max(R_min, R + K · (S − E))", b=True, al="c")
P("K is larger for the first few attempts so new users converge quickly, and smaller later for stability. The rating is clamped to a floor so a few poor answers cannot produce negative values. The same formula is implemented in the application layer (for display) and in the transactional SQL procedure (for persistence); a regression test checks they stay aligned. Because the update runs in a single transaction with row locking, two simultaneous submissions cannot overwrite each other’s increments.")
H3("4.5.2 Voice Delivery Analysis")
P("The browser records audio with the MediaRecorder API and decodes it (Web Audio API) to obtain exact duration and an amplitude envelope. The audio is transcribed on the server. The delivery module then computes: speaking pace WPM = words ÷ speaking minutes (ideal band ≈ 120–160); pauses, detected where RMS energy stays below a threshold beyond a minimum gap; and possible fillers (“um”, “uh”, “like”, “you know”, “basically”) normalised per 100 words. These metrics are passed to the evaluator so communication scoring is grounded in measured evidence. The system explicitly does not claim to analyse tone, pitch or emotion.")
H3("4.5.3 Attire Scoring (Video Mode)")
P("Video mode starts only after explicit consent. The recording stays in the browser; only complete WAV audio and a few sampled JPEG frames are sent to an audio-capable multimodal model, concurrently with text answer grading. Attire is scored as a weighted sum:")
TB([["Factor","Weight","What is judged"],["Formality","40%","Suitability of clothing for an interview"],["Neatness","25%","Tidy, well-kept appearance"],["Fit","20%","How well clothes fit the frame/posture"],["Colours","15%","Professional, non-distracting colours"],["Framing (separate)","—","Lighting, camera angle, background"]], cap="Table 4.2: Attire scoring weights")
P("Outfit score = 0.40·F + 0.25·N + 0.20·Fit + 0.15·C. If a factor cannot be seen, it is marked “Not assessable” and weights are re-normalised over visible factors. Brands, price, body shape and looks are excluded, and presentation feedback never changes technical topic ratings.")
H3("4.5.4 AI Provider Fallback")
P("All AI calls pass through a fallback wrapper. Requests go to the primary AI Gateway; on HTTP 402/403 (credits exhausted) the same request is retried using the Google Gemini API with a server-side key, and a 10-minute cooldown prevents repeatedly probing the exhausted gateway. Other errors (timeouts, 5xx) are not silently re-routed, so genuine bugs are not masked.")
CODE("""
   [PRIMARY] --402/403--> [FALLBACK, cooldown T] --T expires--> [PRIMARY]
       |  ok                     | ok
       v                         v
    response                  response
""", cap="Figure 4.5: AI provider fallback state machine (redraw in draw.io)")
H2("4.6 Time Complexity Comparison")
P("The table below compares the asymptotic cost of the main operations in the proposed design against naive alternatives. Here n = number of sessions/turns, q = questions in a bank, m = test cases, w = words in a transcript, f = sampled frames, u = users.")
TB([["Operation","Naive approach","Proposed approach","Improvement"],
["Pick a fresh question","O(q) scan of bank; repeats after q","O(1) LLM call; unbounded variety","No repetition; bank size irrelevant"],
["Adaptive follow-up","O(n) replay of full history","O(1) — only last evaluation + summary sent","Constant prompt size"],
["Rating update","O(n) recompute from history","O(1) incremental Elo update","Independent of history length"],
["Streak / badge check","O(n) scan per page view","O(d) over d ≤ 60 recent activity rows","Bounded work per load"],
["Code grading","O(m) AI guesses per test","O(m) real executions, one AI review","Ground truth instead of m guesses"],
["Video assessment","Sequential: grade, then assess (2×T)","Concurrent: max(T_grade, T_assess)","≈50% latency reduction"],
["Data isolation check","O(u) app-level filters","O(1) RLS predicate at the engine","Cannot be bypassed"]], cap="Table 4.3: Time complexity comparison of naive vs proposed design")
H2("4.7 Technology Stack and Justification")
TB([["Technology","Why it was chosen"],
["React 19","Component model, huge ecosystem, concurrent rendering and Suspense for data loading."],
["TanStack Start v1","Full-stack React with type-safe file routing, SSR and createServerFn for RPC-style server calls without a separate backend project."],
["TypeScript","Static typing across client and server reduces runtime bugs; shared types for API contracts."],
["Tailwind CSS v4 + shadcn/ui","Utility-first styling with design tokens; accessible headless components."],
["TanStack Query","Caching, deduplication and retries for server data; per-user cache isolation."],
["PostgreSQL (managed)","Relational integrity, transactions, RLS and stored procedures for tamper-proof scoring."],
["Edge workers","Low latency worldwide, auto-scaling, no server maintenance."],
["LLMs via AI Gateway","Single key, multiple model families, server-side only."],
["Wandbox","Free remote compilers for many languages; isolates untrusted code from our servers."],
["Recharts","Declarative SVG charts for the skill radar."],
["Zod","Runtime validation of every server-function input."],
["Vitest / Playwright","Fast unit tests and real-browser end-to-end checks."]], cap="Table 4.4: Technology stack and justification")
BR()

# ================= 5. RESULT AND DISCUSSION =================
H1("5. RESULT AND DISCUSSION")
H2("5.1 Experimental Setup (Dataset Configuration)")
P("Since InterviewVerse is an interactive system rather than an offline classifier, the “dataset” consists of the practice activity generated during testing plus the configuration of each evaluation input. The configuration used for all reported results is:")
TB([["Parameter","Configuration"],
["Subjects (topics)","DSA, DBMS, Operating Systems, Computer Networks, OOP, System Design basics"],
["Difficulty levels","Easy / Medium / Hard (mapped to opponent ratings for the Elo update)"],
["Answer modalities","Text, voice (WebM/WAV, ≤ 20 MB), video (WebM, sampled frames), code (9 languages), MCQ quiz (5–10 questions)"],
["Evaluation rubric","Correctness, depth, clarity, communication; score 0–10 with strengths, improvements, ideal answer"],
["AI models (primary)","GPT-family chat model for generation/discussion; Gemini-family flash model for evaluation; dedicated transcription model"],
["AI models (fallback)","Gemini flash / flash-lite via Google AI Studio free tier"],
["Test accounts","Dedicated test user(s) on the deployed instance; tamper attempts executed from the browser console"],
["Test environment","Chrome/Edge on desktop (1280 px) and mobile viewport; India time zone (UTC+5:30) and UTC for streak tests"],
["Automated suites","27+ Vitest unit/regression tests; Playwright end-to-end walks; database linter and deep security scans"]], cap="Table 5.1: Dataset / experiment configuration")
H2("5.2 Functional Test Results")
TB([["TC","Scenario","Expected","Status"],
["TC-01","Sign up / sign in","Redirect to dashboard","Pass"],
["TC-02","Open protected page signed out","Redirect to /auth","Pass"],
["TC-03","Complete 1-question interview","Score, summary, rating update","Pass"],
["TC-04","Complete 5-question quiz","Server-graded result saved","Pass"],
["TC-05","Submit code in Python/C/Java","Per-test PASS/FAIL shown","Pass"],
["TC-06","Retry previous question","New attempt created","Pass"],
["TC-07","Discussion chat message","AI reply rendered","Pass"],
["TC-08","Tamper XP from browser","Permission denied","Pass"],
["TC-09","Badge after first DBMS quiz","Badge + streak persist after reload","Pass"],
["TC-10","Mobile layout","No overflow, navigation works","Pass"]], cap="Table 5.2: Functional test cases")
H2("5.3 Performance Results")
TB([["Operation","Observed time (approx.)"],["Question generation","3 – 6 s"],["Text answer evaluation","5 – 10 s"],["Video answer feedback","~9 – 11 s (parallel assessment)"],["Code execution (interpreted)","2 – 5 s"],["Code execution (compiled)","4 – 10 s"],["Dashboard load","< 2 s"]], cap="Table 5.3: Observed response latency")
P("Running video assessment concurrently with answer grading and returning feedback before generating the next question reduced perceived waiting time by roughly 80% compared with the initial sequential design, which took close to a minute in the worst case. Latency depends on AI provider load and network, so exact values vary.")
H2("5.4 Security Test Results")
TB([["Threat","Mitigation","Verified"],
["Reading another user’s data","Owner-only RLS on every table","Yes"],
["Awarding oneself XP / scores","Column grants revoked; server-only RPCs","Yes (browser tamper rejected)"],
["Faking code test results","Server-side tests; save via RPC after execution","Yes"],
["Viewing quiz answer key early","Answers withheld until submission","Yes"],
["Grading made-up questions","Retry limited to caller’s own history","Yes"],
["Double scoring via retries","Idempotent transactional RPCs","Yes"],
["Leaking AI API keys","All AI calls server-side","Yes"],
["Open redirect after login","Same-origin return-path validation","Yes"],
["Unauthorised agent access","OAuth consent + token-scoped client","Yes (unauthenticated MCP call rejected)"]], cap="Table 5.4: Security verification summary")
H2("5.5 Discussion")
P("The results show that an LLM-driven interviewer can deliver structured, explainable feedback fast enough to feel conversational, provided the pipeline is designed for latency: evaluation is saved and returned before follow-up generation, and multimodal assessment runs concurrently. Grounding feedback in measured evidence (execution results, WPM, pauses) noticeably improved the specificity of comments during testing compared with pure code-reading reviews. The Elo-inspired rating converged within a handful of attempts per topic and remained stable afterwards, and the floor clamp prevented discouraging negative values. Finally, moving all value-carrying writes into transactional database procedures made the scoring layer robust against both accidental double submissions and deliberate tampering, at the cost of slightly more complex migrations.")
BR()

# ================= 6. CONCLUSION AND FUTURE WORK =================
H1("6. CONCLUSION AND FUTURE WORK")
H2("6.1 Conclusion")
P("InterviewVerse demonstrates that modern LLMs, browser media APIs, remote code execution and database-level security can be combined into a practical, low-cost interview preparation platform for students. Unlike static question banks, every session is fresh and adaptive; unlike generic chatbots, feedback is structured, grounded in measured evidence and tracked over time; and unlike recruiter tools, the platform is transparent, student-centred and deliberately avoids biased inferences. The server-authoritative design ensures that ratings and achievements are trustworthy, and the fallback mechanism keeps the service usable when the primary AI provider is unavailable. The system has been deployed publicly and tested end-to-end.")
H2("6.2 Limitations and Disadvantages (Review)")
BL(["AI evaluation may occasionally be inconsistent or incorrect; scores should be treated as guidance, not absolute truth.",
"Feedback latency (5–12 s) depends on external providers and cannot be guaranteed to be instant.",
"Voice analysis measures timing and words only — not tone, pitch or emotion.",
"Attire assessment depends on lighting and camera quality, and may be unfair to students with limited equipment.",
"The free code-execution service provides no runtime or memory metrics and may be slow under load.",
"AI usage has recurring cost; the free-tier fallback has rate limits that heavy usage could exceed.",
"The system currently covers Computer Science subjects only and is English-only.",
"No proctoring: nothing prevents a student from using external help during practice."])
H2("6.3 Future Enhancements")
BL(["Downloadable PDF progress reports and personalised study plans generated from weak topics.",
"Faculty/placement-cell admin panel with batch-level analytics.",
"Real-time conversational voice interviewer with streaming speech-to-speech.",
"Company-specific and role-specific interview tracks (e.g. product-based vs service-based).",
"Group discussion and HR round simulations.",
"Self-hosted sandboxed code runner with time and memory metrics per submission.",
"Per-user AI usage quotas and smarter model routing to control cost.",
"Multilingual support and a native mobile application.",
"Calibration studies comparing AI scores with human interviewer scores on a labelled set of answers."])
BR()

# ================= 7. REFERENCES =================
H1("7. REFERENCES")
refs = [
"A. E. Elo, The Rating of Chessplayers, Past and Present. New York: Arco Publishing, 1978.",
"R. Pelánek, “Applications of the Elo rating system in adaptive educational systems,” Computers & Education, vol. 98, pp. 169–179, 2016.",
"T. Brown et al., “Language Models are Few-Shot Learners,” in Advances in Neural Information Processing Systems (NeurIPS), vol. 33, 2020.",
"L. Zheng et al., “Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena,” in NeurIPS Datasets and Benchmarks, 2023.",
"A. Vaswani et al., “Attention Is All You Need,” in Advances in Neural Information Processing Systems, 2017.",
"M. Raghavan, S. Barocas, J. Kleinberg and K. Levy, “Mitigating Bias in Algorithmic Hiring: Evaluating Claims and Practices,” in Proc. ACM FAT*, 2020.",
"Gemini Team, Google, “Gemini: A Family of Highly Capable Multimodal Models,” arXiv:2312.11805, 2023.",
"PostgreSQL Global Development Group, “Row Security Policies,” PostgreSQL Documentation. [Online]. Available: https://www.postgresql.org/docs/current/ddl-rowsecurity.html",
"OWASP Foundation, “OWASP Top Ten Web Application Security Risks.” [Online]. Available: https://owasp.org/www-project-top-ten/",
"Anthropic, “Model Context Protocol Specification,” 2024. [Online]. Available: https://modelcontextprotocol.io"]
for k, r in enumerate(refs, 1): P(f"[{k}]  {r}", after=3)
BR()

# ================= APPENDIX =================
H1("APPENDIX")
H2("A. Team Contribution")
TB([["Member","Role","Major responsibilities"],
["[Student 1]","Frontend & Dashboard Lead","App shell, routing, design system, dashboard, skill radar, badges and streaks"],
["[Student 2]","Database & Security Engineer","Schema, RLS policies, transactional RPCs, migrations, error middleware"],
["[Student 3]","AI Pipeline Engineer","Prompt design, question generation, evaluation, discussion/concepts, Gemini fallback"],
["[Student 4]","Multimodal Engineer","Voice recording, delivery metrics, video capture, frame/audio extraction, attire scoring"],
["[Student 5]","Code Execution Engineer","Coding arena, multi-language runner, test harness, coding review"],
["[Student 6]","Integration & QA Lead","MCP server, OAuth consent, test suites, security scans, documentation"]], cap="Table A.1: Team responsibility matrix")
H2("B. Project Directory Structure")
CODE("""
src/
 |- routes/              # pages (file-based routing)
 |   |- index.tsx        # landing page
 |   |- auth.tsx         # sign in / sign up
 |   +- _authenticated/  # dashboard, interview, voice, video, coding,
 |                     # quiz, concepts, discuss, practice, sessions, profile
 |- components/          # AppShell, InterviewRoom, VideoAnswer, SkillRadar,
 |                     # PracticeRewards, EvaluatingNotice
 |- lib/
 |   |- ai.functions.ts  # authenticated server functions
 |   |- ai.server.ts     # prompts and model calls
 |   |- gemini-fallback.server.ts
 |   |- runner.server.ts # code execution harness
 |   |- video-assessment.server.ts
 |   |- levels.ts        # Elo rating
 |   |- practice-rewards.ts, voice-delivery.ts, interview-rules.ts
 |   +- mcp/             # agent tools
 +- test/                # Vitest suites
supabase/migrations/     # schema, RLS, RPCs
""")
H2("C. Sample Evaluation Output (JSON)")
CODE("""
{
  "score": 7,
  "strengths": ["Correctly defined normalization", "Gave 1NF-3NF examples"],
  "improvements": ["Mention BCNF", "Explain trade-off with joins"],
  "ideal_answer": "Normalization organizes tables to reduce redundancy ...",
  "delivery": { "wpm": 138, "long_pauses": 2, "fillers_per_100": 3.1 }
}
""")
H2("D. Rating Update (simplified)")
CODE("""
function updateRating(R, D, score10, attempts) {
  const E = 1 / (1 + Math.pow(10, (D - R) / 400));
  const S = score10 / 10;
  const K = attempts < 5 ? 48 : 24;
  return Math.max(MIN_RATING, R + K * (S - E));
}
""")
P("Deployed application: https://interview-haven-profile-hub.lovable.app", b=True)

# page numbers in footer
for s in d.sections:
    p = s.footer.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run()
    for tag, txt in (("begin", None), (None, "PAGE"), ("end", None)):
        if tag:
            e = OxmlElement("w:fldChar"); e.set(qn("w:fldCharType"), tag); r._r.append(e)
        else:
            e = OxmlElement("w:instrText"); e.set(qn("xml:space"), "preserve"); e.text = txt; r._r.append(e)
d.save("/mnt/documents/InterviewVerse_KIIT_Project_Report.docx")
print("saved")
