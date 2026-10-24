# WhatsApp CRM v2.0

A full-stack lead management CRM with WhatsApp integration.

## Features
- 🔐 JWT Auth with password strength validation
- 👥 Lead management with status, priority, source, tags, deal value
- 🔍 Search + filter + pagination + bulk actions
- 🔔 Reminders with toggle-complete and overdue detection
- 📊 Dashboard with live stats, bar charts, overdue alerts
- 💬 WhatsApp chat integration
- 🛡️ Helmet security headers, rate limiting, role-based access

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env      # fill in MONGO_URI + JWT_SECRET
npm install
npm run dev               # starts on :5000
```

### Frontend
```bash
cd frontend
npm install
npm start                 # starts on :3000 (proxied to :5000)
```

## Validation Rules

### Auth
| Field | Rule |
|-------|------|
| name | 2–100 chars |
| email | valid format |
| password | min 8 chars, 1 uppercase, 1 lowercase, 1 number |

### Lead
| Field | Rule |
|-------|------|
| customerName | 2–150 chars, required |
| phone | 7–20 digits/symbols, required |
| email | valid format (optional) |
| value | non-negative number |
| notes | max 2000 chars |
| followUpDate | ISO 8601 |

### Reminder
| Field | Rule |
|-------|------|
| message | max 500 chars, required |
| reminderDate | must be future date |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | ❌ | Register |
| POST | /api/auth/login | ❌ | Login |
| GET | /api/auth/me | ✅ | Current user |
| PUT | /api/auth/change-password | ✅ | Change password |
| GET | /api/leads | ✅ | List leads (filter/search/page) |
| POST | /api/leads | ✅ | Create lead |
| GET | /api/leads/:id | ✅ | Get lead |
| PUT | /api/leads/:id | ✅ | Update lead |
| DELETE | /api/leads/:id | ✅ | Delete lead |
| PUT | /api/leads/bulk-status | ✅ | Bulk status update |
| GET | /api/reminders | ✅ | List reminders |
| POST | /api/reminders | ✅ | Create reminder |
| PUT | /api/reminders/:id | ✅ | Update reminder |
| DELETE | /api/reminders/:id | ✅ | Delete reminder |
| PATCH | /api/reminders/:id/toggle | ✅ | Toggle complete |
| GET | /api/dashboard/stats | ✅ | Dashboard stats |
