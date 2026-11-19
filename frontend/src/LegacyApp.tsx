import AssessmentPage from './AssessmentPage';
import AutomaticPostureAssessment from './AutomaticPostureAssessment';
import * as THREE from 'three';
import React, { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Bell, Camera, CheckCircle2, ChevronDown,
  ChevronRight, Clock, Cpu, DollarSign, Eye, EyeOff, Factory, FileText, Filter,
  Gauge, Info, Layers, LayoutDashboard, Maximize2, MessageSquarePlus, Move3d,
  Play, Plus, RefreshCw, RotateCcw, ShieldCheck, Sliders, Sparkles, Tag, Target,
  TrendingDown, TrendingUp, User, Users, Wrench, X, Zap, Check, Compass, Box
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, ComposedChart, Line
} from 'recharts';

// ============================================================================
// 1. DESIGN TOKENS & CONSTANTS
// ============================================================================
const STATUS_COLORS = {
  low: { hex: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Low' },
  moderate: { hex: '#F59E0B', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Moderate' },
  high: { hex: '#F97316', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', label: 'High' },
  critical: { hex: '#EF4444', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'Critical' },
};

const getRiskLevel = (score) => {
  if (score >= 75) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'moderate';
  return 'low';
};

// ============================================================================
// 2. CENTRALIZED SYNTHETIC DEMO DATA (src/data/*)
//    Context: LEONI Automotive Wiring Harness Assembly
//    ~430 wires/harness | ~13 harnesses/hr | 276s takt time
// ============================================================================
const WORKSTATIONS_DATA = {
  'LEONI-MONTAGE-01': {
    id: 'LEONI-MONTAGE-01',
    name: 'LEONI-MONTAGE-01',
    line: 'Harness Assembly Line A — Cockpit Module',
    wiresPerHarness: 430,
    harnessesPerHour: 13,
    taktTime: 276,
    participatingWorkers: 10,
    tableHeight: 95, // cm
    reachDistance: 55, // cm (baseline elevated reach)
    taskRepetition: 180, // reps/hr
    cycleTime: 276, // seconds
    connectorOrientation: 15, // degrees
    taskRotation: 20, // % rotation across shifts
    connectorZones: [
      {
        id: 'A',
        name: 'Connector Group A',
        x: -45,
        y: 80,
        z: 20,
        risk: 'critical',
        exposureScore: 81,
        associatedTask: 'Terminal insertion',
        bodyZones: ['Left Shoulder', 'Left Wrist', 'Neck'],
        reportedDiscomfort: 6.8,
        reportsCount: 7,
        exposureIndicators: ['Repeated elevated reaching (>52 cm)', 'Shoulder flexion >75°', '180 insertions/hr'],
        recommendation: 'Lower Connector Group A by 15 cm, shift 18 cm toward center, and tilt housing to 35°.',
      },
      {
        id: 'B',
        name: 'Connector Group B',
        x: 35,
        y: 80,
        z: 20,
        risk: 'moderate',
        exposureScore: 54,
        associatedTask: 'Component connection',
        bodyZones: ['Right Shoulder', 'Right Elbow'],
        reportedDiscomfort: 4.5,
        reportsCount: 4,
        exposureIndicators: ['Moderate lateral reach', 'Pinch grip force 18N', '125 cycles/hr'],
        recommendation: 'Add angled snap-fit guide jig to reduce insertion peak force.',
      },
      {
        id: 'C',
        name: 'Connector Group C',
        x: -15,
        y: 62,
        z: 12,
        risk: 'low',
        exposureScore: 32,
        associatedTask: 'Harness positioning',
        bodyZones: ['Lower Back', 'Right Hand'],
        reportedDiscomfort: 2.8,
        reportsCount: 2,
        exposureIndicators: ['Neutral reach envelope', 'Balanced bilateral posture'],
        recommendation: 'Maintain current ergonomic envelope; monitor during takt surges.',
      },
      {
        id: 'D',
        name: 'Connector Group D',
        x: 10,
        y: 75,
        z: 28,
        risk: 'high',
        exposureScore: 68,
        associatedTask: 'Taping',
        bodyZones: ['Right Wrist', 'Right Hand', 'Upper Back'],
        reportedDiscomfort: 5.9,
        reportsCount: 6,
        exposureIndicators: ['High wrist ulnar deviation', 'Deep reach over main trunk', '210 wraps/hr'],
        recommendation: 'Introduce ergonomic power-assisted spot-taping gun and bring branch D forward by 10 cm.',
      },
    ],
  },
  'LEONI-MONTAGE-02': {
    id: 'LEONI-MONTAGE-02',
    name: 'LEONI-MONTAGE-02',
    line: 'Harness Assembly Line A — Engine Bay',
    wiresPerHarness: 395,
    harnessesPerHour: 14,
    taktTime: 257,
    participatingWorkers: 10,
    tableHeight: 92,
    reachDistance: 48,
    taskRepetition: 165,
    cycleTime: 257,
    connectorOrientation: 22,
    taskRotation: 35,
    connectorZones: [
      { id: 'A', name: 'Connector Group A', x: -38, y: 74, z: 18, risk: 'high', exposureScore: 69, associatedTask: 'Terminal insertion', bodyZones: ['Left Shoulder', 'Left Elbow'], reportedDiscomfort: 5.6, reportsCount: 5, exposureIndicators: ['Moderate elevated reach', '165 insertions/hr'], recommendation: 'Adjust jig height by -8 cm.' },
      { id: 'B', name: 'Connector Group B', x: 32, y: 76, z: 16, risk: 'moderate', exposureScore: 49, associatedTask: 'Component connection', bodyZones: ['Right Shoulder'], reportedDiscomfort: 4.0, reportsCount: 3, exposureIndicators: ['Moderate reach'], recommendation: 'Standardize clip orientation.' },
      { id: 'C', name: 'Connector Group C', x: -12, y: 60, z: 12, risk: 'low', exposureScore: 29, associatedTask: 'Harness positioning', bodyZones: ['Lower Back'], reportedDiscomfort: 2.3, reportsCount: 1, exposureIndicators: ['Neutral zone'], recommendation: 'Maintain current setup.' },
      { id: 'D', name: 'Connector Group D', x: 14, y: 72, z: 24, risk: 'moderate', exposureScore: 56, associatedTask: 'Taping', bodyZones: ['Right Wrist'], reportedDiscomfort: 4.8, reportsCount: 4, exposureIndicators: ['Repetitive wrist rotation'], recommendation: 'Rotate taping duty every 2 hours.' },
    ],
  },
  'LEONI-TAPING-04': {
    id: 'LEONI-TAPING-04',
    name: 'LEONI-TAPING-04',
    line: 'Finishing & Bundling Cell B',
    wiresPerHarness: 430,
    harnessesPerHour: 13,
    taktTime: 276,
    participatingWorkers: 8,
    tableHeight: 98,
    reachDistance: 50,
    taskRepetition: 215,
    cycleTime: 276,
    connectorOrientation: 10,
    taskRotation: 15,
    connectorZones: [
      { id: 'A', name: 'Connector Group A', x: -40, y: 78, z: 22, risk: 'high', exposureScore: 71, associatedTask: 'Taping', bodyZones: ['Left Wrist', 'Left Shoulder'], reportedDiscomfort: 6.1, reportsCount: 5, exposureIndicators: ['High wrist flexion', '215 wraps/hr'], recommendation: 'Deploy lightweight dispenser.' },
      { id: 'B', name: 'Connector Group B', x: 30, y: 76, z: 20, risk: 'high', exposureScore: 66, associatedTask: 'Taping', bodyZones: ['Right Wrist', 'Right Hand'], reportedDiscomfort: 5.8, reportsCount: 5, exposureIndicators: ['High repetition'], recommendation: 'Increase task rotation to 45%.' },
      { id: 'C', name: 'Connector Group C', x: -10, y: 64, z: 14, risk: 'moderate', exposureScore: 44, associatedTask: 'Harness positioning', bodyZones: ['Lower Back'], reportedDiscomfort: 3.5, reportsCount: 2, exposureIndicators: ['Static standing'], recommendation: 'Upgrade anti-fatigue mat.' },
      { id: 'D', name: 'Connector Group D', x: 15, y: 78, z: 26, risk: 'critical', exposureScore: 78, associatedTask: 'Taping', bodyZones: ['Right Wrist', 'Upper Back'], reportedDiscomfort: 6.5, reportsCount: 6, exposureIndicators: ['Deep reach + high wrist torque'], recommendation: 'Bring rear harness branch closer.' },
    ],
  },
};

const INITIAL_BODY_ZONES = [
  {
    id: 'left_shoulder',
    name: 'Left Shoulder',
    side: 'both',
    reports: 7,
    totalWorkers: 10,
    avgDiscomfort: 6.8,
    exposureScore: 81,
    trend: 'Increasing',
    trendDelta: '+18%',
    priority: 'CRITICAL',
    risk: 'critical',
    associatedTasks: ['Terminal insertion', 'Harness positioning'],
    workstationZones: ['Connector Group A'],
    exposureIndicators: ['Elevated reaching (>55 cm)', 'Static shoulder abduction >70°', '180 repetitions/hr'],
    recommendations: [
      'Reposition Connector Group A 15 cm lower and 18 cm closer to operator centerline.',
      'Tilt connector fixture to 35° to reduce shoulder elevation angle.',
      'Implement 2-hour rotation between Terminal Insertion and Harness Positioning.',
    ],
  },
  {
    id: 'right_wrist',
    name: 'Right Wrist',
    side: 'both',
    reports: 6,
    totalWorkers: 10,
    avgDiscomfort: 5.9,
    exposureScore: 71,
    trend: 'Increasing',
    trendDelta: '+11%',
    priority: 'HIGH',
    risk: 'high',
    associatedTasks: ['Taping', 'Terminal insertion'],
    workstationZones: ['Connector Group D', 'Connector Group A'],
    exposureIndicators: ['Repetitive ulnar deviation', '210 taping cycles/hr', 'High pinch force'],
    recommendations: [
      'Introduce ergonomic low-torque spot-taping dispenser.',
      'Reduce reach depth to Branch D by 10 cm.',
    ],
  },
  {
    id: 'left_wrist',
    name: 'Left Wrist',
    side: 'both',
    reports: 5,
    totalWorkers: 10,
    avgDiscomfort: 5.4,
    exposureScore: 64,
    trend: 'Stable',
    trendDelta: '+3%',
    priority: 'HIGH',
    risk: 'high',
    associatedTasks: ['Terminal insertion', 'Component connection'],
    workstationZones: ['Connector Group A'],
    exposureIndicators: ['Thumb-push terminal seating force', 'Awkward housing angle (15°)'],
    recommendations: [
      'Reorient Connector Group A housing to 35°.',
      'Provide ergonomic terminal insertion assist pen for tight cavities.',
    ],
  },
  {
    id: 'neck',
    name: 'Neck',
    side: 'both',
    reports: 5,
    totalWorkers: 10,
    avgDiscomfort: 5.1,
    exposureScore: 62,
    trend: 'Increasing',
    trendDelta: '+9%',
    priority: 'HIGH',
    risk: 'high',
    associatedTasks: ['Terminal insertion', 'Component connection'],
    workstationZones: ['Connector Group A', 'Connector Group B'],
    exposureIndicators: ['Sustained neck flexion >25°', 'Visual precision inspection of 430-wire cavities'],
    recommendations: [
      'Adjust jig tilt angle and add glare-free overhead task LED bar.',
      'Optimize table height to 88 cm for neutral line-of-sight.',
    ],
  },
  {
    id: 'right_shoulder',
    name: 'Right Shoulder',
    side: 'both',
    reports: 4,
    totalWorkers: 10,
    avgDiscomfort: 4.5,
    exposureScore: 54,
    trend: 'Stable',
    trendDelta: '+1%',
    priority: 'MODERATE',
    risk: 'moderate',
    associatedTasks: ['Component connection', 'Taping'],
    workstationZones: ['Connector Group B', 'Connector Group D'],
    exposureIndicators: ['Moderate lateral reach (42 cm)', '125 cycles/hr'],
    recommendations: ['Keep component feeder bins within 35 cm primary reach zone.'],
  },
  {
    id: 'upper_back',
    name: 'Upper Back',
    side: 'back',
    reports: 4,
    totalWorkers: 10,
    avgDiscomfort: 4.7,
    exposureScore: 56,
    trend: 'Stable',
    trendDelta: '+4%',
    priority: 'MODERATE',
    risk: 'moderate',
    associatedTasks: ['Taping', 'Harness positioning'],
    workstationZones: ['Connector Group D', 'Connector Group A'],
    exposureIndicators: ['Forward trunk lean during deep reach', 'Static standing 7.5 hrs/shift'],
    recommendations: ['Reduce Connector Group D depth and adjust worktable elevation.'],
  },
  {
    id: 'right_hand',
    name: 'Right Hand',
    side: 'both',
    reports: 5,
    totalWorkers: 10,
    avgDiscomfort: 5.2,
    exposureScore: 61,
    trend: 'Increasing',
    trendDelta: '+7%',
    priority: 'HIGH',
    risk: 'high',
    associatedTasks: ['Taping', 'Terminal insertion'],
    workstationZones: ['Connector Group D', 'Connector Group B'],
    exposureIndicators: ['High finger pinch repetition', 'Wire routing tension'],
    recommendations: ['Deploy friction-reducing finger cots and ergonomic taping handle.'],
  },
  {
    id: 'left_hand',
    name: 'Left Hand',
    side: 'both',
    reports: 4,
    totalWorkers: 10,
    avgDiscomfort: 4.6,
    exposureScore: 52,
    trend: 'Stable',
    trendDelta: '+2%',
    priority: 'MODERATE',
    risk: 'moderate',
    associatedTasks: ['Terminal insertion'],
    workstationZones: ['Connector Group A'],
    exposureIndicators: ['Fine precision grip on micro-terminals'],
    recommendations: ['Use pre-sorted terminal trays to minimize fumbling and grip duration.'],
  },
  {
    id: 'left_elbow',
    name: 'Left Elbow',
    side: 'both',
    reports: 3,
    totalWorkers: 10,
    avgDiscomfort: 4.1,
    exposureScore: 47,
    trend: 'Stable',
    trendDelta: '0%',
    priority: 'MODERATE',
    risk: 'moderate',
    associatedTasks: ['Terminal insertion'],
    workstationZones: ['Connector Group A'],
    exposureIndicators: ['Sustained elbow elevation without forearm support'],
    recommendations: ['Lowering Connector Group A reduces elbow extension moment by ~28%.'],
  },
  {
    id: 'right_elbow',
    name: 'Right Elbow',
    side: 'both',
    reports: 2,
    totalWorkers: 10,
    avgDiscomfort: 3.4,
    exposureScore: 38,
    trend: 'Decreasing',
    trendDelta: '-4%',
    priority: 'LOW',
    risk: 'low',
    associatedTasks: ['Component connection'],
    workstationZones: ['Connector Group B'],
    exposureIndicators: ['Within acceptable motion range'],
    recommendations: ['No immediate modification required; continue periodic review.'],
  },
  {
    id: 'lower_back',
    name: 'Lower Back',
    side: 'back',
    reports: 3,
    totalWorkers: 10,
    avgDiscomfort: 3.6,
    exposureScore: 42,
    trend: 'Stable',
    trendDelta: '-2%',
    priority: 'MODERATE',
    risk: 'moderate',
    associatedTasks: ['Harness positioning'],
    workstationZones: ['Connector Group C'],
    exposureIndicators: ['Static upright standing', 'Occasional trunk flexion'],
    recommendations: ['Verify anti-fatigue floor mat condition and footrest availability.'],
  },
];

const TASKS_DATA = [
  {
    id: 'terminal_insertion',
    name: 'Terminal insertion',
    code: 'OP-101',
    durationSec: 98,
    repetitionsPerHr: 180,
    taktSharePct: 35.5,
    exposureScore: 81,
    reportedDiscomfort: 6.8,
    risk: 'critical',
    associatedBodyZones: ['Left Shoulder', 'Left Wrist', 'Neck', 'Left Hand'],
    workstationZones: ['Connector Group A'],
    exposureIndicators: ['Elevated reach >55 cm', 'High precision pinch', 'Static arm abduction', '430 wire terminations/cycle'],
    description: 'Manual insertion of crimped wire terminals into multi-pin automotive connector housings mounted on upper-left assembly jig.',
  },
  {
    id: 'taping',
    name: 'Taping',
    code: 'OP-104',
    durationSec: 74,
    repetitionsPerHr: 210,
    taktSharePct: 26.8,
    exposureScore: 69,
    reportedDiscomfort: 5.9,
    risk: 'high',
    associatedBodyZones: ['Right Wrist', 'Right Hand', 'Upper Back'],
    workstationZones: ['Connector Group D', 'Connector Group B'],
    exposureIndicators: ['210 wrist rotations/hr', 'Ulnar deviation >20°', 'Deep reach over central trunk'],
    description: 'Spot-taping and spiral wrapping of wire harness branches to maintain routing geometry and abrasion protection.',
  },
  {
    id: 'component_connection',
    name: 'Component connection',
    code: 'OP-102',
    durationSec: 62,
    repetitionsPerHr: 125,
    taktSharePct: 22.5,
    exposureScore: 54,
    reportedDiscomfort: 4.5,
    risk: 'moderate',
    associatedBodyZones: ['Right Shoulder', 'Right Elbow', 'Neck'],
    workstationZones: ['Connector Group B'],
    exposureIndicators: ['Snap-fit insertion force 18N', 'Lateral reach 42 cm'],
    description: 'Clipping relay blocks, grommets, and secondary locks onto main cockpit harness branches.',
  },
  {
    id: 'harness_positioning',
    name: 'Harness positioning',
    code: 'OP-103',
    durationSec: 42,
    repetitionsPerHr: 65,
    taktSharePct: 15.2,
    exposureScore: 38,
    reportedDiscomfort: 3.1,
    risk: 'low',
    associatedBodyZones: ['Lower Back', 'Right Hand'],
    workstationZones: ['Connector Group C'],
    exposureIndicators: ['Neutral reach envelope', 'Light bundle weight (2.1 kg)'],
    description: 'Loading main wire trunk onto jig forks and routing primary branches into fixture clips.',
  },
];

const WEEKLY_TREND_DATA = [
  { week: 'W-06', overall: 58, leftShoulder: 61, rightWrist: 54, reports: 4 },
  { week: 'W-07', overall: 61, leftShoulder: 66, rightWrist: 57, reports: 5 },
  { week: 'W-08', overall: 63, leftShoulder: 69, rightWrist: 60, reports: 5 },
  { week: 'W-09', overall: 66, leftShoulder: 74, rightWrist: 64, reports: 6 },
  { week: 'W-10', overall: 69, leftShoulder: 78, rightWrist: 68, reports: 6 },
  { week: 'W-11', overall: 72, leftShoulder: 81, rightWrist: 71, reports: 7 },
];

const INITIAL_RECOMMENDATIONS = [
  {
    id: 'REC-01',
    title: 'Reposition & Reorient Connector Group A',
    bodyZone: 'Left Shoulder',
    task: 'Terminal insertion',
    workstationZone: 'Connector Group A',
    associatedExposure: 'Repeated elevated reaching (55 cm reach, 80 cm jig height, 180 reps/hr)',
    systemFinding: 'Increasing left shoulder discomfort (7/10 workers, avg 6.8/10) is strongly correlated with the terminal insertion task and the elevated lateral position of Connector Group A.',
    recommendedInvestigation: 'Consider lowering Connector Group A by 15 cm, shifting it 18 cm toward the center, and tilting the fixture to 35° to reduce shoulder elevation and reach distance.',
    priority: 'CRITICAL',
    risk: 'critical',
    confidence: 92,
    expectedImpactPct: 33,
    difficulty: 'Low — Fixture Bracket Adjustment',
    estimatedCost: 1450,
    simulationPreset: {
      tableHeight: 88,
      connectorA_y: 65,
      connectorA_x: -27,
      connectorA_z: 14,
      connectorOrientation: 35,
      reachDistance: 40,
      taskRepetition: 180,
      cycleTime: 276,
      taskRotation: 20,
    },
  },
  {
    id: 'REC-02',
    title: 'Introduce Task Rotation Protocol (2-Hour Cycle)',
    bodyZone: 'Left Shoulder & Right Wrist',
    task: 'Terminal insertion & Taping',
    workstationZone: 'Connector Groups A & D',
    associatedExposure: 'Sustained high-repetition single-posture cycles (20% current rotation)',
    systemFinding: 'Low task rotation concentrates repetitive shoulder abduction and wrist ulnar deviation on the same operators throughout an 8-hour shift.',
    recommendedInvestigation: 'Evaluate increasing structured rotation to 60% between Terminal Insertion, Taping, and Harness Positioning to distribute localized musculoskeletal load.',
    priority: 'HIGH',
    risk: 'high',
    confidence: 87,
    expectedImpactPct: 21,
    difficulty: 'Low — Operational Scheduling',
    estimatedCost: 400,
    simulationPreset: {
      tableHeight: 95,
      connectorA_y: 80,
      connectorA_x: -45,
      connectorA_z: 20,
      connectorOrientation: 15,
      reachDistance: 55,
      taskRepetition: 145,
      cycleTime: 276,
      taskRotation: 65,
    },
  },
  {
    id: 'REC-03',
    title: 'Ergonomic Spot-Taping Dispenser & Branch D Relocation',
    bodyZone: 'Right Wrist & Right Hand',
    task: 'Taping',
    workstationZone: 'Connector Group D',
    associatedExposure: 'High wrist deviation (210 wraps/hr) combined with deep reach (28 cm Z-depth)',
    systemFinding: 'Right wrist discomfort reports increased 11% over 6 weeks, clustering around high-frequency manual taping along rear Branch D.',
    recommendedInvestigation: 'Investigate moving Branch D routing pins 10 cm forward and trialing a lightweight balanced spot-taping dispenser.',
    priority: 'HIGH',
    risk: 'high',
    confidence: 84,
    expectedImpactPct: 19,
    difficulty: 'Medium — Tooling & Jig Pin Mod',
    estimatedCost: 2200,
    simulationPreset: {
      tableHeight: 90,
      connectorA_y: 72,
      connectorA_x: -35,
      connectorA_z: 12,
      connectorOrientation: 28,
      reachDistance: 44,
      taskRepetition: 160,
      cycleTime: 276,
      taskRotation: 40,
    },
  },
  {
    id: 'REC-04',
    title: 'Dynamic Worktable Height Calibration & Task Lighting',
    bodyZone: 'Neck & Upper Back',
    task: 'Terminal insertion & Component connection',
    workstationZone: 'Full Assembly Jig',
    associatedExposure: 'Sustained neck flexion >25° during micro-cavity visual verification',
    systemFinding: 'Fixed 95 cm worktable elevation forces shorter operators into shoulder elevation while taller operators flex their neck forward.',
    recommendedInvestigation: 'Test electric height-adjustable table presets (84–94 cm) paired with angled glare-free LED task illumination.',
    priority: 'MODERATE',
    risk: 'moderate',
    confidence: 79,
    expectedImpactPct: 14,
    difficulty: 'Medium — Hardware Upgrade',
    estimatedCost: 3600,
    simulationPreset: {
      tableHeight: 87,
      connectorA_y: 68,
      connectorA_x: -30,
      connectorA_z: 15,
      connectorOrientation: 30,
      reachDistance: 42,
      taskRepetition: 170,
      cycleTime: 276,
      taskRotation: 35,
    },
  },
];

const INITIAL_INTERVENTIONS = [
  {
    id: 'INT-2026-01',
    title: 'Relocate Connector Group A Bracket (-15cm Y, +18cm X)',
    description: 'Fabricate angled 35° mounting bracket for Connector Group A to bring terminal insertion inside primary ergonomic reach zone.',
    workstation: 'LEONI-MONTAGE-01',
    costEstimate: 1450,
    expectedReductionPct: 33,
    difficulty: 'Low',
    status: 'Planned',
    beforeExposure: 72,
    afterExposure: 48,
    createdDate: '2026-11-12',
    evaluationNote: 'Scheduled for weekend maintenance window. Prototype 3D simulation validated.',
  },
  {
    id: 'INT-2026-02',
    title: '2-Hour Operator Task Rotation Matrix',
    description: 'Rotate assembly operators every 2 hours between Terminal Insertion (high upper-limb) and Harness Positioning (neutral).',
    workstation: 'LEONI-MONTAGE-01',
    costEstimate: 400,
    expectedReductionPct: 18,
    difficulty: 'Low',
    status: 'Implemented',
    beforeExposure: 76,
    afterExposure: 61,
    createdDate: '2026-10-18',
    evaluationNote: 'Implemented across Shift A. Early operator check-ins show reduced end-of-shift fatigue.',
  },
  {
    id: 'INT-2026-03',
    title: 'Anti-Fatigue Floor Matting & Footrest Rail',
    description: 'Replaced worn standing mats along Line A with dual-density ergonomic mats and 12 cm alternating footrest bars.',
    workstation: 'LEONI-MONTAGE-01',
    costEstimate: 950,
    expectedReductionPct: 11,
    difficulty: 'Low',
    status: 'Evaluated',
    beforeExposure: 54,
    afterExposure: 42,
    createdDate: '2026-09-05',
    evaluationNote: '30-day follow-up completed: Lower back discomfort reports dropped from 5/10 to 3/10 workers.',
  },
  {
    id: 'INT-2026-04',
    title: 'Ergonomic Spot-Taping Dispenser Trial',
    description: 'Deploy balanced low-torque taping tools at Connector Group D to mitigate right wrist ulnar deviation.',
    workstation: 'LEONI-TAPING-04',
    costEstimate: 2200,
    expectedReductionPct: 22,
    difficulty: 'Medium',
    status: 'Proposed',
    beforeExposure: 74,
    afterExposure: 58,
    createdDate: '2026-11-16',
    evaluationNote: 'Awaiting tooling supplier sample delivery.',
  },
];

const INITIAL_ALERTS = [
  {
    id: 'ALT-01',
    severity: 'critical',
    title: 'Emerging ergonomic risk detected: Left shoulder',
    detail: '7/10 workers at LEONI-MONTAGE-01 reported left shoulder discomfort (avg 6.8/10, +18% over 4 weeks).',
    timestamp: '14 mins ago',
    targetPage: 'body',
    zoneId: 'left_shoulder',
  },
  {
    id: 'ALT-02',
    severity: 'high',
    title: 'High repetition spike: Taping wrist load',
    detail: 'Right wrist exposure reached 71/100 during peak 13.5 harnesses/hr output at Connector Group D.',
    timestamp: '2 hours ago',
    targetPage: 'tasks',
  },
  {
    id: 'ALT-03',
    severity: 'moderate',
    title: 'Simulation ready: Connector Group A relocation',
    detail: 'AI model estimates -33% overall exposure reduction by lowering Connector Group A by 15 cm.',
    timestamp: '5 hours ago',
    targetPage: 'simulator',
  },
];

// ============================================================================
// 3. SERVICE LAYER — CODEX INTEGRATION INTERFACES (src/services/*)
//    Clean decoupled service functions. Codex can swap these implementations
//    with REST/GraphQL/WebSocket API calls without changing UI components.
// ============================================================================
const ErgoPredictService = {
  /**
   * Fetch parametric workstation configuration.
   * Codex integration: GET /api/v1/workstations/:id
   */
  getWorkstation(workstationId = 'LEONI-MONTAGE-01') {
    return WORKSTATIONS_DATA[workstationId] || WORKSTATIONS_DATA['LEONI-MONTAGE-01'];
  },

  /**
   * Fetch aggregated anonymous worker telemetry & exposure KPIs.
   * Codex integration: GET /api/v1/workstations/:id/aggregates
   */
  getWorkerAggregates(workstationId, bodyZonesState, interventionsState) {
    const ws = this.getWorkstation(workstationId);
    const leftShoulder = bodyZonesState.find((b) => b.id === 'left_shoulder') || bodyZonesState[0];
    const activeInterventions = interventionsState.filter((i) => i.status === 'Planned' || i.status === 'Implemented').length;
    const emergingAlerts = bodyZonesState.filter((b) => b.exposureScore >= 62).length;
    // Weighted prototype exposure score
    const avgTop3 = [...bodyZonesState]
      .sort((a, b) => b.exposureScore - a.exposureScore)
      .slice(0, 3)
      .reduce((acc, z) => acc + z.exposureScore, 0) / 3;
    const overallExposure = Math.round(avgTop3);

    return {
      workstationId: ws.id,
      overallExposure,
      participatingWorkers: ws.participatingWorkers,
      emergingRiskAlerts: Math.max(3, emergingAlerts),
      activeInterventions,
      leadZone: leftShoulder,
      weeklyTrend: WEEKLY_TREND_DATA,
    };
  },

  /**
   * Fetch task-level ergonomic breakdown.
   * Codex integration: GET /api/v1/workstations/:id/tasks
   */
  getTaskAnalysis(workstationId) {
    return TASKS_DATA.map((t) => ({ ...t, workstationId }));
  },

  /**
   * Fetch body-zone discomfort & exposure heatmap data.
   * Codex integration: GET /api/v1/workstations/:id/body-zones
   */
  getBodyZoneAnalysis(bodyZonesState) {
    return bodyZonesState;
  },

  /**
   * Fetch explainable AI recommendations.
   * Codex integration: GET /api/v1/workstations/:id/recommendations
   */
  getRecommendations() {
    return INITIAL_RECOMMENDATIONS;
  },

  /**
   * Parametric What-If Ergonomic Simulation Engine (Prototype Demo Model).
   * Codex integration: POST /api/v1/simulation/run
   * Note: Synthetic demonstration estimates — not validated clinical/ISO measurements.
   */
  simulateIntervention(config) {
    const {
      tableHeight = 95,
      connectorA_y = 80,
      connectorA_x = -45,
      connectorA_z = 20,
      connectorOrientation = 15,
      reachDistance = 55,
      taskRepetition = 180,
      cycleTime = 276,
      taskRotation = 20,
    } = config;

    // Ideal ergonomic targets (prototype heuristic model)
    const idealTableHeight = 88; // cm
    const idealConnY = 64; // cm above table reference
    const idealConnX = -22; // cm closer to centerline
    const idealConnZ = 12; // cm depth
    const idealOrient = 35; // deg tilt toward worker

    const heightPenalty = Math.abs(tableHeight - idealTableHeight) * 0.85;
    const connYPenalty = Math.max(0, connectorA_y - idealConnY) * 0.92 + Math.max(0, idealConnY - connectorA_y) * 0.35;
    const connXPenalty = Math.max(0, Math.abs(connectorA_x) - Math.abs(idealConnX)) * 0.45;
    const connZPenalty = Math.max(0, connectorA_z - idealConnZ) * 0.65;
    const orientPenalty = Math.abs(connectorOrientation - idealOrient) * 0.28;
    const reachPenalty = Math.max(0, reachDistance - 35) * 0.85;
    const repFactor = (taskRepetition - 120) * 0.14;
    const taktPressure = Math.max(0, (280 - cycleTime) * 0.08);
    const rotationRelief = (taskRotation - 20) * 0.19;

    const shoulderRaw = 36 + connYPenalty + connXPenalty * 0.8 + reachPenalty * 0.9 + orientPenalty * 0.6 + repFactor * 0.6 - rotationRelief;
    const wristRaw = 34 + orientPenalty * 1.1 + connZPenalty * 0.7 + repFactor * 1.1 + taktPressure - rotationRelief * 0.8;
    const neckRaw = 30 + heightPenalty * 1.2 + connYPenalty * 0.4 + connZPenalty * 0.5 - rotationRelief * 0.4;
    const backRaw = 26 + heightPenalty * 1.1 + connZPenalty * 0.9 + reachPenalty * 0.4 - rotationRelief * 0.3;

    const clamp = (v) => Math.round(Math.max(18, Math.min(98, v)));
    const shoulderExposure = clamp(shoulderRaw);
    const wristExposure = clamp(wristRaw);
    const neckExposure = clamp(neckRaw);
    const backExposure = clamp(backRaw);
    const overallExposure = clamp(shoulderExposure * 0.42 + wristExposure * 0.28 + neckExposure * 0.16 + backExposure * 0.14);

    // Effective reach distance combines explicit reach slider + connector offset deltas
    const effectiveReach = Math.round(Math.max(24, Math.min(68, reachDistance)));

    return {
      overallExposure,
      shoulderExposure,
      wristExposure,
      neckExposure,
      backExposure,
      reachDistance: effectiveReach,
      riskLevel: getRiskLevel(overallExposure),
      shoulderRisk: getRiskLevel(shoulderExposure),
      wristRisk: getRiskLevel(wristExposure),
    };
  },

  /**
   * Compare Baseline vs Proposed configuration.
   * Codex integration: POST /api/v1/simulation/compare
   */
  compareConfigurations(beforeConfig, afterConfig) {
    const before = this.simulateIntervention(beforeConfig);
    const after = this.simulateIntervention(afterConfig);
    const pctDelta = (b, a) => (b === 0 ? 0 : Math.round(((a - b) / b) * 100));

    return {
      before,
      after,
      deltas: {
        overallPct: pctDelta(before.overallExposure, after.overallExposure),
        shoulderPct: pctDelta(before.shoulderExposure, after.shoulderExposure),
        wristPct: pctDelta(before.wristExposure, after.wristExposure),
        neckPct: pctDelta(before.neckExposure, after.neckExposure),
        backPct: pctDelta(before.backExposure, after.backExposure),
        reachPct: pctDelta(before.reachDistance, after.reachDistance),
      },
    };
  },

  /**
   * Fetch intervention tracking history.
   * Codex integration: GET /api/v1/interventions
   */
  getInterventionHistory(interventionsState) {
    return interventionsState;
  },

  /**
   * Economic Impact & ROI Calculator (Synthetic Demo Assumptions).
   * Codex integration: POST /api/v1/economics/roi
   */
  calculateROI(assumptions) {
    const {
      interventionCost = 4800,
      absenteeismCostPerDay = 260,
      baselineAbsentDaysPerWorkerYr = 9.5,
      absenteeismReductionPct = 28,
      annualScrapDefectCost = 18500,
      defectReductionPct = 15,
      productivityGainPct = 3.2,
      annualOperatorLaborCost = 24000,
      affectedOperators = 10,
    } = assumptions;

    const absenteeismSavings = Math.round(
      affectedOperators * baselineAbsentDaysPerWorkerYr * (absenteeismReductionPct / 100) * absenteeismCostPerDay
    );
    const defectSavings = Math.round(annualScrapDefectCost * (defectReductionPct / 100));
    const productivitySavings = Math.round(
      affectedOperators * annualOperatorLaborCost * (productivityGainPct / 100) * 0.45 // conservative realization factor
    );
    const annualSavings = absenteeismSavings + defectSavings + productivitySavings;
    const netYear1 = annualSavings - interventionCost;
    const roiPct = interventionCost > 0 ? Math.round((netYear1 / interventionCost) * 100) : 0;
    const paybackMonths = annualSavings > 0 ? Number(((interventionCost / annualSavings) * 12).toFixed(1)) : 0;

    const projection = [
      { year: 'Year 0', cumulativeNet: -interventionCost, savings: 0, cost: interventionCost },
      { year: 'Year 1', cumulativeNet: Math.round(annualSavings - interventionCost), savings: annualSavings, cost: interventionCost },
      { year: 'Year 2', cumulativeNet: Math.round(annualSavings * 2 - interventionCost), savings: annualSavings * 2, cost: interventionCost },
      { year: 'Year 3', cumulativeNet: Math.round(annualSavings * 3 - interventionCost), savings: annualSavings * 3, cost: interventionCost },
    ];

    return {
      interventionCost,
      absenteeismSavings,
      defectSavings,
      productivitySavings,
      annualSavings,
      netYear1,
      roiPct,
      paybackMonths,
      projection,
    };
  },

  /**
   * Submit anonymous worker discomfort check-in.
   * Codex integration: POST /api/v1/feedback
   */
  submitWorkerFeedback(feedback) {
    return {
      status: 'accepted',
      timestamp: new Date().toISOString(),
      anonymizedId: `ANON-${Math.floor(10000 + Math.random() * 90000)}`,
      payload: feedback,
    };
  },
};

// ============================================================================
// 4. THREE.JS SCRIPT LOADER HOOK (Ensures Reliable WebGL 3D in Any Sandbox)
// ============================================================================
function useThreeLoader() {
  return { loaded: true, error: null };
}

// ============================================================================
// 5. REUSABLE UI PRIMITIVES
// ============================================================================
function StatusBadge({ level, label = undefined, size = 'sm' }) {
  const key = (level || 'moderate').toLowerCase();
  const style = STATUS_COLORS[key] || STATUS_COLORS.moderate;
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded border ${style.bg} ${style.text} ${style.border} ${
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.hex }} />
      {label || style.label}
    </span>
  );
}

function Panel({ title, subtitle, rightAction = null, children, className = '', noPadding = false }) {
  return (
    <div className={`bg-[#0F172A] border border-slate-800 rounded-lg overflow-hidden flex flex-col ${className}`}>
      {(title || rightAction) && (
        <div className="px-4 py-3 border-b border-slate-800/90 flex items-center justify-between gap-3 bg-[#111B2E]">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {rightAction && <div className="flex items-center gap-2">{rightAction}</div>}
        </div>
      )}
      <div className={noPadding ? 'flex-1' : 'p-4 flex-1'}>{children}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: any } = {}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#0B1221] border border-slate-700 rounded-md px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-slate-200 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-mono font-semibold text-slate-100">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 6. 3D WORKSTATION DIGITAL TWIN COMPONENT (Three.js WebGL)
//    Driven directly by parametric workstation/simulation state
// ============================================================================
function WorkstationDigitalTwin3D({
  workstation,
  simConfig = null,
  simResult = null,
  selectedHotspotId,
  onSelectHotspot,
  compact = false,
}) {
  const { loaded, error } = useThreeLoader();
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const [showWorker, setShowWorker] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [cameraPreset, setCameraPreset] = useState('perspective');
  const [projectedLabels, setProjectedLabels] = useState([]);

  // Store Three.js mutable scene objects in refs for real-time parametric updates without recreating WebGL context
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const dynamicRefs = useRef({
    tableGroup: null,
    connectorMeshes: {},
    hotspotMeshes: {},
    workerGroup: null,
    leftUpperArm: null,
    leftForearm: null,
    rightUpperArm: null,
    rightForearm: null,
    harnessWiresGroup: null,
    raycastTargets: [],
  });

  // Spherical orbit camera state
  const orbitRef = useRef({
    theta: 0.58,
    phi: 1.08,
    radius: 3.15,
    target: { x: 0, y: 1.05, z: 0 },
    isDragging: false,
    isPanning: false,
    prevX: 0,
    prevY: 0,
  });

  const applyCameraPreset = useCallback((preset) => {
    setCameraPreset(preset);
    const o = orbitRef.current;
    if (preset === 'perspective' || preset === 'reset') {
      o.theta = 0.58;
      o.phi = 1.08;
      o.radius = 3.15;
      o.target = { x: 0, y: 1.05, z: 0 };
    } else if (preset === 'top') {
      o.theta = 0.01;
      o.phi = 0.16;
      o.radius = 3.2;
      o.target = { x: 0, y: 1.0, z: 0.1 };
    } else if (preset === 'front') {
      o.theta = 0;
      o.phi = 1.38;
      o.radius = 2.9;
      o.target = { x: 0, y: 1.12, z: 0 };
    } else if (preset === 'side') {
      o.theta = 1.52;
      o.phi = 1.28;
      o.radius = 3.0;
      o.target = { x: 0, y: 1.08, z: 0.15 };
    }
  }, []);

  // Build effective connector zones reflecting live simulator parameters
  const effectiveZones = useMemo(() => {
    return workstation.connectorZones.map((zone) => {
      if (zone.id === 'A' && simConfig) {
        const score = simResult ? simResult.shoulderExposure : zone.exposureScore;
        return {
          ...zone,
          x: simConfig.connectorA_x,
          y: simConfig.connectorA_y,
          z: simConfig.connectorA_z,
          orientation: simConfig.connectorOrientation,
          exposureScore: score,
          risk: getRiskLevel(score),
        };
      }
      if (zone.id === 'D' && simResult) {
        return {
          ...zone,
          exposureScore: simResult.wristExposure,
          risk: getRiskLevel(simResult.wristExposure),
        };
      }
      return zone;
    });
  }, [workstation, simConfig, simResult]);

  // Keep latest callback & flags accessible inside animation loop
  const latestStateRef = useRef({ effectiveZones, showWorker, showHotspots, showLabels, selectedHotspotId, onSelectHotspot, simConfig, workstation });
  useEffect(() => {
    latestStateRef.current = { effectiveZones, showWorker, showHotspots, showLabels, selectedHotspotId, onSelectHotspot, simConfig, workstation };
  }, [effectiveZones, showWorker, showHotspots, showLabels, selectedHotspotId, onSelectHotspot, simConfig, workstation]);

  // Initialize Three.js WebGL scene once when script loads
  useEffect(() => {
    if (!loaded || !canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 640;
    const height = containerRef.current.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090E1A');
    scene.fog = new THREE.Fog('#090E1A', 5.5, 13);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Industrial studio lighting
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xf8fafc, 1.05);
    dirLight.position.set(2.8, 4.8, 3.2);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    fillLight.position.set(-3.0, 2.0, -2.0);
    scene.add(fillLight);

    // Floor & industrial grid
    const floorGeo = new THREE.PlaneGeometry(14, 14);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.9, metalness: 0.1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(10, 24, 0x1e293b, 0x131d31);
    grid.position.y = 0.002;
    scene.add(grid);

    // Operator working area mat (anti-fatigue zone)
    const matGeo = new THREE.BoxGeometry(1.4, 0.018, 0.72);
    const matMat = new THREE.MeshStandardMaterial({ color: 0x172554, roughness: 0.85, metalness: 0.05 });
    const workMat = new THREE.Mesh(matGeo, matMat);
    workMat.position.set(0, 0.009, 0.68);
    workMat.receiveShadow = true;
    scene.add(workMat);

    // Subtle safety border around working area
    const matBorderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.44, 0.005, 0.76));
    const matBorder = new THREE.LineSegments(matBorderGeo, new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 }));
    matBorder.position.set(0, 0.012, 0.68);
    scene.add(matBorder);

    // Static lower steel table legs (fixed floor anchors)
    const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.7 });
    const baseLegCoords = [
      [-0.78, 0.34, -0.28],
      [0.78, 0.34, -0.28],
      [-0.78, 0.34, 0.22],
      [0.78, 0.34, 0.22],
    ];
    baseLegCoords.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.68, 0.06), legMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      scene.add(leg);
    });
    // Lower crossbar
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.045, 0.045), legMat);
    crossbar.position.set(0, 0.22, -0.28);
    scene.add(crossbar);

    // Adjustable upper table + jig group (moves vertically with tableHeight)
    const tableGroup = new THREE.Group();
    scene.add(tableGroup);
    dynamicRefs.current.tableGroup = tableGroup;

    // Telescoping inner legs attached to tableGroup
    const innerLegMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.8 });
    baseLegCoords.forEach(([x, , z]) => {
      const innerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.55, 0.044), innerLegMat);
      innerLeg.position.set(x, -0.275, z);
      tableGroup.add(innerLeg);
    });

    // Worktable surface
    const tabletop = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.045, 0.68),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.3 })
    );
    tabletop.position.set(0, 0, -0.02);
    tabletop.castShadow = true;
    tabletop.receiveShadow = true;
    tableGroup.add(tabletop);

    // Overhead aluminum extrusion frame + LED light bar
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.75 });
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.05, 0.04), frameMat);
    leftPost.position.set(-0.82, 0.52, -0.28);
    tableGroup.add(leftPost);
    const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.05, 0.04), frameMat);
    rightPost.position.set(0.82, 0.52, -0.28);
    tableGroup.add(rightPost);
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.04, 0.04), frameMat);
    topBar.position.set(0, 1.02, -0.28);
    tableGroup.add(topBar);
    const ledBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.022, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
    );
    ledBar.position.set(0, 0.99, -0.18);
    tableGroup.add(ledBar);

    // Tilted Harness Assembly Jig / Pegboard
    const jigBoard = new THREE.Mesh(
      new THREE.BoxGeometry(1.56, 0.74, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x162033, roughness: 0.75, metalness: 0.15 })
    );
    jigBoard.position.set(0, 0.39, -0.14);
    jigBoard.rotation.x = -0.28;
    jigBoard.castShadow = true;
    jigBoard.receiveShadow = true;
    tableGroup.add(jigBoard);

    // Jig border trim
    const jigEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.565, 0.745, 0.032)),
      new THREE.LineBasicMaterial({ color: 0x334155 })
    );
    jigEdges.position.copy(jigBoard.position);
    jigEdges.rotation.copy(jigBoard.rotation);
    tableGroup.add(jigEdges);

    // Main Automotive Wiring Harness Trunk + Colored Cable Branches on the Jig
    const wireGroup = new THREE.Group();
    tableGroup.add(wireGroup);
    dynamicRefs.current.harnessWiresGroup = wireGroup;

    const addCable = (points, colorHex, radius = 0.013) => {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
      const tubeGeo = new THREE.TubeGeometry(curve, 24, radius, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.55, metalness: 0.1 });
      const mesh = new THREE.Mesh(tubeGeo, tubeMat);
      wireGroup.add(mesh);
      return mesh;
    };

    // Main black corrugated conduit trunk
    addCable(
      [[-0.64, 0.24, -0.06], [-0.28, 0.28, -0.07], [0.05, 0.30, -0.08], [0.42, 0.29, -0.07], [0.64, 0.24, -0.06]],
      0x0f172a,
      0.022
    );
    // Secondary yellow/amber power branch
    addCable(
      [[-0.28, 0.28, -0.07], [-0.36, 0.42, -0.11], [-0.46, 0.55, -0.14]],
      0xf59e0b,
      0.011
    );
    // Blue CAN-bus twisted branch
    addCable(
      [[0.05, 0.30, -0.08], [0.18, 0.44, -0.12], [0.35, 0.55, -0.15]],
      0x38bdf8,
      0.011
    );
    // Red sensor branch toward Group D
    addCable(
      [[0.05, 0.30, -0.08], [0.08, 0.43, -0.13], [0.12, 0.52, -0.17]],
      0xef4444,
      0.010
    );
    // Green ground branch toward Group C
    addCable(
      [[-0.28, 0.28, -0.07], [-0.20, 0.22, -0.04], [-0.14, 0.18, -0.02]],
      0x10b981,
      0.010
    );

    // Connector Groups & Ergonomic Hotspots (A, B, C, D)
    const raycastTargets = [];
    ['A', 'B', 'C', 'D'].forEach((id) => {
      // Connector housing block
      const connGroup = new THREE.Group();
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.075, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.5 })
      );
      connGroup.add(housing);

      // Pin cavity detail
      const cavity = new THREE.Mesh(
        new THREE.BoxGeometry(0.085, 0.05, 0.012),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.8 })
      );
      cavity.position.z = 0.032;
      connGroup.add(cavity);

      tableGroup.add(connGroup);
      dynamicRefs.current.connectorMeshes[id] = connGroup;

      // Interactive Hotspot Sphere + Pulsing Ring
      const hotspotGroup = new THREE.Group();
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.9,
      });
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.048, 20, 20), sphereMat);
      sphere.userData = { hotspotId: id };
      hotspotGroup.add(sphere);

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.062, 0.085, 28), ringMat);
      hotspotGroup.add(ring);

      tableGroup.add(hotspotGroup);
      dynamicRefs.current.hotspotMeshes[id] = { group: hotspotGroup, sphere, ring, sphereMat, ringMat };
      raycastTargets.push(sphere);
    });
    dynamicRefs.current.raycastTargets = raycastTargets;

    // Simplified Articulated Industrial Worker Mannequin standing in front of workstation
    const workerGroup = new THREE.Group();
    workerGroup.position.set(0, 0, 0.66);
    scene.add(workerGroup);
    dynamicRefs.current.workerGroup = workerGroup;

    const suitMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.7, metalness: 0.1 });
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4, metalness: 0.3 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6, metalness: 0.15 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

    // Legs & Boots
    [-0.12, 0.12].forEach((x) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.056, 0.86, 12), suitMat);
      leg.position.set(x, 0.44, 0);
      leg.castShadow = true;
      workerGroup.add(leg);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.22), bootMat);
      boot.position.set(x, 0.04, -0.04);
      workerGroup.add(boot);
    });

    // Pelvis & Torso
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.2), suitMat);
    pelvis.position.set(0, 0.88, 0);
    workerGroup.add(pelvis);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.22), suitMat);
    torso.position.set(0, 1.18, 0);
    torso.castShadow = true;
    workerGroup.add(torso);

    // High-vis vest accent stripe
    const vestStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.39, 0.04, 0.23),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.3 })
    );
    vestStripe.position.set(0, 1.12, 0);
    workerGroup.add(vestStripe);

    // Neck & Head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.09, 12), skinMat);
    neck.position.set(0, 1.46, 0);
    workerGroup.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 18), skinMat);
    head.position.set(0, 1.59, -0.01);
    head.castShadow = true;
    workerGroup.add(head);

    // Safety glasses visor
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.045, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 })
    );
    visor.position.set(0, 1.6, -0.1);
    workerGroup.add(visor);

    // Articulated Left Arm (Reaches toward Connector Group A)
    const leftShoulderJoint = new THREE.Group();
    leftShoulderJoint.position.set(-0.23, 1.38, 0);
    workerGroup.add(leftShoulderJoint);
    const leftShoulderBall = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 12), jointMat);
    leftShoulderJoint.add(leftShoulderBall);

    const leftUpperArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.32, 10), suitMat);
    leftUpperArmMesh.position.set(0, -0.16, 0);
    leftShoulderJoint.add(leftUpperArmMesh);

    const leftElbowJoint = new THREE.Group();
    leftElbowJoint.position.set(0, -0.32, 0);
    leftShoulderJoint.add(leftElbowJoint);
    const leftForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.30, 10), skinMat);
    leftForearmMesh.position.set(0, -0.15, 0);
    leftElbowJoint.add(leftForearmMesh);
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), skinMat);
    leftHand.position.set(0, -0.30, 0);
    leftElbowJoint.add(leftHand);

    dynamicRefs.current.leftUpperArm = leftShoulderJoint;
    dynamicRefs.current.leftForearm = leftElbowJoint;

    // Articulated Right Arm (Reaches toward workspace center/right)
    const rightShoulderJoint = new THREE.Group();
    rightShoulderJoint.position.set(0.23, 1.38, 0);
    workerGroup.add(rightShoulderJoint);
    const rightShoulderBall = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), jointMat);
    rightShoulderJoint.add(rightShoulderBall);

    const rightUpperArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.32, 10), suitMat);
    rightUpperArmMesh.position.set(0, -0.16, 0);
    rightShoulderJoint.add(rightUpperArmMesh);

    const rightElbowJoint = new THREE.Group();
    rightElbowJoint.position.set(0, -0.32, 0);
    rightShoulderJoint.add(rightElbowJoint);
    const rightForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.30, 10), skinMat);
    rightForearmMesh.position.set(0, -0.15, 0);
    rightElbowJoint.add(rightForearmMesh);
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), skinMat);
    rightHand.position.set(0, -0.30, 0);
    rightElbowJoint.add(rightHand);

    dynamicRefs.current.rightUpperArm = rightShoulderJoint;
    dynamicRefs.current.rightForearm = rightElbowJoint;

    // Raycaster for clicking hotspots
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const domEl = renderer.domElement;

    const onPointerDown = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      pointerDownPos = { x: clientX, y: clientY };
      orbitRef.current.prevX = clientX;
      orbitRef.current.prevY = clientY;
      if (e.button === 2 || e.shiftKey) {
        orbitRef.current.isPanning = true;
      } else {
        orbitRef.current.isDragging = true;
      }
    };

    const onPointerMove = (e) => {
      if (!orbitRef.current.isDragging && !orbitRef.current.isPanning) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - orbitRef.current.prevX;
      const dy = clientY - orbitRef.current.prevY;
      orbitRef.current.prevX = clientX;
      orbitRef.current.prevY = clientY;

      if (orbitRef.current.isPanning) {
        orbitRef.current.target.x -= dx * 0.003;
        orbitRef.current.target.y += dy * 0.003;
      } else {
        orbitRef.current.theta -= dx * 0.007;
        orbitRef.current.phi = Math.max(0.14, Math.min(Math.PI / 2 - 0.04, orbitRef.current.phi - dy * 0.007));
      }
    };

    const onPointerUp = (e) => {
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
      const dist = Math.hypot(clientX - pointerDownPos.x, clientY - pointerDownPos.y);
      orbitRef.current.isDragging = false;
      orbitRef.current.isPanning = false;

      // Treat short click as hotspot raycast selection
      if (dist < 6 && latestStateRef.current.showHotspots) {
        const rect = domEl.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(dynamicRefs.current.raycastTargets);
        if (hits.length > 0 && hits[0].object.userData.hotspotId) {
          latestStateRef.current.onSelectHotspot?.(hits[0].object.userData.hotspotId);
        }
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      orbitRef.current.radius = Math.max(1.5, Math.min(6.0, orbitRef.current.radius + e.deltaY * 0.0022));
    };

    const onContextMenu = (e) => e.preventDefault();

    domEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });
    domEl.addEventListener('contextmenu', onContextMenu);
    domEl.addEventListener('touchstart', onPointerDown, { passive: true });
    domEl.addEventListener('touchmove', onPointerMove, { passive: true });
    domEl.addEventListener('touchend', onPointerUp);

    // Responsive ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    // Animation loop
    let animId;
    const clock = new THREE.Clock();
    let frameCount = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const st = latestStateRef.current;

      // Update camera from spherical orbit coordinates
      const o = orbitRef.current;
      camera.position.set(
        o.target.x + o.radius * Math.sin(o.phi) * Math.sin(o.theta),
        o.target.y + o.radius * Math.cos(o.phi),
        o.target.z + o.radius * Math.sin(o.phi) * Math.cos(o.theta)
      );
      camera.lookAt(o.target.x, o.target.y, o.target.z);

      // Sync table height from parametric state (cm -> meters)
      const tableHeightM = ((st.simConfig?.tableHeight ?? st.workstation.tableHeight) / 100);
      if (dynamicRefs.current.tableGroup) {
        dynamicRefs.current.tableGroup.position.y = tableHeightM;
      }

      // Sync Worker visibility & articulated arm pose toward Connector A
      if (dynamicRefs.current.workerGroup) {
        dynamicRefs.current.workerGroup.visible = st.showWorker;
        const reachM = ((st.simConfig?.reachDistance ?? st.workstation.reachDistance) / 100);
        // Position worker distance subtly based on reachDistance
        dynamicRefs.current.workerGroup.position.z = 0.34 + reachM * 0.56;

        const zoneA = st.effectiveZones.find((z) => z.id === 'A');
        if (zoneA && dynamicRefs.current.leftUpperArm && dynamicRefs.current.leftForearm) {
          // Elevate left arm dynamically based on Connector A Y-height and table height
          const totalHeightA = tableHeightM + (zoneA.y - 30) / 100;
          const elevationAngle = Math.max(0.55, Math.min(1.85, 0.72 + (totalHeightA - 1.15) * 1.65 + (reachM - 0.38) * 1.1));
          const lateralAngle = Math.max(-0.55, Math.min(0.25, (zoneA.x + 25) * 0.012));
          dynamicRefs.current.leftUpperArm.rotation.x = -elevationAngle;
          dynamicRefs.current.leftUpperArm.rotation.z = lateralAngle;
          dynamicRefs.current.leftForearm.rotation.x = -0.58;
        }
        if (dynamicRefs.current.rightUpperArm && dynamicRefs.current.rightForearm) {
          dynamicRefs.current.rightUpperArm.rotation.x = -0.85 + Math.sin(t * 1.2) * 0.03;
          dynamicRefs.current.rightUpperArm.rotation.z = -0.15;
          dynamicRefs.current.rightForearm.rotation.x = -0.78;
        }
      }

      // Sync Connector Groups & Hotspots
      const nextLabels = [];
      const canvasW = renderer.domElement.clientWidth;
      const canvasH = renderer.domElement.clientHeight;

      st.effectiveZones.forEach((zone) => {
        const cm = dynamicRefs.current.connectorMeshes[zone.id];
        const hm = dynamicRefs.current.hotspotMeshes[zone.id];
        // Map parametric cm coordinates to 3D jig space (meters)
        const posX = zone.x / 100;
        const posY = Math.max(0.08, (zone.y - 25) / 100);
        const posZ = -0.02 - (zone.z / 100) * 0.75;

        if (cm) {
          cm.position.set(posX, posY, posZ);
          const tiltRad = ((zone.orientation ?? st.simConfig?.connectorOrientation ?? 15) * Math.PI) / 180;
          cm.rotation.x = -0.25 + tiltRad * 0.55;
        }

        if (hm) {
          hm.group.visible = st.showHotspots;
          hm.group.position.set(posX, posY + 0.02, posZ + 0.065);
          hm.ring.lookAt(camera.position);

          const riskHex = STATUS_COLORS[zone.risk]?.hex || '#F59E0B';
          hm.sphereMat.color.set(riskHex);
          hm.sphereMat.emissive.set(riskHex);
          hm.ringMat.color.set(riskHex);

          const isSelected = st.selectedHotspotId === zone.id;
          const pulse = 1 + Math.sin(t * (zone.risk === 'critical' ? 4.5 : 2.6)) * (isSelected ? 0.24 : 0.14);
          hm.ring.scale.set(pulse, pulse, 1);
          hm.sphere.scale.setScalar(isSelected ? 1.28 : 1.0);
        }

        // Project 3D position to 2D overlay coordinates every 3 frames for smooth, lightweight labels
        if (st.showLabels && frameCount % 3 === 0) {
          const worldVec = new THREE.Vector3(posX, tableHeightM + posY + 0.12, posZ + 0.06);
          worldVec.project(camera);
          if (worldVec.z < 1) {
            nextLabels.push({
              id: zone.id,
              name: zone.name,
              score: zone.exposureScore,
              risk: zone.risk,
              x: (worldVec.x * 0.5 + 0.5) * canvasW,
              y: (-worldVec.y * 0.5 + 0.5) * canvasH,
            });
          }
        }
      });

      if (st.showLabels && frameCount % 3 === 0) {
        setProjectedLabels(nextLabels);
      } else if (!st.showLabels && frameCount % 15 === 0) {
        setProjectedLabels([]);
      }

      frameCount++;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      domEl.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);
      domEl.removeEventListener('contextmenu', onContextMenu);
      domEl.removeEventListener('touchstart', onPointerDown);
      domEl.removeEventListener('touchmove', onPointerMove);
      domEl.removeEventListener('touchend', onPointerUp);
      renderer.dispose();
    };
  }, [loaded]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-[#090E1A] rounded-lg border border-slate-800 overflow-hidden select-none ${
        compact ? 'h-[430px]' : 'h-[540px]'
      }`}
    >
      {!loaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090E1A] z-20 gap-3">
          <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Initializing WebGL 3D Digital Twin...</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090E1A] z-20 p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
          <p className="text-sm text-slate-200 font-medium">{error}</p>
        </div>
      )}

      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* 2D Projected Component Labels */}
      {showLabels &&
        projectedLabels.map((lbl) => {
          const col = STATUS_COLORS[lbl.risk] || STATUS_COLORS.moderate;
          const isSel = selectedHotspotId === lbl.id;
          return (
            <button
              key={lbl.id}
              onClick={() => onSelectHotspot?.(lbl.id)}
              style={{ left: `${lbl.x}px`, top: `${lbl.y}px` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded text-[11px] font-medium backdrop-blur-md transition-all border shadow-lg flex items-center gap-1.5 z-10 ${
                isSel
                  ? 'bg-slate-900/95 border-sky-400 text-white scale-105'
                  : 'bg-slate-950/80 border-slate-700/80 text-slate-200 hover:border-slate-500'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.hex }} />
              <span>{lbl.name}</span>
              <span className="font-mono text-[10px] px-1 rounded bg-slate-800 text-slate-300">{lbl.score}</span>
            </button>
          );
        })}

      {/* Top-Left Camera Controls HUD */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-md p-1 z-10">
        {[
          { id: 'perspective', label: '3D' },
          { id: 'front', label: 'Front' },
          { id: 'side', label: 'Side' },
          { id: 'top', label: 'Top' },
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => applyCameraPreset(v.id)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              cameraPreset === v.id
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            {v.label}
          </button>
        ))}
        <button
          onClick={() => applyCameraPreset('reset')}
          title="Reset Camera"
          className="px-2 py-1 rounded text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Top-Right Visibility Toggles HUD */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-md p-1 z-10">
        <button
          onClick={() => setShowWorker((s) => !s)}
          className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
            showWorker ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <User className="w-3 h-3" />
          Worker
        </button>
        <button
          onClick={() => setShowHotspots((s) => !s)}
          className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
            showHotspots ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Target className="w-3 h-3" />
          Hotspots
        </button>
        <button
          onClick={() => setShowLabels((s) => !s)}
          className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
            showLabels ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Tag className="w-3 h-3" />
          Labels
        </button>
      </div>

      {/* Bottom Legend & Interaction Hint */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10">
        <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-md px-3 py-1.5 text-[11px] text-slate-300 pointer-events-auto">
          <span className="text-slate-500 font-medium">Exposure:</span>
          {(['low', 'moderate', 'high', 'critical']).map((lvl) => (
            <span key={lvl} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[lvl].hex }} />
              {STATUS_COLORS[lvl].label}
            </span>
          ))}
        </div>
        <div className="bg-slate-950/75 backdrop-blur-md border border-slate-800/80 rounded-md px-2.5 py-1 text-[11px] text-slate-400">
          Drag: Orbit · Scroll: Zoom · Shift+Drag: Pan · Click sphere to inspect
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 7. INTERACTIVE SVG ANATOMICAL BODY MAP (FRONT & BACK VIEWS)
// ============================================================================
function AnatomicalBodyMap({ bodyZones, selectedZoneId, onSelectZone }) {
  const zoneMap = useMemo(() => {
    const m = {};
    bodyZones.forEach((z) => {
      m[z.id] = z;
    });
    return m;
  }, [bodyZones]);

  const renderHotspot = (id, cx, cy, r = 14) => {
    const z = zoneMap[id];
    if (!z) return null;
    const col = STATUS_COLORS[z.risk]?.hex || '#F59E0B';
    const isSel = selectedZoneId === id;
    return (
      <g
        key={id}
        onClick={() => onSelectZone(id)}
        className="cursor-pointer transition-transform"
      >
        {(z.risk === 'critical' || isSel) && (
          <circle cx={cx} cy={cy} r={r + 7} fill={col} opacity={isSel ? 0.32 : 0.18} />
        )}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={col}
          fillOpacity={isSel ? 0.92 : 0.65}
          stroke={isSel ? '#FFFFFF' : col}
          strokeWidth={isSel ? 2.5 : 1.5}
        />
        <text
          x={cx}
          y={cy + 3.5}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="9.5"
          fontWeight="700"
          className="pointer-events-none select-none font-mono"
        >
          {z.reports}
        </text>
        <title>{`${z.name}: ${z.reports}/${z.totalWorkers} reports (Avg ${z.avgDiscomfort}/10)`}</title>
      </g>
    );
  };

  const SilhouetteBase = () => (
    <g fill="#162033" stroke="#334155" strokeWidth="1.5">
      {/* Head */}
      <ellipse cx="100" cy="34" rx="18" ry="22" />
      {/* Neck */}
      <rect x="91" y="55" width="18" height="16" rx="4" />
      {/* Shoulders & Torso */}
      <path d="M58 76 Q100 66 142 76 L134 176 Q100 184 66 176 Z" />
      {/* Left Arm (Viewer Left) */}
      <path d="M58 78 L36 148 L24 202 Q30 212 40 206 L53 152 L66 105 Z" />
      {/* Right Arm (Viewer Right) */}
      <path d="M142 78 L164 148 L176 202 Q170 212 160 206 L147 152 L134 105 Z" />
      {/* Left Leg */}
      <path d="M68 176 L64 265 L68 338 L86 338 L92 260 L96 182 Z" />
      {/* Right Leg */}
      <path d="M132 176 L136 265 L132 338 L114 338 L108 260 L104 182 Z" />
    </g>
  );

  return (
    <div className="grid grid-cols-2 gap-4 items-center">
      {/* FRONT VIEW */}
      <div className="bg-[#0B1221] border border-slate-800/90 rounded-lg p-3 flex flex-col items-center">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 mb-2">
          Anterior (Front View)
        </span>
        <svg viewBox="0 0 200 355" className="w-full max-w-[210px] h-auto">
          <SilhouetteBase />
          {/* Anatomical guide lines */}
          <line x1="100" y1="74" x2="100" y2="176" stroke="#1E293B" strokeDasharray="3 3" />
          {/* Note: In Front View, anatomical LEFT is on viewer's RIGHT (x > 100) */}
          {renderHotspot('neck', 100, 62, 11)}
          {renderHotspot('right_shoulder', 60, 84, 14)}
          {renderHotspot('left_shoulder', 140, 84, 15)}
          {renderHotspot('right_elbow', 44, 144, 12)}
          {renderHotspot('left_elbow', 156, 144, 12)}
          {renderHotspot('right_wrist', 34, 188, 12)}
          {renderHotspot('left_wrist', 166, 188, 12)}
          {renderHotspot('right_hand', 27, 210, 11)}
          {renderHotspot('left_hand', 173, 210, 11)}
          <text x="148" y="348" fill="#64748B" fontSize="9" textAnchor="middle">L</text>
          <text x="52" y="348" fill="#64748B" fontSize="9" textAnchor="middle">R</text>
        </svg>
      </div>

      {/* BACK VIEW */}
      <div className="bg-[#0B1221] border border-slate-800/90 rounded-lg p-3 flex flex-col items-center">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 mb-2">
          Posterior (Back View)
        </span>
        <svg viewBox="0 0 200 355" className="w-full max-w-[210px] h-auto">
          <SilhouetteBase />
          <line x1="100" y1="70" x2="100" y2="176" stroke="#1E293B" strokeWidth="2" />
          {/* In Back View, anatomical LEFT is on viewer's LEFT (x < 100) */}
          {renderHotspot('neck', 100, 62, 11)}
          {renderHotspot('left_shoulder', 60, 84, 15)}
          {renderHotspot('right_shoulder', 140, 84, 14)}
          {renderHotspot('upper_back', 100, 108, 15)}
          {renderHotspot('lower_back', 100, 156, 15)}
          {renderHotspot('left_elbow', 44, 144, 12)}
          {renderHotspot('right_elbow', 156, 144, 12)}
          {renderHotspot('left_wrist', 34, 188, 12)}
          {renderHotspot('right_wrist', 166, 188, 12)}
          <text x="52" y="348" fill="#64748B" fontSize="9" textAnchor="middle">L</text>
          <text x="148" y="348" fill="#64748B" fontSize="9" textAnchor="middle">R</text>
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// 8. PAGE 1: EXECUTIVE DASHBOARD
// ============================================================================
function DashboardPage({ aggregates, bodyZones, tasks, interventions, alerts, recommendations, onNavigate }) {
  const interventionStatusData = useMemo(() => {
    const counts = { Proposed: 0, Planned: 0, Implemented: 0, Evaluated: 0 };
    interventions.forEach((i) => {
      if (counts[i.status] !== undefined) counts[i.status]++;
    });
    return [
      { name: 'Proposed', value: counts.Proposed, color: '#64748B' },
      { name: 'Planned', value: counts.Planned, color: '#F59E0B' },
      { name: 'Implemented', value: counts.Implemented, color: '#38BDF8' },
      { name: 'Evaluated', value: counts.Evaluated, color: '#10B981' },
    ];
  }, [interventions]);

  const topBodyZonesChart = useMemo(
    () => [...bodyZones].sort((a, b) => b.exposureScore - a.exposureScore).slice(0, 6),
    [bodyZones]
  );

  return (
    <div className="space-y-5">
      {/* Main Emerging Risk Alert Banner */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-red-500/20 text-red-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">
                Early-Warning Ergonomic Signal
              </span>
              <StatusBadge level="critical" label="Priority: High" size="xs" />
            </div>
            <h2 className="text-base font-semibold text-white mt-0.5">
              Emerging ergonomic risk detected: Left shoulder — {aggregates.leadZone.reports} of{' '}
              {aggregates.participatingWorkers} workers reporting discomfort (avg {aggregates.leadZone.avgDiscomfort}/10)
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Primary correlation: <span className="text-white font-medium">Terminal insertion</span> at{' '}
              <span className="text-white font-medium">Connector Group A</span> (elevated lateral reach 55 cm).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('body', { zoneId: 'left_shoulder' })}
            className="px-3 py-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-100 transition-colors"
          >
            Inspect Body Zone
          </button>
          <button
            onClick={() => onNavigate('simulator')}
            className="px-3.5 py-2 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            Simulate Fix in 3D
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Overall Exposure Score</span>
            <Gauge className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono tabular-nums">{aggregates.overallExposure}</span>
            <span className="text-xs text-slate-500 font-mono">/ 100</span>
            <span className="ml-auto text-xs font-medium text-red-400 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> +6 pts (4w)
            </span>
          </div>
          <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${aggregates.overallExposure}%`,
                backgroundColor: STATUS_COLORS[getRiskLevel(aggregates.overallExposure)].hex,
              }}
            />
          </div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Participating Workers</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono tabular-nums">{aggregates.participatingWorkers}</span>
            <span className="text-xs text-slate-400">active operators</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">100% anonymized workstation-level aggregation</p>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Emerging Risk Alerts</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono tabular-nums">{aggregates.emergingRiskAlerts}</span>
            <StatusBadge level="critical" label="1 Critical" size="xs" />
          </div>
          <p className="text-[11px] text-slate-500 mt-3">Left shoulder, Right wrist, Neck flagged</p>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Interventions</span>
            <Wrench className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono tabular-nums">{interventions.length}</span>
            <span className="text-xs text-emerald-400">{aggregates.activeInterventions} in progress</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">Est. -33% exposure on planned Connector A mod</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel
          title="Weekly Ergonomic Exposure Trend"
          subtitle="6-week synthetic progression across workstation overall & critical zones"
          className="xl:col-span-7"
        >
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aggregates.weeklyTrend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradShoulder" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradOverall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="week" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} domain={[40, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="leftShoulder" name="Left Shoulder" stroke="#EF4444" fill="url(#gradShoulder)" strokeWidth={2} />
                <Area type="monotone" dataKey="overall" name="Overall Exposure" stroke="#38BDF8" fill="url(#gradOverall)" strokeWidth={2} />
                <Line type="monotone" dataKey="rightWrist" name="Right Wrist" stroke="#F97316" strokeWidth={1.8} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Risk Exposure by Body Zone"
          subtitle="Top 6 affected anatomical zones (0–100 prototype index)"
          rightAction={
            <button onClick={() => onNavigate('body')} className="text-xs text-sky-400 hover:text-sky-300 font-medium">
              Full Body Map →
            </button>
          }
          className="xl:col-span-5"
        >
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topBodyZonesChart} layout="vertical" margin={{ top: 4, right: 16, left: 22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#64748B" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={11} width={92} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="exposureScore" name="Exposure Index" radius={[0, 4, 4, 0]} barSize={16}>
                  {topBodyZonesChart.map((entry) => (
                    <Cell key={entry.id} fill={STATUS_COLORS[entry.risk].hex} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel
          title="Exposure by Industrial Task"
          subtitle="LEONI wiring harness assembly cycle (276s takt time)"
          rightAction={
            <button onClick={() => onNavigate('tasks')} className="text-xs text-sky-400 hover:text-sky-300 font-medium">
              Inspect Tasks →
            </button>
          }
          className="xl:col-span-7"
        >
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tasks} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="exposureScore" name="Exposure Score" radius={[4, 4, 0, 0]} barSize={36}>
                  {tasks.map((t) => (
                    <Cell key={t.id} fill={STATUS_COLORS[t.risk].hex} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Intervention Pipeline Status"
          subtitle="Tracking workstation ergonomic actions"
          rightAction={
            <button onClick={() => onNavigate('interventions')} className="text-xs text-sky-400 hover:text-sky-300 font-medium">
              Manage →
            </button>
          }
          className="xl:col-span-5"
        >
          <div className="h-[220px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={interventionStatusData}
                  cx="42%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {interventionStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Bottom Row: Recent Alerts & Top Recommendations */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Recent Emerging Risk Alerts" subtitle="Automated correlation signals from worker feedback">
          <div className="space-y-2.5">
            {alerts.map((a) => (
              <div
                key={a.id}
                onClick={() => onNavigate(a.targetPage, a.zoneId ? { zoneId: a.zoneId } : undefined)}
                className="p-3 rounded-md bg-[#131D31] hover:bg-[#192640] border border-slate-800 cursor-pointer transition-colors flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge level={a.severity} size="xs" />
                    <span className="text-xs font-semibold text-slate-100">{a.title}</span>
                  </div>
                  <p className="text-xs text-slate-400">{a.detail}</p>
                </div>
                <span className="text-[11px] text-slate-500 whitespace-nowrap">{a.timestamp}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Top AI-Assisted Recommendations"
          subtitle="Ranked by estimated exposure reduction"
          rightAction={
            <button onClick={() => onNavigate('recommendations')} className="text-xs text-sky-400 hover:text-sky-300 font-medium">
              View All →
            </button>
          }
        >
          <div className="space-y-2.5">
            {recommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="p-3 rounded-md bg-[#131D31] border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge level={rec.risk} label={rec.priority} size="xs" />
                    <span className="text-xs font-semibold text-slate-100 truncate">{rec.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    Target: {rec.bodyZone} · {rec.workstationZone}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-semibold text-emerald-400">-{rec.expectedImpactPct}%</span>
                  <button
                    onClick={() => onNavigate('simulator', { preset: rec.simulationPreset })}
                    className="px-2.5 py-1.5 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[11px] font-medium"
                  >
                    Simulate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ============================================================================
// 9. PAGE 2: BODY-ZONE ANALYSIS
// ============================================================================
function BodyAnalysisPage({ bodyZones, selectedZoneId, setSelectedZoneId, onNavigate }) {
  const selected = useMemo(
    () => bodyZones.find((z) => z.id === selectedZoneId) || bodyZones[0],
    [bodyZones, selectedZoneId]
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      {/* Left: Interactive Body Map + Zone Quick List */}
      <div className="xl:col-span-7 space-y-4">
        <Panel
          title="Interactive Human Body Heatmap"
          subtitle="Click any anatomical zone to inspect workstation correlation and exposure indicators"
          rightAction={
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Numbers indicate worker report counts</span>
            </div>
          }
        >
          <AnatomicalBodyMap
            bodyZones={bodyZones}
            selectedZoneId={selected.id}
            onSelectZone={setSelectedZoneId}
          />
          {/* Quick-select pills for all 11 zones */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap gap-1.5">
            {bodyZones.map((z) => {
              const isSel = z.id === selected.id;
              return (
                <button
                  key={z.id}
                  onClick={() => setSelectedZoneId(z.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    isSel
                      ? 'bg-sky-500/20 border-sky-400 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[z.risk].hex }} />
                  {z.name}
                  <span className="text-[10px] font-mono text-slate-400">({z.reports})</span>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Right: Selected Body Zone Detailed Inspector */}
      <div className="xl:col-span-5 space-y-4">
        <Panel
          title={selected.name.toUpperCase()}
          subtitle="Aggregated ergonomic exposure & discomfort telemetry"
          rightAction={<StatusBadge level={selected.risk} label={`Priority: ${selected.priority}`} />}
        >
          <div className="space-y-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-[#131D31] border border-slate-800 rounded-md p-3">
                <span className="text-[11px] text-slate-400 block">Worker Reports</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">
                  {selected.reports}/{selected.totalWorkers}
                </span>
              </div>
              <div className="bg-[#131D31] border border-slate-800 rounded-md p-3">
                <span className="text-[11px] text-slate-400 block">Avg Discomfort</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">
                  {selected.avgDiscomfort}
                  <span className="text-xs text-slate-500">/10</span>
                </span>
              </div>
              <div className="bg-[#131D31] border border-slate-800 rounded-md p-3">
                <span className="text-[11px] text-slate-400 block">4-Week Trend</span>
                <span
                  className={`text-sm font-semibold mt-1.5 flex items-center gap-1 ${
                    selected.trend === 'Increasing'
                      ? 'text-red-400'
                      : selected.trend === 'Decreasing'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {selected.trend === 'Increasing' ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {selected.trend} ({selected.trendDelta})
                </span>
              </div>
            </div>

            {/* Correlations */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0B1221] border border-slate-800/80 rounded-md p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Associated Tasks
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.associatedTasks.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-200">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-[#0B1221] border border-slate-800/80 rounded-md p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Workstation Zones
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.workstationZones.map((wz) => (
                    <span key={wz} className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-xs text-sky-300">
                      {wz}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Exposure Indicators */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Primary Exposure Indicators
              </h4>
              <ul className="space-y-1.5">
                {selected.exposureIndicators.map((ind, i) => (
                  <li key={i} className="text-xs text-slate-200 flex items-center gap-2 bg-[#131D31] px-3 py-2 rounded border border-slate-800/70">
                    <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    {ind}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Recommended Ergonomic Investigations
              </h4>
              <ul className="space-y-1.5">
                {selected.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Navigation Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => onNavigate('twin')}
                className="flex-1 py-2 px-3 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 transition-colors"
              >
                View in 3D Digital Twin
              </button>
              <button
                onClick={() => onNavigate('simulator')}
                className="flex-1 py-2 px-3 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors"
              >
                Open What-If Simulator
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ============================================================================
// 10. PAGE 3: TASK ANALYSIS
// ============================================================================
function TaskAnalysisPage({ tasks, onNavigate }) {
  const [selectedTaskId, setSelectedTaskId] = useState(tasks[0]?.id || 'terminal_insertion');
  const selected = useMemo(() => tasks.find((t) => t.id === selectedTaskId) || tasks[0], [tasks, selectedTaskId]);

  return (
    <div className="space-y-5">
      {/* Top Comparison Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel
          title="Task Ergonomic Exposure vs. Hourly Repetitions"
          subtitle="LEONI Wiring Harness Assembly — 13 harnesses/hr | 276s takt time"
          className="xl:col-span-8"
        >
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={tasks} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748B" fontSize={11} domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" stroke="#38BDF8" fontSize={11} domain={[0, 260]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar yAxisId="left" dataKey="exposureScore" name="Exposure Score (/100)" barSize={36} radius={[4, 4, 0, 0]}>
                  {tasks.map((t) => (
                    <Cell key={t.id} fill={STATUS_COLORS[t.risk].hex} />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="repetitionsPerHr"
                  name="Repetitions / hr"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#38BDF8' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Takt Time Allocation (276s)" subtitle="Cycle duration breakdown per operation" className="xl:col-span-4">
          <div className="space-y-3 mt-1">
            {tasks.map((t) => (
              <div key={t.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-medium">{t.name}</span>
                  <span className="font-mono text-slate-400">
                    {t.durationSec}s ({t.taktSharePct}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${t.taktSharePct}%`, backgroundColor: STATUS_COLORS[t.risk].hex }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Takt Cycle</span>
              <span className="font-mono font-semibold text-white">276 seconds (13.0 harnesses/hr)</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Interactive Task Table + Detail Drawer */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel title="Workstation Operations Matrix" subtitle="Select any task to inspect biomechanical exposure profile" className="xl:col-span-7" noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-[#111B2E]">
                  <th className="py-2.5 px-4">Operation</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Reps/hr</th>
                  <th className="py-2.5 px-3">Discomfort</th>
                  <th className="py-2.5 px-3">Exposure</th>
                  <th className="py-2.5 px-4">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {tasks.map((t) => {
                  const isSel = t.id === selected.id;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className={`cursor-pointer transition-colors ${
                        isSel ? 'bg-sky-500/10' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{t.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{t.code}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">{t.durationSec}s</td>
                      <td className="py-3 px-3 font-mono text-slate-300">{t.repetitionsPerHr}</td>
                      <td className="py-3 px-3 font-mono text-slate-200">{t.reportedDiscomfort}/10</td>
                      <td className="py-3 px-3 font-mono font-bold text-white">{t.exposureScore}/100</td>
                      <td className="py-3 px-4">
                        <StatusBadge level={t.risk} size="xs" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title={`${selected.code} — ${selected.name}`}
          subtitle="Detailed task ergonomics profile"
          rightAction={<StatusBadge level={selected.risk} />}
          className="xl:col-span-5"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">{selected.description}</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#131D31] border border-slate-800 rounded-md p-3">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Affected Body Zones</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.associatedBodyZones.map((bz) => (
                    <span key={bz} className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-200">
                      {bz}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-[#131D31] border border-slate-800 rounded-md p-3">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Interaction Zones</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.workstationZones.map((wz) => (
                    <span key={wz} className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-[11px] text-sky-300">
                      {wz}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Exposure Contributors
              </span>
              <ul className="mt-2 space-y-1.5">
                {selected.exposureIndicators.map((ind, i) => (
                  <li key={i} className="text-xs text-slate-200 flex items-center gap-2 bg-[#0B1221] px-3 py-1.5 rounded border border-slate-800">
                    <Zap className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    {ind}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => onNavigate('simulator')}
              className="w-full py-2 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors"
            >
              Simulate Workstation Adjustments for {selected.name}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ============================================================================
// 11. PAGE 4: 3D WORKSTATION DIGITAL TWIN
// ============================================================================
function DigitalTwinPage({ workstation, onNavigate }) {
  const [selectedHotspotId, setSelectedHotspotId] = useState('A');

  const activeZone = useMemo(
    () => workstation.connectorZones.find((z) => z.id === selectedHotspotId) || workstation.connectorZones[0],
    [workstation, selectedHotspotId]
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      {/* 3D Viewport */}
      <div className="xl:col-span-8 space-y-3">
        <WorkstationDigitalTwin3D
          workstation={workstation}
          selectedHotspotId={selectedHotspotId}
          onSelectHotspot={setSelectedHotspotId}
        />

        {/* Hotspot Quick-Select Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {workstation.connectorZones.map((zone) => {
            const isSel = zone.id === selectedHotspotId;
            return (
              <button
                key={zone.id}
                onClick={() => setSelectedHotspotId(zone.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSel
                    ? 'bg-sky-500/15 border-sky-400'
                    : 'bg-[#0F172A] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{zone.name}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[zone.risk].hex }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">{zone.associatedTask}</div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Exposure</span>
                  <span className="font-bold text-slate-100">{zone.exposureScore}/100</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Hotspot Inspector */}
      <div className="xl:col-span-4 space-y-4">
        <Panel
          title={activeZone.name}
          subtitle={`Coordinates: X ${activeZone.x}cm · Y ${activeZone.y}cm · Z ${activeZone.z}cm`}
          rightAction={<StatusBadge level={activeZone.risk} />}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#131D31] border border-slate-800 rounded-md p-3">
                <span className="text-[11px] text-slate-400">Zone Exposure</span>
                <div className="text-2xl font-bold font-mono text-white mt-0.5">
                  {activeZone.exposureScore}
                  <span className="text-xs text-slate-500">/100</span>
                </div>
              </div>
              <div className="bg-[#131D31] border border-slate-800 rounded-md p-3">
                <span className="text-[11px] text-slate-400">Avg Discomfort</span>
                <div className="text-2xl font-bold font-mono text-white mt-0.5">
                  {activeZone.reportedDiscomfort}
                  <span className="text-xs text-slate-500">/10</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Associated Task</span>
              <div className="mt-1 text-xs font-medium text-slate-100 bg-[#0B1221] border border-slate-800 rounded px-3 py-2">
                {activeZone.associatedTask}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Affected Body Zones</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {activeZone.bodyZones.map((bz) => (
                  <span key={bz} className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-200">
                    {bz}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Exposure Indicators</span>
              <ul className="mt-1.5 space-y-1.5">
                {activeZone.exposureIndicators.map((ind, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    {ind}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/25">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Suggested Engineering Action
              </span>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">{activeZone.recommendation}</p>
            </div>

            <button
              onClick={() => onNavigate('simulator')}
              className="w-full py-2.5 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              Test Modification in What-If Simulator
            </button>
          </div>
        </Panel>

        <Panel title="Workstation Parametric Baseline" subtitle={workstation.line}>
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            <span className="text-slate-400">Table Height</span>
            <span className="font-mono text-right text-slate-200">{workstation.tableHeight} cm</span>
            <span className="text-slate-400">Baseline Reach</span>
            <span className="font-mono text-right text-slate-200">{workstation.reachDistance} cm</span>
            <span className="text-slate-400">Harness Complexity</span>
            <span className="font-mono text-right text-slate-200">{workstation.wiresPerHarness} wires</span>
            <span className="text-slate-400">Takt Time</span>
            <span className="font-mono text-right text-slate-200">{workstation.taktTime} s</span>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ============================================================================
// 12. PAGE 5: WHAT-IF SIMULATOR (CORE FEATURE)
// ============================================================================
function SimulatorPage({ workstation, simConfig, setSimConfig, onPromoteToIntervention }) {
  const [selectedHotspotId, setSelectedHotspotId] = useState('A');

  const baselineConfig = useMemo(() => {
    const zoneA = workstation.connectorZones.find((z) => z.id === 'A') || { x: -45, y: 80, z: 20 };
    return {
      tableHeight: workstation.tableHeight,
      connectorA_y: zoneA.y,
      connectorA_x: zoneA.x,
      connectorA_z: zoneA.z,
      connectorOrientation: workstation.connectorOrientation,
      reachDistance: workstation.reachDistance,
      taskRepetition: workstation.taskRepetition,
      cycleTime: workstation.cycleTime,
      taskRotation: workstation.taskRotation,
    };
  }, [workstation]);

  const comparison = useMemo(
    () => ErgoPredictService.compareConfigurations(baselineConfig, simConfig),
    [baselineConfig, simConfig]
  );

  const chartData = [
    { metric: 'Overall', Current: comparison.before.overallExposure, Proposed: comparison.after.overallExposure },
    { metric: 'Shoulder', Current: comparison.before.shoulderExposure, Proposed: comparison.after.shoulderExposure },
    { metric: 'Wrist', Current: comparison.before.wristExposure, Proposed: comparison.after.wristExposure },
    { metric: 'Neck', Current: comparison.before.neckExposure, Proposed: comparison.after.neckExposure },
    { metric: 'Back', Current: comparison.before.backExposure, Proposed: comparison.after.backExposure },
  ];

  const updateParam = (key, val) => {
    setSimConfig((prev) => ({ ...prev, [key]: Number(val) }));
  };

  const applyOptimalPreset = () => {
    setSimConfig({
      tableHeight: 88,
      connectorA_y: 65,
      connectorA_x: -24,
      connectorA_z: 12,
      connectorOrientation: 35,
      reachDistance: 40,
      taskRepetition: 155,
      cycleTime: 276,
      taskRotation: 55,
    });
  };

  const resetBaseline = () => setSimConfig(baselineConfig);

  const controls = [
    { key: 'tableHeight', label: 'Table Height', unit: 'cm', min: 75, max: 115, step: 1 },
    { key: 'connectorA_y', label: 'Connector A Height', unit: 'cm', min: 45, max: 105, step: 1 },
    { key: 'connectorA_x', label: 'Connector A Horizontal X', unit: 'cm', min: -60, max: 10, step: 1 },
    { key: 'connectorA_z', label: 'Connector A Depth Z', unit: 'cm', min: 5, max: 40, step: 1 },
    { key: 'connectorOrientation', label: 'Connector Orientation', unit: '°', min: 0, max: 60, step: 1 },
    { key: 'reachDistance', label: 'Reach Distance', unit: 'cm', min: 25, max: 65, step: 1 },
    { key: 'taskRepetition', label: 'Task Repetition', unit: '/hr', min: 80, max: 240, step: 5 },
    { key: 'cycleTime', label: 'Task Duration (Takt)', unit: 's', min: 150, max: 350, step: 2 },
    { key: 'taskRotation', label: 'Task Rotation', unit: '%', min: 0, max: 100, step: 5 },
  ];

  return (
    <div className="space-y-4">
      {/* Top Action Bar & Demo Estimate Notice */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-sky-500/15 text-sky-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Parametric Ergonomic What-If Simulator</h2>
            <p className="text-[11px] text-slate-400">
              Demonstration estimates only — adjust sliders to update the 3D Digital Twin and projected exposure in real time.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={resetBaseline}
            className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Baseline
          </button>
          <button
            onClick={applyOptimalPreset}
            className="px-3 py-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs font-semibold text-emerald-300 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Apply Optimal Ergonomic Preset
          </button>
          <button
            onClick={() => onPromoteToIntervention(simConfig, comparison)}
            className="px-3.5 py-1.5 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Promote to Intervention
          </button>
        </div>
      </div>

      {/* Main Split View: Left 3D + Charts | Right Parametric Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7 space-y-4">
          <WorkstationDigitalTwin3D
            workstation={workstation}
            simConfig={simConfig}
            simResult={comparison.after}
            selectedHotspotId={selectedHotspotId}
            onSelectHotspot={setSelectedHotspotId}
            compact
          />

          {/* Current vs Proposed Scorecard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label: 'Overall Exposure',
                curr: comparison.before.overallExposure,
                prop: comparison.after.overallExposure,
                delta: comparison.deltas.overallPct,
                unit: '/100',
              },
              {
                label: 'Shoulder Exposure',
                curr: comparison.before.shoulderExposure,
                prop: comparison.after.shoulderExposure,
                delta: comparison.deltas.shoulderPct,
                unit: '/100',
              },
              {
                label: 'Reach Distance',
                curr: comparison.before.reachDistance,
                prop: comparison.after.reachDistance,
                delta: comparison.deltas.reachPct,
                unit: 'cm',
              },
            ].map((item) => {
              const improved = item.delta < 0;
              return (
                <div key={item.label} className="bg-[#0F172A] border border-slate-800 rounded-lg p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">{item.label}</span>
                    <span
                      className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        item.delta === 0
                          ? 'bg-slate-800 text-slate-400'
                          : improved
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {item.delta > 0 ? `+${item.delta}%` : `${item.delta}%`}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">Current</span>
                      <span className="text-lg font-mono font-semibold text-slate-400">
                        {item.curr}
                        <span className="text-[10px] ml-0.5">{item.unit}</span>
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600" />
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-sky-400 block">Proposed</span>
                      <span className="text-xl font-mono font-bold text-white">
                        {item.prop}
                        <span className="text-[10px] text-slate-400 ml-0.5">{item.unit}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Before / After Comparison Chart */}
          <Panel title="Current vs. Proposed Exposure Profile" subtitle="Projected biomechanical load distribution across zones (Demo Estimates)">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="metric" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Current" fill="#64748B" radius={[3, 3, 0, 0]} barSize={22} />
                  <Bar dataKey="Proposed" fill="#38BDF8" radius={[3, 3, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        {/* Right: Parametric Controls */}
        <Panel
          title="Workstation & Task Parameters"
          subtitle="Modify physical geometry & operational cadence"
          className="xl:col-span-5"
        >
          <div className="space-y-4">
            {controls.map((ctrl) => {
              const val = simConfig[ctrl.key];
              const baseVal = baselineConfig[ctrl.key];
              const changed = val !== baseVal;
              return (
                <div key={ctrl.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-slate-200 flex items-center gap-2">
                      {ctrl.label}
                      {changed && (
                        <span className="text-[10px] font-mono text-sky-400">
                          (base: {baseVal}{ctrl.unit})
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={ctrl.min}
                        max={ctrl.max}
                        step={ctrl.step}
                        value={val}
                        onChange={(e) => updateParam(ctrl.key, e.target.value)}
                        className="w-16 bg-[#0B1221] border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-xs text-white focus:outline-none focus:border-sky-400"
                      />
                      <span className="text-[11px] text-slate-500 w-6">{ctrl.unit}</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step}
                    value={val}
                    onChange={(e) => updateParam(ctrl.key, e.target.value)}
                    className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>{ctrl.min}{ctrl.unit}</span>
                    <span>{ctrl.max}{ctrl.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ============================================================================
// 13. PAGE 6: AI ANALYSIS & RECOMMENDATIONS
// ============================================================================
function RecommendationsPage({ recommendations, onSimulatePreset, onAddIntervention }) {
  return (
    <div className="space-y-4">
      <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4 flex items-start gap-3">
        <Cpu className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-semibold text-white">Explainable Ergonomic Correlation Engine</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Each recommendation traces a transparent chain from anonymous operator discomfort reports to industrial task exposure and physical workstation geometry. These findings support ergonomic investigation and do not constitute medical diagnoses.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec) => (
          <div key={rec.id} className="bg-[#0F172A] border border-slate-800 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-[#111B2E] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono text-slate-500">{rec.id}</span>
                <h3 className="text-sm font-semibold text-white">{rec.title}</h3>
                <StatusBadge level={rec.risk} label={rec.priority} size="xs" />
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400">
                  Model Confidence: <strong className="text-sky-400 font-mono">{rec.confidence}%</strong>
                </span>
                <span className="text-slate-400">
                  Est. Impact: <strong className="text-emerald-400 font-mono">-{rec.expectedImpactPct}% exposure</strong>
                </span>
              </div>
            </div>

            {/* 4-Dimension Reasoning Chain */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                {[
                  { label: '1. BODY ZONE', value: rec.bodyZone, accent: 'border-red-500/30' },
                  { label: '2. TASK', value: rec.task, accent: 'border-orange-500/30' },
                  { label: '3. WORKSTATION ZONE', value: rec.workstationZone, accent: 'border-sky-500/30' },
                  { label: '4. ASSOCIATED EXPOSURE', value: rec.associatedExposure, accent: 'border-amber-500/30' },
                ].map((step) => (
                  <div key={step.label} className={`bg-[#0B1221] border ${step.accent} rounded-md p-3`}>
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 block">{step.label}</span>
                    <span className="text-xs font-medium text-slate-100 mt-1 block leading-snug">{step.value}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="bg-[#131D31] border border-slate-800 rounded-md p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Finding</span>
                  <p className="text-xs text-slate-200 mt-1 leading-relaxed">{rec.systemFinding}</p>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-md p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Recommended Investigation
                  </span>
                  <p className="text-xs text-slate-200 mt-1 leading-relaxed">{rec.recommendedInvestigation}</p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>Difficulty: <strong className="text-slate-200">{rec.difficulty}</strong></span>
                  <span>Est. Cost: <strong className="text-slate-200 font-mono">€{rec.estimatedCost.toLocaleString()}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAddIntervention(rec)}
                    className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-100 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add to Interventions
                  </button>
                  <button
                    onClick={() => onSimulatePreset(rec.simulationPreset)}
                    className="px-3.5 py-1.5 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Move3d className="w-3.5 h-3.5" />
                    Simulate in 3D
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 14. PAGE 7: INTERVENTION TRACKING
// ============================================================================
function InterventionsPage({ interventions, setInterventions, workstationId, showToast }) {
  const [filterStatus, setFilterStatus] = useState('All');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingEvalId, setEditingEvalId] = useState(null);
  const [evalNoteDraft, setEvalNoteDraft] = useState('');

  const [newForm, setNewForm] = useState({
    title: '',
    description: '',
    workstation: workstationId,
    costEstimate: 1200,
    expectedReductionPct: 20,
    difficulty: 'Low',
    status: 'Proposed',
  });

  const filtered = useMemo(() => {
    if (filterStatus === 'All') return interventions;
    return interventions.filter((i) => i.status === filterStatus);
  }, [interventions, filterStatus]);

  const evaluatedChartData = useMemo(
    () =>
      interventions
        .filter((i) => i.status === 'Implemented' || i.status === 'Evaluated' || i.status === 'Planned')
        .map((i) => ({
          name: i.id,
          Before: i.beforeExposure,
          After: i.afterExposure,
        })),
    [interventions]
  );

  const statusOrder = ['Proposed', 'Planned', 'Implemented', 'Evaluated'];

  const advanceStatus = (id) => {
    setInterventions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const idx = statusOrder.indexOf(item.status);
        const nextStatus = statusOrder[Math.min(statusOrder.length - 1, idx + 1)];
        return { ...item, status: nextStatus };
      })
    );
    showToast('Intervention status updated.');
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newForm.title.trim()) return;
    const before = 72;
    const after = Math.max(25, Math.round(before * (1 - Number(newForm.expectedReductionPct) / 100)));
    const created = {
      id: `INT-2026-0${interventions.length + 1}`,
      ...newForm,
      costEstimate: Number(newForm.costEstimate),
      expectedReductionPct: Number(newForm.expectedReductionPct),
      beforeExposure: before,
      afterExposure: after,
      createdDate: new Date().toISOString().slice(0, 10),
      evaluationNote: 'Newly logged intervention awaiting engineering sign-off.',
    };
    setInterventions((prev) => [created, ...prev]);
    setShowNewModal(false);
    setNewForm({
      title: '',
      description: '',
      workstation: workstationId,
      costEstimate: 1200,
      expectedReductionPct: 20,
      difficulty: 'Low',
      status: 'Proposed',
    });
    showToast(`Created intervention ${created.id}.`);
  };

  const saveEvaluation = (id) => {
    setInterventions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, evaluationNote: evalNoteDraft, status: 'Evaluated' } : item))
    );
    setEditingEvalId(null);
    showToast('Before/after evaluation recorded.');
  };

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-[#0F172A] border border-slate-800 rounded-md p-1">
          {['All', ...statusOrder].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                filterStatus === st ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="px-3.5 py-2 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New Intervention
        </button>
      </div>

      {/* Before / After Exposure Chart */}
      <Panel title="Before vs. After Intervention Exposure" subtitle="Measured and projected exposure score reduction across workstation actions">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evaluatedChartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Before" name="Before Exposure" fill="#64748B" radius={[3, 3, 0, 0]} barSize={28} />
              <Bar dataKey="After" name="After Exposure" fill="#10B981" radius={[3, 3, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Intervention Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-8 text-center text-xs text-slate-400">
            No interventions match the selected status filter.
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="bg-[#0F172A] border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-slate-500">{item.id}</span>
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-sky-300">
                      {item.workstation}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge
                    level={
                      item.status === 'Evaluated'
                        ? 'low'
                        : item.status === 'Implemented'
                        ? 'moderate'
                        : item.status === 'Planned'
                        ? 'high'
                        : 'moderate'
                    }
                    label={item.status}
                  />
                  {item.status !== 'Evaluated' && (
                    <button
                      onClick={() => advanceStatus(item.id)}
                      className="px-2.5 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-[11px] font-medium text-sky-300"
                    >
                      Mark as {statusOrder[statusOrder.indexOf(item.status) + 1]}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingEvalId(item.id);
                      setEvalNoteDraft(item.evaluationNote);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200"
                  >
                    Record Evaluation
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Cost Estimate</span>
                  <span className="font-mono font-semibold text-slate-200">€{item.costEstimate.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Expected Reduction</span>
                  <span className="font-mono font-semibold text-emerald-400">-{item.expectedReductionPct}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Exposure Shift</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {item.beforeExposure} → {item.afterExposure}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Difficulty</span>
                  <span className="font-medium text-slate-200">{item.difficulty}</span>
                </div>
              </div>

              {editingEvalId === item.id ? (
                <div className="bg-[#0B1221] border border-slate-700 rounded-md p-3 space-y-2">
                  <textarea
                    value={evalNoteDraft}
                    onChange={(e) => setEvalNoteDraft(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                    placeholder="Enter post-intervention ergonomic evaluation notes..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingEvalId(null)}
                      className="px-2.5 py-1 rounded bg-slate-800 text-xs text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEvaluation(item.id)}
                      className="px-3 py-1 rounded bg-emerald-500 text-slate-950 text-xs font-semibold"
                    >
                      Save Evaluation
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 bg-[#0B1221] px-3 py-2 rounded border border-slate-800/80">
                  <span className="text-slate-500 font-medium">Evaluation Log: </span>
                  {item.evaluationNote}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Intervention Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-700 rounded-lg max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Create Ergonomic Intervention</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Intervention Title *</label>
                <input
                  required
                  value={newForm.title}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  placeholder="e.g., Install 35° Tilted Bracket for Connector Group A"
                  className="w-full bg-[#0B1221] border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  placeholder="Engineering details and expected ergonomic effect..."
                  className="w-full bg-[#0B1221] border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-sky-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Cost Estimate (€)</label>
                  <input
                    type="number"
                    value={newForm.costEstimate}
                    onChange={(e) => setNewForm({ ...newForm, costEstimate: Number(e.target.value) })}
                    className="w-full bg-[#0B1221] border border-slate-700 rounded px-3 py-2 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Expected Exposure Reduction (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={newForm.expectedReductionPct}
                    onChange={(e) => setNewForm({ ...newForm, expectedReductionPct: Number(e.target.value) })}
                    className="w-full bg-[#0B1221] border border-slate-700 rounded px-3 py-2 font-mono text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Implementation Difficulty</label>
                  <select
                    value={newForm.difficulty}
                    onChange={(e) => setNewForm({ ...newForm, difficulty: e.target.value })}
                    className="w-full bg-[#0B1221] border border-slate-700 rounded px-3 py-2 text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Initial Status</label>
                  <select
                    value={newForm.status}
                    onChange={(e) => setNewForm({ ...newForm, status: e.target.value })}
                    className="w-full bg-[#0B1221] border border-slate-700 rounded px-3 py-2 text-white"
                  >
                    <option value="Proposed">Proposed</option>
                    <option value="Planned">Planned</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-2 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
                >
                  Save Intervention
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 15. PAGE 8: ROI & ECONOMIC IMPACT
// ============================================================================
function EconomicImpactPage() {
  const [assumptions, setAssumptions] = useState({
    interventionCost: 4800,
    absenteeismCostPerDay: 260,
    baselineAbsentDaysPerWorkerYr: 9.5,
    absenteeismReductionPct: 28,
    annualScrapDefectCost: 18500,
    defectReductionPct: 15,
    productivityGainPct: 3.2,
    annualOperatorLaborCost: 24000,
    affectedOperators: 10,
  });

  const roi = useMemo(() => ErgoPredictService.calculateROI(assumptions), [assumptions]);

  const breakdownData = [
    { name: 'Absenteeism Reduction', value: roi.absenteeismSavings, color: '#38BDF8' },
    { name: 'Defect / Scrap Reduction', value: roi.defectSavings, color: '#10B981' },
    { name: 'Productivity Gain', value: roi.productivitySavings, color: '#F59E0B' },
  ];

  const updateField = (k, v) => setAssumptions((prev) => ({ ...prev, [k]: Number(v) }));

  return (
    <div className="space-y-5">
      {/* Demo Financial Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg px-4 py-2.5 flex items-center gap-2.5 text-xs text-amber-200">
        <Info className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong>DEMO FINANCIAL ESTIMATES:</strong> All economic projections below are calculated from editable synthetic assumptions for executive decision-support modeling.
        </span>
      </div>

      {/* 4 Economic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4">
          <span className="text-xs text-slate-400">Intervention Investment</span>
          <div className="text-2xl font-bold font-mono text-white mt-1.5">€{roi.interventionCost.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">One-time capex & tooling</span>
        </div>
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4">
          <span className="text-xs text-slate-400">Estimated Annual Savings</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1.5">€{roi.annualSavings.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Absenteeism + Quality + Output</span>
        </div>
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4">
          <span className="text-xs text-slate-400">Year-1 Net ROI</span>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-1.5">{roi.roiPct}%</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Net Year-1: €{roi.netYear1.toLocaleString()}</span>
        </div>
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4">
          <span className="text-xs text-slate-400">Estimated Payback Period</span>
          <div className="text-2xl font-bold font-mono text-white mt-1.5">{roi.paybackMonths} mo</div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Break-even within first year</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Editable Assumptions */}
        <Panel title="Financial Model Assumptions" subtitle="Adjust site-specific cost parameters" className="xl:col-span-5">
          <div className="space-y-3.5 text-xs">
            {[
              { k: 'interventionCost', label: 'Intervention Cost (€)', min: 500, max: 25000, step: 100 },
              { k: 'affectedOperators', label: 'Affected Operators', min: 2, max: 40, step: 1 },
              { k: 'absenteeismCostPerDay', label: 'Avg Absenteeism Cost / Day (€)', min: 100, max: 600, step: 10 },
              { k: 'absenteeismReductionPct', label: 'Expected Absenteeism Reduction (%)', min: 0, max: 60, step: 2 },
              { k: 'defectReductionPct', label: 'Scrap / Wiring Defect Reduction (%)', min: 0, max: 50, step: 1 },
              { k: 'productivityGainPct', label: 'Productivity Improvement (%)', min: 0, max: 12, step: 0.2 },
            ].map((f) => (
              <div key={f.k} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">{f.label}</span>
                  <span className="font-mono font-semibold text-white">{assumptions[f.k]}</span>
                </div>
                <input
                  type="range"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={assumptions[f.k]}
                  onChange={(e) => updateField(f.k, e.target.value)}
                  className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            ))}
          </div>
        </Panel>

        {/* Charts */}
        <div className="xl:col-span-7 space-y-4">
          <Panel title="3-Year Cumulative Net Value (€)" subtitle="Projected financial return after initial workstation modification">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roi.projection} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="year" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cumulativeNet" name="Cumulative Net (€)" radius={[4, 4, 0, 0]} barSize={42}>
                    {roi.projection.map((p, idx) => (
                      <Cell key={idx} fill={p.cumulativeNet >= 0 ? '#10B981' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Annual Savings Value Breakdown" subtitle="Estimated yearly contribution by operational lever">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {breakdownData.map((b) => (
                <div key={b.name} className="bg-[#131D31] border border-slate-800 rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="text-[11px] text-slate-400">{b.name}</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-white mt-1.5">€{b.value.toLocaleString()}/yr</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 16. PAGE 9: WORKER FEEDBACK (SIMPLE, ANONYMOUS, OPERATOR-FIRST)
// ============================================================================
function WorkerFeedbackPage({ bodyZones, tasks, workstationId, onSubmitFeedback }) {
  const [selectedZone, setSelectedZone] = useState('left_shoulder');
  const [intensity, setIntensity] = useState(6);
  const [selectedTask, setSelectedTask] = useState(tasks[0]?.name || 'Terminal insertion');
  const [timing, setTiming] = useState('End of shift');
  const [comment, setComment] = useState('');
  const [submittedRecord, setSubmittedRecord] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const res = onSubmitFeedback({
      workstationId,
      bodyZoneId: selectedZone,
      intensity,
      task: selectedTask,
      timing,
      comment: comment.trim(),
    });
    setSubmittedRecord(res);
    setComment('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Privacy Assurance Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-semibold text-white">Anonymous Operator Ergonomic Check-In</h2>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            No personal name, employee ID, or badge number is collected. Management and ergonomics teams only receive <strong>aggregated workstation-level trends</strong> to prioritize physical improvements.
          </p>
        </div>
      </div>

      {submittedRecord && (
        <div className="bg-sky-500/15 border border-sky-500/40 rounded-lg p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-sky-200">
            <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <strong>Thank you — anonymous feedback recorded ({submittedRecord.anonymizedId}).</strong>
              <span className="block text-slate-300 mt-0.5">
                Workstation aggregates and Body-Zone Analysis have been updated in real time.
              </span>
            </div>
          </div>
          <button
            onClick={() => setSubmittedRecord(null)}
            className="text-xs text-sky-300 hover:text-white underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <Panel title={`Quick Check-In — ${workstationId}`} subtitle="Takes less than 20 seconds">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Body Zone */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-2.5">
              1. Where do you feel discomfort?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {bodyZones.map((z) => {
                const active = selectedZone === z.id;
                return (
                  <button
                    type="button"
                    key={z.id}
                    onClick={() => setSelectedZone(z.id)}
                    className={`px-3 py-2.5 rounded-md border text-xs font-medium text-left transition-all flex items-center justify-between ${
                      active
                        ? 'bg-sky-500/20 border-sky-400 text-white'
                        : 'bg-[#0B1221] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span>{z.name}</span>
                    {active && <Check className="w-3.5 h-3.5 text-sky-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Discomfort Intensity 1-10 */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                2. Discomfort Intensity (1 = Mild, 10 = Severe)
              </label>
              <span className="text-sm font-mono font-bold text-white px-2.5 py-0.5 rounded bg-slate-800">
                {intensity} / 10
              </span>
            </div>
            <div className="grid grid-cols-10 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const active = intensity === num;
                const colorClass =
                  num <= 3
                    ? 'border-emerald-500/40 text-emerald-300'
                    : num <= 6
                    ? 'border-amber-500/40 text-amber-300'
                    : num <= 8
                    ? 'border-orange-500/40 text-orange-300'
                    : 'border-red-500/40 text-red-300';
                return (
                  <button
                    type="button"
                    key={num}
                    onClick={() => setIntensity(num)}
                    className={`py-2.5 rounded-md border font-mono text-xs font-bold transition-all ${
                      active
                        ? 'bg-sky-500 text-slate-950 border-sky-400 scale-105'
                        : `bg-[#0B1221] ${colorClass} hover:bg-slate-800`
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Task */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-2.5">
              3. Which task were you performing?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {tasks.map((t) => {
                const active = selectedTask === t.name;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setSelectedTask(t.name)}
                    className={`px-3 py-2.5 rounded-md border text-xs font-medium transition-all ${
                      active
                        ? 'bg-sky-500/20 border-sky-400 text-white'
                        : 'bg-[#0B1221] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 4: Timing */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-2.5">
              4. When does the discomfort occur?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['Start of shift', 'Mid-shift', 'End of shift', 'Continuous'].map((slot) => {
                const active = timing === slot;
                return (
                  <button
                    type="button"
                    key={slot}
                    onClick={() => setTiming(slot)}
                    className={`px-3 py-2 rounded-md border text-xs font-medium transition-all ${
                      active
                        ? 'bg-sky-500/20 border-sky-400 text-white'
                        : 'bg-[#0B1221] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 5: Optional Comment */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-2">
              5. Optional Workstation Note
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g., Upper-left connector housing feels too high during long batches..."
              className="w-full bg-[#0B1221] border border-slate-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-semibold transition-colors"
          >
            Submit Anonymous Ergonomic Feedback
          </button>
        </form>
      </Panel>
    </div>
  );
}

// ============================================================================
// 17. MAIN APPLICATION SHELL (Sidebar + Header + Switch/Case Router)
// ============================================================================
export default function App() {
  const [activePage, setActivePage] = useState('overview');
  const [workstationId, setWorkstationId] = useState('LEONI-MONTAGE-01');
  const [bodyZones, setBodyZones] = useState(INITIAL_BODY_ZONES);
  const [selectedBodyZoneId, setSelectedBodyZoneId] = useState('left_shoulder');
  const [interventions, setInterventions] = useState(INITIAL_INTERVENTIONS);
  const [alerts] = useState(INITIAL_ALERTS);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const workstation = useMemo(() => ErgoPredictService.getWorkstation(workstationId), [workstationId]);
  const tasks = useMemo(() => ErgoPredictService.getTaskAnalysis(workstationId), [workstationId]);
  const recommendations = useMemo(() => ErgoPredictService.getRecommendations(), []);
  const aggregates = useMemo(
    () => ErgoPredictService.getWorkerAggregates(workstationId, bodyZones, interventions),
    [workstationId, bodyZones, interventions]
  );

  // Simulator state synced to active workstation
  const [simConfig, setSimConfig] = useState(() => {
    const ws = ErgoPredictService.getWorkstation('LEONI-MONTAGE-01');
    const zoneA = ws.connectorZones[0];
    return {
      tableHeight: ws.tableHeight,
      connectorA_y: zoneA.y,
      connectorA_x: zoneA.x,
      connectorA_z: zoneA.z,
      connectorOrientation: ws.connectorOrientation,
      reachDistance: ws.reachDistance,
      taskRepetition: ws.taskRepetition,
      cycleTime: ws.cycleTime,
      taskRotation: ws.taskRotation,
    };
  });

  // Reset simulator baseline when switching workstations
  useEffect(() => {
    const zoneA = workstation.connectorZones.find((z) => z.id === 'A') || workstation.connectorZones[0];
    setSimConfig({
      tableHeight: workstation.tableHeight,
      connectorA_y: zoneA.y,
      connectorA_x: zoneA.x,
      connectorA_z: zoneA.z,
      connectorOrientation: workstation.connectorOrientation,
      reachDistance: workstation.reachDistance,
      taskRepetition: workstation.taskRepetition,
      cycleTime: workstation.cycleTime,
      taskRotation: workstation.taskRotation,
    });
  }, [workstation]);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3600);
  }, []);

  const handleNavigate = useCallback((page, options: any = {}) => {
    if (options.zoneId) setSelectedBodyZoneId(options.zoneId);
    if (options.preset) setSimConfig(options.preset);
    setActivePage(page);
    setShowNotifications(false);
  }, []);

  const handlePromoteToIntervention = (config, comparison) => {
    const reduction = Math.max(5, Math.abs(comparison.deltas.overallPct));
    const newInt = {
      id: `INT-2026-0${interventions.length + 1}`,
      title: `Simulated Mod: Table ${config.tableHeight}cm / Conn A (${config.connectorA_x}, ${config.connectorA_y})`,
      description: `Promoted from 3D What-If Simulator. Reach reduced to ${config.reachDistance}cm, orientation ${config.connectorOrientation}°, rotation ${config.taskRotation}%.`,
      workstation: workstationId,
      costEstimate: 1650,
      expectedReductionPct: reduction,
      difficulty: 'Low',
      status: 'Proposed',
      beforeExposure: comparison.before.overallExposure,
      afterExposure: comparison.after.overallExposure,
      createdDate: new Date().toISOString().slice(0, 10),
      evaluationNote: 'Auto-generated from 3D What-If Simulation.',
    };
    setInterventions((prev) => [newInt, ...prev]);
    showToast(`Promoted simulation to ${newInt.id} in Interventions.`);
    setActivePage('interventions');
  };

  const handleAddRecommendationToInterventions = (rec) => {
    const newInt = {
      id: `INT-2026-0${interventions.length + 1}`,
      title: rec.title,
      description: rec.recommendedInvestigation,
      workstation: workstationId,
      costEstimate: rec.estimatedCost,
      expectedReductionPct: rec.expectedImpactPct,
      difficulty: rec.difficulty.split(' ')[0],
      status: 'Proposed',
      beforeExposure: aggregates.overallExposure,
      afterExposure: Math.round(aggregates.overallExposure * (1 - rec.expectedImpactPct / 100)),
      createdDate: new Date().toISOString().slice(0, 10),
      evaluationNote: `Created from AI Recommendation ${rec.id} (${rec.confidence}% confidence).`,
    };
    setInterventions((prev) => [newInt, ...prev]);
    showToast(`Added "${rec.title}" to Interventions.`);
  };

  const handleWorkerFeedbackSubmit = (feedback) => {
    const result = ErgoPredictService.submitWorkerFeedback(feedback);
    setBodyZones((prev) =>
      prev.map((z) => {
        if (z.id !== feedback.bodyZoneId) return z;
        const nextReports = Math.min(z.totalWorkers, z.reports + 1);
        const nextAvg = Number(((z.avgDiscomfort * z.reports + feedback.intensity) / (z.reports + 1)).toFixed(1));
        const nextExposure = Math.min(98, Math.round(z.exposureScore + (feedback.intensity >= 6 ? 2 : 0)));
        return {
          ...z,
          reports: nextReports,
          avgDiscomfort: nextAvg,
          exposureScore: nextExposure,
          risk: getRiskLevel(nextExposure),
        };
      })
    );
    showToast('Anonymous worker feedback aggregated into workstation telemetry.');
    return result;
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'body', label: 'Body Analysis', icon: Activity },
    { id: 'tasks', label: 'Task Analysis', icon: Layers },
    { id: 'assessment', label: 'RULA / REBA Assessment', icon: Activity },
    { id: 'automatic-assessment', label: 'Automatic Posture Assessment', icon: Camera },
    { id: 'twin', label: 'Digital Twin (3D)', icon: Box },
    { id: 'simulator', label: 'What-if Simulator', icon: Sliders },
    { id: 'recommendations', label: 'AI Recommendations', icon: Cpu },
    { id: 'interventions', label: 'Interventions', icon: Wrench },
    { id: 'economics', label: 'Economic Impact', icon: DollarSign },
    { id: 'feedback', label: 'Worker Feedback', icon: MessageSquarePlus },
  ];

  const pageMeta = {
    overview: { title: 'Executive Ergonomics Overview', subtitle: `${workstation.id} · ${workstation.line}` },
    body: { title: 'Body-Zone Analysis', subtitle: 'Interactive anatomical discomfort heatmap & correlation inspector' },
    tasks: { title: 'Industrial Task Analysis', subtitle: 'LEONI wiring harness operations · 276s takt cycle' },
    assessment: { title: 'Manual RULA / REBA Assessment', subtitle: 'Ergonomist-entered posture observations · no inferred scores' },
    'automatic-assessment': { title: 'Automatic Posture Assessment', subtitle: 'Camera/video posture estimates with assessor confirmation' },
    twin: { title: '3D Workstation Digital Twin', subtitle: 'Interactive WebGL spatial telemetry & ergonomic hotspots' },
    simulator: { title: 'What-If Ergonomic Simulator', subtitle: 'Real-time parametric modification & exposure estimation' },
    recommendations: { title: 'AI Analysis & Recommendations', subtitle: 'Explainable multi-dimensional ergonomic decision support' },
    interventions: { title: 'Intervention Tracking', subtitle: 'Plan, execute, and evaluate workstation modifications' },
    economics: { title: 'ROI & Economic Impact', subtitle: 'Financial modeling based on synthetic operational assumptions' },
    feedback: { title: 'Worker Feedback Check-In', subtitle: 'Fast, anonymous operator discomfort reporting' },
  };

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return (
          <DashboardPage
            aggregates={aggregates}
            bodyZones={bodyZones}
            tasks={tasks}
            interventions={interventions}
            alerts={alerts}
            recommendations={recommendations}
            onNavigate={handleNavigate}
          />
        );
      case 'body':
        return (
          <BodyAnalysisPage
            bodyZones={bodyZones}
            selectedZoneId={selectedBodyZoneId}
            setSelectedZoneId={setSelectedBodyZoneId}
            onNavigate={handleNavigate}
          />
        );
      case 'tasks':
        return <TaskAnalysisPage tasks={tasks} onNavigate={handleNavigate} />;
      case 'assessment':
        return <AssessmentPage />;
      case 'automatic-assessment':
        return <AutomaticPostureAssessment />;
      case 'twin':
        return <DigitalTwinPage workstation={workstation} onNavigate={handleNavigate} />;
      case 'simulator':
        return (
          <SimulatorPage
            workstation={workstation}
            simConfig={simConfig}
            setSimConfig={setSimConfig}
            onPromoteToIntervention={handlePromoteToIntervention}
          />
        );
      case 'recommendations':
        return (
          <RecommendationsPage
            recommendations={recommendations}
            onSimulatePreset={(preset) => handleNavigate('simulator', { preset })}
            onAddIntervention={handleAddRecommendationToInterventions}
          />
        );
      case 'interventions':
        return (
          <InterventionsPage
            interventions={interventions}
            setInterventions={setInterventions}
            workstationId={workstationId}
            showToast={showToast}
          />
        );
      case 'economics':
        return <EconomicImpactPage />;
      case 'feedback':
        return (
          <WorkerFeedbackPage
            bodyZones={bodyZones}
            tasks={tasks}
            workstationId={workstationId}
            onSubmitFeedback={handleWorkerFeedbackSubmit}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#090E1A] text-slate-100 flex font-sans antialiased">
      {/* Left Sidebar */}
      <aside className="w-60 shrink-0 bg-[#0F172A] border-r border-slate-800 flex flex-col justify-between sticky top-0 h-screen">
        <div>
          {/* Brand Logo */}
          <div className="h-14 px-4 border-b border-slate-800 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white leading-none">ERGO-PREDICT</div>
              <div className="text-[10px] font-medium text-slate-400 tracking-wider uppercase mt-0.5">
                Digital Twin AI
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-2.5 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    active
                      ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-sky-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                  {item.id === 'simulator' && (
                    <span className="ml-auto text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
                      Core
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Disclaimer Card */}
        <div className="p-3 border-t border-slate-800">
          <div className="bg-[#0B1221] border border-slate-800 rounded-md p-2.5 text-[10px] text-slate-400 leading-relaxed">
            <span className="text-slate-300 font-semibold block mb-0.5">Decision-Support Prototype</span>
            Does not diagnose medical conditions or replace certified ergonomic assessments.
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 bg-[#0F172A]/95 backdrop-blur border-b border-slate-800 px-5 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{pageMeta[activePage]?.title}</h1>
            <p className="text-[11px] text-slate-400 truncate">{pageMeta[activePage]?.subtitle}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* DEMO DATA Badge */}
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold tracking-wider text-amber-300 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Demo Data
            </span>

            {/* Workstation Selector */}
            <div className="flex items-center gap-1.5 bg-[#162033] border border-slate-700 rounded-md px-2.5 py-1">
              <Factory className="w-3.5 h-3.5 text-sky-400" />
              <select
                value={workstationId}
                onChange={(e) => setWorkstationId(e.target.value)}
                className="bg-transparent text-xs font-mono font-medium text-slate-100 focus:outline-none cursor-pointer"
              >
                {Object.keys(WORKSTATIONS_DATA).map((id) => (
                  <option key={id} value={id} className="bg-[#0F172A] text-slate-100">
                    {id}
                  </option>
                ))}
              </select>
            </div>

            {/* Notification Bell Popover */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications((s) => !s)}
                className="relative p-2 rounded-md bg-[#162033] hover:bg-slate-800 border border-slate-700 text-slate-300"
                title="Ergonomic Alerts"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {alerts.length}
                </span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-[#0F172A] border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-40">
                  <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between bg-[#111B2E]">
                    <span className="text-xs font-semibold text-white">Emerging Risk Alerts</span>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
                    {alerts.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => handleNavigate(a.targetPage, a.zoneId ? { zoneId: a.zoneId } : undefined)}
                        className="w-full text-left p-3 hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <StatusBadge level={a.severity} size="xs" />
                          <span className="text-[10px] text-slate-500">{a.timestamp}</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-100 mt-1">{a.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{a.detail}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ergonomist Profile Placeholder */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-xs font-bold text-sky-300">
                SE
              </div>
              <div className="leading-tight">
                <div className="text-xs font-medium text-slate-200">Lead Ergonomist</div>
                <div className="text-[10px] text-slate-500">LEONI Plant HSE</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 p-5 overflow-y-auto">{renderPage()}</main>
      </div>

      {/* Global Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0F172A] border border-sky-500/40 text-slate-100 px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2.5 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
