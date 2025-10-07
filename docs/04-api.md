# API Documentation

## Base URL
```
Production: https://api.fbads.tudominio.com
Development: http://localhost:4000
```

## Authentication

All endpoints except `/auth/login` and `/auth/register` require authentication via JWT token.

Include the token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

### Authentication

#### POST /api/auth/register
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "viewer"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "viewer",
    "account_ids": [1, 2]
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST /api/auth/logout
Logout and invalidate current session.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

#### GET /api/auth/me
Get current user information.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "viewer",
    "account_ids": [1, 2]
  }
}
```

### Metrics

#### GET /api/metrics/dashboard
Get dashboard metrics summary.

**Query Parameters:**
- `accountId` (required): Account ID to fetch metrics for
- `startDate` (optional): Start date in YYYY-MM-DD format (default: 30 days ago)
- `endDate` (optional): End date in YYYY-MM-DD format (default: today)

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "summary": {
    "total_campaigns": 10,
    "total_impressions": 1500000,
    "total_clicks": 15000,
    "total_spend": 5000.00,
    "total_conversions": 250,
    "total_revenue": 12500.00,
    "avg_ctr": 1.25,
    "avg_cpc": 0.33,
    "avg_roas": 2.5
  },
  "trend": [
    {
      "date": "2024-01-01",
      "impressions": 50000,
      "clicks": 500,
      "spend": 150.00,
      "conversions": 10,
      "revenue": 400.00,
      "ctr": 1.0,
      "cpc": 0.30,
      "roas": 2.67
    }
  ],
  "topCampaigns": [
    {
      "id": 1,
      "name": "Summer Sale Campaign",
      "status": "ACTIVE",
      "impressions": 100000,
      "clicks": 1200,
      "spend": 400.00,
      "conversions": 25,
      "revenue": 1200.00,
      "roas": 3.0
    }
  ],
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

#### GET /api/metrics/campaigns/:campaignId
Get detailed metrics for a specific campaign.

**Path Parameters:**
- `campaignId`: Campaign ID

**Query Parameters:**
- `startDate` (optional): Start date in YYYY-MM-DD format
- `endDate` (optional): End date in YYYY-MM-DD format

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "campaign": {
    "id": 1,
    "account_id": 1,
    "facebook_campaign_id": "123456",
    "name": "Summer Sale Campaign",
    "status": "ACTIVE",
    "objective": "CONVERSIONS",
    "daily_budget": 100.00,
    "account_name": "Demo Account"
  },
  "metrics": [
    {
      "date": "2024-01-01",
      "impressions": 5000,
      "clicks": 50,
      "spend": 15.00,
      "conversions": 2,
      "revenue": 80.00,
      "ctr": 1.0,
      "cpc": 0.30,
      "roas": 5.33
    }
  ],
  "adSets": [
    {
      "id": 1,
      "name": "Ad Set 1",
      "status": "ACTIVE",
      "impressions": 3000,
      "clicks": 30,
      "spend": 10.00,
      "roas": 4.0
    }
  ],
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

#### GET /api/metrics/hourly
Get hourly metrics for the last 24 hours.

**Query Parameters:**
- `accountId` (required): Account ID

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "hourlyMetrics": [
    {
      "datetime": "2024-01-31T23:00:00Z",
      "impressions": 1000,
      "clicks": 10,
      "spend": 3.50,
      "conversions": 1
    }
  ]
}
```

#### POST /api/metrics/compare
Compare multiple campaigns performance.

**Request Body:**
```json
{
  "campaignIds": [1, 2, 3],
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "campaigns": [
    {
      "id": 1,
      "name": "Campaign 1",
      "status": "ACTIVE",
      "impressions": 100000,
      "clicks": 1200,
      "spend": 400.00,
      "conversions": 25,
      "revenue": 1200.00,
      "ctr": 1.2,
      "cpc": 0.33,
      "roas": 3.0,
      "active_days": 30
    }
  ],
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

### Accounts

#### GET /api/accounts
Get all accounts accessible by the user.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "accounts": [
    {
      "id": 1,
      "facebook_account_id": "123456789",
      "name": "Demo Account 1",
      "currency": "USD",
      "timezone": "America/New_York",
      "status": "active"
    }
  ]
}
```

#### GET /api/accounts/:accountId
Get specific account details.

**Path Parameters:**
- `accountId`: Account ID

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Campaigns

#### GET /api/campaigns
Get all campaigns for an account.

**Query Parameters:**
- `accountId` (required): Account ID
- `status` (optional): Filter by status (ACTIVE, PAUSED)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### GET /api/campaigns/:campaignId
Get specific campaign details.

**Path Parameters:**
- `campaignId`: Campaign ID

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Alerts

#### GET /api/alerts
Get all alerts for an account.

**Query Parameters:**
- `accountId` (required): Account ID

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### POST /api/alerts
Create a new alert.

**Request Body:**
```json
{
  "accountId": 1,
  "name": "High CPC Alert",
  "type": "high_cpc",
  "conditions": {
    "threshold": 5.0
  },
  "notificationChannels": {
    "email": ["alert@example.com"]
  }
}
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### PUT /api/alerts/:alertId
Update an alert.

**Path Parameters:**
- `alertId`: Alert ID

**Request Body:**
```json
{
  "enabled": false,
  "conditions": {
    "threshold": 10.0
  }
}
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### DELETE /api/alerts/:alertId
Delete an alert.

**Path Parameters:**
- `alertId`: Alert ID

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Reports

#### GET /api/reports
Get all scheduled reports.

**Query Parameters:**
- `accountId` (required): Account ID

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### POST /api/reports/generate
Generate a report on demand.

**Request Body:**
```json
{
  "accountId": 1,
  "type": "campaign_performance",
  "format": "pdf",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "filters": {
    "campaigns": [1, 2, 3]
  }
}
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "reportId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "downloadUrl": null
}
```

#### GET /api/reports/:reportId/download
Download a generated report.

**Path Parameters:**
- `reportId`: Report ID

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "error": "Error message",
  "details": ["Additional error details"] // optional
}
```

### Common HTTP Status Codes:
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting

API endpoints are rate limited to 100 requests per 15 minutes per IP address.

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Webhook Events

For real-time updates, you can configure webhooks for the following events:

- `alert.triggered`: When an alert condition is met
- `report.completed`: When a report generation is complete
- `sync.completed`: When Facebook data sync is complete
- `sync.failed`: When Facebook data sync fails

Webhook payload example:
```json
{
  "event": "alert.triggered",
  "timestamp": "2024-01-31T12:00:00Z",
  "data": {
    "alertId": 1,
    "alertName": "High CPC Alert",
    "metricValue": 7.5,
    "threshold": 5.0
  }
}
```