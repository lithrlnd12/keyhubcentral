'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, Timestamp, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Loader2, CheckCircle, XCircle, Users, Briefcase, Target, Megaphone, CreditCard, DollarSign, Trash2, Database, UserPlus, FlaskConical } from 'lucide-react';

// Helper to create dates relative to now
const daysAgo = (days: number) => Timestamp.fromDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
const daysFromNow = (days: number) => Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));

// ============ CONTRACTORS DATA ============
const contractors = [
  {
    userId: "contractor-001",
    businessName: "ABC Installations LLC",
    address: { street: "123 Main Street", city: "Dallas", state: "TX", zip: "75201", lat: 32.7767, lng: -96.7970 },
    trades: ["installer"],
    skills: ["Windows", "Doors", "Siding"],
    licenses: [],
    insurance: null,
    w9Url: null,
    achInfo: null,
    serviceRadius: 25,
    rating: { overall: 4.5, customer: 4.5, speed: 4.5, warranty: 4.5, internal: 4.5 },
    status: "active" as const,
  },
  {
    userId: "contractor-002",
    businessName: "Pro Home Services",
    address: { street: "456 Oak Avenue", city: "Fort Worth", state: "TX", zip: "76102", lat: 32.7555, lng: -97.3308 },
    trades: ["installer", "service_tech"],
    skills: ["Roofing", "Gutters", "Exteriors"],
    licenses: [],
    insurance: null,
    w9Url: null,
    achInfo: null,
    serviceRadius: 30,
    rating: { overall: 4.8, customer: 4.9, speed: 4.7, warranty: 4.8, internal: 4.7 },
    status: "active" as const,
  },
  {
    userId: "contractor-003",
    businessName: "Mike's Renovation Crew",
    address: { street: "789 Elm Boulevard", city: "Arlington", state: "TX", zip: "76010", lat: 32.7357, lng: -97.1081 },
    trades: ["installer"],
    skills: ["Bathroom", "Kitchen", "Flooring"],
    licenses: [],
    insurance: null,
    w9Url: null,
    achInfo: null,
    serviceRadius: 35,
    rating: { overall: 4.2, customer: 4.3, speed: 4.0, warranty: 4.2, internal: 4.2 },
    status: "active" as const,
  },
  {
    userId: "contractor-004",
    businessName: "Elite Window & Door",
    address: { street: "321 Cedar Lane", city: "Plano", state: "TX", zip: "75074", lat: 33.0198, lng: -96.6989 },
    trades: ["installer", "pm"],
    skills: ["Windows", "Doors", "Project Management"],
    licenses: [],
    insurance: null,
    w9Url: null,
    achInfo: null,
    serviceRadius: 40,
    rating: { overall: 4.9, customer: 5.0, speed: 4.8, warranty: 4.9, internal: 4.8 },
    status: "active" as const,
  },
  {
    userId: "contractor-005",
    businessName: "DFW Sales Pro",
    address: { street: "555 Maple Drive", city: "Irving", state: "TX", zip: "75039", lat: 32.8140, lng: -96.9489 },
    trades: ["sales_rep"],
    skills: ["Sales", "Customer Relations", "Estimates"],
    licenses: [],
    insurance: null,
    w9Url: null,
    achInfo: null,
    serviceRadius: 50,
    rating: { overall: 4.6, customer: 4.8, speed: 4.5, warranty: 4.4, internal: 4.6 },
    status: "active" as const,
  },
  {
    userId: "contractor-006",
    businessName: "Texas Tech Services",
    address: { street: "777 Pine Street", city: "McKinney", state: "TX", zip: "75070", lat: 33.1972, lng: -96.6397 },
    trades: ["service_tech"],
    skills: ["Repairs", "Maintenance", "Warranty Work"],
    licenses: [],
    insurance: null,
    w9Url: null,
    achInfo: null,
    serviceRadius: 25,
    rating: { overall: 3.8, customer: 4.0, speed: 3.5, warranty: 3.8, internal: 3.9 },
    status: "active" as const,
  },
  {
    userId: "contractor-007",
    businessName: "New Contractor LLC",
    address: { street: "999 Birch Road", city: "Frisco", state: "TX", zip: "75034", lat: 33.1507, lng: -96.8236 },
    trades: ["installer"],
    skills: ["General"],
    licenses: [],
    insurance: null,
    w9Url: null,
    achInfo: null,
    serviceRadius: 20,
    rating: { overall: 0, customer: 0, speed: 0, warranty: 0, internal: 0 },
    status: "pending" as const,
  },
];

