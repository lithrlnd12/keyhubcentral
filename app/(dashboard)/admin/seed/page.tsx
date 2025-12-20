'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Loader2, CheckCircle, XCircle, Users, Briefcase, Target, Megaphone, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// ============ CONTRACTORS DATA ============
const contractors = [
  {
    userId: "test-user-001",
    businessName: "ABC Installations LLC",
    address: { street: "123 Main Street", city: "Dallas", state: "TX", zip: "75201", lat: 32.7767, lng: -96.7970 },
    trades: ["installer"],
    skills: ["Windows", "Doors", "Siding"],
    licenses: [],
    insurance: null,
    w9Url: null,
    achInfo: null,
    serviceRadius: 25,
    rating: { overall: 4.2, customer: 4.5, speed: 4.0, warranty: 4.0, internal: 4.0 },
    status: "active" as const,
  },
  {
    userId: "test-user-002",
    businessName: "Pro Home Services",
    address: { street: "456 Oak Avenue", city: "Fort Worth", state: "TX", zip: "76102", lat: 32.7555, lng: -97.3308 },
    trades: ["installer", "service_tech"],
    skills: ["HVAC", "Roofing", "Gutters"],
    licenses: [],
    insurance: null,
    w9Url: null,
    achInfo: null,
    serviceRadius: 30,
    rating: { overall: 4.7, customer: 4.8, speed: 4.5, warranty: 4.8, internal: 4.5 },
    status: "active" as const,
  },
  {
    userId: "test-user-003",
    businessName: "Quick Fix Renovations",
    address: { street: "789 Elm Boulevard", city: "Arlington", state: "TX", zip: "76010", lat: 32.7357, lng: -97.1081 },
    trades: ["sales_rep"],
    skills: ["Sales", "Customer Relations"],
    licenses: [],
    insurance: null,
    w9Url: null,
    achInfo: null,
    serviceRadius: 40,
    rating: { overall: 3.8, customer: 4.0, speed: 3.5, warranty: 3.8, internal: 4.0 },
    status: "active" as const,
  },
  {
    userId: "test-user-004",
    businessName: "Elite Window & Door",
    address: { street: "321 Cedar Lane", city: "Plano", state: "TX", zip: "75074", lat: 33.0198, lng: -96.6989 },
    trades: ["installer", "pm"],
    skills: ["Windows", "Doors", "Project Management"],
    licenses: [],
    insurance: null,
    w9Url: null,
    achInfo: null,
    serviceRadius: 35,
    rating: { overall: 4.9, customer: 5.0, speed: 4.8, warranty: 4.9, internal: 4.8 },
    status: "active" as const,
  },
  {
    userId: "test-user-005",
    businessName: "Texas Home Experts",
    address: { street: "555 Maple Drive", city: "Irving", state: "TX", zip: "75039", lat: 32.8140, lng: -96.9489 },
    trades: ["service_tech"],
    skills: ["Repairs", "Maintenance", "Inspections"],
    licenses: [],
    insurance: null,
    w9Url: null,
    achInfo: null,
    serviceRadius: 20,
    rating: { overall: 3.2, customer: 3.5, speed: 3.0, warranty: 3.0, internal: 3.2 },
    status: "pending" as const,
  },
];

