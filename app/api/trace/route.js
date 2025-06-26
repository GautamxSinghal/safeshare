// /api/trace/route.js or wherever you're logging the trace data

import { dbConnect } from "@/libs/dbConnection";
import Upload from '@/models/Upload';
import { NextResponse } from 'next/server';
import TraceLog from '@/models/Trace';

// Enhanced IP detection function
function getClientIP(req) {
  // Development mode - log all headers for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 IP Detection Headers:', {
      'cf-connecting-ip': req.headers.get('cf-connecting-ip'),
      'x-forwarded-for': req.headers.get('x-forwarded-for'),
      'x-real-ip': req.headers.get('x-real-ip'),
      'x-client-ip': req.headers.get('x-client-ip'),
      'x-forwarded': req.headers.get('x-forwarded'),
      'forwarded-for': req.headers.get('forwarded-for'),
      'forwarded': req.headers.get('forwarded'),
    });
  }

  // Priority order for IP detection
  const ipSources = [
    // Cloudflare (most reliable)
    req.headers.get('cf-connecting-ip'),
    
    // Standard forwarded headers
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    
    // Nginx and other proxies
    req.headers.get('x-real-ip'),
    req.headers.get('x-client-ip'),
    req.headers.get('x-forwarded'),
    req.headers.get('forwarded-for'),
    
    // RFC 7239 standard
    parseForwardedHeader(req.headers.get('forwarded')),
    
    // Fallback to 'unknown' - connection info not available in Next.js App Router
    'unknown'
  ];

  // Return first valid IP
  for (const ip of ipSources) {
    if (ip && ip !== 'unknown' && ip.trim() !== '') {
      // Clean up IPv6 wrapped IPv4 addresses
      if (ip.startsWith('::ffff:')) {
        const cleanedIP = ip.substring(7);
        console.log(`🌐 IP Detected: ${cleanedIP} (cleaned from IPv6 wrapper)`);
        return cleanedIP;
      }
      console.log(`🌐 IP Detected: ${ip}`);
      return ip;
    }
  }

  // Development fallback - use mock IP for testing
  if (process.env.NODE_ENV === 'development') {
    const mockIP = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
    console.log(`🌐 IP Detected: ${mockIP} (mock for development)`);
    return mockIP;
  }

  console.log('🌐 IP Detected: unknown (no valid IP found)');
  return 'unknown';
}

// Helper function to parse RFC 7239 Forwarded header
function parseForwardedHeader(forwarded) {
  if (!forwarded) return null;
  
  const forMatch = forwarded.match(/for=([^;,\s]+)/i);
  if (forMatch) {
    let ip = forMatch[1];
    // Remove quotes and brackets
    ip = ip.replace(/["\[\]]/g, '');
    // Handle port (remove it)
    ip = ip.split(':')[0];
    return ip;
  }
  
  return null;
}

// Function to get enhanced user agent info
function getUserAgent(req) {
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  // Log in development for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('🖥️ User Agent:', userAgent);
  }
  
  return userAgent;
}

// GET endpoint - for fetching traces
export async function POST(req) {
  try {
    const { uploaderId } = await req.json();
    await dbConnect();
    
    const logs = await TraceLog.find({ uploaderId }).sort({ createdAt: -1 });
    console.log("📊 Traces found:", logs.length);
    
    return NextResponse.json({ 
      logs,
      total: logs.length,
      message: logs.length === 0 ? 'No traces found' : `Found ${logs.length} traces`
    });
  } catch (err) {
    console.error('❌ Trace fetch error:', err);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

// If you also have a separate endpoint for LOGGING traces (not just fetching)
// This would be used when someone accesses a file
export async function logFileAccess(req, traceData) {
  try {
    await dbConnect();
    
    // Enhanced IP and user agent detection
    const clientIP = getClientIP(req);
    const userAgent = getUserAgent(req);
    
    // Create trace log with enhanced data
    const traceLog = new TraceLog({
      uploaderId: traceData.uploaderId,
      ip: clientIP,
      userAgent: userAgent,
      otpUsed: traceData.otpUsed,
      fileName: traceData.fileName,
      fileId: traceData.fileId,
      fileDeleted: traceData.fileDeleted || false,
      accessTime: new Date(),
      // Additional metadata
      headers: {
        referer: req.headers.get('referer'),
        acceptLanguage: req.headers.get('accept-language'),
        acceptEncoding: req.headers.get('accept-encoding'),
      },
      // Geolocation can be added here if you use a service like MaxMind
      location: await getLocationFromIP(clientIP), // Optional
    });
    
    await traceLog.save();
    
    console.log('✅ Trace logged successfully:', {
      ip: clientIP,
      userAgent: userAgent.substring(0, 50) + '...',
      uploaderId: traceData.uploaderId
    });
    
    return { success: true, traceId: traceLog._id };
  } catch (error) {
    console.error('❌ Trace logging error:', error);
    throw error;
  }
}

// Optional: Get location from IP (requires external service)
async function getLocationFromIP(ip) {
  if (
    ip === 'unknown' ||
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.')
  ) {
    return { country: 'Local', city: 'Development' };
  }

  try {
    const response = await fetch(`https://api.ipapi.com/api/${ip}?access_key=f568ace3551e7062f063568b313636dd`);

    if (response.ok) {
      const data = await response.json();
      console.log('🌍 Location data received:', data);
      return {
        country: data.country_name,
        city: data.city,
        region: data.region_name,
        timezone: data.time_zone?.id || 'Unknown'
      };
    }
  } catch (error) {
    console.log('⚠️ Location lookup failed:', error.message);
  }

  return { country: 'Unknown', city: 'Unknown' };
}