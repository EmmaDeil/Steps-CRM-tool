import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import LogoutButton from "./LogoutButton";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  if (!user)
    return (
      <div className="h-screen flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );

    const modules = [
    { id: 1, 
      name: "Accounting", 
      image: "/logo.png",
      link: "/modules/1" 
    },
    { id: 2, 
      name: "Profile", 
      image: "/logo.png",
      link: "/modules/2" 
    },
    { id: 3, 
      name: "Payment Request", 
      image: "/logo.png",
      link: "/modules/3" 
    },
    {
      id: 4,
      name: "Settings",
      image: "/logo.png",
      link: "/modules/4"
    },
    {
      id: 5,
      name: "Analytics",
      image: "/logo.png",
      link: "/modules/5"
    },
    {
      id: 6,
      name: "Support",
      image: "/logo.png",
      link: "/modules/6"
    },
    {
      id: 7,
      name: "Documentation",
      image: "/logo.png",
      link: "/modules/7"
    }
  ];

  return (
    <div className="container mt-4 dashboard-container">
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center">
      <div className="bg-white shadow-lg p-6 rounded-xl max-w-md w-full">
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt="Profile"
            className="w-20 h-20 rounded-full mx-auto mb-4"
          />
        )}
        <h2 className="text-xl font-semibold">
          Welcome, {user.displayName || "User"} 👋
        </h2>
        <p className="text-gray-500 mt-2">{user.email}</p>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </div>
  <div className="row main">
    {modules.map((item) => (
      <div className="col-md-4 mb-3 main-card" key={item.id}>
        <div className="card text-center shadow-sm">
          <img src={item.image} alt={item.name} className="card-img-top" />
          <div className="card-body">
            <h5 className="card-title">{item.name}</h5>
            <Link className="btn btn-primary module-link" to={`/modules/${item.id}`}>Open</Link>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
  )
};

export default Dashboard;
