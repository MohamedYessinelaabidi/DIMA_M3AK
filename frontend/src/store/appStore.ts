import {create} from 'zustand';
type State={mockMode:boolean;setMockMode:(enabled:boolean)=>void;workstationId:string;setWorkstationId:(id:string)=>void};
export const useAppStore=create<State>(set=>({mockMode:import.meta.env.VITE_MOCK_MODE!=='false',setMockMode:mockMode=>set({mockMode}),workstationId:'LEONI-MONTAGE-01',setWorkstationId:workstationId=>set({workstationId})}));
