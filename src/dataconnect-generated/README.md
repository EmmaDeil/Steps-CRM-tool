# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListAllContacts*](#listallcontacts)
  - [*ListOpportunitiesByStage*](#listopportunitiesbystage)
- [**Mutations**](#mutations)
  - [*CreateNewCompany*](#createnewcompany)
  - [*UpdateOpportunityStage*](#updateopportunitystage)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListAllContacts
You can execute the `ListAllContacts` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listAllContacts(): QueryPromise<ListAllContactsData, undefined>;

interface ListAllContactsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllContactsData, undefined>;
}
export const listAllContactsRef: ListAllContactsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAllContacts(dc: DataConnect): QueryPromise<ListAllContactsData, undefined>;

interface ListAllContactsRef {
  ...
  (dc: DataConnect): QueryRef<ListAllContactsData, undefined>;
}
export const listAllContactsRef: ListAllContactsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAllContactsRef:
```typescript
const name = listAllContactsRef.operationName;
console.log(name);
```

### Variables
The `ListAllContacts` query has no variables.
### Return Type
Recall that executing the `ListAllContacts` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAllContactsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListAllContacts`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAllContacts } from '@dataconnect/generated';


// Call the `listAllContacts()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAllContacts();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAllContacts(dataConnect);

console.log(data.contacts);

// Or, you can use the `Promise` API.
listAllContacts().then((response) => {
  const data = response.data;
  console.log(data.contacts);
});
```

### Using `ListAllContacts`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAllContactsRef } from '@dataconnect/generated';


// Call the `listAllContactsRef()` function to get a reference to the query.
const ref = listAllContactsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAllContactsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.contacts);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.contacts);
});
```

## ListOpportunitiesByStage
You can execute the `ListOpportunitiesByStage` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listOpportunitiesByStage(vars: ListOpportunitiesByStageVariables): QueryPromise<ListOpportunitiesByStageData, ListOpportunitiesByStageVariables>;

interface ListOpportunitiesByStageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListOpportunitiesByStageVariables): QueryRef<ListOpportunitiesByStageData, ListOpportunitiesByStageVariables>;
}
export const listOpportunitiesByStageRef: ListOpportunitiesByStageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listOpportunitiesByStage(dc: DataConnect, vars: ListOpportunitiesByStageVariables): QueryPromise<ListOpportunitiesByStageData, ListOpportunitiesByStageVariables>;

interface ListOpportunitiesByStageRef {
  ...
  (dc: DataConnect, vars: ListOpportunitiesByStageVariables): QueryRef<ListOpportunitiesByStageData, ListOpportunitiesByStageVariables>;
}
export const listOpportunitiesByStageRef: ListOpportunitiesByStageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listOpportunitiesByStageRef:
```typescript
const name = listOpportunitiesByStageRef.operationName;
console.log(name);
```

### Variables
The `ListOpportunitiesByStage` query requires an argument of type `ListOpportunitiesByStageVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListOpportunitiesByStageVariables {
  stage: string;
}
```
### Return Type
Recall that executing the `ListOpportunitiesByStage` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListOpportunitiesByStageData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListOpportunitiesByStage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listOpportunitiesByStage, ListOpportunitiesByStageVariables } from '@dataconnect/generated';

// The `ListOpportunitiesByStage` query requires an argument of type `ListOpportunitiesByStageVariables`:
const listOpportunitiesByStageVars: ListOpportunitiesByStageVariables = {
  stage: ..., 
};