// ============ JOBS DATA ============
const jobs = [
  {
    type: "windows" as const,
    customer: {
      name: "John Smith",
      email: "john.smith@email.com",
      phone: "(214) 555-0101",
      address: { street: "100 Residential Ave", city: "Dallas", state: "TX", zip: "75201" },
    },
    status: "sold" as const,
    salesRepId: "test-user-003",
    pmId: null,
    crewIds: [],
    pricing: { salePrice: 12500, cost: 7500, commission: 1250, profit: 3750 },
    dates: { lead: Timestamp.fromDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)), sold: Timestamp.now() },
    warranty: { type: "standard" as const, expiresAt: Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) },
    notes: "Customer wants energy-efficient windows throughout.",
    photos: [],
  },
  {
    type: "doors" as const,
    customer: {
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      phone: "(817) 555-0202",
      address: { street: "200 Oak Street", city: "Fort Worth", state: "TX", zip: "76102" },
    },
    status: "production" as const,
    salesRepId: "test-user-003",
    pmId: "test-user-004",
    crewIds: ["test-user-001"],
    pricing: { salePrice: 8900, cost: 5200, commission: 890, profit: 2810 },
    dates: {
      lead: Timestamp.fromDate(new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)),
      sold: Timestamp.fromDate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)),
    },
    warranty: { type: "standard" as const, expiresAt: Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) },
    notes: "Front entry door and 2 side doors.",
    photos: [],
  },
  {
    type: "siding" as const,
    customer: {
      name: "Mike Williams",
      email: "mike.w@email.com",
      phone: "(972) 555-0303",
      address: { street: "300 Elm Road", city: "Plano", state: "TX", zip: "75074" },
    },
    status: "scheduled" as const,
    salesRepId: "test-user-003",
    pmId: "test-user-004",
    crewIds: ["test-user-001", "test-user-002"],
    pricing: { salePrice: 24000, cost: 14500, commission: 2400, profit: 7100 },
    dates: {
      lead: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      sold: Timestamp.fromDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)),
      scheduled: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    },
    warranty: { type: "extended" as const, expiresAt: Timestamp.fromDate(new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000)) },
    notes: "Full house siding replacement - James Hardie.",
    photos: [],
  },
  {
    type: "roofing" as const,
    customer: {
      name: "Lisa Brown",
      email: "lisa.b@email.com",
      phone: "(469) 555-0404",
      address: { street: "400 Pine Lane", city: "Arlington", state: "TX", zip: "76010" },
    },
    status: "complete" as const,
    salesRepId: "test-user-003",
    pmId: "test-user-004",
    crewIds: ["test-user-002"],
    pricing: { salePrice: 18500, cost: 11000, commission: 1850, profit: 5650 },
    dates: {
      lead: Timestamp.fromDate(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)),
      sold: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      scheduled: Timestamp.fromDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)),
      started: Timestamp.fromDate(new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)),
      completed: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    },
    warranty: { type: "lifetime" as const, expiresAt: null },
    notes: "Complete roof replacement - architectural shingles.",
    photos: [],
  },
  {
    type: "windows" as const,
    customer: {
      name: "Robert Davis",
      email: "r.davis@email.com",
      phone: "(214) 555-0505",
      address: { street: "500 Maple Court", city: "Irving", state: "TX", zip: "75039" },
    },
    status: "lead" as const,
    salesRepId: null,
    pmId: null,
    crewIds: [],
    pricing: { salePrice: 0, cost: 0, commission: 0, profit: 0 },
    dates: { lead: Timestamp.now() },
    warranty: null,
    notes: "Interested in replacement windows - 8 windows total.",
    photos: [],
  },
];

// ============ CAMPAIGNS DATA ============
const campaigns = [
  {
    name: "Dallas Metro Windows Q4",
    platform: "google_ads" as const,
    market: "Dallas-Fort Worth",
    trade: "windows",
    startDate: Timestamp.fromDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)),
    endDate: null,
    spend: 4500,
    leadsGenerated: 45,
  },
  {
    name: "Facebook Doors Campaign",
    platform: "facebook" as const,
    market: "Dallas-Fort Worth",
    trade: "doors",
    startDate: Timestamp.fromDate(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)),
    endDate: null,
    spend: 2800,
    leadsGenerated: 32,
  },
  {
    name: "Roofing Storm Season",
    platform: "google_ads" as const,
    market: "Dallas-Fort Worth",
    trade: "roofing",
    startDate: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    endDate: null,
    spend: 6200,
    leadsGenerated: 58,
  },
  {
    name: "Instagram Siding Showcase",
    platform: "instagram" as const,
    market: "Dallas-Fort Worth",
    trade: "siding",
    startDate: Timestamp.fromDate(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)),
    endDate: null,
    spend: 1500,
    leadsGenerated: 18,
  },
  {
    name: "Nextdoor Home Improvement",
    platform: "nextdoor" as const,
    market: "Dallas-Fort Worth",
    trade: "windows",
    startDate: Timestamp.fromDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
    endDate: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    spend: 3200,
    leadsGenerated: 28,
  },
];

