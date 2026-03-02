import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { MarketIdea } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowBigUp, ArrowBigDown, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type SortPeriod = 'day' | 'week' | 'month' | 'all';

export default function Home() {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<MarketIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<SortPeriod>('day');

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('market_ideas')
        .select(`
          *,
          profiles:creator_id (full_name, avatar_url),
          market_options (name)
        `)
        .order('score', { ascending: false });

      // Apply date filtering
      const now = new Date();
      let startDate = new Date();
      
      if (period === 'day') {
        startDate.setDate(now.getDate() - 1);
        query = query.gte('created_at', startDate.toISOString());
      } else if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
        query = query.gte('created_at', startDate.toISOString());
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1);
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // If user is logged in, fetch their votes
      if (user && data) {
        const { data: votes } = await supabase
          .from('votes')
          .select('market_id, vote_type')
          .eq('user_id', user.id)
          .in('market_id', data.map(m => m.id));

        if (votes) {
          const voteMap = new Map(votes.map(v => [v.market_id, v.vote_type]));
          const marketsWithVotes = data.map(m => ({
            ...m,
            user_vote: voteMap.get(m.id) || 0
          }));
          setMarkets(marketsWithVotes);
          setLoading(false);
          return;
        }
      }

      setMarkets(data || []);
    } catch (err) {
      console.error('Error fetching markets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, [period, user]);

  const handleVote = async (marketId: string, type: 1 | -1) => {
    if (!user) {
      signInWithGoogle();
      return;
    }

    // Optimistic update
    setMarkets(prev => prev.map(m => {
      if (m.id !== marketId) return m;
      
      const currentVote = m.user_vote || 0;
      let newScore = m.score;
      let newVote: number = type;

      if (currentVote === type) {
        // Toggle off
        newScore -= type;
        newVote = 0;
      } else if (currentVote === 0) {
        // New vote
        newScore += type;
      } else {
        // Switch vote
        newScore += 2 * type;
      }

      return { ...m, score: newScore, user_vote: newVote };
    }));

    try {
      const market = markets.find(m => m.id === marketId);
      const currentVote = market?.user_vote || 0;

      if (currentVote === type) {
        // Remove vote
        await supabase.from('votes').delete().match({ user_id: user.id, market_id: marketId });
      } else {
        // Upsert vote
        await supabase.from('votes').upsert({
          user_id: user.id,
          market_id: marketId,
          vote_type: type
        });
      }
    } catch (err) {
      console.error('Error voting:', err);
      // Revert on error (could implement more robust rollback)
      fetchMarkets();
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero / CTA */}
      <section className="bg-indigo-700 rounded-2xl p-8 text-white shadow-lg overflow-hidden relative">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl font-bold mb-4">What should we predict next?</h1>
          <p className="text-indigo-100 mb-6 text-lg">
            Suggest new markets, vote on ideas, and help curate the future of prediction.
            The best ideas rise to the top.
          </p>
          <Button 
            variant="secondary" 
            size="lg" 
            onClick={() => user ? window.location.href = '/create' : signInWithGoogle()}
            className="font-semibold"
          >
            Suggest a Market
          </Button>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -right-10 -bottom-20 h-64 w-64 bg-indigo-500 rounded-full blur-3xl opacity-50" />
      </section>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <span className="text-sm font-medium text-gray-500 mr-2">Top of the:</span>
        {(['day', 'week', 'month', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              period === p 
                ? "bg-gray-900 text-white" 
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Market Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <h3 className="text-lg font-medium text-gray-900">No markets found</h3>
          <p className="text-gray-500 mt-1">Be the first to suggest one for this period!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map((market) => (
            <Card key={market.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
              {market.image_url && (
                <div className="h-40 w-full overflow-hidden bg-gray-100">
                  <img 
                    src={market.image_url} 
                    alt={market.title} 
                    className="h-full w-full object-cover transition-transform hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/market/800/400';
                    }}
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-lg leading-tight line-clamp-2">
                    {market.title}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                  {market.profiles?.avatar_url && (
                    <img 
                      src={market.profiles.avatar_url} 
                      className="h-5 w-5 rounded-full" 
                      alt={market.profiles.full_name || 'User'} 
                    />
                  )}
                  <span>{market.profiles?.full_name || 'Anonymous'}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(market.created_at), { addSuffix: true })}</span>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 py-2">
                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                  {market.description}
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Potential Outcomes
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {market.market_options?.slice(0, 3).map((opt) => (
                      <span 
                        key={opt.id} 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {opt.name}
                      </span>
                    ))}
                    {(market.market_options?.length || 0) > 3 && (
                      <span className="text-xs text-gray-500 self-center">
                        +{market.market_options!.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-md">
                  {market.resolution_type === 'date' ? (
                    <Calendar className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span className="line-clamp-1">
                    Resolution: {market.resolution_criteria}
                  </span>
                </div>
              </CardContent>

              <CardFooter className="border-t border-gray-100 bg-gray-50/50 py-3 mt-auto">
                <div className="flex items-center gap-1 bg-white rounded-full shadow-sm border border-gray-200 p-1">
                  <button
                    onClick={() => handleVote(market.id, 1)}
                    className={cn(
                      "p-1.5 rounded-full transition-colors hover:bg-gray-100",
                      market.user_vote === 1 ? "text-orange-600 bg-orange-50 hover:bg-orange-100" : "text-gray-400"
                    )}
                  >
                    <ArrowBigUp className={cn("h-6 w-6", market.user_vote === 1 && "fill-current")} />
                  </button>
                  <span className={cn(
                    "font-bold min-w-[1.5rem] text-center text-sm",
                    market.score > 0 ? "text-orange-600" : market.score < 0 ? "text-blue-600" : "text-gray-600"
                  )}>
                    {market.score}
                  </span>
                  <button
                    onClick={() => handleVote(market.id, -1)}
                    className={cn(
                      "p-1.5 rounded-full transition-colors hover:bg-gray-100",
                      market.user_vote === -1 ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-gray-400"
                    )}
                  >
                    <ArrowBigDown className={cn("h-6 w-6", market.user_vote === -1 && "fill-current")} />
                  </button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
