# Monochrome Tests

This directory contains all automated tests for the Monochrome application.

## Test Structure

```
test/
├── unit/               # Unit tests (fast, isolated)
│   └── server.test.js  # Original server unit tests
├── integration/        # Integration tests (slower, full stack)
│   └── server-integration.test.js  # Server-side download integration tests
└── README.md          # This file
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Only Unit Tests
```bash
npm run test:unit
```

### Run Only Integration Tests
```bash
npm run test:integration
```

### Run Specific Test File
```bash
node --test test/integration/server-integration.test.js
```

## Test Types

### Unit Tests (`test/unit/`)
- **Purpose**: Test individual functions and modules in isolation
- **Speed**: Fast (< 1 second)
- **Dependencies**: Minimal external dependencies
- **Examples**: 
  - Function logic tests
  - Module validation
  - Utility function tests

### Integration Tests (`test/integration/`)
- **Purpose**: Test complete workflows and API endpoints
- **Speed**: Slower (3-5 seconds)
- **Dependencies**: Requires server startup, file system access
- **Examples**:
  - API endpoint testing
  - Server-side download workflows
  - File creation and organization

## Test Requirements

### Before Running Tests
1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the application:
   ```bash
   npm run build
   ```

### Test Environment
- **Node.js**: v22+ (uses native test runner)
- **Test Framework**: Node.js native `node:test`
- **Assertions**: Node.js native `node:assert`

## Integration Test Details

### Server Integration Tests
- **File**: `test/integration/server-integration.test.js`
- **Tests**: 16 tests across 7 suites
- **Duration**: ~3.7 seconds
- **Port**: 3002 (test server)
- **Test Directory**: `test-music-integration/`

#### Test Coverage:
1. Health Check (1 test)
2. Blob Download (5 tests)
3. Lyrics Download (4 tests)
4. Special Characters (3 tests)
5. File Organization (1 test)
6. Error Handling (2 tests)

## Writing New Tests

### Unit Test Example
```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('My Function', () => {
    it('should do something', () => {
        const result = myFunction();
        assert.strictEqual(result, expectedValue);
    });
});
```

### Integration Test Example
```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

describe('My API', () => {
    before(async () => {
        // Setup (start server, create test data)
    });

    after(async () => {
        // Cleanup (stop server, remove test data)
    });

    it('should handle requests', async () => {
        const response = await fetch('http://localhost:3000/api/endpoint');
        assert.strictEqual(response.status, 200);
    });
});
```

## Test Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data in `after()` hooks
3. **Descriptive Names**: Test names should clearly describe what's being tested
4. **Fast**: Keep unit tests fast (< 100ms per test)
5. **No Side Effects**: Tests shouldn't affect production data

## Continuous Integration

Tests can be run in CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run Tests
  run: |
    npm ci
    npm run build
    npm test
```

## Test Data

Test files create temporary directories:
- Unit tests: `test-music/`
- Integration tests: `test-music-integration/`

These directories are automatically cleaned up after tests complete.

## Debugging Tests

### Verbose Output
```bash
node --test --test-reporter=spec test/integration/server-integration.test.js
```

### Run Single Test
```bash
node --test test/integration/server-integration.test.js --test-name-pattern="should save blob"
```

### Debug Mode
```bash
node --inspect-brk --test test/integration/server-integration.test.js
```

## Common Issues

### Tests Timing Out
- Check if server is already running on test port
- Increase timeout in `before()` hook
- Verify `dist/` directory exists

### Permission Errors
- Ensure test directories are writable
- Check file system permissions
- Run tests with appropriate user privileges

### Port Already in Use
- Change `TEST_PORT` in test file
- Kill existing server process: `pkill -f "node js/server.js"`

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass before committing
3. Add integration tests for new API endpoints
4. Update this README if adding new test types
