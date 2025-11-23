# Microsoft Teams App Manifest

This directory contains the Teams app manifest for SprintJam.

## Setup Instructions

### 1. Register Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click "New registration"
3. Name: `SprintJam Teams App`
4. Supported account types: "Accounts in any organizational directory (Any Azure AD directory - Multitenant)"
5. Redirect URI: Leave blank for now
6. Click "Register"
7. **Copy the Application (client) ID** - this is your `YOUR_AAD_APP_ID_HERE`

### 2. Configure API Permissions

1. In your app registration, go to "API permissions"
2. Click "Add a permission" → "Microsoft Graph" → "Delegated permissions"
3. Add these permissions:
   - `User.Read` - Read user profile
   - `email` - View user email
   - `openid` - Sign in
   - `profile` - View user profile
4. Click "Add permissions"

### 3. Expose an API

1. Go to "Expose an API"
2. Click "Set" next to Application ID URI
3. Set it to: `api://sprintjam.co.uk/{YOUR_AAD_APP_ID}`
4. Click "Save"
5. Click "Add a scope"
   - Scope name: `access_as_user`
   - Who can consent: "Admins and users"
   - Admin consent display name: "Access SprintJam as the user"
   - Admin consent description: "Allows Teams to call SprintJam on behalf of the user"
   - User consent display name: "Access SprintJam"
   - User consent description: "Allows SprintJam to access your profile"
   - State: Enabled
6. Click "Add scope"

### 4. Update Manifest

1. Open `manifest.json`
2. Replace `YOUR_APP_ID_HERE` with a new GUID (generate at https://guidgenerator.com)
3. Replace both instances of `YOUR_AAD_APP_ID_HERE` with your Azure AD Application ID
4. If deploying to a custom domain, update all `sprintjam.co.uk` references

### 5. Create Icons

The manifest requires two icons:

- **color-icon.png**: 192x192px full-color icon
- **outline-icon.png**: 32x32px monochrome outline icon (transparent background)

Place both icons in the `teams/manifest/icons/` directory.

Icon guidelines:
- Color icon should use SprintJam's blue accent color (#3B82F6)
- Outline icon should be white/transparent for Teams dark theme
- Use simple, recognizable imagery (e.g., playing cards, poker chips, estimation symbols)

### 6. Package the App

Once configured, package the app:

```bash
cd teams/manifest
zip -r sprintjam-teams.zip manifest.json icons/
```

### 7. Upload to Teams

#### Option A: Developer Preview (Testing)

1. In Microsoft Teams, click Apps → "Upload a custom app"
2. Select `sprintjam-teams.zip`
3. Click "Add" to install for yourself or "Add to a team"

#### Option B: Organization Upload (Internal Distribution)

1. Go to [Teams Admin Center](https://admin.teams.microsoft.com)
2. Navigate to "Teams apps" → "Manage apps"
3. Click "Upload new app"
4. Upload `sprintjam-teams.zip`
5. Approve the app for your organization

#### Option C: AppSource (Public Distribution)

1. Create a Partner Center account
2. Follow [AppSource submission guidelines](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/publish)

## Environment Variables

Add these to your Cloudflare Workers environment:

```env
TEAMS_AAD_APP_ID=your-aad-app-id
TEAMS_AAD_CLIENT_SECRET=your-client-secret  # If using SSO
```

## Testing

After installation:

1. Open Teams
2. Go to a channel or chat
3. Click "+" to add a tab
4. Select "SprintJam"
5. Configure the room (create new or join existing)
6. Start planning poker in Teams!

## Troubleshooting

### "Invalid manifest" error
- Ensure all required icons are present
- Validate JSON syntax
- Check that all URLs use HTTPS

### "Permission denied" error
- Verify Azure AD app permissions are granted
- Check that admin consent is provided if required

### Tab doesn't load
- Verify `validDomains` includes your deployment domain
- Check browser console for CSP or CORS errors
- Ensure your app is served over HTTPS
