import { Router, Routes, Route} from 'react-router-dom';
import './App.css'
import Dashboard from './components/Dashboard';
import ModulePage from "./components/ModulePage";
import NotFound from './components/NotFound';

function App() {

  return (
    <>
      <Routes>
        {/* Main dashboard page */}
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<NotFound />} />

        {/* Dynamic module page */}
        <Route path="/modules/:id" element={<ModulePage />} />
      </Routes>
    </>
  )
}

export default App;
