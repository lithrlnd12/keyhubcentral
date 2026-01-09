# KeyHub Central - User Acceptance Testing (UAT) Plan

**Version:** 1.0
**Date:** January 9, 2026
**Document Owner:** QA Team
**Status:** Active

---

## Table of Contents

1. [Overview](#overview)
2. [Test Environment](#test-environment)
3. [User Roles](#user-roles)
4. [Test Scenarios by Module](#test-scenarios-by-module)
   - [Authentication & User Management](#1-authentication--user-management)
   - [Dashboard & Navigation](#2-dashboard--navigation)
   - [Key Trade Solutions (KTS)](#3-key-trade-solutions-kts)
   - [Key Renovations (KR)](#4-key-renovations-kr)
   - [Keynote Digital (KD)](#5-keynote-digital-kd)
   - [Financials](#6-financials)
   - [Partner Portal](#7-partner-portal)
   - [Contractor Portal](#8-contractor-portal)
   - [Subscriber Portal](#9-subscriber-portal)
   - [Settings & Profile](#10-settings--profile)
5. [Role-Based Access Matrix](#role-based-access-matrix)
6. [Cross-Browser & Device Testing](#cross-browser--device-testing)
7. [Test Sign-Off](#test-sign-off)

---

## Overview

This document outlines the User Acceptance Testing (UAT) plan for KeyHub Central, a Progressive Web App (PWA) that manages three interconnected businesses:

- **Keynote Digital (KD)** - Lead generation & marketing subscriptions
- **Key Trade Solutions (KTS)** - 1099 contractor network
- **Key Renovations (KR)** - D2C home renovation sales

### Testing Objectives

1. Verify all features function correctly for each user role
2. Confirm role-based access controls are properly enforced
3. Validate data integrity across all modules
4. Ensure responsive design works on all devices
5. Test PWA functionality (install, offline support, notifications)

---

## Test Environment

| Environment | URL | Purpose |
|-------------|-----|---------|
| Development | localhost:3000 | Developer testing |
| Staging | [TBD] | UAT testing |
| Production | [TBD] | Live system |

### Test Accounts

| Role | Test Email | Password | Notes |
|------|-----------|----------|-------|
| Owner | owner@test.com | [secure] | Full system access |
| Admin | admin@test.com | [secure] | Operations & accounting |
| Sales Rep | salesrep@test.com | [secure] | Assigned leads, job progress |
| Contractor | contractor@test.com | [secure] | Assigned jobs, availability |
| Project Manager | pm@test.com | [secure] | Job oversight, crew management |
| Subscriber | subscriber@test.com | [secure] | Lead portal access |
| Partner | partner@test.com | [secure] | Partner portal access |

---

## User Roles

| Role | Description | Primary Access Areas |
|------|-------------|---------------------|
| **Owner** | Full system access | All modules, all data, all actions |
| **Admin** | Operations & accounting | All modules, approve users, financials |
| **Sales Rep** | 1099 sales contractor | Assigned leads, job progress on their sales, commissions |
| **Contractor** | 1099 installer/tech | Assigned jobs, availability, earnings |
| **PM** | Project Manager | Assigned jobs, crew management, mark complete |
| **Subscriber** | External contractor | Lead portal, subscription management |
| **Partner** | Partner company user | Labor requests, service tickets |

---

## Test Scenarios by Module

### 1. Authentication & User Management

#### 1.1 User Registration

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| AUTH-001 | New user signup | 1. Navigate to /signup<br>2. Enter name, email, phone<br>3. Enter password (8+ chars)<br>4. Confirm password<br>5. Click "Create account" | User created with "pending" status, redirected to /pending | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| AUTH-002 | Signup validation - password mismatch | 1. Enter different passwords<br>2. Submit form | Error: "Passwords do not match" | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| AUTH-003 | Signup validation - short password | 1. Enter password < 8 chars<br>2. Submit form | Error: "Password must be at least 8 characters" | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| AUTH-004 | Pending approval page | 1. Sign up new user<br>2. View pending page | Shows "Account Pending Approval" with email and options | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

#### 1.2 User Login

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| AUTH-005 | Successful login | 1. Navigate to /login<br>2. Enter valid credentials<br>3. Click "Sign in" | Redirected to appropriate dashboard based on role | Test | Test | Test | Test | Test | Test | Test |
| AUTH-006 | Login with invalid credentials | 1. Enter wrong email/password<br>2. Submit | Error message displayed | Test | Test | Test | Test | Test | Test | Test |
| AUTH-007 | Login with pending account | 1. Login with pending user | Redirected to /pending page | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| AUTH-008 | Login with suspended account | 1. Login with suspended user | Redirected to /login with error | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

#### 1.3 Password Reset

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| AUTH-009 | Request password reset | 1. Click "Forgot password"<br>2. Enter email<br>3. Submit | Success message, reset email sent | Test | Test | Test | Test | Test | Test | Test |
| AUTH-010 | Password reset invalid email | 1. Enter unregistered email<br>2. Submit | Appropriate error or generic message | Test | Test | Test | Test | Test | Test | Test |

#### 1.4 User Approval (Admin Functions)

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| AUTH-011 | View pending users | Navigate to /admin | List of pending users displayed | Test | Test | Denied | Denied | Denied | Denied | Denied |
| AUTH-012 | Approve user with role | 1. Select role from dropdown<br>2. Click approve button | User status → active, role assigned | Test | Test | Denied | Denied | Denied | Denied | Denied |
| AUTH-013 | Reject user | Click reject button on pending user | User status → inactive | Test | Test | Denied | Denied | Denied | Denied | Denied |
| AUTH-014 | Search active users | Enter name/email in search box | Filtered results displayed | Test | Test | Denied | Denied | Denied | Denied | Denied |
| AUTH-015 | Filter users by role | Select role from filter dropdown | Only users with selected role shown | Test | Test | Denied | Denied | Denied | Denied | Denied |
| AUTH-016 | Change user role | 1. Click edit on user<br>2. Select new role<br>3. Save | User role updated | Test | Test | Denied | Denied | Denied | Denied | Denied |
| AUTH-017 | Suspend user | Click suspend button on active user | User status → suspended | Test | Test | Denied | Denied | Denied | Denied | Denied |
| AUTH-018 | Reactivate suspended user | Click activate button on suspended user | User status → active | Test | Test | Denied | Denied | Denied | Denied | Denied |

#### 1.5 Sign Out

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| AUTH-019 | Sign out | Click "Sign out" in navigation | Redirected to /login, session cleared | Test | Test | Test | Test | Test | Test | Test |

---

### 2. Dashboard & Navigation

#### 2.1 Main Dashboard (/overview)

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| DASH-001 | Access dashboard | Navigate to /overview | Dashboard loads with stat cards | Test | Test | Limited | Denied | Limited | Denied | Denied |
| DASH-002 | View KD stats | Check KD section | Leads generated, Revenue, CPL displayed | Test | Test | Denied | Denied | Denied | Denied | Denied |
| DASH-003 | View KTS stats | Check KTS section | Active contractors, Jobs completed | Test | Test | Limited | Limited | Limited | Denied | Denied |
| DASH-004 | View KR stats | Check KR section | Active jobs, Revenue, Profit margin | Test | Test | Limited | Denied | Limited | Denied | Denied |
| DASH-005 | View combined revenue | Check combined stats | Total revenue, total profit | Test | Test | Denied | Denied | Denied | Denied | Denied |

#### 2.2 Navigation - Desktop

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| NAV-001 | Side navigation visible | View on desktop (>768px) | Side nav visible with all permitted links | Test | Test | Test | Test | Test | Test | Test |
| NAV-002 | Navigate via side nav | Click each nav item | Correct page loads | Test | Test | Test | Test | Test | Test | Test |
| NAV-003 | Active nav item highlighted | Navigate to different pages | Current page highlighted in nav | Test | Test | Test | Test | Test | Test | Test |
| NAV-004 | User info in nav | View bottom of side nav | User name and role displayed | Test | Test | Test | Test | Test | Test | Test |

#### 2.3 Navigation - Mobile

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| NAV-005 | Bottom nav visible | View on mobile (<768px) | Bottom nav with icons visible | Test | Test | Test | Test | Test | Test | Test |
| NAV-006 | Navigate via bottom nav | Tap each nav item | Correct page loads | Test | Test | Test | Test | Test | Test | Test |
| NAV-007 | Side nav hidden on mobile | View on mobile | Side nav not visible | Test | Test | Test | Test | Test | Test | Test |

---

### 3. Key Trade Solutions (KTS)

#### 3.1 Contractor List

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| KTS-001 | Access contractor list | Navigate to /kts | Contractor list displayed | Test | Test | Denied | Denied | Test | Denied | Denied |
| KTS-002 | Search contractors | Enter name in search box | Filtered results | Test | Test | Denied | Denied | Test | Denied | Denied |
| KTS-003 | Filter by trade | Select trade filter | Only matching contractors shown | Test | Test | Denied | Denied | Test | Denied | Denied |
| KTS-004 | Filter by status | Select status filter | Only matching status shown | Test | Test | Denied | Denied | Test | Denied | Denied |
| KTS-005 | View contractor details | Click on contractor row | Contractor detail page opens | Test | Test | Denied | Denied | Test | Denied | Denied |

#### 3.2 Contractor Management

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| KTS-006 | Add new contractor | 1. Click "Add Contractor"<br>2. Fill form<br>3. Submit | New contractor created | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KTS-007 | Edit contractor | 1. Open contractor<br>2. Click edit<br>3. Modify fields<br>4. Save | Changes saved | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KTS-008 | Upload W-9 | Upload W-9 document | File uploaded to storage | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KTS-009 | Upload insurance | Upload insurance certificate | File uploaded to storage | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KTS-010 | Update contractor status | Change status dropdown | Status updated | Test | Test | Denied | Denied | Denied | Denied | Denied |

#### 3.3 Availability Management

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| KTS-011 | View availability calendar | Navigate to /kts/availability | Calendar view displayed | Test | Test | Test | Own | Test | Denied | Denied |
| KTS-012 | Set availability | Mark days as available/unavailable | Calendar updated | Test | Test | Own | Own | Own | Denied | Denied |
| KTS-013 | Google Calendar sync | Connect Google Calendar | Events synced both ways | Test | Test | Own | Own | Own | Denied | Denied |

#### 3.4 Inventory Management

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| KTS-014 | View inventory list | Navigate to /kts/inventory | Inventory items displayed | Test | Test | Denied | Test | Test | Denied | Denied |
| KTS-015 | Add inventory item | Click add, fill form, submit | New item created | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KTS-016 | Edit inventory item | Open item, edit, save | Changes saved | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KTS-017 | Perform inventory count | Navigate to /kts/inventory/count | Count interface displayed | Test | Test | Denied | Test | Test | Denied | Denied |
| KTS-018 | Submit inventory count | Complete count, submit | Count recorded | Test | Test | Denied | Test | Test | Denied | Denied |
| KTS-019 | View low stock alerts | Navigate to /kts/inventory/alerts | Low stock items shown | Test | Test | Denied | Denied | Test | Denied | Denied |
| KTS-020 | Upload receipt | Navigate to receipts, upload | Receipt uploaded | Test | Test | Denied | Test | Test | Denied | Denied |
| KTS-021 | Verify receipt | Mark receipt as verified | Receipt status updated | Test | Test | Denied | Denied | Denied | Denied | Denied |

---

### 4. Key Renovations (KR)

#### 4.1 Job List

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| KR-001 | Access job list | Navigate to /kr | Job list displayed | Test | Test | Own | Denied | Assigned | Denied | Denied |
| KR-002 | Search jobs | Enter job # or customer name | Filtered results | Test | Test | Own | Denied | Assigned | Denied | Denied |
| KR-003 | Filter by status | Select status filter | Only matching jobs shown | Test | Test | Own | Denied | Assigned | Denied | Denied |
| KR-004 | Filter by type | Select job type filter | Only matching type shown | Test | Test | Own | Denied | Assigned | Denied | Denied |
| KR-005 | View job details | Click on job row | Job detail page opens | Test | Test | Own | Assigned | Assigned | Denied | Denied |

#### 4.2 Job Pipeline (Kanban)

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| KR-006 | View Kanban board | Toggle to Kanban view | Pipeline columns displayed | Test | Test | Own | Denied | Assigned | Denied | Denied |
| KR-007 | Drag job to new stage | Drag job card between columns | Job status updated | Test | Test | Limited* | Denied | Test | Denied | Denied |
| KR-008 | Move Lead → Sold | Drag job from Lead to Sold | Status = Sold | Test | Test | Test | Denied | Test | Denied | Denied |
| KR-009 | Move through pipeline | Progress job through all stages | Each transition works | Test | Test | Limited* | Denied | Test | Denied | Denied |

*Sales Rep can only move Lead → Sold

#### 4.3 Job Management

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| KR-010 | Create new job | 1. Click "New Job"<br>2. Fill customer info<br>3. Select type<br>4. Save | New job created in Lead status | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KR-011 | Edit job details | 1. Open job<br>2. Edit fields<br>3. Save | Changes saved | Test | Test | Limited | Denied | Test | Denied | Denied |
| KR-012 | Assign sales rep | Select sales rep from dropdown | Rep assigned to job | Test | Test | Denied | Denied | Test | Denied | Denied |
| KR-013 | Assign crew | Select contractor(s) from list | Crew assigned to job | Test | Test | Denied | Denied | Test | Denied | Denied |
| KR-014 | Assign PM | Select PM from dropdown | PM assigned to job | Test | Test | Denied | Denied | Denied | Denied | Denied |

#### 4.4 Job Costs

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| KR-015 | View cost summary | Open job cost tab | Projected vs actual displayed | Test | Test | Denied | Denied | Test | Denied | Denied |
| KR-016 | Enter projected materials | Enter projected material cost | Value saved | Test | Test | Denied | Denied | Test | Denied | Denied |
| KR-017 | Enter actual materials | Enter actual material cost | Value saved, variance calculated | Test | Test | Denied | Denied | Test | Denied | Denied |
| KR-018 | Enter labor costs | Enter projected/actual labor | Values saved | Test | Test | Denied | Denied | Test | Denied | Denied |
| KR-019 | View profit margin | Check calculated margin | Margin % displayed correctly | Test | Test | Denied | Denied | Test | Denied | Denied |

#### 4.5 Communication Log

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| KR-020 | View communication log | Open job communication tab | Log entries displayed | Test | Test | Own | Assigned | Assigned | Denied | Denied |
| KR-021 | Add log entry | 1. Click add<br>2. Select type<br>3. Enter content<br>4. Save | Entry added with timestamp | Test | Test | Own | Assigned | Assigned | Denied | Denied |
| KR-022 | Attach file to entry | Upload file with log entry | File attached | Test | Test | Own | Assigned | Assigned | Denied | Denied |

#### 4.6 Warranty & Service

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| KR-023 | View warranty status | Open job warranty tab | Warranty dates and status shown | Test | Test | Denied | Denied | Test | Denied | Denied |
| KR-024 | Create service ticket | 1. Click create ticket<br>2. Enter issue<br>3. Save | New ticket created linked to job | Test | Test | Denied | Denied | Test | Denied | Denied |
| KR-025 | Assign service tech | Select tech for ticket | Tech assigned | Test | Test | Denied | Denied | Test | Denied | Denied |
| KR-026 | Complete service ticket | Mark ticket complete with notes | Ticket closed | Test | Test | Denied | Assigned | Test | Denied | Denied |

---

### 5. Keynote Digital (KD)

#### 5.1 Lead Management

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| KD-001 | Access all leads | Navigate to /kd | Full lead list displayed | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KD-002 | Search leads | Enter name/phone/email | Filtered results | Test | Test | Own | Denied | Denied | Own | Denied |
| KD-003 | Filter by source | Select lead source | Only matching source shown | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KD-004 | Filter by status | Select lead status | Only matching status shown | Test | Test | Own | Denied | Denied | Own | Denied |
| KD-005 | View lead details | Click on lead row | Lead detail page opens | Test | Test | Own | Denied | Denied | Own | Denied |

#### 5.2 Lead Operations

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| KD-006 | Create new lead | 1. Click "New Lead"<br>2. Fill form<br>3. Save | New lead created | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KD-007 | Edit lead | 1. Open lead<br>2. Edit fields<br>3. Save | Changes saved | Test | Test | Own | Denied | Denied | Denied | Denied |
| KD-008 | Assign lead to rep | Select rep from dropdown | Lead assigned | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KD-009 | Assign lead to subscriber | Select subscriber | Lead assigned to external | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KD-010 | Update lead status | Change status dropdown | Status updated | Test | Test | Own | Denied | Denied | Limited | Denied |
| KD-011 | Convert lead to job | Click "Convert to Job" | Job created from lead | Test | Test | Own | Denied | Denied | Denied | Denied |

#### 5.3 Lead Return (Subscribers)

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| KD-012 | Request lead return | 1. Open lead<br>2. Click return<br>3. Select reason | Return request submitted | Denied | Denied | Denied | Denied | Denied | Test | Denied |
| KD-013 | Return within 24hrs | Return lead within 24 hours | Return accepted | Denied | Denied | Denied | Denied | Denied | Test | Denied |
| KD-014 | Return after 24hrs | Attempt return after 24 hours | Return denied | Denied | Denied | Denied | Denied | Denied | Test | Denied |
| KD-015 | Process lead return | Admin processes return | Replacement lead assigned | Test | Test | Denied | Denied | Denied | Denied | Denied |

#### 5.4 Campaign Management

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| KD-016 | View campaigns | Navigate to /kd/campaigns | Campaign list displayed | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KD-017 | Create campaign | 1. Click "New Campaign"<br>2. Fill details<br>3. Save | New campaign created | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KD-018 | Edit campaign | 1. Open campaign<br>2. Edit<br>3. Save | Changes saved | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KD-019 | View campaign analytics | Open campaign detail | Spend, leads, CPL, ROI shown | Test | Test | Denied | Denied | Denied | Denied | Denied |

#### 5.5 Subscriber Management

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| KD-020 | View subscribers | Navigate to /kd/subscribers | Subscriber list displayed | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KD-021 | Add subscriber | 1. Click add<br>2. Fill details<br>3. Select tier<br>4. Save | New subscriber created | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KD-022 | Edit subscriber | Edit subscriber details | Changes saved | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KD-023 | Change subscription tier | Modify tier setting | Tier updated | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KD-024 | Pause subscription | Set status to paused | Subscription paused | Test | Test | Denied | Denied | Denied | Denied | Denied |
| KD-025 | Cancel subscription | Set status to cancelled | Subscription cancelled | Test | Test | Denied | Denied | Denied | Denied | Denied |

---

### 6. Financials

#### 6.1 Overview

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| FIN-001 | Access financials | Navigate to /financials | Financial overview displayed | Test | Test | Denied | Denied | Denied | Denied | Denied |
| FIN-002 | View revenue summary | Check revenue cards | KD, KTS, KR revenue shown | Test | Test | Denied | Denied | Denied | Denied | Denied |

#### 6.2 Invoice Management

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| FIN-003 | View all invoices | Navigate to /financials/invoices | Invoice list displayed | Test | Test | Denied | Denied | Denied | Denied | Denied |
| FIN-004 | Create invoice | 1. Click new<br>2. Add line items<br>3. Save | Invoice created in draft | Test | Test | Denied | Denied | Denied | Denied | Denied |
| FIN-005 | Edit draft invoice | Modify draft invoice | Changes saved | Test | Test | Denied | Denied | Denied | Denied | Denied |
| FIN-006 | Send invoice | Click send on draft | Status → Sent, email sent | Test | Test | Denied | Denied | Denied | Denied | Denied |
| FIN-007 | Mark invoice paid | Mark sent invoice as paid | Status → Paid | Test | Test | Denied | Denied | Denied | Denied | Denied |
| FIN-008 | View overdue invoices | Filter by overdue | Only overdue shown | Test | Test | Denied | Denied | Denied | Denied | Denied |
| FIN-009 | Send reminder | Send reminder for overdue | Reminder email sent | Test | Test | Denied | Denied | Denied | Denied | Denied |

#### 6.3 P&L Reports

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| FIN-010 | View P&L by entity | Navigate to /financials/pnl | Entity P&L displayed | Test | Test | Denied | Denied | Denied | Denied | Denied |
| FIN-011 | View combined P&L | Select combined view | All entities consolidated | Test | Test | Denied | Denied | Denied | Denied | Denied |
| FIN-012 | Filter by date range | Select month/quarter/year | Data filtered by period | Test | Test | Denied | Denied | Denied | Denied | Denied |

#### 6.4 Expense Tracking

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| FIN-013 | View expenses | Navigate to /financials/expenses | Expense list displayed | Test | Test | Denied | Denied | Denied | Denied | Denied |
| FIN-014 | Add expense | 1. Click add<br>2. Fill details<br>3. Save | Expense recorded | Test | Test | Denied | Denied | Denied | Denied | Denied |
| FIN-015 | Categorize expense | Select category | Category assigned | Test | Test | Denied | Denied | Denied | Denied | Denied |

#### 6.5 Earnings (Own View)

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| FIN-016 | View own earnings | Navigate to /financials/earnings | Personal earnings displayed | Test | Test | Test | Test | Test | Denied | Denied |
| FIN-017 | View earnings by period | Filter MTD/YTD | Filtered earnings shown | Test | Test | Test | Test | Test | Denied | Denied |
| FIN-018 | View payment history | Check payment list | Historical payments shown | Test | Test | Test | Test | Test | Denied | Denied |

---

### 7. Partner Portal

#### 7.1 Partner Dashboard

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| PART-001 | Access partner portal | Navigate to /partner | Partner dashboard displayed | Denied | Denied | Denied | Denied | Denied | Denied | Test |
| PART-002 | View pending requests | Check dashboard cards | Open labor requests, tickets shown | Denied | Denied | Denied | Denied | Denied | Denied | Test |

#### 7.2 Labor Requests

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| PART-003 | View labor requests | Navigate to /partner/labor-requests | Request list displayed | Test | Test | Denied | Denied | Denied | Denied | Test |
| PART-004 | Create labor request | 1. Click new<br>2. Fill details<br>3. Submit | New request created | Denied | Denied | Denied | Denied | Denied | Denied | Test |
| PART-005 | View request details | Click on request | Request details shown | Test | Test | Denied | Denied | Denied | Denied | Test |
| PART-006 | Update request status | Change status | Status updated | Test | Test | Denied | Denied | Denied | Denied | Limited |

#### 7.3 Service Tickets

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| PART-007 | View service tickets | Navigate to /partner/service-tickets | Ticket list displayed | Test | Test | Denied | Denied | Denied | Denied | Test |
| PART-008 | Create service ticket | 1. Click new<br>2. Fill details<br>3. Upload photos<br>4. Submit | New ticket created | Denied | Denied | Denied | Denied | Denied | Denied | Test |
| PART-009 | View ticket details | Click on ticket | Ticket details shown | Test | Test | Denied | Denied | Denied | Denied | Test |

#### 7.4 History

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| PART-010 | View history | Navigate to /partner/history | Completed items shown | Denied | Denied | Denied | Denied | Denied | Denied | Test |
| PART-011 | Filter history | Apply date/type filters | Filtered results | Denied | Denied | Denied | Denied | Denied | Denied | Test |

---

### 8. Contractor Portal

#### 8.1 Portal Dashboard

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| CONT-001 | Access contractor portal | Navigate to /portal | Contractor dashboard displayed | Denied | Denied | Denied | Test | Denied | Denied | Denied |
| CONT-002 | View assigned jobs | Check dashboard | My jobs displayed | Denied | Denied | Denied | Test | Denied | Denied | Denied |
| CONT-003 | View earnings summary | Check earnings widget | MTD/YTD earnings shown | Denied | Denied | Denied | Test | Denied | Denied | Denied |

#### 8.2 Jobs

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| CONT-004 | View my jobs | Navigate to /portal/jobs | Assigned jobs listed | Denied | Denied | Denied | Test | Denied | Denied | Denied |
| CONT-005 | View job details | Click on job | Job details displayed | Denied | Denied | Denied | Test | Denied | Denied | Denied |
| CONT-006 | Upload completion photos | Add photos to job | Photos uploaded | Denied | Denied | Denied | Test | Denied | Denied | Denied |
| CONT-007 | Add job notes | Enter notes on job | Notes saved | Denied | Denied | Denied | Test | Denied | Denied | Denied |

#### 8.3 Availability

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| CONT-008 | View availability | Navigate to /portal/availability | Calendar displayed | Denied | Denied | Denied | Test | Denied | Denied | Denied |
| CONT-009 | Set available days | Mark days as available | Calendar updated | Denied | Denied | Denied | Test | Denied | Denied | Denied |
| CONT-010 | Set unavailable days | Mark days as unavailable | Calendar updated | Denied | Denied | Denied | Test | Denied | Denied | Denied |

#### 8.4 Earnings

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| CONT-011 | View earnings | Navigate to /portal/earnings | Earnings history displayed | Denied | Denied | Denied | Test | Denied | Denied | Denied |
| CONT-012 | View payment details | Click on payment | Payment breakdown shown | Denied | Denied | Denied | Test | Denied | Denied | Denied |

#### 8.5 Inventory (Contractor)

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| CONT-013 | View assigned inventory | Navigate to /portal/inventory | My inventory displayed | Denied | Denied | Denied | Test | Denied | Denied | Denied |
| CONT-014 | Perform inventory count | Submit count | Count recorded | Denied | Denied | Denied | Test | Denied | Denied | Denied |
| CONT-015 | Upload receipt | Upload purchase receipt | Receipt submitted | Denied | Denied | Denied | Test | Denied | Denied | Denied |

---

### 9. Subscriber Portal

#### 9.1 Subscriber Dashboard

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| SUB-001 | Access subscriber portal | Navigate to /subscriber | Subscriber dashboard displayed | Denied | Denied | Denied | Denied | Denied | Test | Denied |
| SUB-002 | View lead count | Check dashboard | Lead count for period shown | Denied | Denied | Denied | Denied | Denied | Test | Denied |

#### 9.2 My Leads

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| SUB-003 | View my leads | Navigate to /subscriber/leads | Assigned leads listed | Denied | Denied | Denied | Denied | Denied | Test | Denied |
| SUB-004 | View lead details | Click on lead | Lead details displayed | Denied | Denied | Denied | Denied | Denied | Test | Denied |
| SUB-005 | Update lead status | Change contact status | Status updated | Denied | Denied | Denied | Denied | Denied | Test | Denied |
| SUB-006 | Return lead | Request lead return | Return submitted (if within 24hrs) | Denied | Denied | Denied | Denied | Denied | Test | Denied |

#### 9.3 Subscription

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| SUB-007 | View subscription | Navigate to /subscriber/subscription | Subscription details shown | Denied | Denied | Denied | Denied | Denied | Test | Denied |
| SUB-008 | View billing history | Check billing section | Past invoices listed | Denied | Denied | Denied | Denied | Denied | Test | Denied |
| SUB-009 | View lead statistics | Check performance stats | Conversion rates, etc. shown | Denied | Denied | Denied | Denied | Denied | Test | Denied |

---

### 10. Settings & Profile

#### 10.1 Profile Management

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| SET-001 | View profile | Navigate to /profile | Profile page displayed | Test | Test | Test | Test | Test | Test | Test |
| SET-002 | Edit display name | Update name, save | Name updated | Test | Test | Test | Test | Test | Test | Test |
| SET-003 | Edit phone | Update phone, save | Phone updated | Test | Test | Test | Test | Test | Test | Test |
| SET-004 | Change password | Enter current + new password | Password changed | Test | Test | Test | Test | Test | Test | Test |

#### 10.2 Notification Settings

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| SET-005 | Access settings | Navigate to /settings | Settings page displayed | Test | Test | Test | Test | Test | Test | Test |
| SET-006 | Toggle push notifications | Enable/disable | Setting saved | Test | Test | Test | Test | Test | Test | Test |
| SET-007 | Toggle email notifications | Enable/disable | Setting saved | Test | Test | Test | Test | Test | Test | Test |
| SET-008 | Toggle specific notification types | Enable/disable by type | Settings saved | Test | Test | Test | Test | Test | Test | Test |

#### 10.3 Google Calendar Integration

| TC# | Test Case | Steps | Expected Result | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|-----|-----------|-------|-----------------|-------|-------|-----------|------------|-----|------------|---------|
| SET-009 | Connect Google Calendar | Click connect, authorize | Calendar linked | Test | Test | Test | Test | Test | Denied | Denied |
| SET-010 | Disconnect Google Calendar | Click disconnect | Calendar unlinked | Test | Test | Test | Test | Test | Denied | Denied |
| SET-011 | Sync calendar | Trigger manual sync | Events synced | Test | Test | Test | Test | Test | Denied | Denied |

---

## Role-Based Access Matrix

### Summary: What Each Role Can Access

| Feature | Owner | Admin | Sales Rep | Contractor | PM | Subscriber | Partner |
|---------|-------|-------|-----------|------------|-----|------------|---------|
| **Dashboard** | Full | Full | Limited | Limited (Portal) | Limited | Denied | Denied |
| **KTS - All Contractors** | Full | Full | Denied | Denied | View | Denied | Denied |
| **KTS - Own Profile** | Full | Full | Full | Full | Full | Denied | Denied |
| **KTS - Availability** | Full | Full | Own | Own | Own | Denied | Denied |
| **KTS - Inventory** | Full | Full | Denied | View/Count | View/Count | Denied | Denied |
| **KR - All Jobs** | Full | Full | Denied | Denied | Assigned | Denied | Denied |
| **KR - Own Sales Jobs** | Full | Full | Full | Denied | Full | Denied | Denied |
| **KR - Job Status Update** | Full | Full | Lead→Sold | Denied | Full | Denied | Denied |
| **KD - All Leads** | Full | Full | Denied | Denied | Denied | Denied | Denied |
| **KD - Assigned Leads** | Full | Full | Full | Denied | Denied | Full | Denied |
| **KD - Campaigns** | Full | Full | Denied | Denied | Denied | Denied | Denied |
| **KD - Subscribers** | Full | Full | Denied | Denied | Denied | Denied | Denied |
| **Financials - Full P&L** | Full | Full | Denied | Denied | Denied | Denied | Denied |
| **Financials - Own Earnings** | Full | Full | Full | Full | Full | Denied | Denied |
| **Financials - Invoices** | Full | Full | Denied | Denied | Denied | View Own | Denied |
| **Admin - User Management** | Full | Full | Denied | Denied | Denied | Denied | Denied |
| **Admin - Partners** | Full | Full | Denied | Denied | Denied | Denied | Denied |
| **Portal - Contractor** | N/A | N/A | N/A | Full | N/A | N/A | N/A |
| **Portal - Subscriber** | N/A | N/A | N/A | N/A | N/A | Full | N/A |
| **Portal - Partner** | N/A | N/A | N/A | N/A | N/A | N/A | Full |

---

## Cross-Browser & Device Testing

### Browser Compatibility

| Browser | Desktop | Mobile | Tablet |
|---------|---------|--------|--------|
| Chrome | Test | Test | Test |
| Firefox | Test | Test | Test |
| Safari | Test | Test | Test |
| Edge | Test | Test | Test |

### Device Testing

| Device Type | Viewport | Test Priority |
|-------------|----------|---------------|
| iPhone SE | 375x667 | High |
| iPhone 12/13/14 | 390x844 | High |
| iPhone 14 Pro Max | 430x932 | Medium |
| Samsung Galaxy S21 | 360x800 | High |
| iPad Mini | 768x1024 | High |
| iPad Pro | 1024x1366 | Medium |
| Desktop HD | 1280x800 | High |
| Desktop Full HD | 1920x1080 | High |
| Desktop 4K | 2560x1440 | Low |

### PWA Testing

| TC# | Test Case | Steps | Expected Result |
|-----|-----------|-------|-----------------|
| PWA-001 | Install on iOS | Safari → Share → Add to Home | App installed, opens standalone |
| PWA-002 | Install on Android | Chrome → Menu → Add to Home | App installed, opens standalone |
| PWA-003 | Offline indicator | Disable network | Offline message displayed |
| PWA-004 | Push notification | Trigger notification | Notification received |
| PWA-005 | App icon | Check home screen | Correct icon displayed |

---

## Test Sign-Off

### Sign-Off Checklist

| Role | Tester Name | Date | Status | Signature |
|------|-------------|------|--------|-----------|
| Owner | | | Pending | |
| Admin | | | Pending | |
| Sales Rep | | | Pending | |
| Contractor | | | Pending | |
| PM | | | Pending | |
| Subscriber | | | Pending | |
| Partner | | | Pending | |

### Overall Sign-Off

| Milestone | Target Date | Actual Date | Status | Sign-Off By |
|-----------|-------------|-------------|--------|-------------|
| UAT Start | | | | |
| All Critical Tests Pass | | | | |
| All High Tests Pass | | | | |
| All Medium Tests Pass | | | | |
| Bug Fixes Complete | | | | |
| Final Sign-Off | | | | |

### Notes

_Use this section to document any issues, deviations, or special considerations during UAT._

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-09 | QA Team | Initial UAT plan |
