# A360 Platform Analysis Report
## Complete Session: Extraction Intelligence, HITL/TCP Pipeline, GHL Integration, and Roadmap

**Date:** 2026-04-27  
**Author:** Chris Cabell  
**Scope:** Full analysis session covering extraction system, production pipeline, GHL integration, and simplification path

---

# PART 1: EXTRACTION INTELLIGENCE & PE VALUE PROPOSITION

## 1.1 The Intelligence Pipeline

A360 transforms live consultations into structured revenue intelligence in under 60 seconds through a two-pass AI extraction system (v3.2).

```
Live Consultation
       ↓
Real-Time Transcription (Deepgram)
       ↓
Pass 1: Context & Offerings Extraction
       ↓
Pass 2: Outcome & Intelligence Extraction
       ↓
Downstream Agents (Coaching, Opportunities, Cross-Sell, Marketing)
       ↓
CRM Personalization → Follow-Up Campaigns → Provider Coaching → Revenue Dashboards
```

Every field is evidence-backed with verbatim quotes and confidence scores (0.0-1.0). Nothing hallucinated. Nothing assumed.

---

## 1.2 What We Extract: Pass 1 — Patient Context & Offerings

### Visit Context Fields

| Field | What It Captures | PE Value |
|-------|-----------------|----------|
| **Visit Type** | `initial_consultation`, `follow_up`, `procedure`, `treatment_visit` | Segment conversion by visit type across portfolio |
| **Reason for Visit** | Plain-language why the patient came in today | Identify high-intent visit patterns |
| **Referral Source** | `friend`, `google`, `instagram`, `event`, `provider_referral`, etc. | Track CAC by channel, measure referral program ROI |
| **Motivating Events** | Life events driving urgency (wedding, reunion, career change) + timing + urgency level (`high/medium/low`) | Predict seasonal demand; trigger time-sensitive follow-up |
| **Motivation Type** | `life_transition`, `self_perception`, `social_professional`, `age_alignment`, `maintenance` | Segment patient psychology for marketing optimization |
| **Primary Concern** | THE main driver for today's visit | Match marketing spend to actual patient demand |
| **Secondary Concerns** | Other concerns mentioned (current + future) | Size the upsell/cross-sell opportunity per patient |
| **Patient Goals** | Desired outcomes (not treatments — what they want) | Measure goal-to-outcome alignment across practices |
| **Treatment Areas** | Anatomical areas: forehead, lips, cheeks, jawline, neck, etc. | Track trending treatment areas by geography/demographics |
| **Concern Areas** | Clinical conditions: wrinkles, volume loss, acne scarring, texture, etc. | Map clinical demand to service catalog gaps |

### Offerings Extraction (The Revenue Map)

For every product, service, or package mentioned in a consultation:

| Field | What It Captures | How It's Calculated |
|-------|-----------------|-------------------|
| **Name** | The specific offering (Botox, HydraFacial, filler, etc.) | Extracted from transcript, matched to practice catalog |
| **Type** | `product`, `service`, or `package` | Classified by catalog match |
| **Disposition** | What happened to it — the critical revenue signal | 8-level enum (see below) |
| **Area** | Where on the body | Anatomical mapping |
| **Quantity** | Units, syringes, sessions | Extracted from provider language |
| **Catalog Match** | Matched to practice's actual product/service catalog | Fuzzy + category matching (`exact` or `category`) |

### The 8 Disposition Levels (Priority-Ranked)

| Disposition | Revenue Status | PE Signal |
|-------------|---------------|-----------|
| `performed` | Revenue captured | Closed revenue |
| `scheduled` | Revenue committed | Pipeline — high confidence |
| `purchased` | Revenue captured (product) | Retail attachment rate |
| `agreed_pending` | Revenue at risk — agreed but not booked | Scheduling gap — recoverable |
| `recommended_receptive` | Revenue opportunity — patient interested | Hot lead — follow-up within 48hrs |
| `recommended_hesitant` | Revenue at risk — objections exist | Needs objection resolution |
| `recommended_declined` | Revenue lost — this visit | Track reasons; coaching opportunity |
| `discussed` | Revenue possible — no decision | Education gap — nurture campaign |

### Provider Guidance & Cross-Sell Intelligence (Per Offering)

| Field | What It Captures | PE Value |
|-------|-----------------|----------|
| **Provider Guided** | Did the provider proactively recommend this? (boolean) | Measures proactive selling behavior |
| **Guidance Type** | `enhancement`, `complementary`, `bundled`, `maintenance`, `adjunctive` | Tracks recommendation sophistication |
| **Patient Reception** | `engaged`, `curious`, `hesitant`, `passed`, `unexplored` | Measures provider effectiveness at reading the room |
| **Guidance Rationale** | `concern_alignment`, `treatment_synergy`, `value_creation`, `timing_opportunity` | Is the provider selling on value or just listing options? |

### Cross-Sell Summary (Per Consultation)
- Did the provider recommend beyond the primary reason for visit?
- Were memberships/packages offered?
- Were recurring treatment patterns identified but membership NOT offered? (Missed opportunity flag)

---

## 1.3 What We Extract: Pass 2 — Outcome & Intelligence

