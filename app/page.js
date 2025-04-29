'use client';

import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setProfileData(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch profile data');
      }

      setProfileData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">LinkedIn Profile Scraper</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/username"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Get Profile Info'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-md bg-red-50 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {error}
                </h3>
              </div>
            </div>
          </div>
        )}

        {profileData && (
          <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-black">Profile Information</h2>
            <div className="space-y-3">
              <div className="border-b pb-2">
                <p className="font-medium text-lg text-black">{profileData.name}</p>
                <p className="text-gray-600 mt-1">{profileData.headline}</p>
              </div>
              {profileData.about && (
                <div className="mt-4">
                  <h3 className="font-semibold text-md mb-1 text-black">About</h3>
                  <p className="text-gray-800 whitespace-pre-line">{profileData.about}</p>
                </div>
              )}
              {profileData.experience && profileData.experience.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-md mb-1">Experience</h3>
                  <ul className="space-y-2">
                    {profileData.experience.map((exp, idx) => (
                      <li key={idx} className="border-b pb-2">
                        <p className="font-medium">{exp.title}</p>
                        {exp.company && <p className="text-gray-700">{exp.company}</p>}
                        {exp.date && <p className="text-gray-500 text-sm">{exp.date}</p>}
                        {exp.location && <p className="text-gray-400 text-xs">{exp.location}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {profileData.education && profileData.education.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-md mb-1">Education</h3>
                  <ul className="space-y-2">
                    {profileData.education.map((edu, idx) => (
                      <li key={idx} className="border-b pb-2">
                        <p className="font-medium">{edu.institution}</p>
                        {edu.degree && <p className="text-gray-700">{edu.degree}</p>}
                        {edu.details && <p className="text-gray-500 text-sm">{edu.details}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {profileData.post && (
                <div className="mt-4">
                  <h3 className="font-semibold text-md mb-1">First Original Post</h3>
                  <p className="text-gray-800 whitespace-pre-line">{profileData.post}</p>
                </div>
              )}
              {profileData.connectionMessage && (
                <div className="mt-8 p-4 bg-blue-50 rounded-md">
                  <h3 className="font-semibold text-md mb-1 text-black">Generated Connection Message</h3>
                  <p className="text-blue-900 whitespace-pre-line">{profileData.connectionMessage}</p>
                </div>
              )}
              {profileData.postComment && (
                <div className="mt-4 p-4 bg-green-50 rounded-md">
                  <h3 className="font-semibold text-md mb-1 text-black">Generated Comment for Recent Post</h3>
                  <p className="text-green-900 whitespace-pre-line">{profileData.postComment}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 