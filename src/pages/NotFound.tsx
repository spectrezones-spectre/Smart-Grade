import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Journalise les routes invalides pour faciliter le diagnostic côté navigation.
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-6">
      <div className="text-center max-w-md space-y-4 bg-card shadow-card rounded-lg p-8">
        <div className="text-5xl" aria-hidden="true">🔎</div>
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <p className="text-lg text-muted-foreground">
          La page demandée n'existe encore ou a été déplacée.
        </p>
        <p className="text-sm text-muted-foreground">
          Retournez au tableau de bord pour continuer votre travail en toute sécurité.
        </p>
        <Link to="/dashboard" className="inline-flex text-primary font-medium hover:underline">
          Revenir au tableau de bord
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