| Field | What It Captures | How It's Calculated |
|-------|-----------------|-------------------|
| **Outcome Status** | `treatment_performed`, `booked`, `agreed_pending`, `thinking`, `follow_up_requested`, `declined`, `information_only` | Determined from end-of-consultation language |
| **Commitment Level** | `committed`, `interested`, `considering`, `uncertain`, `not_interested` | Calibrated from patient language patterns + outcome correlation |
| **Intent Score** | 0.0-1.0 numeric score | Weighted composite of buying signals, scheduling language, commitment indicators |
| **Sentiment Final** | -1.0 to +1.0 | End-of-consultation patient emotional state |
| **Sentiment Trajectory** | Array of scores per segment | Shows how sentiment changed DURING the consultation |

### Signal Tags (Buying Signals)

| Signal | What It Means |
|--------|--------------|
| `ready_to_book` | Patient used scheduling language ("book me in") |
| `scheduling_intent` | Asked about availability |
| `treatment_interest_high` | Asked detailed questions (recovery, results, process) |
| `financing_mentioned` | Either party mentioned financing |
| `sticker_shock` | Patient reacted negatively to a price point |
| `price_concern` | Worry about cost (without rejecting) |
| `budget_constraint` | Stated a budget limit |
| `partner_consultation` | Needs to discuss with partner/family |
| `future_language` | Assumptive language ("When I get this done...") |

### Objections, Hesitations & Concerns (Three Distinct Categories)

**Objections** — Direct pushback (revenue actively resisted)
- Types: `price`, `timing`, `fear`, `partner`, `results`, `trust`, `other`
- Tracks: resolved status, resolution approach, verbatim evidence

**Hesitations** — Uncertainty (revenue at risk of stalling)
- Topics: what they're hesitant about
- Tracks: resolved status, resolution approach

**Concerns** — Clinical/practical questions (education gap)
- Categories: `clinical`, `practical`, `safety`, `financial`, `other`
- Tracks: raised_by (patient or provider), addressed status

---

## 1.4 Revenue Leak Detection: How A360 Finds Lost Money

### Revenue Leak #1: Missed Close Opportunities
- **Detection:** Intent score >= 0.7 + no booking attempt
- **Scale:** Avg practice: 15-20% of consults have high intent with no ask
- **Recovery:** Coaching alert with specific feedback and quotes
- **Impact:** At $1,500 avg treatment, recovering 10 missed closes/month = $15,000/month

### Revenue Leak #2: Unresolved Price Objections
- **Detection:** `objection.type = "price"` + `resolved = false`
- **Scale:** 40% of consults have price concerns; only 50% resolved
- **Recovery:** Financing education training + real-time prompts
- **Impact:** Converting 20% of unresolved price objections = $24,000/month per practice

### Revenue Leak #3: Membership/Package Not Offered to Recurring Patients
- **Detection:** Recurring treatment pattern detected + `membership_discussed = false`
- **Scale:** 30-40% of recurring patients have no membership
- **Recovery:** Automated flag; staff trained to present membership
- **Impact:** 100 recurring patients x $200/month membership = $20,000/month secured recurring revenue

### Revenue Leak #4: Cross-Sell Gap
- **Detection:** `provider_guided = false` on complementary offerings
- **Scale:** 60% of consults have zero provider-initiated recommendations beyond primary
- **Recovery:** Cross-sell guidance agent provides specific recommendations
- **Impact:** 35% increase in avg transaction value when structured options presented

### Revenue Leak #5: Interested Patients With No Follow-Up
- **Detection:** `disposition = "recommended_receptive"` or `"discussed"` + no follow-up sent
- **Scale:** Industry: 80% of "thinking about it" patients never hear back
- **Recovery:** Opportunities Agent produces automated personalized follow-up within 48hrs
- **Impact:** 15-25% recovery rate on "thinking" patients

---

## 1.5 The 4-Layer KPI Framework

### Layer 1 — Conversation Quality Metrics

| KPI | Target | How Calculated |
|-----|--------|----------------|
| Conversation Balance Ratio | 40:60 provider:patient | Talk-time analysis per speaker |
| Empathy Statement Rate | >=1 per concern expressed | Count of empathy phrases / concerns raised |
| Question Quality Index | >=80% open-ended | Open-ended questions / total questions |
| Medical Jargon Adjustment | Within 30 seconds | Time between jargon use and plain-language restatement |

### Layer 2 — Sales Effectiveness Metrics

| KPI | Target | How Calculated |
|-----|--------|----------------|
| Objection Resolution Rate | >=90% | Resolved objections / total objections |
| Value Proposition Clarity | >=8/10 | Goal-treatment connections made / recommendations given |
| Cross-Sell Rate | >=85% appropriate timing | Consults with provider-guided additional offerings / total |
| Structured Option Presentation | Standard practice | Consults with Good/Better/Best options presented / total |
| Treatment Plan Completion | 100% | Consults with documented plan / eligible consults |

### Layer 3 — Platform Utilization Metrics

| KPI | Target | How Calculated |
|-----|--------|----------------|
| AI Suggestion Acceptance Rate | >=70% | HITL-accepted recommendations / AI-generated recommendations |
| Follow-Up Automation Utilization | >=95% | Auto follow-ups sent / follow-ups due |
| Documentation Completeness | >=90% | Checklist items completed / total checklist items |

### Layer 4 — Business Outcomes (What PE Cares About)

