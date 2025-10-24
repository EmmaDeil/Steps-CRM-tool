import { CreateNewCompanyData, CreateNewCompanyVariables, ListAllContactsData, UpdateOpportunityStageData, UpdateOpportunityStageVariables, ListOpportunitiesByStageData, ListOpportunitiesByStageVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateNewCompany(options?: useDataConnectMutationOptions<CreateNewCompanyData, FirebaseError, CreateNewCompanyVariables>): UseDataConnectMutationResult<CreateNewCompanyData, CreateNewCompanyVariables>;
export function useCreateNewCompany(dc: DataConnect, options?: useDataConnectMutationOptions<CreateNewCompanyData, FirebaseError, CreateNewCompanyVariables>): UseDataConnectMutationResult<CreateNewCompanyData, CreateNewCompanyVariables>;

export function useListAllContacts(options?: useDataConnectQueryOptions<ListAllContactsData>): UseDataConnectQueryResult<ListAllContactsData, undefined>;
export function useListAllContacts(dc: DataConnect, options?: useDataConnectQueryOptions<ListAllContactsData>): UseDataConnectQueryResult<ListAllContactsData, undefined>;

export function useUpdateOpportunityStage(options?: useDataConnectMutationOptions<UpdateOpportunityStageData, FirebaseError, UpdateOpportunityStageVariables>): UseDataConnectMutationResult<UpdateOpportunityStageData, UpdateOpportunityStageVariables>;
export function useUpdateOpportunityStage(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateOpportunityStageData, FirebaseError, UpdateOpportunityStageVariables>): UseDataConnectMutationResult<UpdateOpportunityStageData, UpdateOpportunityStageVariables>;

export function useListOpportunitiesByStage(vars: ListOpportunitiesByStageVariables, options?: useDataConnectQueryOptions<ListOpportunitiesByStageData>): UseDataConnectQueryResult<ListOpportunitiesByStageData, ListOpportunitiesByStageVariables>;
export function useListOpportunitiesByStage(dc: DataConnect, vars: ListOpportunitiesByStageVariables, options?: useDataConnectQueryOptions<ListOpportunitiesByStageData>): UseDataConnectQueryResult<ListOpportunitiesByStageData, ListOpportunitiesByStageVariables>;