// ============ JOBS DATA (matches Job type) ============
const jobs = [
  {
    jobNumber: "KR-2024-001",
    customer: {
      name: "John & Mary Smith",
      phone: "(214) 555-0101",
      email: "smithfamily@email.com",
      address: { street: "100 Residential Ave", city: "Dallas", state: "TX", zip: "75201" },
    },
    type: "bathroom" as const,
    status: "paid_in_full" as const,
    salesRepId: "contractor-005",
    crewIds: ["contractor-003"],
    pmId: "contractor-004",
    costs: { materialProjected: 8000, materialActual: 7800, laborProjected: 4500, laborActual: 4200 },
    dates: {
      created: daysAgo(90),
      sold: daysAgo(85),
      scheduledStart: daysAgo(60),
      actualStart: daysAgo(58),
      targetCompletion: daysAgo(45),
      actualCompletion: daysAgo(42),
      paidInFull: daysAgo(35),
    },
    warranty: { startDate: daysAgo(42), endDate: daysFromNow(323), status: "active" as const },
    notes: "Master bathroom complete renovation - very happy customer!",
  },
  {
    jobNumber: "KR-2024-002",
    customer: {
      name: "Sarah Johnson",
      phone: "(817) 555-0202",
      email: "sarah.j@email.com",
      address: { street: "200 Oak Street", city: "Fort Worth", state: "TX", zip: "76102" },
    },
    type: "kitchen" as const,
    status: "complete" as const,
    salesRepId: "contractor-005",
    crewIds: ["contractor-003", "contractor-001"],
    pmId: "contractor-004",
    costs: { materialProjected: 15000, materialActual: 14500, laborProjected: 8000, laborActual: 8200 },
    dates: {
      created: daysAgo(75),
      sold: daysAgo(70),
      scheduledStart: daysAgo(45),
      actualStart: daysAgo(44),
      targetCompletion: daysAgo(20),
      actualCompletion: daysAgo(18),
      paidInFull: null,
    },
    warranty: { startDate: daysAgo(18), endDate: daysFromNow(347), status: "active" as const },
    notes: "Full kitchen remodel with new cabinets and countertops. Awaiting final payment.",
  },
  {
    jobNumber: "KR-2024-003",
    customer: {
      name: "Mike Williams",
      phone: "(972) 555-0303",
      email: "mike.w@email.com",
      address: { street: "300 Elm Road", city: "Plano", state: "TX", zip: "75074" },
    },
    type: "exterior" as const,
    status: "started" as const,
    salesRepId: "contractor-005",
    crewIds: ["contractor-001", "contractor-002"],
    pmId: "contractor-004",
    costs: { materialProjected: 22000, materialActual: 0, laborProjected: 12000, laborActual: 0 },
    dates: {
      created: daysAgo(45),
      sold: daysAgo(40),
      scheduledStart: daysAgo(7),
      actualStart: daysAgo(5),
      targetCompletion: daysFromNow(10),
      actualCompletion: null,
      paidInFull: null,
    },
    warranty: { startDate: null, endDate: null, status: "pending" as const },
    notes: "Full siding replacement with James Hardie fiber cement.",
  },
  {
    jobNumber: "KR-2024-004",
    customer: {
      name: "Lisa Brown",
      phone: "(469) 555-0404",
      email: "lisa.b@email.com",
      address: { street: "400 Pine Lane", city: "Arlington", state: "TX", zip: "76010" },
    },
    type: "bathroom" as const,
    status: "scheduled" as const,
    salesRepId: "contractor-005",
    crewIds: ["contractor-003"],
    pmId: null,
    costs: { materialProjected: 6000, materialActual: 0, laborProjected: 3500, laborActual: 0 },
    dates: {
      created: daysAgo(30),
      sold: daysAgo(25),
      scheduledStart: daysFromNow(14),
      actualStart: null,
      targetCompletion: daysFromNow(28),
      actualCompletion: null,
      paidInFull: null,
    },
    warranty: { startDate: null, endDate: null, status: "pending" as const },
    notes: "Guest bathroom update - tile and vanity replacement.",
  },
  {
    jobNumber: "KR-2024-005",
    customer: {
      name: "Robert Davis",
      phone: "(214) 555-0505",
      email: "r.davis@email.com",
      address: { street: "500 Maple Court", city: "Irving", state: "TX", zip: "75039" },
    },
    type: "kitchen" as const,
    status: "production" as const,
    salesRepId: "contractor-005",
    crewIds: [],
    pmId: "contractor-004",
    costs: { materialProjected: 18000, materialActual: 0, laborProjected: 9000, laborActual: 0 },
    dates: {
      created: daysAgo(21),
      sold: daysAgo(14),
      scheduledStart: null,
      actualStart: null,
      targetCompletion: null,
      actualCompletion: null,
      paidInFull: null,
    },
    warranty: { startDate: null, endDate: null, status: "pending" as const },
    notes: "Kitchen renovation - materials being ordered.",
  },
  {
    jobNumber: "KR-2024-006",
    customer: {
      name: "Jennifer Martinez",
      phone: "(817) 555-0606",
      email: "j.martinez@email.com",
      address: { street: "600 Cedar Ave", city: "Fort Worth", state: "TX", zip: "76103" },
    },
    type: "exterior" as const,
    status: "sold" as const,
    salesRepId: "contractor-005",
    crewIds: [],
    pmId: null,
    costs: { materialProjected: 28000, materialActual: 0, laborProjected: 14000, laborActual: 0 },
    dates: {
      created: daysAgo(10),
      sold: daysAgo(5),
      scheduledStart: null,
      actualStart: null,
      targetCompletion: null,
      actualCompletion: null,
      paidInFull: null,
    },
    warranty: { startDate: null, endDate: null, status: "pending" as const },
    notes: "Complete exterior renovation - siding, windows, and front door.",
  },
  {
    jobNumber: "KR-2024-007",
    customer: {
      name: "David Wilson",
      phone: "(972) 555-0707",
      email: "d.wilson@email.com",
      address: { street: "700 Birch Street", city: "Plano", state: "TX", zip: "75075" },
    },
    type: "bathroom" as const,
    status: "lead" as const,
    salesRepId: null,
    crewIds: [],
    pmId: null,
    costs: { materialProjected: 0, materialActual: 0, laborProjected: 0, laborActual: 0 },
    dates: {
      created: daysAgo(3),
      sold: null,
      scheduledStart: null,
      actualStart: null,
      targetCompletion: null,
      actualCompletion: null,
      paidInFull: null,
    },
    warranty: { startDate: null, endDate: null, status: "pending" as const },
    notes: "New lead - interested in bathroom remodel.",
  },
];

