# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useCreateNewCompany, useListAllContacts, useUpdateOpportunityStage, useListOpportunitiesByStage } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useCreateNewCompany(createNewCompanyVars);

const { data, isPending, isSuccess, isError, error } = useListAllContacts();

const { data, isPending, isSuccess, isError, error } = useUpdateOpportunityStage(updateOpportunityStageVars);

const { data, isPending, isSuccess, isError, error } = useListOpportunitiesByStage(listOpportunitiesByStageVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createNewCompany, listAllContacts, updateOpportunityStage, listOpportunitiesByStage } from '@dataconnect/generated';


// Operation CreateNewCompany:  For variables, look at type CreateNewCompanyVars in ../index.d.ts
const { data } = await CreateNewCompany(dataConnect, createNewCompanyVars);

// Operation ListAllContacts: 
const { data } = await ListAllContacts(dataConnect);

// Operation UpdateOpportunityStage:  For variables, look at type UpdateOpportunityStageVars in ../index.d.ts
const { data } = await UpdateOpportunityStage(dataConnect, updateOpportunityStageVars);

// Operation ListOpportunitiesByStage:  For variables, look at type ListOpportunitiesByStageVars in ../index.d.ts
const { data } = await ListOpportunitiesByStage(dataConnect, listOpportunitiesByStageVars);


```