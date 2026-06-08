# Task 4 - Backend API Routes for Cold Mail Sender

## Summary
Built all 9 backend API routes for the Cold Mail Sender application using Next.js 16 App Router format.

## API Routes Created

### 1. `/api/config` (GET + POST)
- GET: Returns AppConfig, creates default if not exists
- POST: Upserts AppConfig with request body fields

### 2. `/api/hr-list` (GET + POST)
- GET: Returns all HR contacts ordered by createdAt desc
- POST: Creates a new HR contact with name, email, title, company

### 3. `/api/hr-list/[id]` (DELETE)
- DELETE: Deletes an HR contact by id, returns 404 if not found

### 4. `/api/hr-list/upload` (POST)
- Accepts multipart form data with CSV file
- Parses CSV using papaparse (case-insensitive headers)
- Skips rows with existing emails
- Returns count of contacts added

### 5. `/api/generate-email` (POST)
- Uses z-ai-web-dev-sdk LLM to generate personalized cold email
- Updates status to "generating" during generation
- Parses LLM response with robust JSON extraction (handles markdown code blocks)
- Updates HR contact with generated subject/body on success
- Resets to "pending" on failure

### 6. `/api/send-email` (POST)
- Uses Nodemailer with Gmail SMTP
- Attaches resume.pdf if it exists in /public
- Updates HR contact status to "sent" with messageId on success
- Updates to "failed" with error message on failure

### 7. `/api/reset-status` (POST)
- Resets HR contact status to "pending"
- Clears subject, body, sentAt, error, messageId

### 8. `/api/resume-status` (GET)
- Checks if resume.pdf exists in /public
- Returns { exists, filename }

### 9. `/api/upload-resume` (POST)
- Accepts multipart form data with PDF file
- Validates file type is PDF
- Saves to /public/resume.pdf

## Testing Results
- All endpoints tested and working correctly
- Lint passes with no errors
- Database operations verified with curl tests
