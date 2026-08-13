/**
 * Lightweight, zero-dependency Test Runner & Assertion Harness for E2E Test Suite
 * Provides describe, test, expect, and detailed summary reporting with strict sequential execution queue.
 */

export interface TestCaseResult {
  suiteName: string
  testName: string
  passed: boolean
  durationMs: number
  error?: string
}

export class TestSuiteRunner {
  private results: TestCaseResult[] = []
  private currentSuite = 'Default Suite'
  private executionQueue: Promise<void> = Promise.resolve()

  public setSuite(name: string): void {
    this.currentSuite = name
  }

  public enqueueTest(testName: string, testFn: () => Promise<void> | void): Promise<boolean> {
    const suite = this.currentSuite
    let passed = false

    this.executionQueue = this.executionQueue.then(async () => {
      this.currentSuite = suite
      const start = Date.now()
      try {
        await testFn()
        const duration = Date.now() - start
        this.results.push({
          suiteName: suite,
          testName,
          passed: true,
          durationMs: duration,
        })
        console.log(`  ✓ [PASS] ${testName} (${duration}ms)`)
        passed = true
      } catch (err) {
        const duration = Date.now() - start
        const errorMsg = err instanceof Error ? err.stack || err.message : String(err)
        this.results.push({
          suiteName: suite,
          testName,
          passed: false,
          durationMs: duration,
          error: errorMsg,
        })
        console.error(`  ✗ [FAIL] ${testName} (${duration}ms)`)
        console.error(`     Error: ${errorMsg}`)
        passed = false
      }
    })

    return this.executionQueue.then(() => passed)
  }

  public async waitAll(): Promise<void> {
    await this.executionQueue
  }

  public getResults(): TestCaseResult[] {
    return [...this.results]
  }

  public printSummary(): boolean {
    const total = this.results.length
    const passed = this.results.filter((r) => r.passed).length
    const failed = total - passed

    console.log('\n' + '='.repeat(70))
    console.log(` E2E TEST SUITE EXECUTION SUMMARY`)
    console.log('='.repeat(70))
    console.log(` Total Tests Executed : ${total}`)
    console.log(` Passed               : ${passed}`)
    console.log(` Failed               : ${failed}`)
    console.log(` Pass Rate            : ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`)
    console.log('='.repeat(70))

    if (failed > 0) {
      console.log('\nFAILED TESTS DETAILS:')
      this.results
        .filter((r) => !r.passed)
        .forEach((r, i) => {
          console.log(`\n${i + 1}) [${r.suiteName}] ${r.testName}`)
          console.log(`   ${r.error}`)
        })
    }

    return failed === 0
  }
}

export const runner = new TestSuiteRunner()

export async function describe(suiteName: string, fn: () => void | Promise<void>): Promise<void> {
  runner.setSuite(suiteName)
  console.log(`\n--- Suite: ${suiteName} ---`)
  await fn()
  await runner.waitAll()
}

export function test(testName: string, testFn: () => Promise<void> | void): Promise<boolean> {
  return runner.enqueueTest(testName, testFn)
}

export const it = test

export function expect<T>(actual: T) {
  return {
    toBe(expected: unknown): void {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`)
      }
    },
    toEqual(expected: unknown): void {
      const actStr = JSON.stringify(actual)
      const expStr = JSON.stringify(expected)
      if (actStr !== expStr) {
        throw new Error(`Expected ${actStr} to equal ${expStr}`)
      }
    },
    toBeGreaterThan(expected: number): void {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`)
      }
    },
    toBeLessThan(expected: number): void {
      if (typeof actual !== 'number' || actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`)
      }
    },
    toContain(expected: unknown): void {
      if (typeof actual === 'string' && typeof expected === 'string') {
        if (!actual.includes(expected)) {
          throw new Error(`Expected string "${actual}" to contain "${expected}"`)
        }
      } else if (Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error(`Expected array to contain ${JSON.stringify(expected)}`)
        }
      } else {
        throw new Error(`toContain supported only for strings or arrays`)
      }
    },
    toBeNull(): void {
      if (actual !== null) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be null`)
      }
    },
    toBeTruthy(): void {
      if (!actual) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be truthy`)
      }
    },
    toBeFalsy(): void {
      if (actual) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be falsy`)
      }
    },
    toMatch(regex: RegExp): void {
      if (typeof actual !== 'string' || !regex.test(actual)) {
        throw new Error(`Expected "${actual}" to match regex ${regex}`)
      }
    },
    async toThrow(expectedMsg?: string | RegExp): Promise<void> {
      if (typeof actual !== 'function') {
        throw new Error('toThrow requires actual value to be a function')
      }
      let threw = false
      let caughtError: unknown
      try {
        await (actual as () => unknown)()
      } catch (err) {
        threw = true
        caughtError = err
      }
      if (!threw) {
        throw new Error('Expected function to throw an error, but it succeeded')
      }
      if (expectedMsg) {
        const msg = caughtError instanceof Error ? caughtError.message : String(caughtError)
        if (typeof expectedMsg === 'string' && !msg.includes(expectedMsg)) {
          throw new Error(`Expected error message "${msg}" to contain "${expectedMsg}"`)
        } else if (expectedMsg instanceof RegExp && !expectedMsg.test(msg)) {
          throw new Error(`Expected error message "${msg}" to match ${expectedMsg}`)
        }
      }
    },
  }
}
