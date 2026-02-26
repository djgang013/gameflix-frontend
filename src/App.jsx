import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Games from './pages/Games';
import PlayGame from './pages/PlayGame'; // 1. Import the new page

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/games" element={<Games />} />

                {/* 2. Add the dynamic route. The ":id" means it can be any number */}
                <Route path="/play/:id" element={<PlayGame />} />
            </Routes>
        </Router>
    );
}

export default App;