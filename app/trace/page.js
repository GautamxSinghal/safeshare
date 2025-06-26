"use client"
import { verifyJWT } from "@/libs/jwt";
import { jwtDecode } from "jwt-decode";
import { useState, useEffect } from "react";

const Page = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, uniqueIPs: 0 });

  useEffect(() => {
    const fetchTraces = async () => {
      try {
        const token = localStorage.getItem("safeshare_token");
        console.log('🔑 Token trace', token);
        
        if (!token) {
          setError("No authentication token found");
          setLoading(false);
          return;
        }

        // Check if token is expired
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        if (decoded.exp < currentTime) {
          setError("Session expired. Please login again.");
          setLoading(false);
          return;
        }

        const uploaderId = decoded?.uploaderId;
        console.log('👤 Uploader ID', uploaderId);
        
        if (!uploaderId) {
          setError("Invalid token: missing uploader ID");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/trace", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ uploaderId }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("📊 Trace data", data);
        
        const traces = data.logs || [];
        setLogs(traces);
        
        // Calculate stats
        const uniqueIPs = new Set(traces.map(log => log.ip)).size;
        setStats({ total: traces.length, uniqueIPs });
        
        console.log("📈 Trace stats", { total: traces.length, uniqueIPs });
        
      } catch (error) {
        console.error('❌ Error fetching traces:', error);
        setError(error.message || "Failed to fetch trace data");
      } finally {
        setLoading(false);
      }
    };

    fetchTraces();
  }, []);

  // Enhanced IP formatting function
  const formatIP = (ip) => {
    if (!ip || ip === 'unknown') {
      return '❓ Unknown IP';
    }
    
    if (ip === '::1' || ip === '127.0.0.1') {
      return `🏠 ${ip} (localhost)`;
    }
    
    // Check for private IP ranges
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return `🏢 ${ip} (private network)`;
    }
    
    // Public IP
    return `🌍 ${ip}`;
  };

  // Enhanced user agent parsing
  const parseUserAgent = (userAgent) => {
    if (!userAgent || userAgent === 'unknown') {
      return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
    }

    // Simple user agent parsing (you could use a library like ua-parser-js for more accuracy)
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';

    // Browser detection
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // OS detection
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    // Device detection
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) device = 'Mobile';
    else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) device = 'Tablet';

    return { browser, os, device, full: userAgent };
  };

  // Time formatting
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">📊 File Access Trace</h1>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-500">Total Accesses</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{stats.uniqueIPs}</div>
            <div className="text-sm text-green-500">Unique IPs</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {logs.length > 0 ? formatTime(logs[0].accessTime) : 'Never'}
            </div>
            <div className="text-sm text-purple-500">Last Access</div>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading traces...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg mb-6">
          <div className="flex items-center">
            <span className="text-xl mr-2">❌</span>
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-xl">No trace data found</p>
          <p className="text-sm mt-2">File accesses will appear here once someone visits your shared files.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log, i) => {
            const userAgentInfo = parseUserAgent(log.userAgent);
            
            return (
              <div key={i} className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                {/* Header with time */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">⏰</span>
                    <div>
                      <div className="text-lg font-semibold text-gray-800">
                        {formatTime(log.accessTime)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(log.accessTime).toLocaleString()}
                      </div>
                    </div>
                  </div>                  
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {/* IP Information */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-700">IP Address:</span>
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                        {formatIP(log.ip)}
                      </span>
                    </div>
                    
                    {/* Location if available */}
                    {log.location && (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-700">Location:</span>
                        <span>{log.location.city}, {log.location.country}</span>
                      </div>
                    )}
                  </div>

                  {/* Device Information */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-700">Device:</span>
                      <span>{userAgentInfo.device} • {userAgentInfo.os} • {userAgentInfo.browser}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-700">OTP Used:</span>
                      <span className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                        {log.otpUsed}
                      </span>
                    </div>
                  </div>
                </div>

                {/* File Information */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {log.fileDeleted ? (
                    <div className="flex items-center space-x-2 text-red-600">
                      <span className="text-xl">🗑️</span>
                      <span className="font-medium">File was deleted after access</span>
                    </div>
                  ) : (
                <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">📁</span>
                        <span className="font-medium text-gray-700">
                          File Name: {log.fileName}
                        </span>
                    </div>
                    </div>
                  )}
                </div>

                {/* User Agent Details (Expandable) */}
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                    📱 View details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-600 break-all">
                    {userAgentInfo.full}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Page;