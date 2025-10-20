import React from 'react'
import { Link } from 'react-router-dom';

const Dashboard = () => {

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