// ============ CAMPAIGNS DATA ============
const campaigns = [
  {
    name: "Dallas Windows Q4 2024",
    platform: "google_ads" as const,
    market: "Dallas",
    trade: "bathroom",
    startDate: daysAgo(90),
    endDate: null,
    spend: 8500,
    leadsGenerated: 42,
  },
  {
    name: "Fort Worth Kitchen Campaign",
    platform: "meta" as const,
    market: "Fort Worth",
    trade: "kitchen",
    startDate: daysAgo(60),
    endDate: null,
    spend: 5200,
    leadsGenerated: 28,
  },
  {
    name: "DFW Exterior Blitz",
    platform: "google_ads" as const,
    market: "Dallas-Fort Worth",
    trade: "exterior",
    startDate: daysAgo(45),
    endDate: null,
    spend: 12000,
    leadsGenerated: 65,
  },
  {
    name: "TikTok Home Reno",
    platform: "tiktok" as const,
    market: "Dallas-Fort Worth",
    trade: "bathroom",
    startDate: daysAgo(30),
    endDate: null,
    spend: 3500,
    leadsGenerated: 35,
  },
  {
    name: "Summer Siding Special",
    platform: "meta" as const,
    market: "Plano",
    trade: "exterior",
    startDate: daysAgo(120),
    endDate: daysAgo(60),
    spend: 6800,
    leadsGenerated: 38,
  },
];

