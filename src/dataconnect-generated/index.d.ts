import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Activity_Key {
  id: UUIDString;
  __typename?: 'Activity_Key';
}

export interface Company_Key {
  id: UUIDString;
  __typename?: 'Company_Key';
}

export interface Contact_Key {
  id: UUIDString;
  __typename?: 'Contact_Key';
}

export interface CreateNewCompanyData {
  company_insert: Company_Key;
}

export interface CreateNewCompanyVariables {
  name: string;
  industry?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
}

export interface ListAllContactsData {
  contacts: ({
    id: UUIDString;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    title?: string | null;
    company?: {
      name: string;
    };
  } & Contact_Key)[];
}

export interface ListOpportunitiesByStageData {
  opportunities: ({
    id: UUIDString;
    name: string;
    amount: number;
    expectedCloseDate?: DateString | null;
    contact?: {
      firstName: string;
      lastName: string;
    };
      company?: {
        name: string;
      };
  } & Opportunity_Key)[];
}

export interface ListOpportunitiesByStageVariables {
  stage: string;
}

export interface Opportunity_Key {
  id: UUIDString;
  __typename?: 'Opportunity_Key';
}

export interface UpdateOpportunityStageData {
  opportunity_update?: Opportunity_Key | null;
}

export interface UpdateOpportunityStageVariables {
  id: UUIDString;
  stage: string;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateNewCompanyRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewCompanyVariables): MutationRef<CreateNewCompanyData, CreateNewCompanyVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateNewCompanyVariables): MutationRef<CreateNewCompanyData, CreateNewCompanyVariables>;
  operationName: string;
}
export const createNewCompanyRef: CreateNewCompanyRef;

export function createNewCompany(vars: CreateNewCompanyVariables): MutationPromise<CreateNewCompanyData, CreateNewCompanyVariables>;
export function createNewCompany(dc: DataConnect, vars: CreateNewCompanyVariables): MutationPromise<CreateNewCompanyData, CreateNewCompanyVariables>;

interface ListAllContactsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllContactsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllContactsData, undefined>;
  operationName: string;
}
export const listAllContactsRef: ListAllContactsRef;

export function listAllContacts(): QueryPromise<ListAllContactsData, undefined>;
export function listAllContacts(dc: DataConnect): QueryPromise<ListAllContactsData, undefined>;

interface UpdateOpportunityStageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateOpportunityStageVariables): MutationRef<UpdateOpportunityStageData, UpdateOpportunityStageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateOpportunityStageVariables): MutationRef<UpdateOpportunityStageData, UpdateOpportunityStageVariables>;
  operationName: string;
}
export const updateOpportunityStageRef: UpdateOpportunityStageRef;

export function updateOpportunityStage(vars: UpdateOpportunityStageVariables): MutationPromise<UpdateOpportunityStageData, UpdateOpportunityStageVariables>;
export function updateOpportunityStage(dc: DataConnect, vars: UpdateOpportunityStageVariables): MutationPromise<UpdateOpportunityStageData, UpdateOpportunityStageVariables>;

interface ListOpportunitiesByStageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListOpportunitiesByStageVariables): QueryRef<ListOpportunitiesByStageData, ListOpportunitiesByStageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListOpportunitiesByStageVariables): QueryRef<ListOpportunitiesByStageData, ListOpportunitiesByStageVariables>;
  operationName: string;
}
export const listOpportunitiesByStageRef: ListOpportunitiesByStageRef;

export function listOpportunitiesByStage(vars: ListOpportunitiesByStageVariables): QueryPromise<ListOpportunitiesByStageData, ListOpportunitiesByStageVariables>;
export function listOpportunitiesByStage(dc: DataConnect, vars: ListOpportunitiesByStageVariables): QueryPromise<ListOpportunitiesByStageData, ListOpportunitiesByStageVariables>;

