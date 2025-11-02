# Triad API Governance

## Overview
This document outlines the API governance principles and implementation details for the Triad architecture. It establishes standardized API patterns and authentication mechanisms across all Triad services.

## API Standards

### Health Check Endpoints
Each Triad service implements a standardized health check endpoint:

```
GET /api/ping
```

**Response Format:**
```json
{
  "message": "Server is alive",
  "service": "[SERVICE-NAME]",
  "timestamp": "ISO-8601 TIMESTAMP",
  "version": "1.0.0"
}
```

### Cross-Service Authentication
Services authenticate with each other using a shared JWT-based mechanism:

1. All services share the same `TRIAD_SECRET_KEY` environment variable
2. JWT tokens are generated with service-specific claims
3. Tokens are validated by the receiving service using the shared secret
4. Failed authentication results in 401 Unauthorized responses

## Service Registry

| Service | Base URL | API Version | Endpoints |
|---------|----------|-------------|-----------| 
| PaintBrain7 | https://paintbrain7.onrender.com | 1.0.0 | `/api/ping`, `/api/auth/*`, `/api/projects/*` |
| IDEA-HUB | https://idea-hub.onrender.com | 1.0.0 | `/api/ping`, `/idea`, `/export-to-google-docs` |
| Triad-Documents | https://triad-documents.onrender.com | 1.0.0 | `/api/ping` |

## Monitoring and Telemetry
The Triad architecture implements centralized monitoring through a telemetry collector script that:

1. Periodically polls all service health endpoints
2. Records response times and statuses
3. Logs results to a central location
4. Triggers alerts on service degradation or failure

## Governance Evolution
This API governance framework will evolve according to the principles outlined in the Triad Manifesto, with all changes requiring documentation updates and cross-service testing.

## Operational Status
Last Verification: **2025-10-27 03:43:28 UTC**
Status: **Active - Initial Implementation**

---

*This document is maintained as part of the Triad Governance Layer v1.0*