// ============ LEADS DATA ============
const leads = [
  {
    source: "google_ads" as const,
    campaignId: null, // Will be linked after campaigns are created
    market: "Dallas-Fort Worth",
    trade: "windows",
    customer: {
      name: "Amanda Green",
      email: "amanda.g@email.com",
      phone: "(214) 555-1001",
      address: { street: "101 First Street", city: "Dallas", state: "TX", zip: "75201" },
    },
    quality: "hot" as const,
    status: "new" as const,
    assignedTo: null,
    assignedType: null,
    returnReason: null,
    returnedAt: null,
  },
  {
    source: "facebook" as const,
    campaignId: null,
    market: "Dallas-Fort Worth",
    trade: "doors",
    customer: {
      name: "Brian Taylor",
      email: "b.taylor@email.com",
      phone: "(817) 555-1002",
      address: { street: "202 Second Ave", city: "Fort Worth", state: "TX", zip: "76102" },
    },
    quality: "warm" as const,
    status: "contacted" as const,
    assignedTo: "test-user-003",
    assignedType: "internal" as const,
    returnReason: null,
    returnedAt: null,
  },
  {
    source: "referral" as const,
    campaignId: null,
    market: "Dallas-Fort Worth",
    trade: "roofing",
    customer: {
      name: "Carol Martinez",
      email: "c.martinez@email.com",
      phone: "(972) 555-1003",
      address: { street: "303 Third Blvd", city: "Plano", state: "TX", zip: "75074" },
    },
    quality: "hot" as const,
    status: "quoted" as const,
    assignedTo: "test-user-003",
    assignedType: "internal" as const,
    returnReason: null,
    returnedAt: null,
  },
  {
    source: "google_ads" as const,
    campaignId: null,
    market: "Dallas-Fort Worth",
    trade: "siding",
    customer: {
      name: "David Wilson",
      email: "d.wilson@email.com",
      phone: "(469) 555-1004",
      address: { street: "404 Fourth Lane", city: "Arlington", state: "TX", zip: "76010" },
    },
    quality: "cold" as const,
    status: "new" as const,
    assignedTo: null,
    assignedType: null,
    returnReason: null,
    returnedAt: null,
  },
  {
    source: "website" as const,
    campaignId: null,
    market: "Dallas-Fort Worth",
    trade: "windows",
    customer: {
      name: "Emily Harris",
      email: "e.harris@email.com",
      phone: "(214) 555-1005",
      address: { street: "505 Fifth Court", city: "Irving", state: "TX", zip: "75039" },
    },
    quality: "warm" as const,
    status: "converted" as const,
    assignedTo: "test-user-003",
    assignedType: "internal" as const,
    returnReason: null,
    returnedAt: null,
  },
  {
    source: "instagram" as const,
    campaignId: null,
    market: "Dallas-Fort Worth",
    trade: "doors",
    customer: {
      name: "Frank Anderson",
      email: "f.anderson@email.com",
      phone: "(817) 555-1006",
      address: { street: "606 Sixth Drive", city: "Fort Worth", state: "TX", zip: "76103" },
    },
    quality: "hot" as const,
    status: "new" as const,
    assignedTo: null,
    assignedType: null,
    returnReason: null,
    returnedAt: null,
  },
  {
    source: "nextdoor" as const,
    campaignId: null,
    market: "Dallas-Fort Worth",
    trade: "roofing",
    customer: {
      name: "Grace Thompson",
      email: "g.thompson@email.com",
      phone: "(972) 555-1007",
      address: { street: "707 Seventh Way", city: "Plano", state: "TX", zip: "75075" },
    },
    quality: "warm" as const,
    status: "contacted" as const,
    assignedTo: null,
    assignedType: null,
    returnReason: null,
    returnedAt: null,
  },
  {
    source: "google_ads" as const,
    campaignId: null,
    market: "Dallas-Fort Worth",
    trade: "windows",
    customer: {
      name: "Henry Lee",
      email: "h.lee@email.com",
      phone: "(469) 555-1008",
      address: { street: "808 Eighth Place", city: "Arlington", state: "TX", zip: "76011" },
    },
    quality: "cold" as const,
    status: "lost" as const,
    assignedTo: "test-user-003",
    assignedType: "internal" as const,
    returnReason: null,
    returnedAt: null,
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
    leadsDelivered: 8,
    status: "active" as const,
    startDate: Timestamp.fromDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)),
    billingCycle: Timestamp.fromDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)),
    coverageAreas: ["Dallas", "Irving"],
    trades: ["windows", "doors"],
    companyName: "North Texas Windows",
    contactEmail: "info@ntxwindows.com",
    contactPhone: "(214) 555-2001",
  },
  {
    userId: "subscriber-002",
    tier: "growth" as const,
    monthlyFee: 899,
    adSpendMin: 900,
    leadCap: 25,
    leadsDelivered: 18,
    status: "active" as const,
    startDate: Timestamp.fromDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
    billingCycle: Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
    coverageAreas: ["Fort Worth", "Arlington", "Mansfield"],
    trades: ["roofing", "siding"],
    companyName: "DFW Roofing Pros",
    contactEmail: "sales@dfwroofing.com",
    contactPhone: "(817) 555-2002",
  },
  {
    userId: "subscriber-003",
    tier: "pro" as const,
    monthlyFee: 1499,
    adSpendMin: 1500,
    leadCap: 50,
    leadsDelivered: 42,
    status: "active" as const,
    startDate: Timestamp.fromDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)),
    billingCycle: Timestamp.fromDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)),
    coverageAreas: ["Dallas", "Fort Worth", "Plano", "Arlington", "Irving"],
    trades: ["windows", "doors", "siding", "roofing"],
    companyName: "Premier Home Solutions",
    contactEmail: "leads@premierhome.com",
    contactPhone: "(972) 555-2003",
  },
  {
    userId: "subscriber-004",
    tier: "starter" as const,
    monthlyFee: 399,
    adSpendMin: 600,
    leadCap: 15,
    leadsDelivered: 15,
    status: "paused" as const,
    startDate: Timestamp.fromDate(new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)),
    billingCycle: Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
    coverageAreas: ["Plano", "McKinney"],
    trades: ["windows"],
    companyName: "Collin County Glass",
    contactEmail: "info@ccglass.com",
    contactPhone: "(469) 555-2004",
  },
];

