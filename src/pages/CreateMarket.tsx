import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Plus, X, Calendar, AlertCircle } from 'lucide-react';

export default function CreateMarket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [resolutionType, setResolutionType] = useState<'date' | 'event'>('event');
  const [resolutionCriteria, setResolutionCriteria] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');
  const [options, setOptions] = useState<string[]>(['Yes', 'No']);

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Create Market Idea
      const { data: market, error: marketError } = await supabase
        .from('market_ideas')
        .insert({
          creator_id: user.id,
          title,
          description,
          image_url: imageUrl || null,
          resolution_criteria: resolutionType === 'date' ? `Date: ${resolutionDate}` : resolutionCriteria,
          resolution_type: resolutionType,
          resolution_date: resolutionType === 'date' && resolutionDate ? new Date(resolutionDate).toISOString() : null,
        })
        .select()
        .single();

      if (marketError) throw marketError;

      // 2. Create Options
      const optionsData = options
        .filter((opt) => opt.trim() !== '')
        .map((name) => ({
          market_id: market.id,
          name: name.trim(),
        }));

      if (optionsData.length > 0) {
        const { error: optionsError } = await supabase.from('market_options').insert(optionsData);
        if (optionsError) throw optionsError;
      }

      navigate('/');
    } catch (err: any) {
      console.error('Error creating market:', err);
      setError(err.message || 'Failed to create market');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-4">Sign in to suggest a market</h2>
        <Button onClick={() => navigate('/')}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Suggest a Prediction Market</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="e.g., Will SpaceX land on Mars by 2030?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Image URL (Optional)</label>
              <Input
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              {imageUrl && (
                <div className="mt-2 relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Resolution Criteria</label>
              <div className="flex gap-4 mb-2">
                <button
                  type="button"
                  onClick={() => setResolutionType('event')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border ${
                    resolutionType === 'event'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Specific Event
                </button>
                <button
                  type="button"
                  onClick={() => setResolutionType('date')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border ${
                    resolutionType === 'date'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Specific Date
                </button>
              </div>
              
              {resolutionType === 'event' ? (
                <Textarea
                  placeholder="Describe exactly what needs to happen for this market to resolve..."
                  value={resolutionCriteria}
                  onChange={(e) => setResolutionCriteria(e.target.value)}
                  required
                />
              ) : (
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="date"
                    className="pl-9"
                    value={resolutionDate}
                    onChange={(e) => setResolutionDate(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Provide more context about this market..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Outcomes</label>
                <Button type="button" variant="ghost" size="sm" onClick={handleAddOption} className="h-8">
                  <Plus className="h-3 w-3 mr-1" /> Add Option
                </Button>
              </div>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      required
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOption(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => navigate('/')}>
                Cancel
              </Button>
              <Button type="submit" isLoading={loading}>
                Create Market Suggestion
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
