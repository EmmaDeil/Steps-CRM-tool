import React from "react";
import { useParams } from "react-router-dom";

const ModulePage = () => {
  const { id } = useParams();

  return (
    <div className="p-6 text-center">
      <h1 className="text-2xl font-bold">Module {id}</h1>
      <p className="mt-2 text-gray-600">
        Welcome to the module page for ID {id}.  
        You can now render content dynamically based on this ID.
      </p>

      <div className="mt-4">
        <h2 className="text-xl font-semibold">Module Content</h2>
        <p className="mt-2 text-gray-600">
          Here you can add the content specific to module {id}.
        </p>
      </div>
    </div>
  );
};

export default ModulePage;
