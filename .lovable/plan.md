## Issue

The Phone tab on `/auth` is now reaching Twilio successfully, but Supabase is rejecting the request with:

```
422: Signups not allowed for otp
```

This means phone provider is enabled, but **new user signups via phone are disabled** in auth settings. Only existing users with a phone number could sign in — brand new users cannot create an account.

## Fix

Update the auth configuration to allow phone signups by calling `supabase--configure_auth` with the phone signup option enabled.

That's the only change needed — the frontend code in `src/routes/auth.tsx` is already correct (sends OTP, verifies code). Once signups are allowed, entering a phone number on the Phone tab will:
1. Send a 6-digit SMS code via Twilio
2. Verify the code
3. Create the user account and sign them in

## Verify

After the config change, test the Phone tab in the preview with a real phone number (verified in your Twilio trial account) and confirm the SMS arrives and login completes.
