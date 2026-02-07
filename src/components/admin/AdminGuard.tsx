import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Navigate } from "react-router-dom";

export default function AdminGuard({
  children,
}: {
  children: JSX.Element;
}) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthenticated(!!data.user);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  if (!authenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
