'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState<'claude' | 'gemini'>('claude');
  const [hasKey, setHasKey] = useState(false);
  const [keyPreview, setKeyPreview] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchApiKeyStatus();
    }
  }, [status, router]);

  const fetchApiKeyStatus = async () => {
    try {
      const response = await fetch('/api/user/api-key');
      const data = await response.json();

      if (data.success) {
        setHasKey(data.data.hasKey);
        setKeyPreview(data.data.keyPreview || '');
        setAiProvider(data.data.aiProvider || 'claude');
      }
    } catch (error) {
      console.error('Error fetching API key status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch('/api/user/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, aiProvider }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'API key saved successfully!' });
        setApiKey('');
        fetchApiKeyStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save API key' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
      console.error('Error saving API key:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveApiKey = async () => {
    if (!confirm('Are you sure you want to remove your API key? You will not be able to use AI analysis features.')) {
      return;
    }

    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch('/api/user/api-key', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'API key removed successfully' });
        fetchApiKeyStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to remove API key' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
      console.error('Error removing API key:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500 mx-auto" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-400 hover:text-gray-300"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="mt-2 text-sm text-gray-400">
              Manage your account and API configuration
            </p>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
              <div className="rounded-lg border border-gray-800 bg-gray-950 p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Name</span>
                  <span className="text-sm font-medium text-white">{session?.user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Email</span>
                  <span className="text-sm font-medium text-white">{session?.user?.email}</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-4">AI Provider Configuration</h2>
              <p className="text-sm text-gray-400 mb-4">
                Choose your AI provider and add your API key to enable AI analysis features.
              </p>

              {message && (
                <div
                  className={`mb-4 rounded-md border p-3 ${
                    message.type === 'success'
                      ? 'border-green-500/50 bg-green-500/10'
                      : 'border-red-500/50 bg-red-500/10'
                  }`}
                >
                  <p
                    className={`text-sm ${
                      message.type === 'success' ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
              )}

              {hasKey && (
                <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-500">
                        API Key Configured ({aiProvider === 'claude' ? 'Claude' : 'Gemini'})
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{keyPreview}</p>
                    </div>
                    <button
                      onClick={handleRemoveApiKey}
                      disabled={isSaving}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveApiKey} className="space-y-4">
                <div>
                  <label htmlFor="aiProvider" className="block text-sm font-medium text-gray-300 mb-2">
                    AI Provider
                  </label>
                  <select
                    id="aiProvider"
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value as 'claude' | 'gemini')}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="claude">Claude (Anthropic)</option>
                    <option value="gemini">Gemini (Google)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {aiProvider === 'claude' ? (
                      <>
                        Get your API key from{' '}
                        <a
                          href="https://console.anthropic.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-400"
                        >
                          console.anthropic.com
                        </a>
                      </>
                    ) : (
                      <>
                        Get your API key from{' '}
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-400"
                        >
                          Google AI Studio
                        </a>
                      </>
                    )}
                  </p>
                </div>

                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-2">
                    {hasKey ? 'Update API Key' : 'API Key'}
                  </label>
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={aiProvider === 'claude' ? 'sk-ant-...' : 'AIza...'}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Your API key is encrypted and stored securely
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSaving || !apiKey}
                  className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : hasKey ? 'Update API Key' : 'Save API Key'}
                </button>
              </form>
            </div>

            <div className="border-t border-gray-800 pt-6">
              <h2 className="text-xl font-semibold text-white mb-4">Features</h2>
              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Real-time crypto price tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Technical indicators (RSI, MACD, EMA, Bollinger Bands)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={hasKey ? 'text-green-500' : 'text-gray-600'}>
                    {hasKey ? '✓' : '○'}
                  </span>
                  <span>{aiProvider === 'claude' ? 'Claude' : 'Gemini'} AI market analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={hasKey ? 'text-green-500' : 'text-gray-600'}>
                    {hasKey ? '✓' : '○'}
                  </span>
                  <span>Pattern recognition and risk assessment</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