| KPI | Benchmark | How Calculated |
|-----|-----------|----------------|
| Consultation Conversion Rate | 34% avg to 65%+ target | (Performed + Booked + Scheduled) / Total consults |
| Average Revenue Per Consultation | Track growth | Sum of performed/booked treatment values / total consults |
| Patient Lifetime Value | Maximize | Cumulative revenue per patient over 24-month window |
| Time-to-Decision Reduction | >=30% reduction | Avg days from consult to booking (tracked via disposition changes) |
| Patient Retention Rate | >=70% | Patients with return visit within 12mo / total patients |
| Referral Generation Rate | Track growth | New patients with `referred_by` != unknown / total new patients |

---

## 1.6 The 25+ Consultation KPIs

| # | KPI | Category | Scale |
|---|-----|----------|-------|
| 1 | Total Consultations Analyzed | Volume | Count |
| 2 | Transcript Coverage Rate | Volume | % |
| 3 | Clear Next Step Rate | Close | % |
| 4 | Close Attempt Rate | Close | % |
| 5 | Booking Momentum Score | Close | 0-5 |
| 6 | Consults Ending Without Plan | Close | % |
| 7 | Treatment Plan Discussed Rate | Planning | % |
| 8 | Structured Option Presentation | Planning | % |
| 9 | Aftercare Mention Rate | Planning | % |
| 10 | Objection Frequency Rate | Barriers | % |
| 11 | Objection Handling Rate | Barriers | % |
| 12 | Cost Concern Mention Rate | Barriers | % |
| 13 | Patient Question Rate | Engagement | % |
| 14 | Avg Questions Per Consult | Engagement | Count |
| 15 | Patient Talk-Time Balance | Engagement | Ratio |
| 16 | Empathy Statement Rate | Communication | % |
| 17 | Benefit Explanation Rate | Communication | % |
| 18 | Risk Discussion Rate | Communication | % |
| 19 | Clinical Note Completeness | Documentation | 0-100% |
| 20 | Consent Mention Rate | Documentation | % |
| 21 | Follow-Up Interval Documented | Documentation | % |
| 22 | Missed Close Opportunities | Coaching | Count |
| 23 | High Intent / No Next Step | Coaching | Count |
| 24 | Objection Raised / No Resolution | Coaching | Count |
| 25 | Consult Ended Without Summary | Coaching | Count |

**+ 7 Specialized Evaluation Systems:** Emotional Intelligence, Financial/Financing Discussions, Referral Generation, Safety/Clinical Screening, Skincare Product Integration, Team Coordination, Timeline/Urgency Management

---

## 1.7 Provider Coaching Scores

### Visit-Type-Specific Weighted Scoring

| Category | Initial Consult | Follow-Up | Procedure | Treatment Visit |
|----------|----------------|-----------|-----------|----------------|
| Discovery & Needs | 25% | 10% | 0% | 5% |
| Education & Expectations | 20% | 15% | 20% | 20% |
| Closing & Next Steps | 25% | 25% | 10% | 15% |
| Safety & Clinical | 15% | 20% | 50% | 40% |
| Cross-Sell & Additional Recs | 15% | 30% | 20% | 20% |

---

## 1.8 Blurbs & Personalization

### What Are Blurbs?

A "blurb" is a contextualized, personalized text snippet generated from extraction data. Not a generic template — built from the patient's actual words, concerns, and signals.

### How Blurbs Are Generated

```
Extraction Data (structured fields)
       +
Patient's Own Words (verbatim quotes from evidence)
       +
Practice Context (catalog, suggestion rules, brand voice)
       ↓
Opportunities Agent generates:
  → personalization_snippets (for email/SMS merge)
  → script_snippets (for staff follow-up calls)
  → educational_hooks (for content delivery)
  → next_visit_reference (for provider prep)
```

### Example — Generic vs. A360 Personalized

| Generic Follow-Up | A360 Blurb-Powered Follow-Up |
|-------------------|------------------------------|
| "Hi Sarah, thank you for visiting. We'd love to help you with your skincare goals." | "Hi Sarah, you mentioned wanting to look refreshed for your daughter's wedding in April. The Botox we discussed for your forehead lines typically takes 2 weeks to fully settle — if you'd like to be ready for photos, booking by mid-March would be ideal. We also talked about the lip filler you were curious about — I've attached some before/afters of similar patients." |

---

## 1.9 The Opportunities Agent Output

For every consultation, the Opportunities Agent produces a 6-section artifact:

1. **follow_up_plan** — Actionable items for CRM/outreach with timing and priority
2. **patient_interests_detail** — Each unbooked interest with blurb, value, disposition, context
3. **sell_plan** — Per-opportunity talking points, objection preempts, suggested angles
4. **next_visit_reference** — Provider prep: quotes to recall, items to re-recommend
5. **marketing_education** — Key messages, educational hooks, personalization snippets
6. **crm_personalization_context** — Flat key-value pairs for CRM merge tags:
   - primary_interest, primary_concern, event_name, event_date
   - intent_level, next_step_summary, interests_list, potential_value

---

## 1.10 Portfolio-Wide Visibility for PE

