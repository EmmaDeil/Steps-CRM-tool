import {useState} from 'react';

function UserProfile() {
  const [name, setName] = useState('');  // Manages the user's name
  const [age, setAge] = useState(0);     // Manages the user's age

  function updateProfile() {
    setName('Alice');
    setAge(25);
  }

  return (
    <div>
      <p>Name: {name}</p>
      <p>Age: {age}</p>
      <button onClick={updateProfile}>Update Profile</button>
    </div>
  );
}
export default UserProfile;