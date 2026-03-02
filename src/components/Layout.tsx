import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Plus, LogOut, TrendingUp } from 'lucide-react';

export default function Layout() {
  const { user, signInWithGoogle, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">MarketMind</span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link to="/create">
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Suggest Market
                  </Button>
                </Link>
                <div className="flex items-center gap-3">
                  {user.user_metadata.avatar_url && (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={user.user_metadata.full_name}
                      className="h-8 w-8 rounded-full border border-gray-200"
                    />
                  )}
                  <Button variant="ghost" size="sm" onClick={() => signOut()}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={() => signInWithGoogle()} variant="primary" size="sm">
                Sign in with Google
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
