import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'stepsproject',
  location: 'us-central1'
};

export const createNewCompanyRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewCompany', inputVars);
}
createNewCompanyRef.operationName = 'CreateNewCompany';

export function createNewCompany(dcOrVars, vars) {
  return executeMutation(createNewCompanyRef(dcOrVars, vars));
}

export const listAllContactsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllContacts');
}
listAllContactsRef.operationName = 'ListAllContacts';

export function listAllContacts(dc) {
  return executeQuery(listAllContactsRef(dc));
}

export const updateOpportunityStageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateOpportunityStage', inputVars);
}
updateOpportunityStageRef.operationName = 'UpdateOpportunityStage';

export function updateOpportunityStage(dcOrVars, vars) {
  return executeMutation(updateOpportunityStageRef(dcOrVars, vars));
}

export const listOpportunitiesByStageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListOpportunitiesByStage', inputVars);
}
listOpportunitiesByStageRef.operationName = 'ListOpportunitiesByStage';

export function listOpportunitiesByStage(dcOrVars, vars) {
  return executeQuery(listOpportunitiesByStageRef(dcOrVars, vars));
}

