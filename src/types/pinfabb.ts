export interface PinfabbReport {
  // Header
  reportNumber: string;
  date: string;
  orderNumber: string;
  page: string;
  
  // Ship Info
  shipName: string;
  imoNumber: string;
  flag: string;
  
  // Plant
  stabilizationPlant: string;
  
  // Working Time
  port: string;
  numberOfTechnicians: number;
  dateStart: string;
  dateEnd: string;
  overtimeHours: number;
  nightHours: number;
  
  // Content
  spareParts: string;
  serviceReport: string;
  
  // Signatures
  chiefEngineerName: string;
  chiefEngineerDate: string;
  serviceEngineerName: string;
  serviceEngineerDate: string;
}

export const defaultPinfabbReport: PinfabbReport = {
  reportNumber: '',
  date: new Date().toISOString().split('T')[0],
  orderNumber: '',
  page: '1',
  shipName: '',
  imoNumber: '',
  flag: '',
  stabilizationPlant: 'PINFABB Stabilizers',
  port: '',
  numberOfTechnicians: 1,
  dateStart: '',
  dateEnd: '',
  overtimeHours: 0,
  nightHours: 0,
  spareParts: '',
  serviceReport: '',
  chiefEngineerName: '',
  chiefEngineerDate: '',
  serviceEngineerName: '',
  serviceEngineerDate: new Date().toISOString().split('T')[0],
};

export const FLAG_OPTIONS = [
  'Italy',
  'Malta',
  'Panama',
  'Bahamas',
  'Liberia',
  'Marshall Islands',
  'Greece',
  'Cyprus',
  'Norway',
  'United Kingdom',
  'Germany',
  'France',
  'Netherlands',
  'Singapore',
  'Hong Kong',
  'Japan',
  'Other',
];
