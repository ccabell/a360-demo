# Transcript Enhancement Pipeline — Claude Code Desktop Prompt

Copy everything below the line into a new Claude Code desktop session.

---

## Task: Enhance 20 Demo Transcripts for A360

You are enhancing 20 real medical aesthetics consultation transcripts for use in product demos. The transcripts are stored in Supabase and accessible via the Prompt Runner API. You will read each transcript, enhance it, and write the enhanced version back to the `transcript_text_enhanced` column in `ie_transcripts`.

### How to Read a Transcript

```bash
curl -s "https://prompt-runner-production.up.railway.app/transcripts/{TRANSCRIPT_ID}"
```

Returns JSON with `transcript_raw` (the full text), `transcript_summary`, `consult_type`, `duration_minutes`.

### How to Write Back the Enhanced Transcript

Use the Supabase REST API directly:

```bash
curl -s -X PATCH \
  "https://wvpgmawrizwkmvfnwqfl.supabase.co/rest/v1/ie_transcripts?id=eq.{TRANSCRIPT_ID}" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2cGdtYXdyaXp3a212Zm53cWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTUyNTQsImV4cCI6MjA4NzM3MTI1NH0._72rihlJiCHFs8eiLYgIbqPqvslLRVCyaDMpy51kibc" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2cGdtYXdyaXp3a212Zm53cWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTUyNTQsImV4cCI6MjA4NzM3MTI1NH0._72rihlJiCHFs8eiLYgIbqPqvslLRVCyaDMpy51kibc" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"transcript_text_enhanced": "THE ENHANCED TEXT HERE"}'
```

Note: The enhanced text will contain quotes and special characters. When writing back, save the enhanced text to a temp file first, then use `jq` to build the JSON payload safely:

```bash
# Write enhanced text to temp file
cat > /tmp/enhanced.txt << 'ENDOFTEXT'
...enhanced transcript here...
ENDOFTEXT

# Build JSON and PATCH
jq -n --rawfile text /tmp/enhanced.txt '{"transcript_text_enhanced": $text}' | \
curl -s -X PATCH \
  "https://wvpgmawrizwkmvfnwqfl.supabase.co/rest/v1/ie_transcripts?id=eq.{TRANSCRIPT_ID}" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2cGdtYXdyaXp3a212Zm53cWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTUyNTQsImV4cCI6MjA4NzM3MTI1NH0._72rihlJiCHFs8eiLYgIbqPqvslLRVCyaDMpy51kibc" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2cGdtYXdyaXp3a212Zm53cWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTUyNTQsImV4cCI6MjA4NzM3MTI1NH0._72rihlJiCHFs8eiLYgIbqPqvslLRVCyaDMpy51kibc" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d @-
```

### Processing Approach

Process ALL 20 transcripts. For each one:
1. Read the transcript via curl
2. Enhance it according to the rules below (YOU are the enhancement engine — apply the rules directly)
3. Write the enhanced text back to Supabase
4. Report what you changed

Use agents to parallelize — spawn 3-4 agents at a time, each handling one transcript independently. Each agent needs the full context (rules, product catalog, product assignment for that specific transcript).

### The 20 Transcripts to Enhance