| Capability | Traditional Approach | A360 Approach |
|------------|---------------------|---------------|
| Conversion tracking | PMS booking data (lagging, incomplete) | Real-time disposition per offering per consult |
| Revenue pipeline | Guesswork or CRM estimates | Computed `potential_value` per patient, aggregated |
| Provider performance | Patient surveys (biased, delayed) | Evidence-based scoring on 25+ KPIs per consultation |
| Training ROI | Before/after revenue (confounded) | Direct KPI score improvement per provider post-training |
| Marketing attribution | UTM links, last-touch | Referral source extracted from actual conversations |
| Demand intelligence | Appointment type codes | Actual concerns, goals, treatment areas from patient's own words |
| Churn risk | Patient hasn't returned in 6 months | Sentiment trajectory, unresolved concerns, declining intent scores |
| Same-store growth levers | General "improve operations" | Specific: "Location X leaves $48K/month on the table from unresolved price objections" |

### Example PE Dashboard (Aggregated Across Portfolio)

```
Portfolio Conversion Rate:     42% → Target: 65% (Gap: $4.2M/year across 12 locations)
Avg Revenue Per Consultation:  $1,847 → Top Quartile: $2,390 (+29%)
Unresolved Price Objections:   $576K/year across portfolio
Membership Penetration:        23% → Target: 45% (Potential: $2.8M ARR)
Cross-Sell Attachment Rate:    38% → Top Performer: 72%
Follow-Up Recovery Rate:       12% → A360 Target: 25% ($1.1M recoverable)
Provider Coaching ROI:         10% close-rate improvement = $1.8M/year
```

---

# PART 2: PRODUCTION PIPELINE ANALYSIS (AWS + iOS)

## 2.1 Current Architecture: End-to-End Flow

### In Plain English

When the provider stops recording, the system:

1. **Checks if it's a real medical conversation** — An AI reads the transcript and decides whether it's medically relevant. This is like asking "is water wet?" for a consultation that just happened in a med spa. Takes 5-60 seconds, sometimes longer if there are connection issues.

2. **Extracts what was discussed** — An AI reads the transcript and the practice's product/service catalog, then lists out every treatment, product, and service that came up. This is the useful part. Takes 15-30 seconds.

3. **Suggests cross-sell opportunities** — A second AI reads the extraction plus the full catalog and recommends additional items the provider didn't mention (upsells, packages, alternatives). This is a sales tool, not verification. Takes another 15-30 seconds, and it has to wait for step 2 to finish first.

4. **Waits for provider approval** — The provider sees the extracted offerings on a review screen and must select items, then click "Confirm Selections & Generate Plan." Nothing else can happen until this button is clicked. If the provider is busy with the next patient, everything waits.

5. **Generates 5 documents in parallel** — After approval: Treatment & Care Plan, Clinical Notes, Follow-Up Email, Consultation Summary, and Clarifying Questions. Each takes 2-5 minutes, but they all run at the same time.

6. **Documents appear one-by-one** — As each document finishes, it shows up in the web app. The real-time notification system for this already works well.

### The Timeline

| Phase | What Happens | Time |
|-------|-------------|------|
| Recording stops | Transcript saved to S3 | Instant |
| Medical relevance check | AI decides if it's a real consultation | 5-60s |
| Extract discussed offerings | AI lists what was talked about | 15-30s |
| Generate recommended offerings | AI suggests upsells (waits for extraction) | 15-30s |
| Wait for provider | Provider reviews and clicks Confirm | 1 min to hours |
| Generate documents | 5 AI agents run in parallel | 2-5 min |
| **Total** | | **7-20 min** (not counting provider wait) |

### Two Separate Pipelines

The system uses two separate AWS Step Functions workflows connected by an SQS queue:

- **Pipeline 1 (HITL Generator):** Runs steps 1-3 above. Produces the offerings for provider review.
- **Pipeline 2 (AI Outputs Generator):** Runs step 5 above. Produces all the documents.

Pipeline 2 cannot start until the provider approves in step 4. Both pipelines independently look up the same practice/patient information from the database and read the same transcript from S3. This duplicate work adds ~4 seconds per run.

### The Technical Chain

```
iOS: User stops recording
  → WebSocket "session-end" message
  → Transcript written to S3 as *-final.json
       ↓
EventBridge S3 Rule triggers on *-final.json
       ↓
SQS (transcript queue) → EventBridge Pipe
       ↓
Step Functions: HITL Generator State Machine
  Step 1: Tenant Parameter Resolution [Lambda] — ~1-2s
  Step 2: Read Transcript from S3 [Lambda] — ~1-2s
  Step 3: Medical Relevance Check [Sync HTTP → ECS Fargate] — 5-60s
    - Uses Claude Haiku, temperature=0.0
    - 60s timeout + retry: 10s, 20s, 40s, 80s, 160s
  Step 4: Choice — Is Medically Relevant? → YES continues
  Step 5: Generate HITL Offerings [Async Poll → ECS Fargate]
    - LLM Call #1: DiscussedOfferingsAgent (Claude Sonnet, temp=0.0) — 15-30s
    - LLM Call #2: RecommendedOfferingsAgent (Sequential, waits for #1) — 15-30s
    - 10-second poll intervals between status checks
  → Store artifact to S3 → Lambda stores in DB → AppSync notification

Provider reviews in web app Align Mode, clicks "Confirm"
  → POST /consultations/{id}/hitl/offerings
  → Stores validated-offerings.json to S3 (single-submit enforced)
  → SQS message to HITL Offerings Queue

Step Functions: AI Outputs Generator State Machine
  Step 1: Tenant Parameter Resolution [Lambda] — RUNS AGAIN
  Step 2: Read Transcript from S3 [Lambda] — RUNS AGAIN
  Step 3: PARALLEL (5 agents):
    - Clinical Notes (transcript only)
    - Clarifying Questions (transcript only)
    - Follow-Up Email (transcript only)
    - Treatment & Care Plan (transcript + validatedOfferings)
    - Consultation Summary (transcript only)
  → Each: S3 artifact → Lambda → DB → AppSync notification
```

