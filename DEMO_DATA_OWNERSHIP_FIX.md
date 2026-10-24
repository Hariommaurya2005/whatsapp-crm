# Fix demo records not appearing in the logged-in user's Leads list

The dashboard was counting all leads for users with the `admin` role, while `/api/leads` is intentionally scoped to the logged-in user's own records. In addition, the demo dataset originally assigns sample records to the Meera Nair user ID. If you log in as another account, the dashboard count and list can disagree.

## Safe fix

1. Back up your database first.
2. Confirm `backend/.env` points to the intended database (`whatsapp-crm-improved`) and has `MONGO_URI` set.
3. Run from the `backend` folder in PowerShell, using the email of the account you actually log in with:

```powershell
$env:TARGET_USER_EMAIL="your-login-email@example.com"
node scripts/fixDemoDataOwner.js
```

The script changes only the known demo document ID ranges for leads, knowledge bases, meetings, reminders, and AI insights. It does not modify users or passwords. Chat messages reference the demo lead IDs.

4. Restart the backend (`Ctrl+C`, then `npm run dev`) and refresh the CRM.

The dashboard now uses the same per-user ownership scope as `/api/leads`, avoiding cross-user data visibility for admin accounts.
