-- RakshaNet: Passkey (WebAuthn) authentication schema
-- Replaces SMS / OTP login. No passwords, no SMS OTPs, and NO biometric
-- data (fingerprint/face) is ever stored here. Only public WebAuthn credential material.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- One row per RakshaNet account. The phone number is the unique account identifier.
create table if not exists rakshanet_users (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  created_at timestamptz not null default now()
);

-- One row per registered passkey. A user can have multiple authenticators (e.g. phone + laptop).
create table if not exists webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references rakshanet_users(id) on delete cascade,
  credential_id text unique not null,      -- base64url credential ID
  public_key text not null,                -- base64-encoded COSE public key. NEVER a private key.
  counter bigint not null default 0,       -- signature counter, used to detect cloned authenticators
  transports jsonb,                        -- e.g. ["internal"], ["usb","nfc"]
  device_type text,                        -- "singleDevice" | "multiDevice"
  backed_up boolean default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- Short-lived WebAuthn challenges. One in-flight challenge per phone number per purpose.
create table if not exists webauthn_challenges (
  phone text not null,
  purpose text not null check (purpose in ('registration', 'authentication')),
  challenge text not null,
  created_at timestamptz not null default now(),
  primary key (phone, purpose)
);

-- Authenticated sessions created after successful WebAuthn verification
create table if not exists rakshanet_sessions (
  token text primary key,
  user_id uuid not null references rakshanet_users(id) on delete cascade,
  phone text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists rakshanet_users_phone_idx on rakshanet_users (phone);
create index if not exists webauthn_credentials_user_id_idx on webauthn_credentials (user_id);
create index if not exists webauthn_credentials_credential_id_idx on webauthn_credentials (credential_id);
create index if not exists rakshanet_sessions_user_id_idx on rakshanet_sessions (user_id);
create index if not exists rakshanet_sessions_phone_idx on rakshanet_sessions (phone);

-- Lock every table down completely. All access happens through the Edge Functions
-- using the service_role key, which bypasses RLS.
alter table rakshanet_users enable row level security;
alter table webauthn_credentials enable row level security;
alter table webauthn_challenges enable row level security;
alter table rakshanet_sessions enable row level security;

