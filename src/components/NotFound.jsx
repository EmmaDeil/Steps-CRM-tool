import React from 'react'
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div>
      <h2>Oops! Page not found</h2>
      <Link to='/' className='btn btn-primary'>Go to Dashboard</Link>
    </div>
  )
}

export default NotFound;