// ============ LEADS DATA ============
const leads = [
  {
    source: "google_ads" as const,
    campaignId: null,
    market: "Dallas",
    trade: "bathroom",
    customer: { name: "Amanda Green", phone: "(214) 555-1001", email: "amanda.g@email.com", address: { street: "101 First Street", city: "Dallas", state: "TX", zip: "75201" }, notes: null },
    quality: "hot" as const,
    status: "new" as const,
    assignedTo: null,
    assignedType: null,
    returnReason: null,
    returnedAt: null,
    createdAt: daysAgo(2),
  },
  {
    source: "meta" as const,
    campaignId: null,
    market: "Fort Worth",
    trade: "kitchen",
    customer: { name: "Brian Taylor", phone: "(817) 555-1002", email: "b.taylor@email.com", address: { street: "202 Second Ave", city: "Fort Worth", state: "TX", zip: "76102" }, notes: null },
    quality: "warm" as const,
    status: "contacted" as const,
    assignedTo: "contractor-005",
    assignedType: "internal" as const,
    returnReason: null,
    returnedAt: null,
    createdAt: daysAgo(5),
  },
  {
    source: "referral" as const,
    campaignId: null,
    market: "Plano",
    trade: "exterior",
    customer: { name: "Carol Martinez", phone: "(972) 555-1003", email: "c.martinez@email.com", address: { street: "303 Third Blvd", city: "Plano", state: "TX", zip: "75074" }, notes: null },
    quality: "hot" as const,
    status: "qualified" as const,
    assignedTo: "contractor-005",
    assignedType: "internal" as const,
    returnReason: null,
    returnedAt: null,
    createdAt: daysAgo(8),
  },
  {
    source: "google_ads" as const,
    campaignId: null,
    market: "Arlington",
    trade: "bathroom",
    customer: { name: "Dennis Lee", phone: "(469) 555-1004", email: "d.lee@email.com", address: { street: "404 Fourth Lane", city: "Arlington", state: "TX", zip: "76010" }, notes: null },
    quality: "warm" as const,
    status: "new" as const,
    assignedTo: null,
    assignedType: null,
    returnReason: null,
    returnedAt: null,
    createdAt: daysAgo(1),
  },
  {
    source: "tiktok" as const,
    campaignId: null,
    market: "Dallas",
    trade: "kitchen",
    customer: { name: "Emily Chen", phone: "(214) 555-1005", email: "e.chen@email.com", address: { street: "505 Fifth Court", city: "Irving", state: "TX", zip: "75039" }, notes: null },
    quality: "hot" as const,
    status: "converted" as const,
    assignedTo: "contractor-005",
    assignedType: "internal" as const,
    returnReason: null,
    returnedAt: null,
    createdAt: daysAgo(15),
  },
  {
    source: "meta" as const,
    campaignId: null,
    market: "Fort Worth",
    trade: "exterior",
    customer: { name: "Frank Anderson", phone: "(817) 555-1006", email: "f.anderson@email.com", address: { street: "606 Sixth Drive", city: "Fort Worth", state: "TX", zip: "76103" }, notes: null },
    quality: "cold" as const,
    status: "lost" as const,
    assignedTo: "contractor-005",
    assignedType: "internal" as const,
    returnReason: null,
    returnedAt: null,
    createdAt: daysAgo(20),
  },
  {
    source: "google_ads" as const,
    campaignId: null,
    market: "Dallas",
    trade: "bathroom",
    customer: { name: "Grace Kim", phone: "(972) 555-1007", email: "g.kim@email.com", address: { street: "707 Seventh Way", city: "Plano", state: "TX", zip: "75075" }, notes: null },
    quality: "warm" as const,
    status: "assigned" as const,
    assignedTo: "contractor-005",
    assignedType: "internal" as const,
    returnReason: null,
    returnedAt: null,
    createdAt: daysAgo(4),
  },
  {
    source: "event" as const,
    campaignId: null,
    market: "Dallas",
    trade: "kitchen",
    customer: { name: "Henry Park", phone: "(469) 555-1008", email: "h.park@email.com", address: { street: "808 Eighth Place", city: "McKinney", state: "TX", zip: "75070" }, notes: null },
    quality: "hot" as const,
    status: "new" as const,
    assignedTo: null,
    assignedType: null,
    returnReason: null,
    returnedAt: null,
    createdAt: daysAgo(0),
  },
];

// ============ SUBSCRIPTIONS DATA ============
const subscriptions = [
  {
    userId: "subscriber-001",
    tier: "starter" as const,
    monthlyFee: 399,
    adSpendMin: 600,
    leadCap: 15,
    status: "active" as const,
    startDate: daysAgo(90),
    billingCycle: daysFromNow(10),
  },
  {
    userId: "subscriber-002",
    tier: "growth" as const,
    monthlyFee: 899,
    adSpendMin: 900,
    leadCap: 25,
    status: "active" as const,
    startDate: daysAgo(180),
    billingCycle: daysFromNow(5),
  },
  {
    userId: "subscriber-003",
    tier: "pro" as const,
    monthlyFee: 1499,
    adSpendMin: 1500,
    leadCap: 50,
    status: "active" as const,
    startDate: daysAgo(365),
    billingCycle: daysFromNow(15),
  },
  {
    userId: "subscriber-004",
    tier: "starter" as const,
    monthlyFee: 399,
    adSpendMin: 600,
    leadCap: 15,
    status: "paused" as const,
    startDate: daysAgo(120),
    billingCycle: daysAgo(5),
  },
];

