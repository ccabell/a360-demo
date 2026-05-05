/* A360 Agent Info Panel — shared slide-out component
   Usage:
     <script src="agent-info-panel.js"></script>
     ...
     <h3>Patient Goals <button class="a360-info" data-agent="p1_extraction"></button></h3>
     ...
     A360.attachInfoIcons(document);  // auto-wires every .a360-info[data-agent]

   Single-file: injects its own CSS, owns its DOM, no dependencies.
*/
(function () {
  'use strict';

  // ─── Agent type taxonomy ───────────────────────────────────────────────────
  const TYPE_COLORS = {
    'Extraction':           { bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' },
    'Generation':           { bg: '#f5f3ff', fg: '#6d28d9', bd: '#c4b5fd' },
    'Recommendation':       { bg: '#ecfeff', fg: '#0e7490', bd: '#a5f3fc' },
    'Evaluation':           { bg: '#fffbeb', fg: '#b45309', bd: '#fcd34d' },
    'Validation':           { bg: '#fef2f2', fg: '#b91c1c', bd: '#fca5a5' },
    'Gate':                 { bg: '#f3f4f6', fg: '#374151', bd: '#d1d5db' },
    'Pipeline':             { bg: '#ecfdf5', fg: '#047857', bd: '#a7f3d0' },
    'RAG':                  { bg: '#fdf4ff', fg: '#a21caf', bd: '#f0abfc' },
    'Feedback / Learning':  { bg: '#fff7ed', fg: '#c2410c', bd: '#fed7aa' },
  };

  const STATUS_COLORS = {
    'Live':      { bg: '#ecfdf5', fg: '#047857' },
    'Beta':      { bg: '#eff6ff', fg: '#1d4ed8' },
    'Designed':  { bg: '#f3f4f6', fg: '#6b7280' },
    'Planned':   { bg: '#f3f4f6', fg: '#9ca3af' },
  };

  // ─── Agent inventory ───────────────────────────────────────────────────────
  // Keep this aligned with reference/platform/A360_Platform_Master_Feature_Inventory.md
  const AGENTS = {
    p1_extraction: {
      name: 'Pass 1 — Context & Offerings',
      type: 'Extraction',
      model: 'Claude Haiku 4.5 (Bedrock)',
      system: 'Prompt Runner',
      status: 'Live',
      description: 'First pass over the raw transcript. Extracts patient context, goals, concerns, and every offering discussed with a disposition (performed, scheduled, declined, hesitant, recommended, discussed). Every field carries a verbatim evidence quote.',
      inputs: ['Raw transcript', 'Visit type', 'Practice context'],
      outputs: ['Patient context', 'Goals + evidence', 'Concerns + evidence', 'Offerings (name, area, disposition, evidence)'],
      references: [
        'Global Library — 371 products, 28 concerns, 23 anatomy areas',
        'Product alias map (resolves "Botox" → BOTOX Cosmetic etc.)',
        'Concern taxonomy (wrinkles → fine lines, crow\'s feet, etc.)',
      ],
      prompt: 'prompts/v3.2_pass_1_context_offerings.md',
    },
    p2_extraction: {
      name: 'Pass 2 — Outcome & Intelligence',
      type: 'Extraction',
      model: 'Claude Haiku 4.5 (Bedrock)',
      system: 'Prompt Runner',
      status: 'Live',
      description: 'Second pass that consumes Pass 1 output plus the transcript and produces commercial intelligence: outcome, commitment level, hesitations, objections, next steps, signal tags, and a structured checklist with evidence.',
      inputs: ['Raw transcript', 'Pass 1 JSON', 'Visit-type checklist'],
      outputs: ['Outcome status + commitment', 'Hesitations / Objections', 'Next steps', 'Signal tags', 'Visit-type checklist with evidence'],
      references: [
        'Default visit-type checklists (initial / follow-up / treatment_visit)',
        'Pass 1 output (offerings + concerns)',
      ],
      prompt: 'prompts/v3.2_pass_2_outcome_intelligence.md',
    },
    cross_sell_guidance_v3: {
      name: 'Cross-Sell Guidance (v3)',
      type: 'Recommendation',
      model: 'gpt-4o-mini',
      system: 'Prompt Runner',
      status: 'Live',
      description: 'Generates prioritized cross-sell and upsell recommendations from the consultation summary. Each recommendation has rationale, intent score, and a suggested next step.',
      inputs: ['Pass 1 + Pass 2 extraction', 'Practice catalog (offerings)'],
      outputs: ['Ranked recommendations', 'Rationale per rec', 'Intent + receptivity scores', 'Suggested next step'],
      references: [
        'Practice Library (PL) — practice-specific catalog with COALESCE overrides',
        'Global Library defaults (when PL has no override)',
      ],
      prompt: 'prompts/cross_sell_guidance_v3.md',
    },
    opportunities_agent: {
      name: 'Opportunities Agent',
      type: 'Recommendation',
      model: 'gpt-4o-mini',
      system: 'Prompt Runner',
      status: 'Live',
      description: 'Builds a follow-up plan from interest-but-not-booked opportunities: sell plan, next-visit reference, marketing/education content, and CRM personalization context. Feeds Reach.',
      inputs: ['Pass 1 + Pass 2 extraction', 'Patient + practice metadata'],
      outputs: ['Follow-up plan', 'Sell plan', 'CRM personalization fields', 'Marketing hooks', 'Education content tags'],
      references: [
        'Practice Library (services + packages)',
        'Patient interaction history (when available)',
      ],
      prompt: 'prompts/opportunities_agent.md',
    },
    email_campaign: {
      name: 'Email Campaign',
      type: 'Generation',
      model: 'gpt-4o-mini',
      system: 'Prompt Runner',
      status: 'Live',
      description: 'Personalized post-visit email composed from the extraction output. Patient-friendly tone, references specific concerns and next steps. Drafted for clinician review before send.',
      inputs: ['Pass 1 + Pass 2 extraction', 'Patient first name', 'Practice voice'],
      outputs: ['Subject line', 'Email body (HTML + plain)', 'CTA', 'Send window suggestion'],
      references: ['Practice voice guidelines (when present)'],
      prompt: 'prompts/email_campaign.md',
    },
    coaching_evidence_extractor: {
      name: 'Coaching Evidence Extractor',
      type: 'Extraction',
      model: 'gpt-4o-mini',
      system: 'Prompt Runner',
      status: 'Live',
      description: 'Pulls coaching-specific evidence from the consultation: LAER (Listen-Acknowledge-Explore-Respond) phases, coaching moments, behaviors, and KPI data points. Produces evidence — does not coach.',
      inputs: ['Raw transcript', 'Pass 1 + Pass 2 extraction'],
      outputs: ['LAER phase mapping', 'Coaching moments + evidence', 'KPI scores (rapport, discovery, education, closing, etc.)'],
      references: ['Coaching framework — 8 dimensions, 25+ KPIs'],
      prompt: 'prompts/coaching_evidence_extractor.md',
    },
    coaching_generator: {
      name: 'Coaching Generator',
      type: 'Generation',
      model: 'gpt-4o-mini',
      system: 'Prompt Runner',
      status: 'Live',
      description: 'Produces principle-based coaching feedback from the evidence pass. Professional trainer tone — strengths first, no scripts, no emotional labels. Every recommendation cites transcript evidence.',
      inputs: ['Coaching Evidence Extractor output'],
      outputs: ['Strengths', 'Growth areas', 'Specific behaviors to repeat / change', 'Evidence citations'],
      references: ['Sales Excellence Framework', '42 Deep Dive Coaching Playbooks'],
      prompt: 'prompts/coaching_generator.md',
    },
    coaching_language_validator: {
      name: 'Coaching Language Validator',
      type: 'Validation',
      model: 'gpt-4o-mini',
      system: 'Prompt Runner',
      status: 'Live',
      description: 'Final-pass quality gate on coaching output. Enforces language policy: no scripts, no emotional labels ("you sounded nervous"), no judgment, evidence-backed claims only. Either passes or returns specific edits.',
      inputs: ['Coaching Generator output'],
      outputs: ['Pass / Fail verdict', 'Per-claim edits', 'Final cleaned coaching draft'],
      references: ['Coaching Language Policy'],
      prompt: 'prompts/coaching_language_validator.md',
    },
    coaching_pipeline: {
      name: 'Full Coaching Pipeline',
      type: 'Pipeline',
      model: 'gpt-4o-mini × 3',
      system: 'Prompt Runner',
      status: 'Live',
      description: 'Single endpoint that runs the three coaching agents in sequence — Evidence → Generator → Validator — and returns the final validated coaching report. Use for one-shot coaching analysis.',
      inputs: ['Raw transcript', 'Pass 1 + Pass 2 extraction'],
      outputs: ['Final coaching report (validated)', 'Per-stage outputs for inspection'],
      references: ['All references from the three sub-agents'],
      prompt: 'prompts/coaching_pipeline.md',
    },

    // ── Platform agents (AWS Step Functions) ──────────────────────────────
    medical_relevance_gate: {
      name: 'Medical Relevance Gate',
      type: 'Gate',
      model: 'Claude Haiku 4.5',
      system: 'genai-platform (Step Functions)',
      status: 'Live',
      description: 'Decides whether a transcript is clinically relevant before downstream processing fires. Filters out non-clinical conversations (billing, scheduling) so we never spend Sonnet on noise.',
      inputs: ['Raw transcript'],
      outputs: ['Boolean: relevant?', 'Confidence', 'Reason'],
      references: ['Medical relevance heuristics'],
    },
    soap_notes: {
      name: 'Clinical Notes (SOAP)',
      type: 'Generation',
      model: 'Claude Sonnet 4.5',
      system: 'genai-platform (Step Functions)',
      status: 'Live',
      description: 'AI-generated SOAP notes in 3 variants (general, explant, venous). Provider-customizable language, detail level, and perspective. Single-shot Bedrock invocation.',
      inputs: ['Raw transcript', 'Provider preferences'],
      outputs: ['Subjective', 'Objective', 'Assessment', 'Plan'],
      references: ['Provider customization profile'],
    },
    treatment_care_plan: {
      name: 'Treatment & Care Plan (TCP)',
      type: 'Generation',
      model: 'Claude Sonnet 4.5 (multi-agent)',
      system: 'genai-platform (Step Functions)',
      status: 'Live (slow)',
      description: 'Generates Good / Better / Best treatment tiers with pricing, milestones, and patient-friendly explanations. Multi-agent: clinical, business, sales, compliance. Currently 2–5 min generation — being re-architected.',
      inputs: ['Extraction output', 'Practice catalog + pricing rules', 'Patient goals + concerns'],
      outputs: ['Good / Better / Best tiers', 'Per-tier pricing', 'Milestones', 'Patient-facing language'],
      references: [
        'Practice Library (services, packages, pricing rules)',
        'Global Library defaults',
        'Stacking policy + promotions',
      ],
    },
    consultation_summary: {
      name: 'Consultation Summary',
      type: 'Generation',
      model: 'Claude Sonnet 4.5',
      system: 'genai-platform (Step Functions)',
      status: 'Live',
      description: 'Patient-friendly summary of the visit. Bullets what was discussed, decided, and what happens next. Used in the patient portal and in follow-up emails.',
      inputs: ['Raw transcript', 'Pass 2 outcome'],
      outputs: ['Visit summary (patient voice)', 'Decisions made', 'Open items'],
      references: [],
    },
    follow_up_email: {
      name: 'Follow-Up Email (Platform)',
      type: 'Generation',
      model: 'Claude Sonnet 4.5',
      system: 'genai-platform (Step Functions)',
      status: 'Live',
      description: 'Platform-side follow-up email generator (separate from Prompt Runner email_campaign). Used in the production a360-genai-platform pipeline.',
      inputs: ['Extraction output', 'Patient profile'],
      outputs: ['Subject', 'Body', 'CTA'],
      references: ['Practice voice'],
    },
    clarifying_questions: {
      name: 'Clarifying Questions',
      type: 'Generation',
      model: 'Claude Sonnet 4.5',
      system: 'genai-platform (Step Functions)',
      status: 'Live',
      description: 'Identifies information gaps in the consultation and proposes clarifying questions for the next visit. Drives "missing info" alerts in the provider dashboard.',
      inputs: ['Extraction output'],
      outputs: ['Ranked clarifying questions', 'Information-gap reason per question'],
      references: ['Visit-type completeness rubric'],
    },

    // ── Coaching tool (RAG) ───────────────────────────────────────────────
    rag_chat: {
      name: 'Aesthetics360 Coach (RAG Chat)',
      type: 'RAG',
      model: 'Gemini 2.5 Flash',
      system: 'Coaching Tool',
      status: 'Live',
      description: 'Conversational coach that answers provider questions grounded in the practice\'s consultation history. Pulls relevant transcripts + extractions from a vector store and synthesizes a coaching answer.',
      inputs: ['Provider question', 'Practice ID'],
      outputs: ['Answer', 'Citations to specific consultations'],
      references: [
        'Special RAG: practice-scoped vector store of transcripts + extractions',
        'Coaching framework taxonomy',
      ],
    },
    coaching_report_generator: {
      name: 'Coaching Report Generator',
      type: 'Generation',
      model: 'Gemini 2.5 Flash',
      system: 'Coaching Tool',
      status: 'Live',
      description: 'Produces a multi-week coaching report for a provider: trends, KPI deltas, specific consultations to review. Aggregates across many runs.',
      inputs: ['Provider ID', 'Time window', 'KPI roll-ups'],
      outputs: ['Trend summary', 'KPI deltas', 'Recommended review queue'],
      references: ['All coaching pipeline outputs over the window'],
    },

    // ── HITL & feedback ────────────────────────────────────────────────────
    hitl_verification: {
      name: 'HITL Verification',
      type: 'Feedback / Learning',
      model: 'Human + gpt-4o-mini diff',
      system: 'Mid-Stream + Prompt Runner',
      status: 'Live',
      description: 'Human-in-the-loop verification of extraction output. Reviewers correct dispositions, fix evidence, accept/reject offerings. Diffs are persisted as training signal — every override becomes a labeled example we can replay.',
      inputs: ['Extraction output', 'Reviewer corrections'],
      outputs: ['Corrected extraction', 'Override log (field, before, after, reviewer, reason)'],
      references: [
        'Override log (Supabase ie_run_overrides)',
        'Practice Library (target of practice-specific overrides)',
      ],
      prompt: 'prompts/v3_hitl_verification.md',
    },
    practice_feedback_loop: {
      name: 'Practice Feedback Loop',
      type: 'Feedback / Learning',
      model: '—',
      system: 'Prompt Runner + Supabase',
      status: 'Designed',
      description: 'Captures practice-specific corrections (their preferred phrasing, products they don\'t carry, services renamed) and folds them into the Practice Library. Next run for that practice automatically reflects the feedback — the model adapts without retraining.',
      inputs: ['HITL overrides', 'Practice library edits', 'Reviewer flags'],
      outputs: ['Updated Practice Library overrides', 'Per-practice prompt context block'],
      references: ['Practice Library', 'Override log'],
    },
    batch_eval_runner: {
      name: 'Batch Eval Runner',
      type: 'Evaluation',
      model: 'deterministic + LLM judge',
      system: 'Prompt Runner (CLI)',
      status: 'Live',
      description: 'Runs the full extraction pipeline over N transcripts and emits a batch_report.json + eval_report.json. Measures schema compliance, field population, evidence accuracy, disposition distribution. How we ship a new prompt safely.',
      inputs: ['Prompt set version', 'N transcripts', 'Model selection'],
      outputs: ['Per-run metrics', 'Aggregate summary', 'Regression diff vs previous version'],
      references: ['tests/test_extraction.py', 'eval_report_*.json artifacts'],
    },

    // ── Designed / planned (preprocessing chain) ───────────────────────────
    diarization_correction: {
      name: 'Diarization Correction',
      type: 'Extraction',
      model: 'Claude Haiku 4.5 (planned)',
      system: 'genai-platform (planned)',
      status: 'Designed',
      description: 'Fixes speaker misattribution from Deepgram using clinical heuristics (who asks discovery questions, who explains procedures, who consents). Targets <12s latency.',
      inputs: ['Diarized transcript with speaker labels'],
      outputs: ['Corrected speaker labels', 'Confidence per turn'],
      references: ['Clinical role heuristics'],
    },
    segmentation_labeling: {
      name: 'Segmentation & Labeling',
      type: 'Extraction',
      model: 'Claude Haiku 4.5 (planned)',
      system: 'genai-platform (planned)',
      status: 'Designed',
      description: 'Splits a transcript into labeled segments (intro, discovery, education, presentation, close, etc.) and tags each with disposition + signal tags. Powers segment-level coaching and search.',
      inputs: ['Transcript with corrected diarization'],
      outputs: ['Labeled segments', '9 phase categories × 8 dispositions × 20 signal tags'],
      references: ['Phase taxonomy', 'Signal tag taxonomy'],
    },
    catalog_validation: {
      name: 'Catalog Validation',
      type: 'Validation',
      model: 'Claude Haiku 4.5 (planned)',
      system: 'genai-platform (planned)',
      status: 'Designed',
      description: 'Resolves informal references in the transcript ("the laser thing", "that injectable") to canonical catalog entries with confidence. Fails closed when ambiguous so HITL can resolve.',
      inputs: ['Transcript', 'Practice catalog'],
      outputs: ['Resolved offering matches', 'Ambiguity flags', 'Confidence per match'],
      references: ['Practice Library', 'Global Library product alias map'],
    },

    // ── TCP Builder agents (prototype scope — see TCP_Builder_Requirements.md) ─
    tcp_goals_agent: {
      name: 'Goals Agent (TCP)',
      type: 'Generation',
      model: 'Claude Sonnet 4.5 (planned)',
      system: 'TCP Builder · Pulse',
      status: 'Designed',
      description: 'Drafts a 2–3 sentence patient-friendly goals narrative for the TCP from selected concerns, anatomy areas, and (optionally) a transcript excerpt. Provider can edit directly or regenerate.',
      inputs: ['Selected concerns', 'Selected anatomy areas', 'Transcript excerpt (optional)', 'Patient name'],
      outputs: ['2–3 sentence goals narrative', 'Suggested follow-up questions if intent is ambiguous'],
      references: [
        'Global Library: gl_concerns (28 concerns)',
        'Global Library: gl_anatomy_areas (23 areas)',
      ],
    },
    tcp_recommendation_agent: {
      name: 'Recommendation Agent (TCP)',
      type: 'Recommendation',
      model: 'Claude Sonnet 4.5 (planned)',
      system: 'TCP Builder · Pulse',
      status: 'Designed',
      description: 'Ranks practice catalog items against selected concerns + anatomy areas using the GL junction tables, then refines with goals context. Suggests phase grouping (immediate / follow-up / maintenance). Distinct from cross_sell_guidance_v3 — that one runs post-consultation; this one drives the builder.',
      inputs: ['Selected concerns', 'Selected anatomy areas', 'Patient goals', 'Practice catalog (PL with GL fallback)'],
      outputs: ['Ranked treatment list', 'Per-treatment rationale', 'Suggested phase grouping'],
      references: [
        'gl_product_concerns / gl_service_concerns junctions',
        'gl_product_anatomy_areas / gl_service_anatomy_areas junctions',
        'Practice Library (pl_products / pl_services) with COALESCE on GL',
      ],
    },
    tcp_education_agent: {
      name: 'Education Agent (TCP)',
      type: 'RAG',
      model: 'Claude Sonnet 4.5 (planned)',
      system: 'TCP Builder · Pulse',
      status: 'Designed',
      description: 'Curates patient-education content for each selected treatment: before/after photos, videos, brochures, pre/post-procedure instructions. Pulls from gl_product_content / gl_service_content; falls back to instruction fields on the base product/service when content tables are empty.',
      inputs: ['Selected treatments', 'gl_product_content', 'gl_service_content', 'Base product/service instruction fields'],
      outputs: ['Per-treatment content package (photos, videos, PDFs)', 'Pre/post instructions', 'Plan-level recovery summary'],
      references: [
        'gl_product_content (currently empty — populate for prototype)',
        'gl_service_content (currently empty — populate for prototype)',
        'gl_products: pre/post_procedure_instructions, dosing_guidelines',
        'gl_services: pre/post_procedure_instructions, expected_outcomes, recovery_timeline',
      ],
    },
    tcp_pricing_agent: {
      name: 'Pricing Agent (TCP)',
      type: 'Evaluation',
      model: 'Deterministic (no LLM)',
      system: 'TCP Builder · Pulse',
      status: 'Designed',
      description: 'Computes the investment summary: line totals, phase subtotals, plan total, financing-option monthly payments at configurable terms, and package-bundle detection. Pure deterministic calculation — runs locally, no LLM cost, no latency.',
      inputs: ['Treatment list with qty + price', 'Practice financing terms', 'pl_packages catalog'],
      outputs: ['Subtotal + total', 'Financing options (monthly payment per term)', 'Package match + savings if any'],
      references: [
        'pl_packages (package_price, total_value, savings_amount)',
        'pl_package_items (item_type, product_id, service_id, quantity)',
        'Practice financing terms (default: 6mo/0%, 12mo/7.99%, 24mo/9.99%)',
      ],
    },
    tcp_action_agent: {
      name: 'Action Agent (TCP)',
      type: 'Generation',
      model: 'Claude Sonnet 4.5 (planned)',
      system: 'TCP Builder · Pulse',
      status: 'Designed',
      description: 'Generates a numbered next-steps list and follow-up schedule from the finalized treatment plan. Derives target dates from treatment protocols (min_retreatment_interval, recommended_sessions, maintenance_interval).',
      inputs: ['Finalized treatments', 'Phase structure', 'Treatment protocols from gl_products / gl_services'],
      outputs: ['Numbered next-steps list', 'Follow-up schedule (event + target_date pairs)'],
      references: [
        'gl_products: min_retreatment_interval, recommended_sessions, maintenance_interval',
        'gl_services: recovery_timeline, treatment_frequency',
      ],
    },

    // ── Reach agents (prototype scope — see REACH_AGENT_REQUIREMENTS.md) ─────
    reach_signal_aggregator: {
      name: 'Signal Aggregator (Reach)',
      type: 'Extraction',
      model: 'Deterministic (no LLM)',
      system: 'Reach · post-consultation pipeline',
      status: 'Designed',
      description: 'Reads the consultation extraction and aggregates signals into a normalized scorecard: intent strength, buy signal, sentiment trend, primary barrier, motivating event, decision style. Pure deterministic compute — runs in milliseconds.',
      inputs: ['Pass 1 + Pass 2 extraction', 'Consultation Intelligence KPIs (when available)'],
      outputs: ['Intent score (0-1)', 'Buy signal strength (0-100)', 'Sentiment final score', 'Primary barrier label', 'Motivating event normalized', 'Decision style classifier'],
      references: ['Signal taxonomy (REACH_AGENT_REQUIREMENTS.md §5.1)'],
    },
    reach_strategy_agent: {
      name: 'Campaign Strategy Agent (Reach)',
      type: 'Recommendation',
      model: 'Claude Sonnet 4.5 (planned) + decision tree',
      system: 'Reach · post-consultation pipeline',
      status: 'Designed',
      description: 'Picks one of 9 campaign archetypes from the aggregated signals: BOOKING_FACILITATION, HIGH_INTEREST_NURTURE, EVENT_DRIVEN, VALUE_REINFORCEMENT, REASSURANCE_EDUCATION, STANDARD_FOLLOWUP, GENTLE_ENGAGEMENT, AFTERCARE_REBOOKING, CROSS_SELL_EXPANSION. Each has a distinct sequence length, cadence, tone, and content profile. Patient may stack max 2 campaigns.',
      inputs: ['Aggregated signals', 'Patient history', 'Practice campaign preferences'],
      outputs: ['Selected campaign type', 'Sequence length', 'Cadence schedule', 'Confidence score', 'Stacking decisions'],
      references: ['9 campaign types (REACH_AGENT_REQUIREMENTS.md §8.1)', 'Stacking rules §8.2'],
    },
    reach_email_generator: {
      name: 'Email Generator (Reach)',
      type: 'Generation',
      model: 'Claude Sonnet 4.5 (planned)',
      system: 'Reach · post-consultation pipeline',
      status: 'Designed',
      description: 'Generates each email body in the campaign sequence with subject + 2 A/B variants. Personalization is L4 (evidence-backed emotional intelligence): every personalization phrase pulled from a specific extraction signal. The agent never invents — if a hook is unavailable, the phrase is omitted, not fabricated.',
      inputs: ['Campaign type + sequence step', 'Extraction signals', 'Patient name + provider name', 'Practice voice config', 'Education content from practice library'],
      outputs: ['Subject line + 2 alts', 'Preview text', 'Body (HTML + plain)', 'Personalization-hook map (which signal each phrase used)', 'Content flags (care_plan / pricing / financing / B&A / objection / credentials)'],
      references: ['Personalization framework (REACH_AGENT_REQUIREMENTS.md §7)', 'Sequence templates §9'],
    },
    reach_sms_generator: {
      name: 'SMS Generator (Reach)',
      type: 'Generation',
      model: 'Claude Sonnet 4.5 (planned)',
      system: 'Reach · post-consultation pipeline',
      status: 'Designed',
      description: 'Generates standard SMS messages (one-way push). Character-conscious, personal tone from provider, complementary to (not redundant with) the email sent around the same day. Includes opt-out compliance string.',
      inputs: ['Campaign type', 'Day-N position in sequence', 'Adjacent email content (avoid redundancy)', 'Provider voice'],
      outputs: ['SMS body (≤ 320 chars)', 'TCPA-compliant opt-out string', 'Send-time recommendation'],
      references: ['SMS specs (REACH_AGENT_REQUIREMENTS.md §10)'],
    },
    reach_rcs_orchestrator: {
      name: 'Conversational SMS / RCS Orchestrator (OrchardLink)',
      type: 'RAG',
      model: 'OrchardLink RCS engine + Gemini 2.5 Flash',
      system: 'Reach · OrchardLink integration',
      status: 'Designed',
      description: 'Powers two-way conversational SMS over Google RCS / Apple Business Messages. Always-on. Has full consultation context — knows the patient\'s wedding date, package math, price objection, fear of looking "frozen." Renders rich content (timeline cards, package details, scheduling links) with quick-reply CTAs. Escalates to staff only when needed.',
      inputs: ['Patient text input', 'Full consultation context', 'Practice catalog + pricing', 'Live appointment availability'],
      outputs: ['Conversational response with quick-reply buttons', 'Rich content (timelines, comparison cards)', 'Booking action when triggered'],
      references: ['OrchardLink RCS docs (REACH_AGENT_REQUIREMENTS.md §11)'],
    },
    reach_education_curator: {
      name: 'Education Content Curator (Reach)',
      type: 'RAG',
      model: 'Deterministic ranking + Claude Haiku 4.5',
      system: 'Reach · post-consultation pipeline',
      status: 'Designed',
      description: 'Selects which practice-library education resources to attach to each email in the sequence. Ranks content by relevance to the email\'s topic + patient\'s concerns. Email 1 might surface a "what to expect" article, Email 3 a financing PDF, Email 4 a B/A gallery.',
      inputs: ['Email topic', 'Selected treatments', 'Patient concerns', 'Practice library catalog'],
      outputs: ['Ordered list of content links per email', 'Relevance score', 'Why-relevant blurb'],
      references: ['Education content links (REACH_AGENT_REQUIREMENTS.md §15)', 'Practice library content tables'],
    },
    reach_compliance_validator: {
      name: 'Compliance Validator (Reach)',
      type: 'Validation',
      model: 'Rule-based + Claude Haiku 4.5',
      system: 'Reach · pre-send gate',
      status: 'Designed',
      description: 'Final pass before any campaign content goes out. Checks for: medical claims without disclaimers, missing opt-out on SMS (TCPA), pricing accuracy, brand-name vs generic correctness, contraindication leakage. Critical violations block; warnings flag for staff review.',
      inputs: ['Generated emails + SMS', 'Campaign metadata', 'Practice compliance config'],
      outputs: ['Pass / Fail per piece', 'Specific violations with fix suggestions', 'Audit log entry'],
      references: ['Compliance rules', 'TCPA opt-out requirements', 'Practice-level guardrails'],
    },
    reach_crm_pusher: {
      name: 'CRM Field Pusher (Reach)',
      type: 'Generation',
      model: 'Deterministic',
      system: 'Reach · GHL / CRM integration',
      status: 'Designed',
      description: 'Alternative delivery path. Instead of generating full content, pushes structured fields to the CRM (GoHighLevel) so the practice\'s existing templates handle messaging. Sets ~12 contact fields per patient: campaign_type, intent_strength, primary_objection, event_type, package_value, etc. Triggers the matching workflow.',
      inputs: ['Aggregated signals', 'Selected campaign type', 'Care plan data'],
      outputs: ['Set of A360_* contact fields on the GHL contact', 'Triggered workflow id'],
      references: ['GHL custom fields convention', 'Field mapping spec'],
    },
  };

  // ─── CSS injection ─────────────────────────────────────────────────────────
  const CSS = `
    .a360-info{
      display:inline-flex;align-items:center;justify-content:center;
      width:16px;height:16px;border-radius:50%;
      background:rgba(255,255,255,.18);color:rgba(255,255,255,.85);
      border:1px solid rgba(255,255,255,.3);
      font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;line-height:1;
      cursor:pointer;padding:0;transition:all .12s;flex-shrink:0;
      margin-left:6px;vertical-align:middle;
    }
    .a360-info:hover{background:rgba(255,255,255,.35);color:#fff;border-color:rgba(255,255,255,.55)}
    .a360-info.dark{background:#f3f4f6;color:#6b7280;border-color:#d1d5db}
    .a360-info.dark:hover{background:#1b4f6b;color:#fff;border-color:#1b4f6b}
    .a360-info::before{content:'i'}

    .a360-scrim{
      position:fixed;inset:0;background:rgba(15,23,42,.35);
      opacity:0;pointer-events:none;transition:opacity .18s ease;z-index:9998;
    }
    .a360-scrim.open{opacity:1;pointer-events:auto}

    .a360-panel{
      position:fixed;top:0;right:0;bottom:0;width:460px;max-width:92vw;
      background:#fff;box-shadow:-4px 0 24px rgba(15,23,42,.18);
      transform:translateX(100%);transition:transform .22s ease;
      z-index:9999;display:flex;flex-direction:column;
      font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;color:#1a1f2e;
    }
    .a360-panel.open{transform:translateX(0)}

    .a360-panel-hdr{
      background:#1b4f6b;color:#fff;padding:14px 18px;
      display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
    }
    .a360-panel-hdr .ttl{font-size:14px;font-weight:700;letter-spacing:-.01em;line-height:1.3;margin-bottom:4px}
    .a360-panel-hdr .badges{display:flex;gap:6px;flex-wrap:wrap}
    .a360-badge{font-size:9px;font-weight:700;padding:3px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:.04em;border:1px solid transparent}
    .a360-close{
      background:transparent;border:none;color:rgba(255,255,255,.85);
      font-size:18px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:4px;
      flex-shrink:0;
    }
    .a360-close:hover{background:rgba(255,255,255,.15);color:#fff}

    .a360-panel-body{
      flex:1;overflow-y:auto;padding:16px 18px 24px;
      font-size:12px;line-height:1.55;color:#374151;
    }
    .a360-section{margin-bottom:16px}
    .a360-section:last-child{margin-bottom:0}
    .a360-section-lbl{
      font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;
      color:#9ca3af;margin-bottom:6px;
    }
    .a360-section-val{font-size:13px;color:#1a1f2e}
    .a360-desc{font-size:13px;line-height:1.6;color:#374151;margin-bottom:12px}

    .a360-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .a360-meta-cell{
      background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;
    }
    .a360-meta-cell .lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:2px}
    .a360-meta-cell .val{font-size:12px;font-weight:600;color:#1a1f2e;font-family:'JetBrains Mono',monospace}

    .a360-list{list-style:none;padding:0;margin:0}
    .a360-list li{
      padding:6px 0 6px 14px;font-size:12px;color:#374151;
      border-bottom:1px solid #f3f4f6;position:relative;line-height:1.5;
    }
    .a360-list li:last-child{border-bottom:none}
    .a360-list li::before{
      content:'';position:absolute;left:2px;top:11px;
      width:5px;height:5px;border-radius:50%;background:#1b4f6b;
    }
    .a360-ref{
      padding:7px 10px;background:#eff6ff;border-left:2px solid #2563eb;
      border-radius:0 4px 4px 0;font-size:12px;color:#1e3a8a;margin-bottom:5px;line-height:1.5;
    }
    .a360-ref:last-child{margin-bottom:0}

    .a360-link{
      display:inline-flex;align-items:center;gap:6px;
      font-size:11px;font-weight:600;color:#1b4f6b;text-decoration:none;
      padding:5px 10px;border:1px solid #cfe1eb;border-radius:6px;
      background:#f0f7fb;font-family:'JetBrains Mono',monospace;
    }
    .a360-link:hover{background:#1b4f6b;color:#fff;border-color:#1b4f6b}

    @media (max-width:640px){
      .a360-meta-grid{grid-template-columns:1fr}
    }
  `;

  // ─── DOM build ─────────────────────────────────────────────────────────────
  let scrimEl = null;
  let panelEl = null;
  let titleEl, badgesEl, bodyEl;

  function injectStyles() {
    if (document.getElementById('a360-info-styles')) return;
    const s = document.createElement('style');
    s.id = 'a360-info-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function buildPanel() {
    if (panelEl) return;
    scrimEl = document.createElement('div');
    scrimEl.className = 'a360-scrim';
    scrimEl.addEventListener('click', closePanel);

    panelEl = document.createElement('aside');
    panelEl.className = 'a360-panel';
    panelEl.setAttribute('role', 'dialog');
    panelEl.setAttribute('aria-modal', 'true');
    panelEl.innerHTML = `
      <div class="a360-panel-hdr">
        <div style="flex:1;min-width:0">
          <div class="ttl"></div>
          <div class="badges"></div>
        </div>
        <button class="a360-close" aria-label="Close">×</button>
      </div>
      <div class="a360-panel-body"></div>
    `;
    titleEl = panelEl.querySelector('.ttl');
    badgesEl = panelEl.querySelector('.badges');
    bodyEl = panelEl.querySelector('.a360-panel-body');
    panelEl.querySelector('.a360-close').addEventListener('click', closePanel);

    document.body.appendChild(scrimEl);
    document.body.appendChild(panelEl);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panelEl.classList.contains('open')) closePanel();
    });
  }

  function badge(text, palette) {
    const c = palette || { bg: '#f3f4f6', fg: '#374151', bd: '#d1d5db' };
    return `<span class="a360-badge" style="background:${c.bg};color:${c.fg};border-color:${c.bd||c.bg}">${escapeHtml(text)}</span>`;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function section(label, html) {
    if (!html) return '';
    return `<div class="a360-section">
      <div class="a360-section-lbl">${escapeHtml(label)}</div>
      ${html}
    </div>`;
  }

  function listHtml(items) {
    if (!items || !items.length) return '';
    return '<ul class="a360-list">' +
      items.map(i => `<li>${escapeHtml(i)}</li>`).join('') +
      '</ul>';
  }

  function refsHtml(items) {
    if (!items || !items.length) return '';
    return items.map(i => `<div class="a360-ref">${escapeHtml(i)}</div>`).join('');
  }

  function metaCell(lbl, val) {
    if (!val) return '';
    return `<div class="a360-meta-cell"><div class="lbl">${escapeHtml(lbl)}</div><div class="val">${escapeHtml(val)}</div></div>`;
  }

  function openPanel(agentId) {
    const a = AGENTS[agentId];
    if (!a) {
      console.warn('[A360] Unknown agent id:', agentId);
      return;
    }
    buildPanel();

    titleEl.textContent = a.name;
    badgesEl.innerHTML = [
      badge(a.type, TYPE_COLORS[a.type]),
      badge(a.status, STATUS_COLORS[a.status]),
    ].join('');

    let body = '';
    if (a.description) body += `<div class="a360-desc">${escapeHtml(a.description)}</div>`;

    body += `<div class="a360-section"><div class="a360-meta-grid">
      ${metaCell('Type', a.type)}
      ${metaCell('Model', a.model)}
      ${metaCell('Runs in', a.system)}
      ${metaCell('Status', a.status)}
    </div></div>`;

    body += section('Inputs', listHtml(a.inputs));
    body += section('Outputs', listHtml(a.outputs));
    body += section('References', refsHtml(a.references));

    if (a.prompt) {
      body += section('Prompt template',
        `<a class="a360-link" href="https://github.com/ccabell/prompt-runner/blob/master/${escapeHtml(a.prompt)}" target="_blank" rel="noopener">→ ${escapeHtml(a.prompt)}</a>`);
    }

    bodyEl.innerHTML = body;
    bodyEl.scrollTop = 0;

    requestAnimationFrame(() => {
      scrimEl.classList.add('open');
      panelEl.classList.add('open');
    });
  }

  function closePanel() {
    if (!panelEl) return;
    scrimEl.classList.remove('open');
    panelEl.classList.remove('open');
  }

  function attachInfoIcons(root) {
    root = root || document;
    const icons = root.querySelectorAll('.a360-info[data-agent]');
    icons.forEach(icon => {
      if (icon.__a360Wired) return;
      icon.__a360Wired = true;
      icon.setAttribute('aria-label', 'Agent info');
      icon.setAttribute('title', 'About this agent');
      icon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPanel(icon.dataset.agent);
      });
    });
  }

  // ─── Public API ────────────────────────────────────────────────────────────
  injectStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => attachInfoIcons(document));
  } else {
    attachInfoIcons(document);
  }

  window.A360 = window.A360 || {};
  window.A360.openAgentPanel = openPanel;
  window.A360.closeAgentPanel = closePanel;
  window.A360.attachInfoIcons = attachInfoIcons;
  window.A360.AGENTS = AGENTS;
})();
