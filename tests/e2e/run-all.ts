/**
 * Master E2E Test Suite Runner
 * Executes all automated tests across Tiers 1-4 for R1-R4 requirements:
 * - Tier 1: Feature Coverage (R1: 5 tests, R2: 5 tests, R3: 5 tests, R4: 5 tests = 20 tests total)
 * - Tier 2: Boundary & Corner Cases (5 tests)
 * - Tier 3: Cross-Feature Integration (2 flows)
 * - Tier 4: Real-World Workload Scenario (1 workflow scenario)
 */

import { runner } from './helpers/test-runner-harness'
import { runR1UploadDropzoneTests } from './tier1-features/r1-upload-dropzone.spec'
import { runR2PrivateStorageTests } from './tier1-features/r2-private-storage.spec'
import { runR3DbPersistenceTests } from './tier1-features/r3-db-persistence.spec'
import { runR4DocumentViewerTests } from './tier1-features/r4-document-viewer.spec'
import { runTier2BoundaryTests } from './tier2-boundaries/boundary-corner-cases.spec'
import { runTier3IntegrationTests } from './tier3-integration/cross-feature-flows.spec'
import { runTier4RealWorldWorkloadTests } from './tier4-scenarios/real-world-workload.spec'

export async function main() {
  console.log('\n======================================================================')
  console.log(' STARTING E2E AUTOMATED TEST SUITE EXECUTION (TIERS 1 - 4)')
  console.log(' Project: ISS Transit Documents Storage & Viewer')
  console.log('======================================================================\n')

  try {
    // --- Tier 1: Feature Coverage ---
    await runR1UploadDropzoneTests()
    await runR2PrivateStorageTests()
    await runR3DbPersistenceTests()
    await runR4DocumentViewerTests()

    // --- Tier 2: Boundary & Corner Cases ---
    await runTier2BoundaryTests()

    // --- Tier 3: Cross-Feature Integration ---
    await runTier3IntegrationTests()

    // --- Tier 4: Real-World Workload Scenario ---
    await runTier4RealWorldWorkloadTests()

    // --- Final Summary ---
    const success = runner.printSummary()

    if (success) {
      console.log('\n SUCCESS: 100% test pass rate achieved across all test tiers!')
      process.exit(0)
    } else {
      console.error('\n FAILURE: One or more tests failed. See log output above.')
      process.exit(1)
    }
  } catch (err) {
    console.error('\n UNHANDLED EXCEPTION DURING TEST EXECUTION:')
    console.error(err)
    process.exit(1)
  }
}

main()
