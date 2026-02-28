# Cortex

## Overview

Cortex is a graph-powered unified digital brain designed to help users manage, organise, and make sense of their scattered digital presence across apps, files, tools, and platforms.

It is built on top of a powerful local-first AI assistant foundation and extended with a real-time knowledge graph layer that unifies everything into a project-centric intelligence system.

Instead of jumping between disconnected tools, Cortex creates a single Project Neural Graph that understands relationships between projects, tasks, people, topics, decisions, deadlines, documents, commits, emails, bookmarks, and AI interactions.

---

# Foundation: Local-First Unified Data Engine

Cortex is built on a robust local-first AI system that provides:

- Self-hosted deployment
- REST-based API (OpenAPI 3.1 compliant)
- Predictable resource-oriented design
- API key authentication
- Bearer token authentication
- Session authentication (web UI)
- Standard HTTP status handling (200, 201, 400, 401, 403, 500)

Base URL:
http://localhost:3001

---

# Core Capabilities (Inherited + Extended)

## 1. Universal Content System

Endpoint: `/api/all`

### Features:
- Global search across all content types
- Text-based search
- Tag filtering
- Date range filtering
- Due status filtering (all, due_now, overdue, due_today)
- Pagination (limit up to 9999, offset support)
- Mixed-type result aggregation
- Automatic content type detection
- Multipart upload support
- Metadata injection during upload
- Unified ingestion pipeline

This powers Cortex's global search and ingestion engine.

---

## 2. Tasks Management

- Create tasks
- Retrieve tasks
- Update tasks (PUT)
- Partial update (PATCH)
- Delete tasks
- Review toggle
- Flag toggle
- Pin/unpin
- Assistant status control
- Execution tracking

### Task Collaboration
- Create task comments
- Retrieve task comments
- Update comments
- Delete comments

---

## 3. Bookmark Management

- Create bookmark
- Retrieve bookmarks
- Update bookmark
- Delete bookmark
- Review
- Flag
- Pin
- Bulk import

### Bookmark Assets

- Favicon
- Screenshot (normal)
- Screenshot (mobile)
- Screenshot (full page)
- Thumbnail
- PDF version
- Reader-mode cleaned version
- Raw archived content
- Extracted Markdown
- Extracted Text
- Full content access
- Readme-style output

---

## 4. Document Management

- Upload document
- Retrieve documents
- Update document
- Delete document
- Review
- Flag
- Pin

### Document Assets

- Original file retrieval
- Thumbnail
- Screenshot
- PDF version
- Parsed content
- Extracted Markdown
- Extracted Text

---

## 5. Photo Management

- Upload photo
- Retrieve photos
- Update photo
- Delete photo
- Review
- Flag
- Pin

### Photo Assets

- Image view
- Thumbnail
- AI analysis metadata
- Extracted content

---

## 6. Notes System

- Create note
- Upload note
- Retrieve note
- Update note
- Delete note
- Review
- Flag
- Pin

---

## 7. AI System

### Prompting

- Send AI prompt
- Stream AI responses
- AI text response logging
- AI image response logging
- AI error tracking

### AI Conversations

- Create conversation
- Retrieve conversations
- Update conversation
- Delete conversation
- Persist conversation history

### AI Model Configuration

- Retrieve active model configuration
- View provider
- View short and full model names
- View model URL
- Capability detection:
  - Streaming support
  - Thinking mode configuration
  - Control toggles
- Model enable/disable state

---

## 8. History & Audit System

Endpoint: `/api/history`

### Filtering:

- By action:
  - create
  - update
  - delete
  - api_call
  - ai_prompt_text_response
  - ai_prompt_image_response
  - ai_prompt_error
  - api_content_upload
  - api_error_general

- By item type:
  - task
  - note
  - bookmark
  - document
  - photo
  - api
  - prompt
  - api_error
  - content_submission

- By actor:
  - user
  - assistant
  - system

- By date range
- Pagination support

### Audit Features:

- Before/after state tracking
- Timestamp logging
- Access control enforcement
- Activity feed capability
- Debugging support

---

## 9. User Management

- Retrieve user profile
- Update user profile
- Delete all user data
- Dashboard statistics
- Retrieve user by ID

---

## 10. Dashboard & Analytics

- Dashboard statistics endpoint
- Aggregated system stats
- User-level metrics

---

## 11. Job Processing & Background Workers

- Task execution tracking
- Processing status summary
- Active job monitoring
- Per-asset processing status
- Retry failed jobs
- Update processing states

These enable:

- OCR pipelines
- Extraction pipelines
- Screenshot generation
- Asset enrichment workflows

---

# Content Enrichment Capabilities

- Automatic MIME detection
- Content classification
- OCR support
- Web archiving
- Text extraction (Markdown + TXT)
- Screenshot generation
- Thumbnail generation
- AI-based photo analysis
- Processing status tracking

---

# Cortex Extension Layer: Project Neural Graph

On top of this complete data engine, Cortex adds a knowledge graph layer.

## Graph Node Types

- Project
- Task
- Topic
- Person
- Decision
- Deadline
- Document
- Commit
- Email
- Bookmark
- AI Interaction
- Conversation

## Graph Edge Types

- belongs_to
- mentions
- references
- decided_by
- updated_by
- depends_on
- related_to
- occurred_at
- assigned_to
- attached_to
- discussed_in
- generated_by

---

# Cortex Advanced Features

## 1. Unified Project View

Query example:
"Show me everything related to Edge AI Hackathon across tools."

Returns:

- Tasks
- Notes
- Documents
- Bookmarks
- Emails
- Decisions
- Deadlines
- AI conversations
- Extracted content

All in a single contextual interface.

---

## 2. Timeline Mode

Reconstructs:

- Commits
- Document edits
- Task updates
- AI prompts
- Conversation activity
- Deadline changes
- Asset processing events

Provides full project evolution history.

---

## 3. Weekly Graph Diff Digest

Compares graph state over time:

- New nodes added
- New edges created
- Updated tasks
- New dependencies
- AI interactions triggered
- Deadlines modified

Outputs intelligent summaries such as:

"This week: 3 new tasks, 2 new decisions, 1 deadline moved."

---

## 4. Graph-Aware AI Agents

Agents combine:

- Semantic search
- Keyword ranking
- Structural graph traversal
- Contextual reasoning

Example queries:

- "What decisions are blocking deployment?"
- "Which tasks involve both John and the ML pipeline?"
- "What changed since last sprint?"
- "Summarise all documents related to Project X."

---

# High-Level Summary

Cortex integrates:

- Unified ingestion
- Full CRUD across all content types
- Rich asset extraction
- AI-powered querying
- Conversation persistence
- Activity auditing
- Background processing pipelines
- Dashboard analytics
- Hybrid semantic + structural reasoning
- Graph-based contextual intelligence

Cortex transforms fragmented digital systems into a structured, intelligent Project Neural Graph.
