## Plan

1. **Fix the active phone OTP path**
   - Update the phone submit handler in `src/routes/auth.tsx` so the first OTP request always allows account creation for phone login.
   - The resend helper already uses `shouldCreateUser: true`, but the initial submit handler still uses `mode === "signup"`, which is why the network request shows `create_user: false`.

2. **Keep the existing UI flow**
   - Do not change the auth screen design or verification flow.
   - Keep the Phone tab as a sign-in/create-account-by-SMS flow.

3. **Improve the error copy for this specific case**
   - Map `Signups not allowed for otp` / `otp_disabled` to a clearer phone setup message instead of showing “That code is invalid or expired.”

## Technical detail

Current live request:
```json
{"phone":"+971521080180","create_user":false,"channel":"sms"}
```

The code still has this in the main phone submit path:
```ts
options: { shouldCreateUser: mode === "signup" }
```

I will change it to:
```ts
options: { shouldCreateUser: true }
```

After this, the outgoing request should become `create_user: true`.