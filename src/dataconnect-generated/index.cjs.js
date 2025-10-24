const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'stepsproject',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const createNewCompanyRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewCompany', inputVars);
}
createNewCompanyRef.operationName = 'CreateNewCompany';
exports.createNewCompanyRef = createNewCompanyRef;

exports.createNewCompany = function createNewCompany(dcOrVars, vars) {
  return executeMutation(createNewCompanyRef(dcOrVars, vars));
};

const listAllContactsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllContacts');
}
listAllContactsRef.operationName = 'ListAllContacts';
exports.listAllContactsRef = listAllContactsRef;

exports.listAllContacts = function listAllContacts(dc) {
  return executeQuery(listAllContactsRef(dc));
};

const updateOpportunityStageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateOpportunityStage', inputVars);
}
updateOpportunityStageRef.operationName = 'UpdateOpportunityStage';
exports.updateOpportunityStageRef = updateOpportunityStageRef;

exports.updateOpportunityStage = function updateOpportunityStage(dcOrVars, vars) {
  return executeMutation(updateOpportunityStageRef(dcOrVars, vars));
};

const listOpportunitiesByStageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListOpportunitiesByStage', inputVars);
}
listOpportunitiesByStageRef.operationName = 'ListOpportunitiesByStage';
exports.listOpportunitiesByStageRef = listOpportunitiesByStageRef;

exports.listOpportunitiesByStage = function listOpportunitiesByStage(dcOrVars, vars) {
  return executeQuery(listOpportunitiesByStageRef(dcOrVars, vars));
};