// Call the `listOpportunitiesByStage()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listOpportunitiesByStage(listOpportunitiesByStageVars);
// Variables can be defined inline as well.
const { data } = await listOpportunitiesByStage({ stage: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listOpportunitiesByStage(dataConnect, listOpportunitiesByStageVars);

console.log(data.opportunities);

// Or, you can use the `Promise` API.
listOpportunitiesByStage(listOpportunitiesByStageVars).then((response) => {
  const data = response.data;
  console.log(data.opportunities);
});
```

### Using `ListOpportunitiesByStage`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listOpportunitiesByStageRef, ListOpportunitiesByStageVariables } from '@dataconnect/generated';

// The `ListOpportunitiesByStage` query requires an argument of type `ListOpportunitiesByStageVariables`:
const listOpportunitiesByStageVars: ListOpportunitiesByStageVariables = {
  stage: ..., 
};

// Call the `listOpportunitiesByStageRef()` function to get a reference to the query.
const ref = listOpportunitiesByStageRef(listOpportunitiesByStageVars);
// Variables can be defined inline as well.
const ref = listOpportunitiesByStageRef({ stage: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listOpportunitiesByStageRef(dataConnect, listOpportunitiesByStageVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.opportunities);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.opportunities);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateNewCompany
You can execute the `CreateNewCompany` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createNewCompany(vars: CreateNewCompanyVariables): MutationPromise<CreateNewCompanyData, CreateNewCompanyVariables>;

interface CreateNewCompanyRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewCompanyVariables): MutationRef<CreateNewCompanyData, CreateNewCompanyVariables>;
}
export const createNewCompanyRef: CreateNewCompanyRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createNewCompany(dc: DataConnect, vars: CreateNewCompanyVariables): MutationPromise<CreateNewCompanyData, CreateNewCompanyVariables>;

interface CreateNewCompanyRef {
  ...
  (dc: DataConnect, vars: CreateNewCompanyVariables): MutationRef<CreateNewCompanyData, CreateNewCompanyVariables>;
}
export const createNewCompanyRef: CreateNewCompanyRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createNewCompanyRef:
```typescript
const name = createNewCompanyRef.operationName;
console.log(name);
```

### Variables
The `CreateNewCompany` mutation requires an argument of type `CreateNewCompanyVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateNewCompanyVariables {
  name: string;
  industry?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
}
```
### Return Type
Recall that executing the `CreateNewCompany` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateNewCompanyData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateNewCompanyData {
  company_insert: Company_Key;
}
```
### Using `CreateNewCompany`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createNewCompany, CreateNewCompanyVariables } from '@dataconnect/generated';

// The `CreateNewCompany` mutation requires an argument of type `CreateNewCompanyVariables`:
const createNewCompanyVars: CreateNewCompanyVariables = {
  name: ..., 
  industry: ..., // optional
  address: ..., // optional
  phone: ..., // optional
  website: ..., // optional
};

// Call the `createNewCompany()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createNewCompany(createNewCompanyVars);
// Variables can be defined inline as well.
const { data } = await createNewCompany({ name: ..., industry: ..., address: ..., phone: ..., website: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createNewCompany(dataConnect, createNewCompanyVars);

console.log(data.company_insert);

// Or, you can use the `Promise` API.
createNewCompany(createNewCompanyVars).then((response) => {
  const data = response.data;
  console.log(data.company_insert);
});
```

### Using `CreateNewCompany`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createNewCompanyRef, CreateNewCompanyVariables } from '@dataconnect/generated';

// The `CreateNewCompany` mutation requires an argument of type `CreateNewCompanyVariables`:
const createNewCompanyVars: CreateNewCompanyVariables = {
  name: ..., 
  industry: ..., // optional
  address: ..., // optional
  phone: ..., // optional
  website: ..., // optional
};

// Call the `createNewCompanyRef()` function to get a reference to the mutation.
const ref = createNewCompanyRef(createNewCompanyVars);
// Variables can be defined inline as well.
const ref = createNewCompanyRef({ name: ..., industry: ..., address: ..., phone: ..., website: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createNewCompanyRef(dataConnect, createNewCompanyVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.company_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.company_insert);
});
```

## UpdateOpportunityStage
You can execute the `UpdateOpportunityStage` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateOpportunityStage(vars: UpdateOpportunityStageVariables): MutationPromise<UpdateOpportunityStageData, UpdateOpportunityStageVariables>;

interface UpdateOpportunityStageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateOpportunityStageVariables): MutationRef<UpdateOpportunityStageData, UpdateOpportunityStageVariables>;
}
export const updateOpportunityStageRef: UpdateOpportunityStageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateOpportunityStage(dc: DataConnect, vars: UpdateOpportunityStageVariables): MutationPromise<UpdateOpportunityStageData, UpdateOpportunityStageVariables>;

interface UpdateOpportunityStageRef {
  ...
  (dc: DataConnect, vars: UpdateOpportunityStageVariables): MutationRef<UpdateOpportunityStageData, UpdateOpportunityStageVariables>;
}
export const updateOpportunityStageRef: UpdateOpportunityStageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateOpportunityStageRef:
```typescript
const name = updateOpportunityStageRef.operationName;
console.log(name);
```

### Variables
The `UpdateOpportunityStage` mutation requires an argument of type `UpdateOpportunityStageVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateOpportunityStageVariables {
  id: UUIDString;
  stage: string;
}
```
### Return Type
Recall that executing the `UpdateOpportunityStage` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateOpportunityStageData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateOpportunityStageData {
  opportunity_update?: Opportunity_Key | null;
}
```
### Using `UpdateOpportunityStage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateOpportunityStage, UpdateOpportunityStageVariables } from '@dataconnect/generated';

// The `UpdateOpportunityStage` mutation requires an argument of type `UpdateOpportunityStageVariables`:
const updateOpportunityStageVars: UpdateOpportunityStageVariables = {
  id: ..., 
  stage: ..., 
};

// Call the `updateOpportunityStage()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateOpportunityStage(updateOpportunityStageVars);
// Variables can be defined inline as well.
const { data } = await updateOpportunityStage({ id: ..., stage: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateOpportunityStage(dataConnect, updateOpportunityStageVars);

console.log(data.opportunity_update);

// Or, you can use the `Promise` API.
updateOpportunityStage(updateOpportunityStageVars).then((response) => {
  const data = response.data;
  console.log(data.opportunity_update);
});
```

### Using `UpdateOpportunityStage`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateOpportunityStageRef, UpdateOpportunityStageVariables } from '@dataconnect/generated';

// The `UpdateOpportunityStage` mutation requires an argument of type `UpdateOpportunityStageVariables`:
const updateOpportunityStageVars: UpdateOpportunityStageVariables = {
  id: ..., 
  stage: ..., 
};

// Call the `updateOpportunityStageRef()` function to get a reference to the mutation.
const ref = updateOpportunityStageRef(updateOpportunityStageVars);
// Variables can be defined inline as well.
const ref = updateOpportunityStageRef({ id: ..., stage: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateOpportunityStageRef(dataConnect, updateOpportunityStageVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.opportunity_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.opportunity_update);
});
```

