import { Navigate } from 'react-router-dom';

// La racine sert uniquement de point d'entrée et redirige vers le tableau de bord.
const Index = () => <Navigate to="/dashboard" replace />;

export default Index;