---

## 2.2 What the Provider Sees (Web App UX)

### Three Modes

**Capture Mode** — During the consultation. Live transcript, real-time sentiment and intent indicators.

**Align Mode** — The HITL review screen (the bottleneck):
- Before offerings arrive: "No Recommendations Yet"
- After offerings arrive: cards in 3 sections (Discussed / Recommended / Custom)
- Each card: name, rationale, price, quantity, checkbox, edit button
- Bottom panel: selected items, running total, "Confirm Selections & Generate Plan" button
- After confirming: everything locks, button shows "Confirmed"

**Plan Mode** — 8 tabs showing AI-generated documents:

| Tab | Content | Empty State |
|-----|---------|-------------|
| 0 | Consultation Summary | "No Summary Yet" |
| 1 | Treatment and Care Plan | "No Treatment Care Plan Yet" |
| 2 | Clinical Notes | "No Clinical Notes Yet" |
| 3 | Follow-Up Email | "No Follow Up Email Yet" |
| 4 | Clarifying Questions | "No Clarifying Questions Yet" |
| 5 | Recognized Intents | "No Intents Yet" |
| 6 | Extracted Entities | "No Entities Yet" |
| 7 | Sentiment Analysis | "No Sentiments Yet" |

**All AI tabs (0-4) locked behind "Confirm Recommendations First" wall until provider approves in Align Mode.**

### UX Gaps
- No loading spinner or "Generating..." state — just empty screens
- No indication of how long anything will take
- Blue dot indicator + pulsing animation exists for content arrival (works well)
- Real-time AppSync notification infrastructure works — the gap is purely UI loading states

---

## 2.3 What's Wrong

### HITL Is Overcomplicated

| Issue | Impact |
|-------|--------|
| Medical relevance check on every transcript | 5-60s wasted on obvious consultations |
| Two sequential LLM calls (discussed → recommended) | 30-60s when only discussed is needed |
| RecommendedOfferingsAgent is cross-sell, not verification | Delays verification by 15-30s |
| Context resolved 3x (HITL generator + discussed + recommended agents) | 6-12s redundant DB queries |
| HITL is a hard gate — blocks ALL downstream outputs | Provider doesn't review → nothing generates |
| 10-second poll intervals | 30+ seconds dead wait time |
| No retry allowed (409 on second submit) | Provider can't resubmit if something goes wrong |

### No Progress Indicators

| Where | User Sees | Should See |
|-------|-----------|-----------|
| Align Mode (waiting for offerings) | "No Recommendations Yet" | "Analyzing consultation..." |
| Plan Mode (waiting for AI outputs) | "No X Yet" | "Generating Treatment Plan..." with progress |
| After clicking Confirm | Nothing for 2-5 min | Per-tab progress indicators |

### Unnecessary Work

| What | Why Unnecessary | Time Cost |
|------|----------------|-----------|
| Medical relevance check | Scheduled consultations are obviously medical | 5-60s |
| RecommendedOfferingsAgent | Cross-selling != verification; can be deferred | 15-30s |
| Duplicate tenant resolution | Same data queried 3x across state machines | 6-12s |
| Duplicate S3 transcript read | Same transcript read twice | 2-4s |
| 10s poll intervals | 3s would be responsive enough | 20-30s dead time |

---

## 2.4 Transcript Persistence

**The full transcript survives past HITL.** It lives permanently in S3 as the original Deepgram output JSON (`*-final.json`). It is never deleted, modified, or truncated by any step in the pipeline.

Both Pipeline 1 (HITL Generator) and Pipeline 2 (AI Outputs Generator) independently read the same transcript from S3 via the `transcript_reader` Lambda. Every agent in Pipeline 2 receives the full `conversationText`.

What each agent receives:

| Agent | Gets Full Transcript? | Gets Validated Offerings? |
|-------|----------------------|--------------------------|
| Clinical Notes | Yes | No |
| Clarifying Questions | Yes | No |
| Follow-Up Email | Yes | No |
| Treatment & Care Plan | Yes | **Yes** (`requires_validated_offerings=True`) |
| Consultation Summary | Yes | No |

---

# PART 3: GHL INTEGRATION ANALYSIS

## 3.1 Current Capabilities

The GHL integration has three capabilities: OAuth connection, contact sync, and email sending. That's all.

### OAuth Connection
- Authorization URL: `https://marketplace.gohighlevel.com/oauth/chooselocation`
- Token exchange/refresh: `https://services.leadconnectorhq.com/oauth/token`
- API Base: `https://services.leadconnectorhq.com`
- Tokens AES256-encrypted in database with auto-refresh

