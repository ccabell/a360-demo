# 15 — Product Content CMS

## Overview

A lightweight CMS within Mid-Stream for linking and managing product-associated content: PDFs, YouTube videos, and images. The goal is to connect manufacturer content to specific products in the Global Library so agents can reference authoritative sources and point users to the original material.

---

## What We Have Today

### PDFs
- **680 clinical PDFs** in HealthVU (`C:\Users\Chris\Dropbox\NewCO\HealthVU\Education Content - New\`)
- **260 unique PDFs** (after dedup) from `a360-scraped-data` repo — prescribing info, IFUs, clinical studies, injection guides, patient brochures
- **Dedup + product matching done**: `C:\Projects\accuracy\pdf_review.csv` has 260 PDFs with auto-matched product IDs (42 matched, 218 need review)
- PDFs are categorized: prescribing_information, clinical_study, user_guide, patient_brochure, safety, marketing, training
- GL already has `document_urls`, `prescribing_info_url`, `patient_brochure_url` columns on `gl_product_content`

### YouTube Videos
- **2,260 videos / 78,855 transcript chunks** with ada-002 embeddings
- Stored in Supabase project `gjqicqldjgvrwmtkliie`, table `manufacturer_youtube_transcript`
- Schema per chunk: `manufacturer_name`, `video_title`, `video_url`, `video_id`, `chunk_text`, `start_time`, `end_time`, `embedding vector(1536)`
- Channels: Dr Tim Pearce (406), AAFE TV (339), BTL (337), Lumenis (237), Sciton (98), SkinCeuticals (98), +10 more
- Already vectorized and searchable — can do semantic search across transcripts
- Local inventory: `C:\projects\rag\youtube_video_inventory.csv`

### Images
- **~1,351 unique images** in `a360-scraped-data` (product photos, B&A, device photos, logos)
- Organized by manufacturer: ZO Skin Health (582), Obagi (279), Alastin (132), CoolSculpting (121), Neocutis (76), Candela (72), Sciton (62)
- HealthVU has additional B&A images organized by product
- Mid-Stream already has a media viewer component

---

## What to Build

### 1. Product Content Dashboard

A tab or page within the existing product detail view in Mid-Stream. When viewing a product, show all linked content in organized sections.

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  Product: BOTOX Cosmetic (Allergan Aesthetics)           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Documents]  [Videos]  [Images]  [Upload]               │
│                                                          │
│  ┌─ Documents (6) ─────────────────────────────────────┐ │
│  │                                                     │ │
│  │  📋 Prescribing Information                         │ │
│  │  ├ botox-cosmetic_pi.pdf          (PI, FDA)    [⋮] │ │
│  │  ├ botox_medguide.pdf             (Safety)     [⋮] │ │
│  │                                                     │ │
│  │  📘 Clinical / Training                             │ │
│  │  ├ ART of Injection Guide.pdf     (Training)   [⋮] │ │
│  │  ├ BTXC Reconstitute Guide.pdf    (Guide)      [⋮] │ │
│  │                                                     │ │
│  │  📄 Patient Materials                               │ │
│  │  ├ Patient Loyalty Program.pdf    (Brochure)   [⋮] │ │
│  │  ├ Assessment Flashcard.pdf       (Education)  [⋮] │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ Videos (12) ───────────────────────────────────────┐ │
│  │                                                     │ │
│  │  🎬 AAFE TV                                         │ │
│  │  ├ "Advanced BOTOX Injection Techniques"  32:14 [▶] │ │
│  │  ├ "Glabellar Complex: Anatomy Review"    18:42 [▶] │ │
│  │                                                     │ │
│  │  🎬 Dr Tim Pearce                                   │ │
│  │  ├ "How to Inject Forehead Lines"         22:08 [▶] │ │
│  │  ├ "Avoiding Ptosis with BOTOX"           15:33 [▶] │ │
│  │                                                     │ │
│  │  [Search video transcripts...]                      │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ Images (8) ────────────────────────────────────────┐ │
│  │  [Grid of thumbnails — B&A photos, product shots]   │ │
│  │  Click to open in media viewer                      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2. Document Management

**Linking documents to products:**
- Upload PDF or link existing file path
- Assign to product (dropdown from `gl_products`)
- Classify: prescribing_information | clinical_study | user_guide | patient_brochure | safety | marketing | training
- Auto-populate from the dedup CSV we already have (`pdf_review.csv`)

**Document viewer:**
- Inline PDF viewer (or new tab)
- Show metadata: category, source, upload date, file size

**Storage:**
- New table `gl_product_documents` (see schema below)
- File storage: Supabase Storage bucket or reference to file path
- Link to `gl_product_content.document_urls` for backward compat

### 3. Video Management

**Linking videos to products:**
- Search YouTube transcript chunks by product name → show matching videos
- Admin can confirm/reject auto-matches
- Manual link: paste YouTube URL, assign to product

**Video features:**
- Play video inline (YouTube embed)
- Show transcript alongside video (from `manufacturer_youtube_transcript` chunks)
- Semantic search across video transcripts: "How do you inject the glabella?" → returns timestamped video segments
- Click a search result → opens video at that timestamp

**Key capability — Agent sourcing:**
When an agent answers a question using video-derived knowledge, it can cite the source: "Based on [video title] at [timestamp] — [Watch here]". This requires:
- Facts in `gl_product_facts` that reference a `video_url` + `start_time` in `source_url`
- Agent prompt template includes: "When citing video sources, include the YouTube link with timestamp"

### 4. Image Management

**Linking images to products:**
- Upload or link existing images
- Assign to product
- Tag: product_photo | before_after | device_photo | logo | educational | marketing

**Image viewer:**
- Use existing Mid-Stream media viewer
- Grid view with lightbox
- B&A pairs shown side-by-side when tagged as before_after

---

## Database Schema

### New table: `gl_product_documents`

```sql
CREATE TABLE gl_product_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES gl_products(id),
  
  -- Document identity
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT DEFAULT 'pdf',
  file_size_bytes INTEGER,
  
  -- Classification
  category TEXT NOT NULL,  -- prescribing_information, clinical_study, user_guide, patient_brochure, safety, marketing, training
  
  -- Storage
  storage_path TEXT,       -- Supabase Storage path or local file reference
  external_url TEXT,       -- External URL if hosted elsewhere
  
  -- Source
  manufacturer TEXT,
  source TEXT,             -- healthvu, scraped_data, manual_upload, manufacturer_website
  
  -- Metadata
  page_count INTEGER,
  is_vectorized BOOLEAN DEFAULT FALSE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT
);
```

### New table: `gl_product_videos`

```sql
CREATE TABLE gl_product_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES gl_products(id),
  
  -- Video identity
  video_id TEXT NOT NULL,          -- YouTube video ID
  video_url TEXT NOT NULL,         -- Full YouTube URL
  title TEXT NOT NULL,
  channel_name TEXT,
  duration_seconds INTEGER,
  
  -- Transcript
  transcript_available BOOLEAN DEFAULT FALSE,
  chunk_count INTEGER,             -- Number of chunks in manufacturer_youtube_transcript
  
  -- Classification  
  category TEXT,                   -- clinical_demo, injection_technique, product_education, patient_testimonial, marketing, training
  
  -- Source
  cms_project_id TEXT DEFAULT 'gjqicqldjgvrwmtkliie',  -- Which Supabase project has the transcript chunks
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  linked_by TEXT
);
```

### New table: `gl_product_images`

```sql
CREATE TABLE gl_product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES gl_products(id),
  
  -- Image identity
  filename TEXT NOT NULL,
  storage_path TEXT,
  external_url TEXT,
  
  -- Classification
  image_type TEXT,  -- product_photo, before_after, device_photo, logo, educational, marketing
  
  -- Before/After specific
  ba_pair_id UUID,          -- Links before + after images together
  ba_position TEXT,         -- before | after
  ba_treatment_area TEXT,   -- forehead, nasolabial, etc.
  
  -- Metadata
  width INTEGER,
  height INTEGER,
  file_size_bytes INTEGER,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT
);
```

---

## Data Population Strategy

### Phase 1: Auto-populate from existing data

**Documents:**
1. Import the 260 deduped PDFs from `pdf_review.csv` (42 already product-matched)
2. Import HealthVU PDFs matched by folder structure (Allergan/Botox/*.pdf → BOTOX product)
3. Admin reviews and confirms matches in the CMS

**Videos:**
1. Query `manufacturer_youtube_transcript` for distinct videos
2. Auto-match to products by searching video titles against `gl_products.name`
3. Admin reviews and confirms matches

**Images:**
1. Import from `a360-scraped-data` image inventory (1,351 unique images already mapped by manufacturer)
2. Auto-match to products by directory path
3. Admin tags image types

### Phase 2: Agent integration

Once content is linked to products:
- Add `source_url` references in `gl_product_facts` pointing to specific PDFs, video timestamps, or images
- Agents cite sources in responses: "According to the BOTOX prescribing information..." with a link
- Video search: agent can say "For a demonstration of this technique, see [video title] at [timestamp]"

---

## API Endpoints

```
# Documents
GET    /api/gl/products/:id/documents          — List documents for a product
POST   /api/gl/products/:id/documents          — Link/upload a document
DELETE /api/gl/products/:id/documents/:docId   — Unlink a document
PATCH  /api/gl/products/:id/documents/:docId   — Update category/metadata

# Videos  
GET    /api/gl/products/:id/videos             — List videos for a product
POST   /api/gl/products/:id/videos             — Link a video
DELETE /api/gl/products/:id/videos/:vidId      — Unlink a video
GET    /api/gl/videos/search?q=...             — Semantic search across video transcripts (queries embeddings in CMS project)

# Images
GET    /api/gl/products/:id/images             — List images for a product
POST   /api/gl/products/:id/images             — Link/upload an image
DELETE /api/gl/products/:id/images/:imgId      — Unlink an image
```

---

## Connection to Agent Grounding

This CMS directly enhances the grounded facts architecture:

1. **Facts can cite documents**: `gl_product_facts.source_url` → links to a specific PDF in `gl_product_documents`
2. **Facts can cite video timestamps**: `gl_product_facts.source_url` → `https://youtube.com/watch?v=xxx&t=120`
3. **Agents include source links in responses**: When an agent uses a fact derived from a PI document or video, it includes the link so the user can verify
4. **Search-grounded answers**: User asks a clinical question → semantic search finds relevant video segment → agent answers with citation and timestamp link

This turns the GL from a static database into a **source-linked knowledge system** where every claim an agent makes can be traced back to a manufacturer document, clinical video, or published study.
