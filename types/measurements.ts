import { Timestamp } from 'firebase/firestore';

export type MeasurementSystemType = 'tub_wall' | 'shower_wall';
export type ColorFamily = 'standard' | 'premium';
export type WallStyle = 'smooth' | 'simulated_tile';
export type MeasurementReference = 'ceiling' | 'top_of_tile';

export interface WallMeasurements {
  // Labeled A-H matching the form diagram
  leftSidewallHeight: number | null;    // A
  leftSidewallDepth: number | null;     // B
  soapDishWallHeight: number | null;    // C
  soapDishWallWidth: number | null;     // D
  rightSidewallDepth: number | null;    // E
  rightSidewallHeight: number | null;   // F
  leftLegDepth: number | null;          // G
  rightLegDepth: number | null;         // H
  // Window kit (optional)
  windowHeight: number | null;
  windowWidth: number | null;
  windowDepth: number | null;
}

export interface MeasurementSet {
  id: string;
  systemType: MeasurementSystemType;
  colorFamily: ColorFamily;
  colorName: string;
  tileName: string;
  style: WallStyle;
  measurementReference: MeasurementReference;
  measurements: WallMeasurements;
  notes: string;
  measuredBy: string;
  measuredByName: string;
  measuredAt: Timestamp;
  updatedAt: Timestamp;
}

export interface JobMeasurementsData {
  sets: MeasurementSet[];
  // Uploaded PDF alternative
  uploadedFormUrl?: string;
  uploadedFormName?: string;
  uploadedAt?: Timestamp;
}

// Default empty measurements
export const EMPTY_WALL_MEASUREMENTS: WallMeasurements = {
  leftSidewallHeight: null,
  leftSidewallDepth: null,
  soapDishWallHeight: null,
  soapDishWallWidth: null,
  rightSidewallDepth: null,
  rightSidewallHeight: null,
  leftLegDepth: null,
  rightLegDepth: null,
  windowHeight: null,
  windowWidth: null,
  windowDepth: null,
};

// Measurement labels for the diagram
export const MEASUREMENT_LABELS: Record<keyof Omit<WallMeasurements, 'windowHeight' | 'windowWidth' | 'windowDepth'>, string> = {
  leftSidewallHeight: 'A',
  leftSidewallDepth: 'B',
  soapDishWallHeight: 'C',
  soapDishWallWidth: 'D',
  rightSidewallDepth: 'E',
  rightSidewallHeight: 'F',
  leftLegDepth: 'G',
  rightLegDepth: 'H',
};

// Human-readable field names
export const MEASUREMENT_FIELD_NAMES: Record<keyof WallMeasurements, string> = {
  leftSidewallHeight: 'Left Sidewall Height',
  leftSidewallDepth: 'Left Sidewall Depth',
  soapDishWallHeight: 'Soap Dish Wall Height',
  soapDishWallWidth: 'Soap Dish Wall Width',
  rightSidewallDepth: 'Right Sidewall Depth',
  rightSidewallHeight: 'Right Sidewall Height',
  leftLegDepth: 'Left Leg Depth',
  rightLegDepth: 'Right Leg Depth',
  windowHeight: 'Window Height',
  windowWidth: 'Window Width',
  windowDepth: 'Window Depth',
};