| # | Transcript ID | Patient | Type | Duration | Products to Weave In |
|---|--------------|---------|------|----------|---------------------|
| 1 | `2abf90ef-6e10-4b6c-9452-4b19f582a885` | Sofia Reyes | treatment_visit | 37.5m | Botox Cosmetic, Juvederm Voluma, BBL HERO |
| 2 | `f09c4c7b-3b28-46ee-a224-73cec60276be` | Katherine Chen | treatment_visit | 37.7m | Botox Cosmetic, Morpheus8 Face, DiamondGlow |
| 3 | `ce52930d-05b6-4a1a-a09f-be191707fd77` | Danielle Brooks | consultation_only | 42.2m | Juvederm Vollure, Sculptra, Ultherapy PRIME |
| 4 | `4b756ffe-ec2b-415f-820d-982b1a68968a` | Amara Okafor | initial_consultation | 30.6m | Dysport, Restylane Kysse, Halo, PRF |
| 5 | `c270cafa-5ed0-4a52-b75a-f219d093c7c9` | Rachel Whitfield | treatment_visit | 32.9m | Botox Cosmetic, Dysport, Xeomin, Emsculpt Neo |
| 6 | `3242a32a-0458-4d96-b7b8-3d4216eba549` | Jessica Navarro | follow_up | 22.7m | Restylane Kysse, Juvederm Volbella, Hollywood Spectra |
| 7 | `27776b55-0aa0-4d86-a43c-44540f5b999f` | Meredith Gallagher | follow_up | 48.9m | Botox Cosmetic, Kybella, SkinTyte |
| 8 | `95923e8b-fbd2-427f-9641-884a7e96175f` | Priya Sharma | treatment_visit | 31.9m | DiamondGlow, Forever Young BBL, Juvederm Ultra |
| 9 | `b34a207d-fcb7-4de9-950d-addc7665cd9c` | Lauren DeStefano | treatment_visit | 47.6m | PRF, Juvederm Ultra Plus, Morpheus8 Face |
| 10 | `a0d9cc64-1aa5-4d4d-a722-84599ed7c167` | Natasha Kim | treatment_visit | 24.4m | Microneedling, Laser Hair Removal, ProFractional |
| 11 | `88438059-1cee-414f-81c0-d0a9d84e2fde` | Christine Morales | treatment_visit | 45.3m | Dysport, Halo, PRF, UltraShape Power |
| 12 | `d781f720-0602-4169-b15f-aad97f9aa732` | Vanessa Thornton | treatment_visit | 35.6m | Dysport, Juvederm Vollure, Forever Clear BBL |
| 13 | `3dc1303e-1bef-4332-ba81-b13721c096b9` | David Park | treatment_visit | 42.1m | Botox Cosmetic, Dysport, Xeomin, Sculptra |
| 14 | `537209de-3f64-43bd-a935-52d879173af8` | Adrienne Cole | treatment_visit | 27.7m | Dysport, Restylane Kysse, Morpheus8 Body |
| 15 | `2da94d9d-a319-4362-a28f-3bbaf59e55be` | Michelle Dupont | consultation | 75.9m | Juvederm Volbella, CO2 Laser, Votiva |
| 16 | `cd3a440e-97e3-4eff-a702-3839cbfabc8a` | Gabriela Santos | initial_consultation | 40.3m | Botox Cosmetic, BBL HERO, Sculptra, Ultherapy PRIME |
| 17 | `3355f583-b490-4777-99ff-58fc3c5d9c3b` | Elena Vasquez | treatment_visit | 43.6m | Dysport, Xeomin, Dermaplane, Morpheus8 Face |
| 18 | `d7f36b86-044a-40e8-9db7-824c482c5b83` | Robert Harrington | follow_up | 19.2m | Botox Cosmetic, Juvederm Voluma |
| 19 | `0db776c5-7502-44bd-9e05-c6f5740e0a89` | Simone Washington | follow_up | 89.4m | Botox Cosmetic, Juvederm Voluma, Emsculpt Neo |
| 20 | `53147faa-3a45-4427-8e95-e4eef84a05af` | Mei-Lin Tanaka | procedure | 73.2m | Xeomin, Juvederm Volux, Laser Hair Removal |

---

## Enhancement Rules

You ARE the enhancement engine. When you read a transcript, apply these rules directly and produce the enhanced version.

### Approach: Surgical Enhancement, Not Rewrite

- Start from the original transcript as your base
- Make TARGETED modifications: swap a generic term for a brand name, replace a sensitive tangent with similar-length alternative banter, insert a natural cross-sell moment between existing lines
- Leave 80%+ of the dialogue completely unchanged
- The output must be approximately the same length as the input (within +/-15%)
- Preserve Speaker 0 / Speaker 1 / Speaker 2 / etc. format exactly

