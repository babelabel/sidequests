# Resend email setup

Supabase's default email sender works for testing, but has tight limits (~3 emails per hour from the same IP) and goes to spam often. For 30 friends signing up, you need a real email service.

**Resend** is the easiest free option: 3,000 emails/month free, no credit card required.

---

## Step 1 — Sign up at Resend (3 min)

1. Go to **resend.com**
2. Sign up with the same email you've been using
3. Verify email
4. You land in the Resend dashboard

---

## Step 2 — Add a sender domain (optional but recommended)

You have two options:

### Option A — Use Resend's test domain (quick, less professional)

By default, Resend lets you send from `onboarding@resend.dev`. Emails work but show that address as the sender — looks slightly off. Fine for friends.

### Option B — Use a custom domain (better, more setup)

If you have any domain you own (e.g., `abel.dev`, `sidequest.fun`), you can send from `noreply@yourdomain.com`. Requires adding DNS records, takes ~10 min.

**For 30 friends I recommend Option A** — they know it's you, the from-address doesn't matter much.

---

## Step 3 — Get an API key from Resend

1. In Resend dashboard, left sidebar → **API Keys**
2. Click **"Create API Key"**
3. Name: `sidequest`
4. Permission: **Sending access** (or Full access — both work)
5. Click Create
6. **Copy the key immediately** — it starts with `re_...` and you can only see it once

---

## Step 4 — Configure Supabase to use Resend SMTP

1. Go to **supabase.com** → your sidequest project
2. Left sidebar → **Authentication** (or Project Settings → Authentication)
3. Find **Email** section → **SMTP Settings** (might be under "Emails" subsection)
4. Toggle ON **"Enable Custom SMTP"**
5. Fill in:
   - **Sender email**: `onboarding@resend.dev` (or your custom domain address)
   - **Sender name**: `Sidequest`
   - **Host**: `smtp.resend.com`
   - **Port**: `465`
   - **Username**: `resend` (literally the word "resend")
   - **Password**: paste your `re_...` API key from Resend
   - **Minimum interval between emails**: leave default (60s) or lower to 0 for testing

6. Click **Save**

---

## Step 5 — Test it

1. Open your sidequest URL in incognito
2. Enter a real email and request a magic link
3. The email should arrive within ~30 seconds, from `onboarding@resend.dev` (or your custom domain)
4. Click the link, confirm you can sign in

If you get an SMTP error in the Supabase logs:
- Verify the password is your full Resend API key (starting with `re_`), not your Resend account password
- Verify port is `465` (not 587)
- Verify the sender email matches what Resend allows (e.g., `onboarding@resend.dev` exactly)

---

## Step 6 — Monitor usage

In Resend dashboard, you'll see how many emails you've sent and your remaining quota.

For 30 friends, expected monthly usage:
- Initial sign-up: ~30 emails
- Re-logins / device switches: ~50 emails
- **Total: ~80-100 emails/month** — well under the 3,000 free limit

If you ever hit the limit, Resend's paid tier starts at $20/month for 50,000 emails. You'll never need that for a friend group.

---

## Customizing the email template (optional)

The default magic link email is plain. If you want it themed:

1. Supabase → Authentication → Email Templates → "Magic Link"
2. Click the **HTML** tab
3. Replace the body with something like:

```html
<div style="background: #0a0a0b; color: #fafaf9; padding: 40px; font-family: -apple-system, sans-serif; text-align: center;">
  <h1 style="font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: 48px; margin: 0;">
    sidequest
  </h1>
  <p style="color: #a1a1aa; margin: 20px 0;">Your sign-in link is ready.</p>
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #fbbf24, #f97316); color: #0a0a0b; padding: 16px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; margin: 20px 0;">
    Open Sidequest →
  </a>
  <p style="color: #71717a; font-size: 12px; margin-top: 40px;">
    If you didn't request this, ignore this email.
  </p>
</div>
```

4. Save.

The `{{ .ConfirmationURL }}` placeholder is what Supabase swaps for the real magic link.

---

## If something goes wrong

**SMTP test fails in Supabase**
- Most common: wrong password (paste the Resend API key, not your account password)
- Second most common: wrong port (use 465, not 25/587/2525)
- If both correct: try toggling "Use TLS" if there's an option

**Emails send but never arrive**
- Check spam folder
- Check Resend dashboard → Logs → see if the email was actually delivered
- If Resend shows "delivered" but recipient didn't get it, it's their spam filter — they need to whitelist `onboarding@resend.dev`

**Hit rate limit on Resend**
- Free tier: 100 emails/day, 3,000/month
- For 30 friends, this should never be an issue
- If you're hitting it during testing (re-sending to yourself a lot), wait 24 hours or upgrade

---

Once this is set up, your 30 friends can reliably receive sign-in emails. Without it, ~30% of them will hit the default Supabase rate limit or get marked as spam.
