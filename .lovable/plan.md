## Root cause

The Phone tab calls `supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } })`. With `shouldCreateUser: false`, Supabase only sends an OTP to phone numbers that already exist in the users table. Since no users have registered by phone yet, every attempt fails with:

```
{ "code": "otp_disabled", "message": "Signups not allowed for otp" }
```

(This is not actually a backend toggle — it's the response Supabase gives when the SDK explicitly forbids user creation and no matching user exists.)

## Fix

In `src/routes/auth.tsx`, change the phone OTP send call to `shouldCreateUser: true` so a phone-only user is created on first verify. After this single one-line change, the Phone tab will:
1. Send the 6-digit SMS via Twilio
2. Verify the code
3. Create the account (if new) and sign the user in

No other file or config change is needed.

## Verify

Reload `/auth`, switch to Phone, enter a Twilio-verified number, and confirm the SMS arrives and login completes.