### Content to REMOVE or REPLACE

Replace with natural-sounding alternative banter of SIMILAR LENGTH:
- Firearms, weapons, or violence discussion
- Explicit political opinions or controversial topics
- Deeply personal disclosures that could be embarrassing (health crises, relationship drama, legal issues, financial hardships beyond normal budget talk)
- Any remaining PHI (real names appear as **NAME**, real addresses as **ADDRESS** — leave the redaction tags, don't try to fill them in)

### Content to ENHANCE

1. **Brand Names**: Replace generic terms with specific product names from the assigned list:
   - "the Botox" → "Botox Cosmetic"
   - "the filler" → the specific filler from the assignment (e.g., "Juvederm Voluma")
   - "the laser" → the specific device (e.g., "Halo" or "BBL HERO")

2. **Email/Send Trigger** (at least ONE per transcript): Provider naturally offers to send information:
   - "I'll email you the pre-care instructions for the Halo treatment"
   - "Let me send you some before-and-after photos so you can see what to expect"
   - "I'll have the front desk email you the Sculptra information packet"

3. **Future Event/Timeline Trigger** (at least ONE per transcript): Patient mentions upcoming reason:
   - "My daughter's wedding is in October"
   - "I have a big conference next month"
   - "We're going on a beach vacation in August"
   - "My high school reunion is coming up"

4. **Cross-Sell Moment** (at least ONE per transcript): Natural complementary treatment mention:
   - "While we're doing your neurotoxin, have you thought about addressing [concern] with [product]?"
   - "A lot of my patients who do [treatment A] love pairing it with [treatment B]"
   - Patient asks: "What else could I do for [area/concern]?"

5. **Coaching Moments**: Preserve or enhance natural selling moments — both strong technique (good rapport, needs assessment, proper recommendation flow) and improvable moments (missed opportunity, weak close, no urgency). Don't make the provider perfect — the coaching agent needs both good and bad examples to evaluate.

6. **Membership/Package Mentions**: Where natural, mention loyalty programs, Aspire rewards, Alle points, or treatment packages.

### What NOT to Do

- Don't make it sound scripted or like an infomercial
- Don't change accurate clinical details (dosing, injection sites, technique)
- Don't remove natural banter, humor, or rapport-building — that's what makes these feel real
- Don't fill in redacted PHI tags (**NAME**, **ADDRESS**, **DATE_TIME**) — leave them as-is
- Don't add Speaker labels that don't exist in the original
- Don't wrap output in code blocks or add headers

### Output Format

For each transcript, produce:
1. The complete enhanced transcript text (raw text, no code blocks, no headers)
2. An enhancement log appended at the very end:

```
<!-- ENHANCEMENT_LOG: {"removed": ["brief descriptions"], "added": ["brief descriptions"], "products_mentioned": ["Botox Cosmetic", "etc"], "agent_triggers": ["cross_sell", "email", "opportunities", "coaching"]} -->
```

---

## Product Catalog Reference

The practice (Lumiere Aesthetics) offers these treatments. Only use products from each transcript's assigned list, but this full catalog is here for accuracy:

**INJECTABLES (Neurotoxins):**
- Botox Cosmetic (AbbVie/Allergan) — forehead, glabella, crow's feet, brow lift, DAO, lip flip, platysmal bands
- Dysport (Ipsen/Galderma) — forehead, glabella, crow's feet, brow lift
- Xeomin (Merz) — forehead, glabella, lip flip

**DERMAL FILLERS:**
- Juvederm Ultra / Ultra Plus (Allergan) — lips, nasolabial folds
- Juvederm Voluma (Allergan) — cheeks, chin, jawline
- Juvederm Vollure (Allergan) — nasolabial folds, marionette lines
- Juvederm Volbella (Allergan) — lips, perioral lines
- Juvederm Volux (Allergan) — jawline definition
- Restylane Kysse (Galderma) — lips
- Sculptra (Galderma) — deep volume restoration, collagen stimulation (temples, cheeks, jawline)

**FAT REDUCTION:**
- Kybella (AbbVie/Allergan) — submental fat (double chin)

**ENERGY-BASED DEVICES — Sciton Joule Platform:**
- BBL HERO — photofacial, pigmentation, redness, skin rejuvenation
- Forever Young BBL — preventive aging, skin maintenance
- Forever Clear BBL — acne treatment
- Halo — hybrid fractional laser (resurfacing + rejuvenation)
- ProFractional — ablative fractional resurfacing (deeper texture/scars)
- SkinTyte — infrared skin tightening
- Hollywood Spectra Laser Facial (Lutronic) — toning, pigmentation, pore refinement
- Laser Hair Removal (Sciton Bare HR or Lumenis LightSheer)

**SKIN REMODELING:**
- Morpheus8 Face (InMode) — RF microneedling, skin tightening, texture
- Morpheus8 Body (InMode) — body skin tightening, stretch marks, cellulite
- Ultherapy PRIME (Merz) — non-invasive ultrasound lifting (brow, chin, neck, decolletage)

**BODY CONTOURING:**
- Emsculpt Neo (BTL) — simultaneous fat reduction + muscle building
- UltraShape Power (Candela) — non-invasive fat destruction

**INTIMATE WELLNESS:**
- Votiva (InMode) — vaginal rejuvenation, stress incontinence
- Morpheus8V (InMode) — RF microneedling for intimate wellness

**SKIN TREATMENTS:**
- DiamondGlow — dermabrasion + serum infusion
- PRF (Platelet-Rich Fibrin) — under-eye rejuvenation, hair restoration
- Microneedling — collagen induction
- Chemical Peels — skin resurfacing
- Dermaplane — exfoliation

---

## Agent Capabilities Being Triggered

These downstream AI agents run on every transcript. The enhancement should naturally produce moments that trigger rich output from each:

1. **Cross-Sell Guidance Agent** — Triggers when: patient mentions concerns about other areas, provider recommends complementary treatments, patient asks "what else can I do for X?", seasonal treatment planning discussed.

2. **Opportunities Agent** — Triggers when: patient mentions upcoming events (wedding, reunion, vacation), expresses interest but defers, mentions budget constraints, asks about packages/memberships, discusses treatment frequency.

3. **Email Campaign Agent** — Triggers when: provider offers to send information, discusses aftercare, mentions follow-up content, references educational materials.

4. **Coaching Evidence Extractor** — Triggers when: provider uses good/bad sales techniques, handles objections, builds rapport, discusses pricing, presents treatment options. Best when conversation has BOTH strong and improvable moments.

5. **Coaching Generator** — Evaluates LAER model (Listen, Acknowledge, Explore, Respond). Best when there are active listening moments, empathy statements, exploratory questions.

6. **Coaching Language Validator** — Checks clinical appropriateness. Best with mix of proper clinical terminology and occasional informal language.

---

## Execution Plan

Process all 20 transcripts. For each batch:

1. Spawn 3-4 agents in parallel, each handling one transcript
2. Each agent should:
   a. Read the transcript: `curl -s "https://prompt-runner-production.up.railway.app/transcripts/{ID}"`
   b. Extract the `transcript_raw` field
   c. Apply the enhancement rules above with the assigned products for that transcript
   d. Write the enhanced text to a temp file
   e. Use jq + curl to PATCH it back to Supabase (use the write-back method shown above)
   f. Report: transcript ID, original length, enhanced length, what was removed, what was added, products mentioned
3. After each batch completes, report progress and start the next batch
4. After all 20 are done, do a verification pass: `curl` each transcript and confirm `transcript_text_enhanced` is populated

Keep going until all 20 are done. Do not stop and ask — process them all.