// ============ INVOICES DATA ============
const invoices = [
  // KR invoices (to customers)
  {
    invoiceNumber: "INV-KR-001",
    from: { entity: "kr" as const, name: "Key Renovations" },
    to: { type: "customer" as const, name: "John & Mary Smith", email: "smithfamily@email.com" },
    lineItems: [
      { description: "Master Bathroom Renovation", qty: 1, rate: 25000, total: 25000 },
    ],
    subtotal: 25000,
    tax: 0,
    total: 25000,
    status: "paid" as const,
    dueDate: daysAgo(40),
    paidAt: daysAgo(35),
    jobId: null,
  },
  {
    invoiceNumber: "INV-KR-002",
    from: { entity: "kr" as const, name: "Key Renovations" },
    to: { type: "customer" as const, name: "Sarah Johnson", email: "sarah.j@email.com" },
    lineItems: [
      { description: "Kitchen Remodel - Deposit", qty: 1, rate: 15000, total: 15000 },
    ],
    subtotal: 15000,
    tax: 0,
    total: 15000,
    status: "paid" as const,
    dueDate: daysAgo(65),
    paidAt: daysAgo(63),
    jobId: null,
  },
  {
    invoiceNumber: "INV-KR-003",
    from: { entity: "kr" as const, name: "Key Renovations" },
    to: { type: "customer" as const, name: "Sarah Johnson", email: "sarah.j@email.com" },
    lineItems: [
      { description: "Kitchen Remodel - Final Balance", qty: 1, rate: 23000, total: 23000 },
    ],
    subtotal: 23000,
    tax: 0,
    total: 23000,
    status: "sent" as const,
    dueDate: daysAgo(3),
    paidAt: null,
    jobId: null,
  },
  {
    invoiceNumber: "INV-KR-004",
    from: { entity: "kr" as const, name: "Key Renovations" },
    to: { type: "customer" as const, name: "Mike Williams", email: "mike.w@email.com" },
    lineItems: [
      { description: "Exterior Siding - Deposit (50%)", qty: 1, rate: 24000, total: 24000 },
    ],
    subtotal: 24000,
    tax: 0,
    total: 24000,
    status: "paid" as const,
    dueDate: daysAgo(35),
    paidAt: daysAgo(33),
    jobId: null,
  },
  // KTS invoices (to contractors for labor)
  {
    invoiceNumber: "INV-KTS-001",
    from: { entity: "kts" as const, name: "Key Trade Solutions" },
    to: { type: "contractor" as const, id: "contractor-003", name: "Mike's Renovation Crew", email: "mike@renovationcrew.com" },
    lineItems: [
      { description: "Labor - Smith Bathroom (Job KR-2024-001)", qty: 1, rate: 4200, total: 4200 },
      { description: "Commission (10%)", qty: 1, rate: 420, total: 420 },
    ],
    subtotal: 4620,
    tax: 0,
    total: 4620,
    status: "paid" as const,
    dueDate: daysAgo(30),
    paidAt: daysAgo(28),
    jobId: null,
  },
  {
    invoiceNumber: "INV-KTS-002",
    from: { entity: "kts" as const, name: "Key Trade Solutions" },
    to: { type: "contractor" as const, id: "contractor-003", name: "Mike's Renovation Crew", email: "mike@renovationcrew.com" },
    lineItems: [
      { description: "Labor - Johnson Kitchen (Job KR-2024-002)", qty: 1, rate: 8200, total: 8200 },
      { description: "Commission (10%)", qty: 1, rate: 820, total: 820 },
    ],
    subtotal: 9020,
    tax: 0,
    total: 9020,
    status: "sent" as const,
    dueDate: daysFromNow(7),
    paidAt: null,
    jobId: null,
  },
  // KD invoices (lead fees and subscriptions)
  {
    invoiceNumber: "INV-KD-001",
    from: { entity: "kd" as const, name: "Keynote Digital" },
    to: { type: "subscriber" as const, id: "subscriber-003", name: "Premier Home Solutions", email: "leads@premierhome.com" },
    lineItems: [
      { description: "Monthly Subscription - Pro Tier", qty: 1, rate: 1499, total: 1499 },
      { description: "Ad Spend Management", qty: 1, rate: 1500, total: 1500 },
    ],
    subtotal: 2999,
    tax: 0,
    total: 2999,
    status: "paid" as const,
    dueDate: daysAgo(20),
    paidAt: daysAgo(18),
    jobId: null,
  },
  {
    invoiceNumber: "INV-KD-002",
    from: { entity: "kd" as const, name: "Keynote Digital" },
    to: { type: "subscriber" as const, id: "subscriber-002", name: "DFW Roofing Pros", email: "sales@dfwroofing.com" },
    lineItems: [
      { description: "Monthly Subscription - Growth Tier", qty: 1, rate: 899, total: 899 },
      { description: "Ad Spend Management", qty: 1, rate: 900, total: 900 },
    ],
    subtotal: 1799,
    tax: 0,
    total: 1799,
    status: "paid" as const,
    dueDate: daysAgo(25),
    paidAt: daysAgo(24),
    jobId: null,
  },
  {
    invoiceNumber: "INV-KD-003",
    from: { entity: "kd" as const, name: "Keynote Digital" },
    to: { type: "subscriber" as const, id: "subscriber-001", name: "North Texas Windows", email: "info@ntxwindows.com" },
    lineItems: [
      { description: "Monthly Subscription - Starter Tier", qty: 1, rate: 399, total: 399 },
      { description: "Ad Spend Management", qty: 1, rate: 600, total: 600 },
    ],
    subtotal: 999,
    tax: 0,
    total: 999,
    status: "sent" as const,
    dueDate: daysFromNow(10),
    paidAt: null,
    jobId: null,
  },
  // Intercompany invoice (KD to KR for lead fee)
  {
    invoiceNumber: "INV-KD-IC-001",
    from: { entity: "kd" as const, name: "Keynote Digital" },
    to: { type: "intercompany" as const, entity: "kr" as const, name: "Key Renovations" },
    lineItems: [
      { description: "Lead Fee - Martinez (converted)", qty: 1, rate: 150, total: 150 },
      { description: "Lead Fee - Smith (converted)", qty: 1, rate: 150, total: 150 },
    ],
    subtotal: 300,
    tax: 0,
    total: 300,
    status: "paid" as const,
    dueDate: daysAgo(30),
    paidAt: daysAgo(28),
    jobId: null,
  },
  // More historical paid invoices for revenue chart
  {
    invoiceNumber: "INV-KR-H001",
    from: { entity: "kr" as const, name: "Key Renovations" },
    to: { type: "customer" as const, name: "Historical Customer 1", email: "hist1@email.com" },
    lineItems: [{ description: "Bathroom Renovation", qty: 1, rate: 18000, total: 18000 }],
    subtotal: 18000, tax: 0, total: 18000,
    status: "paid" as const,
    dueDate: daysAgo(120),
    paidAt: daysAgo(118),
    jobId: null,
  },
  {
    invoiceNumber: "INV-KR-H002",
    from: { entity: "kr" as const, name: "Key Renovations" },
    to: { type: "customer" as const, name: "Historical Customer 2", email: "hist2@email.com" },
    lineItems: [{ description: "Kitchen Renovation", qty: 1, rate: 32000, total: 32000 }],
    subtotal: 32000, tax: 0, total: 32000,
    status: "paid" as const,
    dueDate: daysAgo(95),
    paidAt: daysAgo(92),
    jobId: null,
  },
  {
    invoiceNumber: "INV-KD-H001",
    from: { entity: "kd" as const, name: "Keynote Digital" },
    to: { type: "subscriber" as const, id: "subscriber-003", name: "Premier Home Solutions", email: "leads@premierhome.com" },
    lineItems: [{ description: "Monthly Subscription + Ad Spend", qty: 1, rate: 2999, total: 2999 }],
    subtotal: 2999, tax: 0, total: 2999,
    status: "paid" as const,
    dueDate: daysAgo(50),
    paidAt: daysAgo(48),
    jobId: null,
  },
  {
    invoiceNumber: "INV-KTS-H001",
    from: { entity: "kts" as const, name: "Key Trade Solutions" },
    to: { type: "contractor" as const, id: "contractor-001", name: "ABC Installations LLC", email: "abc@install.com" },
    lineItems: [{ description: "Labor + Commission", qty: 1, rate: 5500, total: 5500 }],
    subtotal: 5500, tax: 0, total: 5500,
    status: "paid" as const,
    dueDate: daysAgo(60),
    paidAt: daysAgo(58),
    jobId: null,
  },
];

