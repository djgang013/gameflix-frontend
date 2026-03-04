import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Games from './pages/Games';
import PlayGame from './pages/PlayGame';
import TicTacToe from "./pages/TicTacToe.jsx";
import Rps from './pages/Rps';
import Wordle from './pages/Wordle';
import Profile from './pages/Profile';
function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/games" element={<Games />} />
                <Route path="/play/tictactoe" element={<TicTacToe />} />
                <Route path="/play/rps" element={<Rps />} />
                <Route path="/play/wordle" element={<Wordle />} />
                {/* 2. Add the dynamic route. The ":id" means it can be any number */}
                <Route path="/play/:id" element={<PlayGame />} />
                <Route path="/profile" element={<Profile />} />
            </Routes>
        </Router>
    );
}

export default App;