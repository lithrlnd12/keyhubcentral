#!/usr/bin/env bash
#
# KeyHub Central - Comprehensive E2E Test Runner
# Usage: ./e2e/run-all-tests.sh [options]
#
# Options:
#   --suite <name>    Run specific suite: auth, roles, workflows, public, e2e, all (default: all)
#   --browser <name>  Browser: chromium, firefox, webkit (default: chromium)
#   --headed          Run in headed mode (visible browser)
#   --ui              Open Playwright UI mode
#   --report          Open HTML report after run
#   --workers <n>     Number of parallel workers (default: 1 for stability)
#   --grep <pattern>  Filter tests by name pattern
#   --debug           Run with Playwright inspector
#   --help            Show this help

set -euo pipefail

# Defaults
SUITE="all"
BROWSER="chromium"
HEADED=""
UI=""
REPORT=""
WORKERS="1"
GREP=""
DEBUG=""
EXTRA_ARGS=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --suite) SUITE="$2"; shift 2 ;;
    --browser) BROWSER="$2"; shift 2 ;;
    --headed) HEADED="--headed"; shift ;;
    --ui) UI="--ui"; shift ;;
    --report) REPORT="true"; shift ;;
    --workers) WORKERS="$2"; shift 2 ;;
    --grep) GREP="--grep \"$2\""; shift 2 ;;
    --debug) DEBUG="true"; shift ;;
    --help)
      head -15 "$0" | tail -13
      exit 0
      ;;
    *) EXTRA_ARGS="$EXTRA_ARGS $1"; shift ;;
  esac
done

echo "============================================"
echo "  KeyHub Central - E2E Test Suite"
echo "============================================"
echo "  Suite:   $SUITE"
echo "  Browser: $BROWSER"
echo "  Workers: $WORKERS"
echo "============================================"
echo ""

# Base command
CMD="npx playwright test"

# Add project (browser)
CMD="$CMD --project=$BROWSER"

# Add workers
CMD="$CMD --workers=$WORKERS"

# Add headed mode
if [[ -n "$HEADED" ]]; then
  CMD="$CMD $HEADED"
fi

# Debug mode
if [[ -n "$DEBUG" ]]; then
  export PWDEBUG=1
fi

# UI mode
if [[ -n "$UI" ]]; then
  npx playwright test --ui
  exit 0
fi

# Add grep filter
if [[ -n "$GREP" ]]; then
  CMD="$CMD $GREP"
fi

# Define test suites
run_suite() {
  local suite_name=$1
  shift
  local files=("$@")

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Running: $suite_name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  local test_cmd="$CMD"
  for f in "${files[@]}"; do
    test_cmd="$test_cmd $f"
  done
  test_cmd="$test_cmd $EXTRA_ARGS"

  echo "  Command: $test_cmd"
  echo ""

  eval "$test_cmd" || true
}