type SeedCategory = 'contractors' | 'jobs' | 'campaigns' | 'leads' | 'subscriptions';

const SEED_CATEGORIES = [
  { id: 'contractors' as SeedCategory, label: 'Contractors', icon: Users, count: contractors.length, route: '/kts' },
  { id: 'jobs' as SeedCategory, label: 'Jobs', icon: Briefcase, count: jobs.length, route: '/kr' },
  { id: 'campaigns' as SeedCategory, label: 'Campaigns', icon: Megaphone, count: campaigns.length, route: '/kd/campaigns' },
  { id: 'leads' as SeedCategory, label: 'Leads', icon: Target, count: leads.length, route: '/kd' },
  { id: 'subscriptions' as SeedCategory, label: 'Subscriptions', icon: CreditCard, count: subscriptions.length, route: '/kd/subscribers' },
];

export default function SeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [seeding, setSeeding] = useState<SeedCategory | null>(null);
  const [results, setResults] = useState<Record<SeedCategory, { name: string; success: boolean; id?: string; error?: string }[]>>({
    contractors: [],
    jobs: [],
    campaigns: [],
    leads: [],
    subscriptions: [],
  });
  const [seedingAll, setSeedingAll] = useState(false);

  // Only allow owner/admin
  if (user?.role !== 'owner' && user?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500">Access denied. Admin only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const seedContractors = async () => {
    const categoryResults: typeof results.contractors = [];
    for (const contractor of contractors) {
      try {
        const docRef = await addDoc(collection(db, 'contractors'), {
          ...contractor,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        categoryResults.push({ name: contractor.businessName, success: true, id: docRef.id });
      } catch (err) {
        categoryResults.push({
          name: contractor.businessName,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }
    return categoryResults;
  };

  const seedJobs = async () => {
    const categoryResults: typeof results.jobs = [];
    for (const job of jobs) {
      try {
        const docRef = await addDoc(collection(db, 'jobs'), {
          ...job,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        categoryResults.push({ name: job.customer.name, success: true, id: docRef.id });
      } catch (err) {
        categoryResults.push({
          name: job.customer.name,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }
    return categoryResults;
  };

  const seedCampaigns = async () => {
    const categoryResults: typeof results.campaigns = [];
    for (const campaign of campaigns) {
      try {
        const docRef = await addDoc(collection(db, 'campaigns'), {
          ...campaign,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        categoryResults.push({ name: campaign.name, success: true, id: docRef.id });
      } catch (err) {
        categoryResults.push({
          name: campaign.name,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }
    return categoryResults;
  };

  const seedLeads = async () => {
    const categoryResults: typeof results.leads = [];
    for (const lead of leads) {
      try {
        const docRef = await addDoc(collection(db, 'leads'), {
          ...lead,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        categoryResults.push({ name: lead.customer.name, success: true, id: docRef.id });
      } catch (err) {
        categoryResults.push({
          name: lead.customer.name,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }
    return categoryResults;
  };

  const seedSubscriptions = async () => {
    const categoryResults: typeof results.subscriptions = [];
    for (const subscription of subscriptions) {
      try {
        const docRef = await addDoc(collection(db, 'subscriptions'), {
          ...subscription,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        categoryResults.push({ name: subscription.companyName, success: true, id: docRef.id });
      } catch (err) {
        categoryResults.push({
          name: subscription.companyName,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }
    return categoryResults;
  };

  const handleSeedCategory = async (category: SeedCategory) => {
    setSeeding(category);
    let categoryResults: typeof results.contractors = [];

    switch (category) {
      case 'contractors':
        categoryResults = await seedContractors();
        break;
      case 'jobs':
        categoryResults = await seedJobs();
        break;
      case 'campaigns':
        categoryResults = await seedCampaigns();
        break;
      case 'leads':
        categoryResults = await seedLeads();
        break;
      case 'subscriptions':
        categoryResults = await seedSubscriptions();
        break;
    }

    setResults(prev => ({ ...prev, [category]: categoryResults }));
    setSeeding(null);
  };

  const handleSeedAll = async () => {
    setSeedingAll(true);

    // Seed in order: contractors first (dependencies), then jobs, campaigns, leads, subscriptions
    const contractorResults = await seedContractors();
    setResults(prev => ({ ...prev, contractors: contractorResults }));

    const jobResults = await seedJobs();
    setResults(prev => ({ ...prev, jobs: jobResults }));

    const campaignResults = await seedCampaigns();
    setResults(prev => ({ ...prev, campaigns: campaignResults }));

    const leadResults = await seedLeads();
    setResults(prev => ({ ...prev, leads: leadResults }));

    const subscriptionResults = await seedSubscriptions();
    setResults(prev => ({ ...prev, subscriptions: subscriptionResults }));

    setSeedingAll(false);
  };

  const totalSeeded = Object.values(results).flat().filter(r => r.success).length;
  const totalErrors = Object.values(results).flat().filter(r => !r.success).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Seed Test Data</h1>
        <p className="text-gray-400 mt-1">Add sample data for testing all modules.</p>
      </div>

      {/* Seed All Button */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Seed All Data</p>
              <p className="text-sm text-gray-400">
                Add {contractors.length + jobs.length + campaigns.length + leads.length + subscriptions.length} records across all modules
              </p>
            </div>
            <Button onClick={handleSeedAll} disabled={seedingAll || seeding !== null}>
              {seedingAll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Seeding All...
                </>
              ) : (
                'Seed All'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SEED_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const categoryResults = results[category.id];
          const successCount = categoryResults.filter(r => r.success).length;
          const hasResults = categoryResults.length > 0;

          return (
            <Card key={category.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="w-5 h-5 text-brand-gold" />
                  {category.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-400">{category.count} records to add</p>

                {hasResults && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">{successCount} added</span>
                    {categoryResults.some(r => !r.success) && (
                      <>
                        <XCircle className="w-4 h-4 text-red-400 ml-2" />
                        <span className="text-red-400">
                          {categoryResults.filter(r => !r.success).length} failed
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSeedCategory(category.id)}
                    disabled={seeding !== null || seedingAll}
                    className="flex-1"
                  >
                    {seeding === category.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      `Add ${category.label}`
                    )}
                  </Button>
                  {hasResults && successCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(category.route)}
                    >
                      View
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Results Summary */}
      {(totalSeeded > 0 || totalErrors > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">{totalSeeded} records created</span>
              </div>
              {totalErrors > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-medium">{totalErrors} errors</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {SEED_CATEGORIES.map((category) => {
                const categoryResults = results[category.id];
                if (categoryResults.length === 0) return null;

                return (
                  <div key={category.id}>
                    <p className="text-sm font-medium text-gray-300 mb-2">{category.label}</p>
                    <ul className="space-y-1 text-sm">
                      {categoryResults.map((r, i) => (
                        <li key={i} className="flex items-center gap-2">
                          {r.success ? (
                            <CheckCircle className="w-3 h-3 text-green-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-400" />
                          )}
                          <span className={r.success ? 'text-gray-400' : 'text-red-400'}>
                            {r.name}
                          </span>
                          {r.error && <span className="text-red-400 text-xs">- {r.error}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