**Scopes requested:**
- `contacts.readonly` — search and read contacts
- `contacts.write` — create and update contacts
- `conversations.readonly` — read conversations (not used)
- `conversations.write` — write conversations (not used)
- `conversations/message.write` — send messages (emails)

### Contact Sync

| Capability | What We Send |
|-----------|-------------|
| Create contact | **email, firstName, lastName, locationId** — that's it |
| Update contact | **firstName, lastName** — nothing else |
| Search contacts | Query string, page, page size |
| Find duplicates | Email address |
| Get contact by ID | Reads: id, firstName, lastName, dateOfBirth, email, phone |

**Critical gap:** We only send name and email. We never send custom fields, tags, notes, phone updates, or any consultation intelligence data.

### Email Sending

| Capability | How |
|-----------|-----|
| Send immediately | POST to `/conversations/messages` with HTML body + subject |
| Schedule for later | EventBridge schedules the send |
| Cancel scheduled | Cancels EventBridge task |
| Reschedule | Updates EventBridge task timing |
| Track status | Stores GHL response (messageId, conversationId, traceId) |

Email content comes from AI-generated follow-up email attachment in S3. No merge tags or personalization — sends AI content as-is.

### What We Have vs. What We Need

| Capability | Have Today | Need for GHL Push |
|-----------|-----------|-------------------|
| OAuth + token management | Yes | Reuse |
| Create/update contact (name + email) | Yes | Need custom fields + tags |
| **Update custom fields** | **No** | **Yes** |
| **Add/remove tags** | **No** | **Yes** |
| **Add contact notes** | **No** | **Yes** |
| **Create opportunities** | **No** | **Yes** |
| **Trigger workflows/campaigns** | **No** | **Yes** |
| **Create tasks** | **No** | **Yes** |
| Send email | Yes | Reuse |
| **Send SMS** | **No** | Nice to have |
| Receive webhooks from GHL | **No** | Nice to have |

### What the GHL API Supports That We're Not Using

The `update_contact` endpoint we already call (`PUT /contacts/{id}`) accepts all of these fields — we're just only sending `firstName` and `lastName`:

- `customFields` (array of {id, field_value})
- `tags` (array of strings)
- `phone`
- `address1`, `city`, `state`, `postalCode`
- `companyName`, `website`, `source`
- `notes` (custom note text)
- `dateOfBirth`

**The OAuth client just needs its `update_contact` method expanded to pass more fields.**

### 11 API Endpoints Exposed

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | GET | `/hl/authorize` | Start OAuth flow |
| 2 | GET | `/hl/callback` | OAuth callback |
| 3 | GET | `/hl/status` | Check if connected |
| 4 | DELETE | `/hl/disconnect` | Disconnect |
| 5 | GET | `/hl/patients/list` | Search GHL contacts |
| 6 | POST | `/hl/patients/sync` | Import GHL contact as A360 patient |
| 7 | POST | `/hl/email/send` | Send or schedule email |
| 8 | POST | `/hl/email/send-scheduled` | Internal: EventBridge trigger |
| 9 | PATCH | `/hl/email/cancel-scheduled` | Cancel scheduled email |
| 10 | PATCH | `/hl/email/reschedule` | Reschedule pending email |
| 11 | GET | `/hl/email/list-info` | Email history for attachment |

**No webhook receivers.** Integration is one-directional: A360 → GHL only.

### Documented But Not Built

A `GHL_CAMPAIGNS_AND_PAYLOAD_GUIDE.md` exists in the Prompt Runner project defining a full campaign payload with tags, custom fields, campaign types (botox_interest_nurture, wedding_timeline, high_intent_nurture, etc.) and CaloSpa-specific configuration. This is designed but not implemented.

---

## 3.2 GHL Output Payload Spec

### What Should Be Pushed Per Consultation

```
CONTACT UPDATE
  Primary concern ........... "Forehead lines and volume loss"
  Goals ..................... "Look refreshed", "Natural results"
  Motivation ................ Life transition (daughter's wedding)
  Referral source ........... Patient referral (Friend Sarah)
  Intent level .............. 4 out of 5
  Sentiment ................. Positive

CONSULTATION RECORD
  Date ...................... 2026-04-27
  Visit type ................ Initial consultation
  Outcome ................... Booked
  Commitment level .......... Committed
  Provider .................. Dr. Smith

OFFERINGS (what was discussed)
  Botox .................... Performed, forehead, 20 units, $240
  Dermal Filler ............ Recommended (receptive), cheeks, $650

OPPORTUNITIES (unbooked items with revenue potential)
  Dermal Filler ............ $650, patient was curious
  → Follow up: Send before/after gallery within 48 hours

MOTIVATING EVENTS
  Daughter's wedding ....... April, HIGH urgency

OBJECTIONS
  Price concern ............ "That's more than I expected"
  → Resolved: Provider explained financing options

PERSONALIZATION (for email/SMS merge tags)
  Primary interest ......... Dermal Filler
  Event name ............... Daughter's wedding
  All interests ............ Botox, Dermal Filler, HydraFacial
  Total pipeline value ..... $1,540
  Next step ................ Booked Botox today, send filler info in 48hrs

CAMPAIGN TRIGGERS
  48-hour follow-up, event reminder, membership offer, post-treatment care

SIGNAL TAGS
  ready_to_book, treatment_interest_high, positive_sentiment
```

