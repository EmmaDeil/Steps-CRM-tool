import React from "react";
import { useParams } from "react-router-dom";

// import Accounting from "./modules/Accounting";
// import Inventory from "./modules/Inventory";
// import HRManagement from "./modules/HRManagement";
// import FacilityMaintenance from "./modules/FacilityMaintenance";
// import FinanceReports from "./modules/FinanceReports";
// import SecurityLogs from "./modules/SecurityLogs";
// import AdminControls from "./modules/AdminControls";

const ModulePage = () => {
  const { id } = useParams();

  // Convert the id from string → number
  const moduleId = parseInt(id, 10);

  // Render different components based on moduleId
  switch (moduleId) {
    case 1:
      return <Accounting />;
    case 2:
      return <Inventory />;
    case 3:
      return <HRManagement />;
    case 4:
      return <FacilityMaintenance />;
    case 5:
      return <FinanceReports />;
    case 6:
      return <SecurityLogs />;
    case 7:
      return <AdminControls />;
    default:
      return (
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold">Module Not Found</h1>
          <p className="mt-2 text-gray-600">
            The module ID <strong>{id}</strong> doesn’t exist.
          </p>
        </div>
      );
  }
};

export default ModulePage;
