export type Side='left'|'right'|'both'|'none';
export interface WorkerFeedback {id:string;anonymousId:string;bodyZone:string;side:Side;discomfort:number;taskId:string;timestamp:string;duration?:string;comment?:string}
export interface Task {id:string;name:string;durationSeconds:number;repetitionsPerHour:number;estimatedForce?:number;associatedBodyZones:string[];workstationZones:string[]}
export interface Workstation {id:string;name:string;tableHeight:number;reachDistance:number;cycleTime:number;connectorZones:{id:string;name:string;x:number;y:number;z:number}[]}
export type AssessmentStatus='MEASURED'|'SIMULATED'|'INCOMPLETE';