---

# PART 4: SIMPLIFICATION & ROADMAP

## 4.1 The Real Goal

```
Provider finishes consultation
         ↓
Transcript is captured and saved
         ↓
AI extracts: what was discussed, patient goals,
concerns, objections, intent level, next steps
         ↓
Structured data pushed to GHL for marketing automation
         ↓
Done. Everything else is optional/background.
```

---

## 4.2 Three Options

### Option A: Skip HITL Entirely
Recording stops → Extract (1 AI call, ~30s) → Push to GHL → Generate docs in background.

### Option B: HITL as Optional Review (Recommended)
Recording stops → Extract → Push to GHL immediately → Start all docs → Show review screen for optional correction.

### Option C: Quick Confirm (Verify or Send)
Recording stops → Extract → Show simple summary → Provider clicks "Looks Good" or "Verify First" → Push to GHL + start docs.

---

## 4.3 The "Verify or Send" Flow

```
Recording stops → AI extracts offerings (~30s)
       ↓
Provider sees simple screen:
  ┌─────────────────────────────────────────────┐
  │  Consultation Complete                       │
  │                                              │
  │  Services: Botox (forehead, 20 units)       │
  │            Dermal Filler (cheeks, discussed) │
  │  Products: SkinMedica TNS Advanced+          │
  │                                              │
  │  Outcome: Booked                             │
  │  Patient Intent: High                        │
  │                                              │
  │  ┌──────────────┐  ┌────────────────────┐   │
  │  │   Send       │  │  Verify First      │   │
  │  └──────────────┘  └────────────────────┘   │
  └─────────────────────────────────────────────┘
```

**"Send"** — Pushes AI-extracted data to GHL immediately. Starts document generation.

**"Verify First"** — Opens review screen. Provider edits, then clicks "Send to GHL."

---

## 4.4 Proposed Architecture: Add Pass 2 as 6th Agent

The v3.2 Pass 2 extraction prompt (currently running on OpenAI in the Prompt Runner test system) can be deployed as a new Bedrock agent in the production Step Functions pipeline:

```
Pipeline 2 (AI Outputs Generator) — add extraction agent:
  Step 1: Tenant Resolution → gets s3_key + validatedOfferings
  Step 2: Read Transcript from S3 → full conversationText
  Step 3: PARALLEL (6 branches):
     ├─ Clinical Notes (transcript only)
     ├─ Clarifying Questions (transcript only)
     ├─ Follow-Up Email (transcript only)
     ├─ TCP (transcript + validatedOfferings)
     ├─ Consultation Summary (transcript only)
     └─ NEW: Intelligence Extraction (transcript + validatedOfferings)
            → outcome, objections, intent, signals, personalization
            → Push to GHL + store on patient record
```

This works because:
1. Full transcript is available (Pipeline 2 already reads it from S3)
2. Validated offerings are available (tenant resolver loads them)
3. The parallel branch pattern exists (just add a 6th `AgentBranchConfig`)
4. Pass 2 prompt accepts both inputs via `{{transcript}}` and `{{pass_1_output}}`

---

## 4.5 Implementation Roadmap

### Tier 1: Quick Wins — Do This Week

| # | Change | Time Saved | Effort | Vibe-Codeable? |
|---|--------|-----------|--------|----------------|
| 1 | Reduce poll interval 10s → 3s | ~25s/run | 1 line CDK | No (CDK deploy) |
| 2 | Add "Generating..." loading states | Huge UX win | ~2 hours React | **Yes** |
| 3 | Remove "Confirm First" wall from tabs | Eliminates mandatory wait | ~1 hour React | **Yes** |

### Tier 2: Remove Unnecessary Steps — 1-2 Sprints

| # | Change | Time Saved | Effort | Vibe-Codeable? |
|---|--------|-----------|--------|----------------|
| 4 | Skip medical relevance for scheduled consultations | 5-60s/run | ~2 days | No |
| 5 | Remove RecommendedOfferingsAgent from critical path | 15-30s/run | ~1 day | Partially |
| 6 | Pass context through SQS (stop re-querying) | ~4s/run | ~2 days | No |

### Tier 3: Decouple HITL + GHL Push — 2-3 Sprints

| # | Change | Time Saved | Effort | Vibe-Codeable? |
|---|--------|-----------|--------|----------------|
| 7 | Generate docs without waiting for approval | Eliminates wait | ~1 week | No |
| 8 | Make Align Mode optional | Better provider workflow | ~3 days | Partially |
| 9 | Add GHL push with full payload | Data in GHL in ~60s | ~1 week | Partially |
| 10 | Deploy Pass 2 as production Bedrock agent | Full intelligence extraction | ~1.5-2 weeks | No |

### Tier 4: Additional Features

| # | Change | Effort | Vibe-Codeable? |
|---|--------|--------|----------------|
| 11 | Quick Confirm screen (Verify or Send) | 3-4 days frontend | **Yes** |
| 12 | Manual TCP builder | 5-7 days (Approach A, no AI) | **Yes** (mostly) |
| 13 | GHL SSO (simple link) | 15 minutes | **Yes** (GHL admin) |
| 14 | GHL SSO (true embedded SSO) | 1-2 weeks | Partially |
| 15 | Per-tab generation progress | ~3 days | **Yes** (frontend) |

