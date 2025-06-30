# QA³ Backend ML API Specification

## Overview
The ta-backend-ml service provides AI-powered test automation capabilities for the QA³ platform. It handles autonomous web testing, bug detection, and intelligent report generation.

## Architecture
- **Framework**: FastAPI (Python)
- **Test Automation**: Playwright
- **AI/ML**: OpenAI GPT-4, Computer Vision models
- **Container**: Docker
- **Port**: 8081

## API Endpoints

### 1. Test Execution

#### POST /api/v1/tests/execute
Starts an autonomous test session for a given project.

**Request Body:**
```json
{
  "project_id": "string",
  "test_config": {
    "url": "string",
    "mode": "omakase" | "scenario" | "hybrid",
    "max_duration": 3600,
    "browser": "chrome" | "firefox" | "safari",
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "auth": {
      "type": "basic" | "oauth" | "custom",
      "credentials": {}
    },
    "test_scenarios": [],
    "excluded_paths": [],
    "custom_rules": []
  },
  "integration_config": {
    "github_repo": "string",
    "slack_webhook": "string",
    "jira_config": {}
  }
}
```

**Response:**
```json
{
  "test_session_id": "string",
  "status": "started",
  "estimated_duration": 3600
}
```

### 2. Test Status

#### GET /api/v1/tests/{test_session_id}/status
Gets the current status of a test session.

**Response:**
```json
{
  "test_session_id": "string",
  "status": "running" | "completed" | "failed",
  "progress": 75,
  "discovered_bugs": 12,
  "pages_tested": 45,
  "scenarios_completed": 23,
  "current_action": "Testing checkout flow"
}
```

### 3. Bug Detection

#### POST /api/v1/analyze/bug
Analyzes a potential bug and generates detailed report.

**Request Body:**
```json
{
  "screenshot": "base64_string",
  "dom_snapshot": "string",
  "console_logs": [],
  "network_logs": [],
  "user_actions": [],
  "error_message": "string",
  "url": "string",
  "browser_info": {}
}
```

**Response:**
```json
{
  "bug_id": "string",
  "severity": "critical" | "high" | "medium" | "low",
  "type": "ui" | "functional" | "performance" | "security",
  "title": "string",
  "description": "string",
  "reproduction_steps": [],
  "affected_components": [],
  "suggested_fix": "string",
  "confidence_score": 0.95
}
```

### 4. Test Scenario Generation

#### POST /api/v1/scenarios/generate
Generates test scenarios based on application analysis.

**Request Body:**
```json
{
  "project_id": "string",
  "source_code_url": "string",
  "documentation_urls": [],
  "user_stories": [],
  "existing_tests": []
}
```

**Response:**
```json
{
  "scenarios": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "priority": "high" | "medium" | "low",
      "steps": [],
      "expected_results": [],
      "test_data": {}
    }
  ]
}
```

### 5. Visual Regression Testing

#### POST /api/v1/visual/compare
Compares screenshots for visual regression.

**Request Body:**
```json
{
  "baseline_screenshot": "base64_string",
  "current_screenshot": "base64_string",
  "threshold": 0.95,
  "ignore_regions": []
}
```

**Response:**
```json
{
  "match_percentage": 0.98,
  "differences": [],
  "diff_image": "base64_string",
  "regression_detected": false
}
```

### 6. Report Generation

#### POST /api/v1/reports/generate
Generates comprehensive test reports.

**Request Body:**
```json
{
  "test_session_id": "string",
  "format": "html" | "pdf" | "json",
  "include_screenshots": true,
  "language": "ja" | "en"
}
```

**Response:**
```json
{
  "report_id": "string",
  "download_url": "string",
  "summary": {
    "total_bugs": 15,
    "critical_bugs": 2,
    "test_coverage": 85,
    "recommendations": []
  }
}
```

### 7. AI Chat Interface

#### POST /api/v1/chat/query
Natural language interface for test queries.

**Request Body:**
```json
{
  "project_id": "string",
  "query": "string",
  "context": {
    "test_session_id": "string",
    "bug_ids": []
  }
}
```

**Response:**
```json
{
  "response": "string",
  "suggested_actions": [],
  "related_bugs": [],
  "confidence": 0.92
}
```

## ML Models and Capabilities

### 1. Page Understanding Model
- **Purpose**: Understands web page structure and functionality
- **Capabilities**:
  - Element detection and classification
  - Form field understanding
  - Navigation flow analysis
  - Content categorization

### 2. Bug Detection Model
- **Purpose**: Identifies various types of bugs
- **Capabilities**:
  - UI inconsistency detection
  - Broken functionality identification
  - Performance issue detection
  - Security vulnerability scanning

### 3. Test Scenario Generator
- **Purpose**: Creates comprehensive test scenarios
- **Capabilities**:
  - User flow generation
  - Edge case identification
  - Test data generation
  - Priority assessment

### 4. Natural Language Processor
- **Purpose**: Processes specifications and generates reports
- **Capabilities**:
  - Specification parsing
  - Report generation in multiple languages
  - Bug description generation
  - Root cause analysis

## Integration APIs

### GitHub Integration
- Automatic PR creation for bugs
- Source code analysis
- Test coverage mapping

### Slack Integration
- Real-time test notifications
- Bug alerts
- Daily summary reports

### Jira Integration
- Automatic ticket creation
- Status synchronization
- Priority mapping

## Performance Requirements

- Test execution: < 5s startup time
- Bug detection: < 2s per page
- Report generation: < 10s
- API response time: < 500ms (except long-running operations)
- Concurrent test sessions: Up to 100

## Security Considerations

- All API endpoints require authentication
- Test credentials are encrypted at rest
- Screenshots are stored temporarily and deleted after processing
- Network traffic is monitored for sensitive data leakage
- Compliance with SOC2 Type II requirements

## Error Handling

All endpoints return standardized error responses:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {},
    "request_id": "string"
  }
}
```

## Monitoring and Logging

- Structured logging with correlation IDs
- Performance metrics per endpoint
- ML model performance tracking
- Resource utilization monitoring
- Error rate tracking

## Development Guidelines

1. All endpoints must be versioned
2. Backward compatibility for at least 2 versions
3. Comprehensive API documentation with examples
4. Unit tests with >80% coverage
5. Integration tests for all major workflows
6. Performance benchmarks for ML operations