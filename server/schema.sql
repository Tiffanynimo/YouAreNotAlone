-- YouAreNotAlone PostgreSQL Schema
-- BetterAuth tables (user, session, account, verification) are auto-created by BetterAuth migrate.
-- This file defines the application-specific tables.

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  survivor_id TEXT NOT NULL,
  user_email TEXT,
  user_name TEXT,
  professional_id TEXT,
  professional_type TEXT NOT NULL,
  counselor_name TEXT,
  date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Chat rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  participants JSONB NOT NULL DEFAULT '{}',
  participant_ids TEXT[] NOT NULL DEFAULT '{}',
  last_message TEXT DEFAULT '',
  last_message_time TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  chat_room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  sender_role TEXT,
  recipient_id TEXT,
  recipient_name TEXT,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_room ON messages(chat_room_id, created_at);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  appointment_id TEXT,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'appointment',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  user_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, created_at);

-- Case verifications
CREATE TABLE IF NOT EXISTS case_verifications (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  survivor_id TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  survivor_id TEXT,
  user_email TEXT,
  user_name TEXT,
  type TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);

-- Therapist notes
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  therapist_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_therapist ON notes(therapist_id);

-- Resources (managed by admin)
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  file_url TEXT,
  uploaded_by TEXT,
  uploaded_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flagged messages (content moderation)
CREATE TABLE IF NOT EXISTS flagged_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  user_email TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
