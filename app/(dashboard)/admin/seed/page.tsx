'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

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

export default function SeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [results, setResults] = useState<{ name: string; success: boolean; id?: string; error?: string }[]>([]);

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

  const handleSeed = async () => {
    setSeeding(true);
    setResults([]);

    for (const contractor of contractors) {
      try {
        const docRef = await addDoc(collection(db, 'contractors'), {
          ...contractor,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        setResults(prev => [...prev, { name: contractor.businessName, success: true, id: docRef.id }]);
      } catch (err) {
        setResults(prev => [...prev, {
          name: contractor.businessName,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }]);
      }
    }

    setSeeding(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Seed Test Data</h1>
        <p className="text-gray-400 mt-1">Add sample contractors for testing.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contractors to Add</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm">
            {contractors.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-white">{c.businessName}</span>
                <span className="text-gray-500">- {c.address.city}, {c.address.state}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${c.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {c.status}
                </span>
              </li>
            ))}
          </ul>

          <Button onClick={handleSeed} disabled={seeding} className="w-full">
            {seeding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Test Contractors'
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {results.map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  {r.success ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className={r.success ? 'text-white' : 'text-red-400'}>
                    {r.name}
                  </span>
                  {r.success && <span className="text-gray-500">({r.id})</span>}
                  {r.error && <span className="text-red-400">- {r.error}</span>}
                </li>
              ))}
            </ul>

            {results.every(r => r.success) && (
              <Button
                variant="outline"
                onClick={() => router.push('/kts')}
                className="mt-4 w-full"
              >
                View Contractors →
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
