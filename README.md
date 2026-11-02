# PYQ Frequency Analyzer 📊

A full-stack, local-first web application designed for university students to analyze previous-year question papers (PYQs), track question repetition patterns across examination sessions, and generate subject-wise and module-wise frequency intelligence reports.

**100% Free & Local: Operates entirely without paid AI APIs, external LLM tokens, or cloud dependencies.**

---

## Key Features

1. **Subject & Module Management**:
   - Organize exams by subject (e.g., *Big Data Analytics*, *Deep Learning*, *Computer Networks*).
   - Divide syllabus into structured modules with custom ordering.

2. **Multi-Paper PDF Upload & Processing**:
   - Upload multiple PDF examination papers simultaneously.
   - Text-based PDF extraction via `pdf-parse`.
   - Automatic fallback to **Tesseract.js OCR** for scanned PDFs.
   - Preview extracted raw text and inspection modal.
   - Automatic calculation of **Total Available Papers** per subject.

3. **Dual Question Entry Modes**:
   - **Method A (PDF Auto-Extraction & Review)**:
     - Automatically parses question boundaries, strips boilerplate headers, and captures marks.
     - Interactive review modal to edit text, assign modules, and approve AI/similarity suggestions before saving.
   - **Method B (Manual Entry)**:
     - Enter question text, select module, and check off papers where it appeared.
     - Live duplicate warning alerts students in real-time as they type if a similar question already exists.

4. **Local Similarity & Repetition Deduplication**:
   - **Local NLP Similarity Engine**:
     - Stop-word filtering & question verb stripping (e.g. *explain, describe, write a note on*).
     - Token set overlap (Dice & Jaccard coefficients).
     - Character tri-gram similarity & Levenshtein edit distance.
   - **Human-in-the-Loop Verification**:
     - Questions are **never automatically merged** without confirmation.
     - Suggested matches display similarity percentage (e.g., *85% Match*) and shared key concepts.
     - **Approve & Merge**: Combines paper occurrences under one canonical question while preserving original phrasing from each source paper.
     - **Separate / Unmerge**: Ability to split any occurrence back into an independent question.

5. **Visual Frequency Report (Highest Priority)**:
   - Visual hierarchy: **Subject → Total PYQ Papers → Modules → Questions → Repetition Count**.
   - Displays repetition as both a fraction (`X/Y`, e.g., `6/8`) and a percentage (`75%`).
   - Sorted automatically in descending order of repetition count.
   - Expandable rows reveal all papers where the question appeared and original wording.
   - Search by keyword, filter by module, or view single-appearance questions.
   - **Export Options**: Export to **PDF** (custom formatted table), **Excel (.xlsx)**, **CSV**, or browser **Print**.

---

## Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React icons.
- **Backend**: Node.js, Express.js, TypeScript (`tsx`).
- **Database**: SQLite with Prisma ORM (modular and ready for PostgreSQL migration).
- **PDF & OCR**: `pdf-parse`, `tesseract.js`, `pdf-lib`.
- **Exporting**: `jspdf`, `jspdf-autotable`, `xlsx`.

---

## Getting Started

### Prerequisites

- Node.js (v18+ or v22+)
- npm (v9+)

### Installation

1. Clone or open the repository folder:
   ```bash
   cd "c:\PYQ analyzer"
   ```

2. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

3. Initialize the SQLite database and run Prisma push:
   ```bash
   npx prisma db push
   ```

4. Install client dependencies:
   ```bash
   cd ../client
   npm install
   ```

---

## Running the Application

### Option A: Concurrent Development (Both Frontend & Backend)

From the project root:
```bash
npm run dev
```

Or run them in separate terminals:

**Terminal 1 (Backend Server on Port 5000):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend Client on Port 3000):**
```bash
cd client
npm run dev
```

Open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## Seed Sample Data (Big Data Analytics Demo)

To immediately test the entire workflow with 8 previous-year PDF question papers and 5 modules:

1. Click **"Load Sample (8 Papers)"** in the top navigation bar of the application.
2. Alternatively, run via terminal:
   ```bash
   cd server
   npm run seed
   ```

This will:
- Create the subject **Big Data Analytics (18CS81)**.
- Generate 8 formatted university exam PDF files in `server/uploads/`.
- Create 5 modules (*Introduction to Big Data*, *Hadoop and MapReduce*, *NoSQL Databases*, *Data Analytics*, *Data Visualization*).
- Populate questions with repetition frequencies matching the specification (e.g. *7/8 papers = 88%*, *6/8 papers = 75%*).

---

## Database Schema (Prisma)

- `Subject`: Holds subject metadata (`name`, `subjectCode`, `description`).
- `Module`: Associated with a subject; ordered sequentially.
- `Paper`: Represents an uploaded PDF question paper (`paperName`, `year`, `uploadedFilePath`, `extractionStatus`, `rawExtractedText`).
- `Question`: Canonical question definition assigned to a module.
- `QuestionOccurrence`: Join entity connecting a question to a specific paper, storing `originalQuestionText`, `marks`, and `sourcePageNumber` with unique constraint `@@unique([questionId, paperId])`.

---

## Verification & Acceptance Criteria Checklist

- [x] Create a subject named Big Data Analytics.
- [x] Upload / seed 8 previous-year PDF papers.
- [x] Create 5 modules under the subject.
- [x] Extract questions from PDFs with editable review modal.
- [x] Assign questions to modules.
- [x] Suggest similar questions with local offline algorithms.
- [x] Calculate distinct paper repetition count (`6/8`) and percentage (`75%`).
- [x] Display final frequency report with most repeated questions first under every module.
- [x] Export report to PDF, Excel (.xlsx), and CSV.
- [x] Full data persistence in SQLite database across page refreshes.
