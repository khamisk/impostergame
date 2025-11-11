# Analytics System

This project includes a backend analytics system to track user visits and sessions.

## Setup

Set an admin token as an environment variable in Railway or your `.env` file:

```
ADMIN_TOKEN=your_secret_token_here
```

If no token is set, the default token is `default_admin_token_123` (change this in production!)

## Admin Endpoints

All endpoints require authentication via the `x-admin-token` header or `?token=` query parameter.

### 1. Get Analytics Summary

**GET** `/admin/analytics?token=YOUR_TOKEN`

Returns:
- Total visits
- Total sessions
- Unique visitors (by IP)
- Average session time
- Browser breakdown (Chrome, Firefox, Safari, Edge, Other)
- Platform breakdown (Mobile, Windows, Mac, Linux, Other)
- Active sessions count
- List of currently active sessions

Example:
```bash
curl "https://your-app.up.railway.app/admin/analytics?token=your_secret_token_here"
```

### 2. Get Recent Sessions

**GET** `/admin/analytics/sessions?token=YOUR_TOKEN&limit=100`

Returns detailed list of recent sessions with:
- Socket ID
- Start and end times
- Duration
- IP address
- User agent

Example:
```bash
curl "https://your-app.up.railway.app/admin/analytics/sessions?token=your_secret_token_here&limit=50"
```

### 3. Download Raw Analytics

**GET** `/admin/analytics/download?token=YOUR_TOKEN`

Downloads the complete `analytics.json` file.

Example:
```bash
curl "https://your-app.up.railway.app/admin/analytics/download?token=your_secret_token_here" -o analytics.json
```

### 4. Clear Analytics

**POST** `/admin/analytics/clear?token=YOUR_TOKEN`

Clears all analytics data (use with caution).

Example:
```bash
curl -X POST "https://your-app.up.railway.app/admin/analytics/clear?token=your_secret_token_here"
```

## Data Collected

For each session, the following data is tracked:
- **Socket ID**: Unique identifier for the connection
- **Start Time**: When the user connected
- **End Time**: When the user disconnected
- **Duration**: How long the session lasted
- **IP Address**: User's IP (handles proxies via x-forwarded-for)
- **User Agent**: Browser and platform information

## Privacy Notes

- Data is stored locally in `analytics.json` file
- IP addresses are collected for unique visitor counting
- No personal information beyond IP and user agent is stored
- The analytics file is excluded from git via `.gitignore`
- Consider implementing data retention policies for GDPR compliance

## Example Response

```json
{
  "totalVisits": 145,
  "totalSessions": 145,
  "uniqueVisitors": 87,
  "avgSessionTimeMs": 245000,
  "avgSessionTimeReadable": "4m 5s",
  "totalTimeMs": 35525000,
  "browsers": {
    "Chrome": 98,
    "Firefox": 24,
    "Safari": 18,
    "Edge": 5
  },
  "platforms": {
    "Mobile": 67,
    "Windows": 45,
    "Mac": 28,
    "Linux": 5
  },
  "activeSessions": [
    {
      "socketId": "abc123",
      "startTime": "2025-11-10T12:34:56.789Z",
      "duration": "45s",
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "activeCount": 1
}
```
