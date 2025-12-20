// Run this in browser console while logged in as admin at your app URL
// Or copy to a temporary page component

const seedContractors = async () => {
  // Import Firebase from window (already loaded by the app)
  const { collection, addDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

  // Get the Firestore instance from the app
  const db = window.__FIREBASE_DB__ || (await import('/lib/firebase/config.js')).db;

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
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
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
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
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
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
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
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
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
      status: "pending",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  ];

  console.log('Adding contractors...');
  for (const contractor of contractors) {
    try {
      const docRef = await addDoc(collection(db, 'contractors'), contractor);
      console.log(`✓ Added: ${contractor.businessName} (${docRef.id})`);
    } catch (err) {
      console.error(`✗ Failed: ${contractor.businessName}`, err.message);
    }
  }
  console.log('Done!');
};

seedContractors();
