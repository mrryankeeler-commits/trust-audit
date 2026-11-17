# Trust Audit Landing Page

Premium Trust Audit landing page for Ryan Keeler.

## Local preview (no live writes)

From this directory, run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000/?preview=1#request.

Preview mode is automatic on localhost, 127.0.0.1, IPv6 loopback and file URLs.
`?preview=1` or the legacy `?test=1` also enables it. In preview mode:

- Requests are simulated in memory; nothing is posted to Apps Script or Google Sheets.
- Clarity is not loaded and analytics events stay in memory, including page-exit events.
- “Fill sample request” populates both steps for testing; “Clear form” resets the form.
- `window.trustAuditPreview.submissions` and `.events` expose the simulated data in browser developer tools. Reloading clears it.

Check required fields, accepted username/profile-link formats, unrelated URL rejection,
the missing-profile fallback, Back preserving every answer, the audit-only confirmation,
and Start again resetting every field on desktop and mobile.

The page describes a personalised review for founders selling B2B services, showing
what’s working, what the people they want to reach might miss and which changes
are most worth making based on their LinkedIn goals. It does not promise a video, a fixed post or recommendation count,
a delivery deadline or limited slots.

## Form and backend mapping

The form shows one of two steps at a time: Your details, then Your business and goals.
All valid non-spam requests use the same audit-only confirmation. Booking is removed
until a new link is supplied and its return is requested.
There is no automatic fit scoring or rejection. The hidden honeypot remains in place;
a filled honeypot silently skips saving the request.

The existing Google Apps Script URL and request payload keys/order are preserved:

| Form answer | Existing request key / Sheet column |
| --- | --- |
| Name | `name` |
| Email | `email` |
| Company / business name | `company_name` |
| Your role | `role` |
| LinkedIn profile link or username | `linkedin_url` (canonical HTTPS profile URL, or blank for fallback) |
| What do you sell, and who do you sell it to? | `offer_summary` |
| What would you like LinkedIn to help you with right now? | `commercial_focus` |
| How is LinkedIn working for you at the moment? | `linkedin_current_state` |
| Is there anything specific you’d like me to look at? | `specific_notes` |

Provide either a LinkedIn profile or company/business name; both can be supplied.
Company name is optional when a valid profile is provided. Role, current LinkedIn
situation and notes are always optional. The profile
field accepts a username, `@username`, `linkedin.com/in/username`, a `www` variant,
or a complete HTTP/HTTPS profile URL. Entries stay as typed in the form; only the
payload is normalised. Tracking query parameters and fragments are removed.

The LinkedIn help text explains that visitors can enter their business name above
if they cannot find their profile link or username. Both fields stay enabled;
there is no checkbox or toggle. A non-empty profile must be valid even if company
name is provided; visitors can correct it or clear it to use their business name.
Whitespace-only entries count as blank. If both are blank, Continue is blocked.

When the profile is blank and company name is supplied, the submission contains
a blank `linkedin_url` and prepends
“Profile not supplied — confirm by email” to `specific_notes`, preserving any notes
below it. This fallback is inferred from the two existing fields and adds no
payload key or Sheet column. No uploads or automatic profile lookup are involved.

Retired columns are sent as empty strings: `deal_size`, `current_gaps`, `readiness`, `fit_outcome`.
`record_type=request`, `timestamp` and `source=trust-audit-page` are unchanged.
Live analytics still use the existing Events payload and endpoint outside preview mode.

The Apps Script and Make.com configuration are not stored in this repo. They have not
been changed or tested against live services. The existing `no-cors` POST is retained;
it cannot confirm a row was saved from the browser's opaque response.

## Make.com notification filter to review

The previous README documented notifications for **strong-fit and medium-fit only**.
Any filter equivalent to `fit_outcome = strong_fit OR fit_outcome = medium_fit` will
block every new request because `fit_outcome` is now blank. Any conditions requiring
retired fields to be populated, a non-empty `linkedin_url`, or old values in
`commercial_focus`, `role` or `linkedin_current_state` would also exclude requests.
Configure the request-notification route to accept every
new Requests row, irrespective of fit or retired fields; if it receives mixed record
types, retain only `record_type = request`. This is a flag for review, not a verified
inspection of the live scenario. No live Sheet or Make.com changes were made.

## Live site

https://mrryankeeler-commits.github.io/trust-audit/

Do not expose API keys or private client data in this repo.
