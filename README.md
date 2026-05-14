# Trust Audit Landing Page

Premium Trust Audit landing page for Ryan Keeler.

## Live Site

GitHub Pages live link:

https://mrryankeeler-commits.github.io/trust-audit/

## Test Mode

Use this URL to open the live page with the hidden test panel:

https://mrryankeeler-commits.github.io/trust-audit/?test=1

Use test mode for checking:
- form routing
- strong, medium, and poor fit outcomes
- Google Sheet submissions
- Make.com notifications
- analytics events, once enabled

## Backend

Form submissions go to Google Apps Script and are saved in the Trust Audit Requests Google Sheet.

Sheets:
- Requests: actual audit submissions
- Events: analytics events, once tracking is enabled

## Notification Flow

Strong-fit and medium-fit submissions are picked up by Make.com from the Requests sheet and sent as email notifications.

## Notes

Do not expose API keys or private client data in this repo.