case $SUITE in
  auth)
    run_suite "Authentication & Roles" \
      "e2e/auth.spec.ts" \
      "e2e/roles.spec.ts" \
      "e2e/dashboard.spec.ts"
    ;;

  navigation)
    run_suite "Navigation & Responsive" \
      "e2e/navigation.spec.ts" \
      "e2e/responsive.spec.ts" \
      "e2e/home.spec.ts"
    ;;

  workflows)
    run_suite "All Workflow Tests" \
      "e2e/workflows/"
    ;;

  public)
    run_suite "Public Pages" \
      "e2e/workflows/public-pages.spec.ts"
    ;;

  kr)
    run_suite "Key Renovations (Jobs & Contracts)" \
      "e2e/workflows/jobs.spec.ts" \
      "e2e/workflows/contracts.spec.ts"
    ;;

  kts)
    run_suite "Key Trade Solutions (Contractors, Inventory, Calls)" \
      "e2e/workflows/contractors.spec.ts" \
      "e2e/workflows/contractor-profile.spec.ts" \
      "e2e/workflows/inventory.spec.ts" \
      "e2e/workflows/calls.spec.ts" \
      "e2e/workflows/marketplace.spec.ts"
    ;;

  kd)
    run_suite "Keynote Digital (Leads, Campaigns, Subscribers)" \
      "e2e/workflows/leads.spec.ts" \
      "e2e/workflows/kd-module.spec.ts" \
      "e2e/workflows/subscriber-portal.spec.ts"
    ;;

  financials)
    run_suite "Financial Operations" \
      "e2e/workflows/financials.spec.ts"
    ;;

  admin)
    run_suite "Admin Panel" \
      "e2e/admin.spec.ts" \
      "e2e/workflows/admin-extended.spec.ts" \
      "e2e/workflows/partners.spec.ts"
    ;;

  portals)
    run_suite "All Portals (Contractor, Partner, Customer, Subscriber)" \
      "e2e/workflows/marketplace.spec.ts" \
      "e2e/workflows/contractor-profile.spec.ts" \
      "e2e/workflows/customer-portal.spec.ts" \
      "e2e/workflows/subscriber-portal.spec.ts" \
      "e2e/workflows/partners.spec.ts"
    ;;

  messaging)
    run_suite "Messaging System" \
      "e2e/workflows/messaging.spec.ts"
    ;;

  settings)
    run_suite "Settings & Profile" \
      "e2e/workflows/settings-profile.spec.ts"
    ;;

  e2e)
    run_suite "End-to-End Business Flows" \
      "e2e/workflows/e2e-flows.spec.ts"
    ;;

  all)
    echo "Running ALL test suites sequentially..."
    echo ""

    run_suite "1/10 - Public Pages & Auth" \
      "e2e/workflows/public-pages.spec.ts" \
      "e2e/auth.spec.ts" \
      "e2e/home.spec.ts"

    run_suite "2/10 - Roles & Access Control" \
      "e2e/roles.spec.ts" \
      "e2e/dashboard.spec.ts"

    run_suite "3/10 - Navigation & Responsive" \
      "e2e/navigation.spec.ts" \
      "e2e/responsive.spec.ts"

    run_suite "4/10 - Key Renovations (Jobs & Contracts)" \
      "e2e/workflows/jobs.spec.ts" \
      "e2e/workflows/contracts.spec.ts"

    run_suite "5/10 - Key Trade Solutions (Contractors, Inventory, Calls)" \
      "e2e/workflows/contractors.spec.ts" \
      "e2e/workflows/contractor-profile.spec.ts" \
      "e2e/workflows/inventory.spec.ts" \
      "e2e/workflows/calls.spec.ts" \
      "e2e/workflows/marketplace.spec.ts"

    run_suite "6/10 - Keynote Digital (Leads, Campaigns, Subscribers)" \
      "e2e/workflows/leads.spec.ts" \
      "e2e/workflows/kd-module.spec.ts" \
      "e2e/workflows/subscriber-portal.spec.ts"

    run_suite "7/10 - Financials" \
      "e2e/workflows/financials.spec.ts"

    run_suite "8/10 - Admin & Partners" \
      "e2e/admin.spec.ts" \
      "e2e/workflows/admin-extended.spec.ts" \
      "e2e/workflows/partners.spec.ts"

    run_suite "9/10 - Messaging & Settings" \
      "e2e/workflows/messaging.spec.ts" \
      "e2e/workflows/settings-profile.spec.ts"

    run_suite "10/10 - End-to-End Business Flows" \
      "e2e/workflows/e2e-flows.spec.ts"
    ;;

  *)
    echo "Unknown suite: $SUITE"
    echo "Available: auth, navigation, workflows, public, kr, kts, kd, financials, admin, portals, messaging, settings, e2e, all"
    exit 1
    ;;
esac

echo ""
echo "============================================"
echo "  Test run complete!"
echo "============================================"

# Open report if requested
if [[ -n "$REPORT" ]]; then
  echo "Opening HTML report..."
  npx playwright show-report
fi
