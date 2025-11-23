# Microsoft Teams Integration for SprintJam

This guide explains how to integrate SprintJam with Microsoft Teams, allowing your team to run planning poker sessions directly within Teams channels and chats.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Setup Guide](#setup-guide)
  - [1. Register Azure AD Application](#1-register-azure-ad-application)
  - [2. Configure Manifest](#2-configure-manifest)
  - [3. Package the App](#3-package-the-app)
  - [4. Install in Teams](#4-install-in-teams)
- [User Guide](#user-guide)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

## ✨ Features

The Teams integration provides:

- **Channel Tabs**: Add SprintJam as a tab in any Teams channel
- **Personal App**: Access SprintJam from your personal Teams apps
- **Auto-Identity**: Automatically use your Teams display name
- **Theme Sync**: Matches Teams light/dark theme automatically
- **Direct Embedding**: Full SprintJam functionality within Teams
- **Real-time Collaboration**: All planning poker features work in Teams
- **Channel Context**: Rooms can be linked to specific Teams channels

## 🔧 Prerequisites

Before starting, ensure you have:

1. **Azure AD Access**: Ability to register applications in Azure AD
2. **Teams Admin Rights**: Permission to upload custom apps (or access to Teams Admin Center)
3. **Deployment**: SprintJam deployed and accessible via HTTPS
4. **Domain**: Your SprintJam instance should be running on a valid domain

## 📖 Setup Guide

### 1. Register Azure AD Application

#### Step 1.1: Create App Registration

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: `SprintJam Teams App`
   - **Supported account types**:
     - Select "Accounts in any organizational directory (Any Azure AD directory - Multitenant)"
   - **Redirect URI**: Leave blank (we'll add this later)
5. Click **Register**
6. **Important**: Copy the **Application (client) ID** - you'll need this

#### Step 1.2: Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph** → **Delegated permissions**
4. Add these permissions:
   - `User.Read` - Read user profile
   - `email` - View user email address
   - `openid` - Sign users in
   - `profile` - View users' basic profile
5. Click **Add permissions**
6. (Optional) Click **Grant admin consent** if you have admin rights

#### Step 1.3: Expose an API

1. Go to **Expose an API**
2. Click **Set** next to "Application ID URI"
3. Set it to: `api://sprintjam.co.uk/{YOUR_APPLICATION_ID}`
   - Replace `sprintjam.co.uk` with your domain
   - Replace `{YOUR_APPLICATION_ID}` with your Application (client) ID
4. Click **Save**
5. Click **Add a scope**:
   - **Scope name**: `access_as_user`
   - **Who can consent**: Admins and users
   - **Admin consent display name**: `Access SprintJam as the user`
   - **Admin consent description**: `Allows Teams to call SprintJam on behalf of the user`
   - **User consent display name**: `Access SprintJam`
   - **User consent description**: `Allows SprintJam to access your Teams profile`
   - **State**: Enabled
6. Click **Add scope**

#### Step 1.4: Add Redirect URIs (Optional - for future SSO)

1. Go to **Authentication**
2. Click **Add a platform** → **Web**
3. Add redirect URI: `https://sprintjam.co.uk/auth/teams/callback`
4. Enable **ID tokens** and **Access tokens**
5. Click **Configure**

### 2. Configure Manifest

#### Step 2.1: Generate App ID

1. Visit [guidgenerator.com](https://www.guidgenerator.com) or use:
   ```bash
   uuidgen  # On macOS/Linux
   # Or use PowerShell on Windows:
   [guid]::NewGuid()
   ```
2. Copy the generated GUID

#### Step 2.2: Update Manifest File

1. Open `teams/manifest/manifest.json`
2. Replace the following placeholders:
   - `YOUR_APP_ID_HERE` → Your generated GUID from Step 2.1
   - `YOUR_AAD_APP_ID_HERE` (appears twice) → Your Azure AD Application ID from Step 1.1
3. If using a custom domain, update all instances of `sprintjam.co.uk` with your domain

Example:
```json
{
  "id": "a1b2c3d4-e5f6-7890-a1b2-c3d4e5f67890",
  ...
  "webApplicationInfo": {
    "id": "12345678-1234-1234-1234-123456789abc",
    "resource": "api://yourdomain.com/12345678-1234-1234-1234-123456789abc"
  }
}
```

### 3. Package the App

#### Step 3.1: Create App Icons

Create two icons in the `teams/manifest/icons/` directory:

**Color Icon** (`color-icon.png`):
- Size: 192x192 pixels
- Format: PNG with transparency
- Design: Full-color version of your SprintJam logo
- Recommendation: Use SprintJam's blue (#3B82F6) as primary color
- Should be recognizable and clear at small sizes

**Outline Icon** (`outline-icon.png`):
- Size: 32x32 pixels
- Format: PNG with transparency
- Design: White outline/monochrome version
- Background: Transparent
- Should work well on dark backgrounds

Icon tips:
- Keep designs simple and recognizable
- Use high contrast for visibility
- Consider using poker card or estimation symbols
- Test on both light and dark Teams themes

#### Step 3.2: Package as ZIP

Navigate to the manifest directory and create a ZIP file:

```bash
cd teams/manifest
zip -r sprintjam-teams.zip manifest.json icons/color-icon.png icons/outline-icon.png

# Verify the contents
unzip -l sprintjam-teams.zip
```

Expected output:
```
Archive:  sprintjam-teams.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
     3456  2025-01-15 10:30   manifest.json
    25678  2025-01-15 10:25   icons/color-icon.png
     1234  2025-01-15 10:25   icons/outline-icon.png
---------                     -------
    30368                     3 files
```

### 4. Install in Teams

You have three installation options:

#### Option A: Developer/Testing Install (Sideloading)

**Requirements**: Sideloading must be enabled for your organization

1. Open Microsoft Teams
2. Click **Apps** in the left sidebar
3. Click **Manage your apps** (bottom left)
4. Click **Upload an app** → **Upload a custom app**
5. Select your `sprintjam-teams.zip` file
6. Click **Add** to install personally, or **Add to a team** to install in a specific team

**Enable Sideloading** (if needed):
1. Go to [Teams Admin Center](https://admin.teams.microsoft.com)
2. Navigate to **Teams apps** → **Setup policies**
3. Select your policy
4. Enable **Upload custom apps**
5. Save changes

#### Option B: Organization-Wide Upload (Internal Distribution)

**Requirements**: Teams Admin Center access

1. Go to [Teams Admin Center](https://admin.teams.microsoft.com)
2. Navigate to **Teams apps** → **Manage apps**
3. Click **Upload new app** (top right)
4. Upload `sprintjam-teams.zip`
5. Click **Upload** to make it available organization-wide
6. (Optional) Configure app permission policies to control who can install

#### Option C: Microsoft AppSource (Public Distribution)

For public distribution to all Teams users:

1. Create a [Microsoft Partner Center account](https://partner.microsoft.com)
2. Follow the [Teams app submission guide](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/publish)
3. Prepare additional materials:
   - Privacy policy URL
   - Terms of service URL
   - Support documentation
   - Screenshots and promotional images
   - App description and metadata
4. Submit for validation
5. Wait for Microsoft approval (typically 1-2 weeks)

## 👥 User Guide

### Adding SprintJam to a Channel

1. Open a Teams channel
2. Click the **+** icon at the top of the channel
3. Search for "SprintJam"
4. Click **SprintJam** from the results
5. Choose:
   - **Create New Room**: Start a fresh planning session
   - **Join Existing Room**: Connect to an existing room using a room key
6. Click **Save**

The SprintJam tab will appear in your channel tabs.

### Using the Personal App

1. Click **Apps** in Teams sidebar
2. Search for "SprintJam"
3. Click to open
4. Use the home screen to:
   - Create a new room
   - Join an existing room

### Features in Teams

All standard SprintJam features work in Teams:

✅ **Real-time Voting**: Live updates as team members vote
✅ **Smart Judge**: AI-powered consensus recommendations
✅ **Structured Voting**: Multi-criteria estimation
✅ **Ticket Queue**: Batch estimate multiple items
✅ **Jira/Linear Integration**: Auto-update story points
✅ **Anonymous Voting**: Optional vote hiding
✅ **Custom Scales**: Configure voting options

### Auto-Identity

When you open SprintJam in Teams:
- Your Teams display name is automatically used
- You don't need to manually enter your name
- Profile information syncs from Teams

### Theme Synchronization

SprintJam automatically matches your Teams theme:
- **Light mode**: Clean, bright interface
- **Dark mode**: Eye-friendly dark theme
- **High contrast**: Accessibility-focused theme
- Changes sync automatically when you switch themes in Teams

## 🏗️ Architecture

### Components

The Teams integration consists of:

1. **Tab Configuration Page** (`/teams/config`)
   - Shown when adding SprintJam to a channel
   - Allows room creation or joining
   - Captures Teams channel metadata

2. **Personal Home Page** (`/teams/home`)
   - Entry point for personal app
   - Quick access to create/join rooms
   - Features overview

3. **Room View** (`/teams/room`)
   - Main planning poker interface
   - Auto-configures from Teams context
   - Links room to Teams channel

4. **Teams Context Hook** (`useTeamsContext`)
   - Detects Teams environment
   - Extracts user identity
   - Monitors theme changes
   - Provides channel/team metadata

### Data Flow

```
Teams App Launch
    ↓
Teams SDK Initialization
    ↓
Extract Context (user, team, channel, theme)
    ↓
Auto-configure Room
    ↓
Connect to Durable Object via WebSocket
    ↓
Real-time Synchronization
```

### Security

- User identity validated through Teams authentication
- No passwords required (Teams SSO)
- All communication over HTTPS/WSS
- Durable Objects provide isolation between rooms
- Optional passcodes for additional security

## 🔍 Troubleshooting

### "Invalid manifest" Error

**Problem**: Teams rejects the manifest during upload

**Solutions**:
1. Validate JSON syntax using [jsonlint.com](https://jsonlint.com)
2. Ensure all required icons are present
3. Check that all URLs use HTTPS (not HTTP)
4. Verify App ID is a valid GUID
5. Confirm all placeholder values are replaced

### "Permission denied" Error

**Problem**: Cannot upload custom apps

**Solutions**:
1. Check if sideloading is enabled in Teams Admin Center
2. Verify you have correct permissions
3. Try installation as Teams admin
4. Ensure app permission policies allow custom apps

### Tab Doesn't Load

**Problem**: White screen or loading error when opening tab

**Solutions**:
1. Check browser console for errors (F12)
2. Verify domain is in `validDomains` in manifest
3. Ensure SprintJam is accessible over HTTPS
4. Check for CSP (Content Security Policy) restrictions
5. Verify Cloudflare Workers are deployed correctly

### Theme Not Syncing

**Problem**: SprintJam theme doesn't match Teams

**Solutions**:
1. Refresh the tab
2. Check browser console for Teams SDK errors
3. Ensure Teams JS SDK is loading correctly
4. Verify theme detection in `useTeamsContext` hook

### User Name Not Auto-Filling

**Problem**: Teams identity not detected

**Solutions**:
1. Ensure Azure AD app permissions are granted
2. Verify user consent was provided
3. Check Teams context in browser console
4. Confirm `useTeamsUsername` hook is working

### WebSocket Connection Fails

**Problem**: Real-time updates not working

**Solutions**:
1. Check firewall/proxy settings
2. Verify WebSocket connections are allowed
3. Ensure Durable Objects are properly configured
4. Check Cloudflare Workers logs

## ❓ FAQ

### Do users need separate accounts?

No, SprintJam uses your Teams identity automatically. No separate login or account creation required.

### Can we use existing rooms in Teams?

Yes, use the "Join Existing Room" option when configuring the tab and enter your room key.

### Does it work on mobile Teams?

Yes, the integration works on Teams mobile apps (iOS and Android). The responsive design adapts to mobile screens.

### Can we use Jira/Linear integration?

Yes, all Jira and Linear features work in the Teams integration. Configure OAuth in the room settings.

### Is data stored in Teams?

No, data is stored in SprintJam's Durable Objects (Cloudflare). Teams just provides the embedding and identity.

### Can we have multiple rooms per channel?

Yes, you can add multiple SprintJam tabs to a channel, each with a different room.

### What permissions does the app need?

The app requests:
- `User.Read` - To display your name
- `email` - For identity verification
- `openid` and `profile` - For authentication

### Is the integration free?

Yes, the Teams integration is free and open source like SprintJam itself.

### Can we self-host?

Yes, deploy SprintJam to your own Cloudflare account and follow this guide to set up Teams integration.

### Does it work with Microsoft 365 Government Cloud?

The integration may require additional configuration for government clouds. Contact your IT admin for guidance on custom app deployments.

## 📚 Additional Resources

- [SprintJam Documentation](https://github.com/yourusername/sprintjam)
- [Microsoft Teams Platform Docs](https://learn.microsoft.com/en-us/microsoftteams/platform/)
- [Teams App Manifest Reference](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Azure AD App Registration Guide](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)

## 🆘 Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review browser console logs
3. Check Cloudflare Workers logs
4. Search existing GitHub issues
5. Open a new issue with:
   - Detailed error description
   - Console logs
   - Steps to reproduce
   - Teams client version

## 🔄 Updating the App

To update your Teams app:

1. Make changes to manifest or code
2. Increment `version` in `manifest.json`
3. Re-package the ZIP file
4. In Teams Admin Center:
   - Navigate to **Manage apps**
   - Find SprintJam
   - Click **Update**
   - Upload new ZIP file
5. Users may need to refresh tabs to see changes

## 🎉 Next Steps

After successful installation:

1. Create a test room in a Teams channel
2. Invite team members to try it out
3. Explore Jira/Linear integration
4. Configure room settings for your workflow
5. Add SprintJam to your sprint planning channels
6. Share feedback and contribute to the project

Happy Planning! 🎯