### What You Can Vibe-Code Right Now

| What | Where | How |
|------|-------|-----|
| Add loading skeletons to doc tabs | `CarePlanContent.tsx`, `SummaryContent.tsx`, etc. | MUI Skeleton + "Generating..." text when content is null |
| Remove approval wall | Same 5 tab files | Delete `ConfirmSelectionsEmptyState` guard |
| Change Confirm button text | `SummaryPanel.tsx` | "Save Review" instead of "Confirm Selections & Generate Plan" |
| Quick Confirm screen | New component | Two buttons: Send / Verify First, shows extraction summary |
| Manual TCP builder | New component | Catalog picker + MUI form using existing `getPLServices`/`getPLProducts` APIs |
| GHL simple link | GHL admin panel | Custom sidebar link to A360 URL |

**Estimated time for all frontend work: ~1 week of focused effort.**

---

# PART 5: KEY FILES REFERENCE

## AWS Infrastructure (Backend Team)

| File | Purpose |
|------|---------|
| `.../step_functions/step_functions_nested_stack.py` | Both pipeline definitions, poll intervals (line 564), retry strategies |
| `.../step_functions/branch_definitions.py` | Agent configs, feature IDs, `requires_validated_offerings` flags |
| `.../agents/medical_relevance/agent.py` | "Is this medical?" check (Claude Haiku) |
| `.../agents/hitl/offerings/discussed/agent.py` | Extracts what was discussed |
| `.../agents/hitl/offerings/discussed/prompt.py` | Extraction prompt |
| `.../agents/hitl/offerings/recommended/agent.py` | Cross-sell suggestions (can skip) |
| `.../agents/hitl/offerings/api.py` | Orchestrates agents, manages async tasks |
| `.../agents/treatment_care_plan/agent.py` | TCP generation |
| `.../lambdas/ai_output_storage_handler/index.py` | Stores docs, sends AppSync notifications |
| `.../lambdas/ai_output_storage_handler/utils/notification.py` | AppSync notification via SigV4 |
| `app/api/patients/consultation.py` (line 866) | "Confirm" button endpoint |

## GHL Integration (Backend)

| File | Purpose |
|------|---------|
| `app/integrations/gohighlevel/oauth_client.py` | OAuth + all GHL API methods |
| `app/integrations/gohighlevel/contact_manager.py` | Contact sync + token refresh |
| `app/integrations/gohighlevel/utils.py` | Email sending + scheduling |
| `app/integrations/gohighlevel/constants.py` | Default scopes |
| `app/integrations/gohighlevel/schemas.py` | Request/response schemas |
| `app/integrations/gohighlevel/exceptions.py` | Error types |
| `app/api/integrations/gohighlevel.py` | All 11 API endpoints |

## Web App (Vibe-Codeable)

Repo: `C:\Users\Chris\repos\a360\a360-web-app` (GitHub: `Aesthetics-360/a360-web-app`)

| File | What to Change |
|------|---------------|
| `ConsultationSession/PlanMode/CarePlanContent/CarePlanContent.tsx` | Remove gate, add skeleton |
| `ConsultationSession/PlanMode/SummaryContent/SummaryContent.tsx` | Same |
| `ConsultationSession/PlanMode/ClinicalNotesContent/ClinicalNotesContent.tsx` | Same |
| `ConsultationSession/PlanMode/EmailContent/EmailContent.tsx` | Same |
| `ConsultationSession/PlanMode/QuestionsContent/QuestionsContent.tsx` | Same |
| `ConsultationSession/PlanMode/components/ConfirmSelectionsEmptyState.tsx` | The gate component |
| `ConsultationSession/AlignMode/components/SummaryPanel.tsx` | "Confirm" button |
| `ConsultationSession/context/ConsultationSessionProvider.tsx` | State management |
| `ConsultationSession/config.ts` | Document type → tab mapping |
| `apiServices/practice/integrations/ghl.api.ts` | GHL API client |

## Prompt Runner (Test System)

Repo: `C:\Projects\Prompts`

| File | Purpose |
|------|---------|
| `prompts/v3.2_pass_1_context_offerings.md` | Pass 1 extraction prompt |
| `prompts/v3.2_pass_2_outcome_intelligence.md` | Pass 2 extraction prompt (candidate for production) |
| `prompts/V3_EXTRACTION_SCHEMA.md` | Complete field definitions |
| `prompts/opportunities_agent.md` | Follow-up + CRM personalization agent |
| `prompts/coaching_evidence_extractor.md` | Coaching evidence extraction |
| `prompts/coaching_generator.md` | Coaching feedback generation |
| `hitl-tcp-project/docs/GHL_CAMPAIGNS_AND_PAYLOAD_GUIDE.md` | GHL campaign payload spec (designed, not built) |

## iOS App (No Changes Needed)

The iOS app is a thin WebSocket + WebView wrapper. All UI changes happen in the web app and are automatically reflected in the iOS WebView.

---

*This report captures the complete analysis session from 2026-04-27. The recommended path: start with vibe-codeable frontend fixes, then deploy Pass 2 as a production Bedrock agent, and wire the extraction output to GHL through an expanded contact update endpoint.*
