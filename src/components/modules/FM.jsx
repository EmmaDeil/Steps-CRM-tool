import React, { useState, useEffect } from "react";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import MaintenanceTicketing from "./MaintenanceTicketing";
import MaintenanceTasks from "./MaintenanceTasks";
import MaintenanceAssets from "./MaintenanceAssets";
import MaintenancePreventive from "./MaintenancePreventive";
import MaintenanceControls from "./MaintenanceControls";

// Re-exported for backward compatibility: Home.jsx imports
// { CreateTicketModal } directly from this module path.
export { CreateTicketModal } from "./MaintenanceTicketing";

const SECTIONS = [
  {
    id: "tickets",
    title: "Ticketing",
    description: "Report and track reactive maintenance requests",
    icon: "fa-ticket",
    color: "blue",
  },
  {
    id: "tasks",
    title: "Tasks",
    description: "Internal work items and checklists assigned to staff",
    icon: "fa-list-check",
    color: "purple",
  },
  {
    id: "assets",
    title: "Equipment & Assets",
    description: "Registry of facility equipment with warranty and history",
    icon: "fa-toolbox",
    color: "orange",
  },
  {
    id: "preventive",
    title: "Preventive Maintenance",
    description: "Scheduled recurring upkeep linked to equipment",
    icon: "fa-calendar-check",
    color: "green",
  },
  {
    id: "controls",
    title: "Controls",
    description: "Teams, role permissions, and approval thresholds",
    icon: "fa-shield-halved",
    color: "gray",
  },
];

const COLOR_CLASSES = {
  blue: "from-blue-50 to-blue-100 text-blue-600 border-blue-100",
  purple: "from-purple-50 to-purple-100 text-purple-600 border-purple-100",
  orange: "from-orange-50 to-orange-100 text-orange-600 border-orange-100",
  green: "from-green-50 to-green-100 text-green-600 border-green-100",
  gray: "from-gray-50 to-gray-100 text-gray-600 border-gray-100",
};

const FM = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [stats, setStats] = useState({});

  useEffect(() => {
    if (activeSection) return;

    Promise.allSettled([
      apiService.get("/api/maintenance/stats"),
      apiService.get("/api/maintenance/tasks/stats"),
      apiService.get("/api/maintenance/assets/stats"),
      apiService.get("/api/maintenance/preventive/upcoming?days=14"),
    ]).then(([ticketStats, taskStats, assetStats, upcomingPM]) => {
      setStats({
        tickets:
          ticketStats.status === "fulfilled"
            ? ticketStats.value.summary?.openTickets
            : undefined,
        tasks:
          taskStats.status === "fulfilled" ? taskStats.value.summary?.pending : undefined,
        assets: assetStats.status === "fulfilled" ? assetStats.value.summary?.total : undefined,
        preventive:
          upcomingPM.status === "fulfilled" ? upcomingPM.value.schedules?.length : undefined,
      });
    });
  }, [activeSection]);

  const sectionCounts = {
    tickets: stats.tickets !== undefined ? `${stats.tickets} open` : null,
    tasks: stats.tasks !== undefined ? `${stats.tasks} pending` : null,
    assets: stats.assets !== undefined ? `${stats.assets} tracked` : null,
    preventive: stats.preventive !== undefined ? `${stats.preventive} due soon` : null,
    controls: null,
  };

  if (activeSection === "tickets") {
    return <MaintenanceTicketing onBack={() => setActiveSection(null)} />;
  }
  if (activeSection === "tasks") {
    return <MaintenanceTasks onBack={() => setActiveSection(null)} />;
  }
  if (activeSection === "assets") {
    return <MaintenanceAssets onBack={() => setActiveSection(null)} />;
  }
  if (activeSection === "preventive") {
    return <MaintenancePreventive onBack={() => setActiveSection(null)} />;
  }
  if (activeSection === "controls") {
    return <MaintenanceControls onBack={() => setActiveSection(null)} />;
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 px-1">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Facility Maintenance", icon: "fa-wrench" },
        ]}
      />

      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Facility Maintenance</h2>
          <p className="text-gray-600 mt-1">
            Manage tickets, tasks, equipment, preventive schedules, and FM controls in one workspace
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className="group relative flex flex-col items-start p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-shadow text-left"
            >
              <div
                className={`size-14 bg-gradient-to-br ${COLOR_CLASSES[section.color]} flex items-center justify-center mb-4 shadow-sm border rounded-full group-hover:border-current transition-colors`}
              >
                <i className={`fa-solid ${section.icon} text-2xl`}></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{section.title}</h3>
              <p className="text-sm text-gray-500 mb-3">{section.description}</p>
              {sectionCounts[section.id] && (
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700">
                  {sectionCounts[section.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FM;