type SeedCategory = 'contractors' | 'jobs' | 'campaigns' | 'leads' | 'subscriptions' | 'invoices';

const SEED_CATEGORIES = [
  { id: 'contractors' as SeedCategory, label: 'Contractors', icon: Users, count: contractors.length, route: '/kts', collection: 'contractors' },
  { id: 'jobs' as SeedCategory, label: 'Jobs', icon: Briefcase, count: jobs.length, route: '/kr', collection: 'jobs' },
  { id: 'campaigns' as SeedCategory, label: 'Campaigns', icon: Megaphone, count: campaigns.length, route: '/kd/campaigns', collection: 'campaigns' },
  { id: 'leads' as SeedCategory, label: 'Leads', icon: Target, count: leads.length, route: '/kd', collection: 'leads' },
  { id: 'subscriptions' as SeedCategory, label: 'Subscriptions', icon: CreditCard, count: subscriptions.length, route: '/kd/subscribers', collection: 'subscriptions' },
  { id: 'invoices' as SeedCategory, label: 'Invoices', icon: DollarSign, count: invoices.length, route: '/financials/invoices', collection: 'invoices' },
];

export default function SeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [seeding, setSeeding] = useState<SeedCategory | null>(null);
  const [clearing, setClearing] = useState<SeedCategory | null>(null);
  const [results, setResults] = useState<Record<SeedCategory, { success: number; failed: number }>>({
    contractors: { success: 0, failed: 0 },
    jobs: { success: 0, failed: 0 },
    campaigns: { success: 0, failed: 0 },
    leads: { success: 0, failed: 0 },
    subscriptions: { success: 0, failed: 0 },
    invoices: { success: 0, failed: 0 },
  });
  const [seedingAll, setSeedingAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [seedingTestUsers, setSeedingTestUsers] = useState(false);
  const [deletingTestUsers, setDeletingTestUsers] = useState(false);
  const [testUserResult, setTestUserResult] = useState<{ success: boolean; message: string } | null>(null);

  // Only allow owner/admin
  if (user?.role !== 'owner' && user?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-400">Access denied. Admin only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const seedCollection = async (collectionName: string, data: any[]) => {
    let success = 0;
    let failed = 0;
    for (const item of data) {
      try {
        await addDoc(collection(db, collectionName), {
          ...item,
          createdAt: item.createdAt || Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        success++;
      } catch (err) {
        console.error(`Error adding to ${collectionName}:`, err);
        failed++;
      }
    }
    return { success, failed };
  };

  const clearCollection = async (collectionName: string) => {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const deletePromises = snapshot.docs.map((d) => deleteDoc(doc(db, collectionName, d.id)));
      await Promise.all(deletePromises);
      return snapshot.size;
    } catch (err) {
      console.error(`Error clearing ${collectionName}:`, err);
      return 0;
    }
  };

  const handleSeedCategory = async (category: SeedCategory) => {
    setSeeding(category);
    let result = { success: 0, failed: 0 };

    switch (category) {
      case 'contractors':
        result = await seedCollection('contractors', contractors);
        break;
      case 'jobs':
        result = await seedCollection('jobs', jobs);
        break;
      case 'campaigns':
        result = await seedCollection('campaigns', campaigns);
        break;
      case 'leads':
        result = await seedCollection('leads', leads);
        break;
      case 'subscriptions':
        result = await seedCollection('subscriptions', subscriptions);
        break;
      case 'invoices':
        result = await seedCollection('invoices', invoices);
        break;
    }

    setResults(prev => ({ ...prev, [category]: result }));
    setSeeding(null);
  };

  const handleClearCategory = async (category: SeedCategory) => {
    setClearing(category);
    const cat = SEED_CATEGORIES.find(c => c.id === category);
    if (cat) {
      await clearCollection(cat.collection);
    }
    setResults(prev => ({ ...prev, [category]: { success: 0, failed: 0 } }));
    setClearing(null);
  };

  const handleSeedAll = async () => {
    setSeedingAll(true);

    for (const category of SEED_CATEGORIES) {
      let data: any[] = [];
      switch (category.id) {
        case 'contractors': data = contractors; break;
        case 'jobs': data = jobs; break;
        case 'campaigns': data = campaigns; break;
        case 'leads': data = leads; break;
        case 'subscriptions': data = subscriptions; break;
        case 'invoices': data = invoices; break;
      }
      const result = await seedCollection(category.collection, data);
      setResults(prev => ({ ...prev, [category.id]: result }));
    }

    setSeedingAll(false);
  };

  const handleClearAll = async () => {
    setClearingAll(true);

    for (const category of SEED_CATEGORIES) {
      await clearCollection(category.collection);
      setResults(prev => ({ ...prev, [category.id]: { success: 0, failed: 0 } }));
    }

    setClearingAll(false);
  };

  const handleSeedTestUsers = async () => {
    setSeedingTestUsers(true);
    setTestUserResult(null);
    try {
      const seedTestUsers = httpsCallable(functions, 'seedTestUsers');
      const result = await seedTestUsers({});
      const data = result.data as { success: boolean; message: string };
      setTestUserResult({ success: true, message: data.message });
    } catch (error: any) {
      console.error('Error seeding test users:', error);
      setTestUserResult({ success: false, message: error.message || 'Failed to seed test users' });
    }
    setSeedingTestUsers(false);
  };

  const handleDeleteTestUsers = async () => {
    setDeletingTestUsers(true);
    setTestUserResult(null);
    try {
      const deleteTestUsers = httpsCallable(functions, 'deleteTestUsers');
      const result = await deleteTestUsers({});
      const data = result.data as { success: boolean; message: string };
      setTestUserResult({ success: true, message: data.message });
    } catch (error: any) {
      console.error('Error deleting test users:', error);
      setTestUserResult({ success: false, message: error.message || 'Failed to delete test users' });
    }
    setDeletingTestUsers(false);
  };

  const totalSeeded = Object.values(results).reduce((acc, r) => acc + r.success, 0);
  const totalRecords = SEED_CATEGORIES.reduce((acc, c) => acc + c.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Seed Test Data</h1>
        <p className="text-gray-400 mt-1">Add realistic test data to see the dashboard and all modules working together.</p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 flex-wrap">
        <Button onClick={handleSeedAll} disabled={seedingAll || clearingAll || seeding !== null}>
          {seedingAll ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Seeding...
            </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              Seed All ({totalRecords} records)
            </>
          )}
        </Button>
        <Button variant="outline" onClick={handleClearAll} disabled={seedingAll || clearingAll || clearing !== null}>
          {clearingAll ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Clearing...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </>
          )}
        </Button>
        <Button variant="outline" onClick={() => router.push('/overview')}>
          View Dashboard
        </Button>
      </div>

      {/* Results Summary */}
      {totalSeeded > 0 && (
        <Card className="border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">{totalSeeded} records created successfully</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SEED_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const categoryResults = results[category.id];
          const isSeeding = seeding === category.id;
          const isClearing = clearing === category.id;

          return (
            <Card key={category.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="w-5 h-5 text-brand-gold" />
                  {category.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-400">{category.count} records</p>

                {categoryResults.success > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">{categoryResults.success} added</span>
                    {categoryResults.failed > 0 && (
                      <>
                        <XCircle className="w-4 h-4 text-red-400 ml-2" />
                        <span className="text-red-400">{categoryResults.failed} failed</span>
                      </>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSeedCategory(category.id)}
                    disabled={seeding !== null || seedingAll || clearingAll}
                    className="flex-1"
                  >
                    {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleClearCategory(category.id)}
                    disabled={clearing !== null || seedingAll || clearingAll}
                  >
                    {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(category.route)}
                  >
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Test Users for Playwright */}
      <Card className="border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-purple-400" />
            Playwright Test Users
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-400">
            Create test user accounts for automated Playwright E2E tests. Each role gets a dedicated test account.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div className="bg-gray-800 rounded px-3 py-2">owner@keyhub.test</div>
            <div className="bg-gray-800 rounded px-3 py-2">admin@keyhub.test</div>
            <div className="bg-gray-800 rounded px-3 py-2">salesrep@keyhub.test</div>
            <div className="bg-gray-800 rounded px-3 py-2">contractor@keyhub.test</div>
            <div className="bg-gray-800 rounded px-3 py-2">pm@keyhub.test</div>
            <div className="bg-gray-800 rounded px-3 py-2">subscriber@keyhub.test</div>
            <div className="bg-gray-800 rounded px-3 py-2">partner@keyhub.test</div>
            <div className="bg-gray-800 rounded px-3 py-2">pending@keyhub.test</div>
          </div>

          <p className="text-xs text-gray-500">
            All accounts use password: <code className="bg-gray-800 px-1 rounded">TestPassword123!</code>
          </p>

          {testUserResult && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded ${testUserResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {testUserResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testUserResult.message}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSeedTestUsers}
              disabled={seedingTestUsers || deletingTestUsers}
              className="flex-1"
            >
              {seedingTestUsers ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Test Users
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteTestUsers}
              disabled={seedingTestUsers || deletingTestUsers}
            >
              {deletingTestUsers ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* What This Creates */}
      <Card>
        <CardHeader>
          <CardTitle>What This Creates</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-400 space-y-2">
          <p><strong className="text-white">Contractors (7):</strong> Mix of active installers, sales reps, PMs, and service techs with various ratings</p>
          <p><strong className="text-white">Jobs (7):</strong> Various stages from lead to paid-in-full across bathroom, kitchen, and exterior types</p>
          <p><strong className="text-white">Campaigns (5):</strong> Active and completed campaigns across Google, Meta, and TikTok</p>
          <p><strong className="text-white">Leads (8):</strong> Various statuses from new to converted, different sources and quality levels</p>
          <p><strong className="text-white">Subscriptions (4):</strong> Starter, Growth, and Pro tiers with active and paused statuses</p>
          <p><strong className="text-white">Invoices (14):</strong> Mix of KR customer invoices, KTS contractor payments, KD subscriptions, and intercompany - includes paid and outstanding</p>
        </CardContent>
      </Card>
    </div>
  );
}
