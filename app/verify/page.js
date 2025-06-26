
"use client"

import { useState, Suspense, useCallback, useEffect,useRef } from "react";
import { useSearchParams } from "next/navigation";

const VerifyPageContent = () => {
  const [otp, setotp] = useState("")
  const [loading, setloading] = useState(false)
  const [error, seterror] = useState(null)
  const [mode, setmode] = useState("");
  const [access, setaccess] = useState("");
  const [file, setfile] = useState(null);

  const searchParams = useSearchParams();
  const fileId = searchParams.get("fileId");
    
  // Printer detection states
  const [showPrinterPopup, setShowPrinterPopup] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [searchingPrinters, setSearchingPrinters] = useState(false);
  const [jsprintManagerReady, setJsprintManagerReady] = useState(false);

  // PDF.js viewer states
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);

  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef(null);

  const renderPDFPage = useCallback(async (pageNumber) => {
    if (!pdfDocument || !canvasRef.current) return;
    
    setIsLoading(true);
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      console.log(`✅ Page ${pageNumber} rendered successfully`);
    } catch (error) {
      console.error('Error rendering PDF page:', error);
      seterror('Failed to render PDF page');
    } finally {
      setIsLoading(false);
    }
  }, [pdfDocument, scale]);

    const loadPDFDocument = useCallback(async (pdfBlob) => {
    try {
      setIsLoading(true);
      seterror('');
      
      if (!window.pdfjsLib) {
        throw new Error('PDF.js not loaded');
      }
      
      console.log('📄 Loading PDF document...');
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const loadingTask = window.pdfjsLib.getDocument({
        data: arrayBuffer,
        disableCreateObjectURL: true,
        disableWebGL: true,
        disableFontFace: false,
        maxImageSize: 1024 * 1024,
        isEvalSupported: false,
        isOffscreenCanvasSupported: false
      });
      
      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      
      console.log(`✅ PDF loaded: ${pdf.numPages} pages`);
      
      // Render first page after a short delay
      setTimeout(() => {
        renderPDFPage(1);
      }, 100);
      
    } catch (error) {
      console.error('Error loading PDF:', error);
      seterror(`Failed to load PDF document: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [renderPDFPage]);

  // Load PDF.js library
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        // Check if PDF.js is already loaded
        if (window.pdfjsLib) {
          setPdfJsLoaded(true);
          return;
        }

        // Load PDF.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        
        script.onload = () => {
          console.log('✅ PDF.js loaded successfully');
          // Configure PDF.js worker
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            setPdfJsLoaded(true);
          }
        };
        
        script.onerror = () => {
          console.error('❌ Failed to load PDF.js');
          seterror('Failed to load PDF viewer. Please refresh the page.');
        };
        
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading PDF.js:', error);
        seterror('PDF viewer initialization failed');
      }
    };
    loadPdfJs();
  }, []);

   useEffect(() => {
    if (showPDFViewer) {
      const handleKeyDown = (e) => {
        if (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'p' || e.key === 's')) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        
        if (e.key === 'F12') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        
        if (e.key === 'ContextMenu') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };
      
      const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      const handleSelectStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      const handleDragStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('selectstart', handleSelectStart);
      document.addEventListener('dragstart', handleDragStart);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('selectstart', handleSelectStart);
        document.removeEventListener('dragstart', handleDragStart);
      };
    }
  }, [showPDFViewer]);

  // JSPrintManager initialization
  useEffect(() => {
    const initializeJSPrintManager = async () => {
      try {
        console.log('🔍 Initializing JSPrintManager...');

        // Load JSPrintManager script if not already loaded
        if (!window.JSPM) {
          await loadJSPrintManagerScript();
        }

        if (!window.JSPM || !window.JSPM.JSPrintManager) {
          throw new Error('JSPrintManager not loaded properly');
        }

        // Configure JSPrintManager with proper settings
        window.JSPM.JSPrintManager.auto_reconnect = true;
        window.JSPM.JSPrintManager.start();

        // Set up WebSocket status monitoring - CRITICAL PART
        window.JSPM.JSPrintManager.WS.onStatusChanged = function () {
          console.log('🔗 JSPrintManager WebSocket status changed:', window.JSPM.JSPrintManager.websocket_status);
          
          if (window.JSPM.JSPrintManager.websocket_status === window.JSPM.WSStatus.Open) {
            console.log('✅ JSPrintManager WebSocket connection established');
            setJsprintManagerReady(true);
            seterror('');
          } else if (window.JSPM.JSPrintManager.websocket_status === window.JSPM.WSStatus.Closed) {
            console.log('❌ JSPrintManager WebSocket connection closed');
            setJsprintManagerReady(false);
            seterror('🔌 JSPrintManager connection lost. Please ensure JSPrintManager app is running.');
          } else if (window.JSPM.JSPrintManager.websocket_status === window.JSPM.WSStatus.Blocked) {
            console.log('🚫 JSPrintManager WebSocket connection blocked');
            setJsprintManagerReady(false);
            seterror('🚫 JSPrintManager connection blocked. Please check firewall settings.');
          }
        };

        // Set up error handling
        window.JSPM.JSPrintManager.WS.onError = function (evt) {
          console.error('❌ JSPrintManager WebSocket error:', evt);
          seterror(`🔌 JSPrintManager error: ${evt.data || 'Connection failed'}`);
          setJsprintManagerReady(false);
        };

        console.log('🚀 JSPrintManager initialization completed');
      } catch (err) {
        console.error('❌ JSPrintManager initialization failed:', err);
        seterror(`🖨️ JSPrintManager Setup Required:

        STEP 1: Download & Install JSPrintManager
        • Go to: https://neodynamic.com/downloads/jspm
        • Download and install JSPrintManager for Windows
        • Start the JSPrintManager application

        STEP 2: Add JSPrintManager.js to your project
        • Copy JSPrintManager.js to your public folder
        • Ensure it's accessible at /JSPrintManager.js

        STEP 3: Check Windows Firewall
        • Allow JSPrintManager through Windows Firewall
        • Ensure port 22443 is not blocked

        Current Status: ${err.message}`);
        setJsprintManagerReady(false);
      }
    };

    const loadJSPrintManagerScript = () => {
      return new Promise((resolve, reject) => {
        if (document.querySelector('script[src*="JSPrintManager.js"]')) {
          console.log('🔍 JSPrintManager.js already loaded');
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.type = 'text/javascript';
        
        // Try paths for JSPrintManager.js
        const scriptPaths = [
          '/JSPrintManager.js',
          './JSPrintManager.js',
          '/public/JSPrintManager.js'
        ];

        let currentPathIndex = 0;

        const tryLoadScript = () => {
          if (currentPathIndex >= scriptPaths.length) {
            reject(new Error('Failed to load JSPrintManager.js from all paths'));
            return;
          }

          script.src = scriptPaths[currentPathIndex];
          console.log(`🔍 Trying to load JSPrintManager.js from: ${script.src}`);
          
          script.onload = () => {
            console.log(`✅ JSPrintManager.js loaded from: ${script.src}`);
            // Wait for JSPM to be available
            setTimeout(() => {
              if (window.JSPM && window.JSPM.JSPrintManager) {
                resolve();
              } else {
                reject(new Error('JSPM not available after script load'));
              }
            }, 1000);
          };
          
          script.onerror = () => {
            console.warn(`❌ Failed to load from: ${script.src}`);
            currentPathIndex++;
            tryLoadScript();
          };
          
          document.head.appendChild(script);
        };

        tryLoadScript();
      });
    };

    initializeJSPrintManager();
  }, []);

  // Get installed printers - IMPROVED VERSION
  const getInstalledPrinters = useCallback(async () => {
    if (!jsprintManagerReady) {
      throw new Error('JSPrintManager not ready');
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('🖨️ Getting installed printers...');
        
        // Use the proper JSPrintManager API to get printers
        window.JSPM.JSPrintManager.getPrinters().then(printersList => {
          console.log('📋 Raw printers list:', printersList);
          
          if (!Array.isArray(printersList)) {
            console.warn('⚠️ Unexpected printer list format, using fallback');
            resolve(['Default Printer']);
            return;
          }

          const processedPrinters = printersList.map(printer => {
            const printerName = typeof printer === 'string' ? printer : printer.name || printer.toString();
            const lowerName = printerName.toLowerCase();
            
            // Identify virtual/PDF printers to warn users
            const virtualKeywords = ['pdf', 'xps', 'onenote', 'fax', 'virtual', 'cutepdf', 'foxit', 'adobe'];
            const isVirtual = virtualKeywords.some(keyword => lowerName.includes(keyword));
            
            return {
              name: printerName,
              type: isVirtual ? 'virtual' : 'physical',
              blocked: false,
              reason: isVirtual ? 'Virtual/Document printer' : 'Physical printer'
            };
          });

          console.log('✅ Processed printers:', processedPrinters);
          resolve(processedPrinters);
          
        }).catch(error => {
          console.error('❌ Error getting printers:', error);
          reject(error);
        });

      } catch (err) {
        console.error('❌ getPrinters failed:', err);
        reject(err);
      }
    });
  }, [jsprintManagerReady]);

  // Search for printers and show popup
  const searchPrintersAndShowPopup = useCallback(async () => {
    setSearchingPrinters(true);
    seterror('');
    setPrinters([]);

    try {
      console.log('🔍 Searching for printers...');
      
      if (!jsprintManagerReady) {
        throw new Error('JSPrintManager not ready. Please ensure the JSPrintManager app is running.');
      }

      const printersList = await getInstalledPrinters();
      
      if (printersList.length === 0) {
        throw new Error('No printers found. Please install at least one printer.');
      }
      
      setPrinters(printersList);
      setShowPrinterPopup(true);

    } catch (err) {
      console.error('🚨 Printer search failed:', err);
      seterror(`Failed to get printers: ${err.message}`);
    } finally {
      setSearchingPrinters(false);
    }
  }, [jsprintManagerReady, getInstalledPrinters]);

  // Direct print function with JSPrintManager implementation
  const handleDirectPrint = useCallback(async () => {
    if (!selectedPrinter) {
      seterror('Please select a printer first');
      return;
    }

    if (!file) {
      seterror('No document available for printing');
      return;
    }

    if (!jsprintManagerReady) {
      seterror('JSPrintManager not ready. Please ensure the app is running.');
      return;
    }

    setloading(true);
    seterror('');

    try {
      console.log('🖨️ Starting print job to:', selectedPrinter);
      
      const { blob, filename, contentType } = file;

      // Convert blob to base64 - PROPER METHOD
      const base64String = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const result = event.target.result;
            const base64Data = result.split(',')[1]; // Remove data URL prefix
            resolve(base64Data);
          } catch (err) {
            reject(new Error(`Failed to convert file to base64: ${err.message}`));
          }
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });

      console.log('✅ File converted to base64, length:', base64String.length);

      // Wait for JSPrintManager to be ready
      if (window.JSPM.JSPrintManager.websocket_status !== window.JSPM.WSStatus.Open) {
        console.log('⏳ Waiting for JSPrintManager connection...');
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('JSPrintManager connection timeout')), 10000);
          
          const checkConnection = () => {
            if (window.JSPM.JSPrintManager.websocket_status === window.JSPM.WSStatus.Open) {
              clearTimeout(timeout);
              resolve();
            } else {
              setTimeout(checkConnection, 500);
            }
          };
          
          checkConnection();
        });
      }

      // Create print job with PROPER JSPrintManager syntax
      const clientPrintJob = new window.JSPM.ClientPrintJob();
      
      // Set printer - CRITICAL: Use exact printer name or "default"
      if (selectedPrinter.toLowerCase() === 'default' || selectedPrinter === 'Default Printer') {
        clientPrintJob.clientPrinter = new window.JSPM.InstalledPrinter('default');
      } else {
        clientPrintJob.clientPrinter = new window.JSPM.InstalledPrinter(selectedPrinter);
      }

      // Create print file with proper file source type
      const printFile = new window.JSPM.PrintFile(
        base64String, 
        window.JSPM.FileSourceType.Base64, 
        filename, 
        1 // number of copies
      );

      // Add file to print job
      clientPrintJob.files.push(printFile);

      console.log('📤 Sending print job to JSPrintManager...');
      console.log('🖨️ Printer:', selectedPrinter);
      console.log('📄 File:', filename);
      console.log('📊 File size:', blob.size, 'bytes');

      // Send to client - THIS IS THE KEY METHOD
      await clientPrintJob.sendToClient();

      console.log('✅ Print job sent successfully');
      setShowPrinterPopup(false);

      // Optional: Add a delay to allow print job to process
      setTimeout(() => {
        console.log('📋 Print job should now appear in Windows print queue');
      }, 2000);

    } catch (err) {
      console.error('❌ Print job failed:', err);
      seterror(`Print failed: ${err.message}`);
    } finally {
      setloading(false);
    }
  }, [selectedPrinter, file, jsprintManagerReady]);

  // Reset function for new document
  const resetForNewDocument = useCallback(() => {
    setShowPrinterPopup(false);
    setSelectedPrinter('');
    setPrinters([]);
    seterror('');
  }, []);

  console.log("fileid", fileId)
  
  const handleVerify = async (e) => {
    e.preventDefault();
    setloading(true);
    seterror(null);
    
    try {
      const res = await fetch("/api/verify/verifyFile", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
      })

      const data = await res.json()
      console.log("data", data);

      if (!res.ok) {
        seterror("File not found or invalid OTP");
        setfile(null);
        return;
      }
      
      if (res.ok) {
        setfile(data);
        setmode(data.mode);
        setaccess(data.access);
        
        // If it's a print mode, automatically show printer popup
        if (data.mode === "print") {
          setTimeout(() => {
            searchPrintersAndShowPopup();
          }, 500);
        }
      }
    } catch (err) {
      console.error("Verification error:", err);
      seterror("Something went wrong during verification");
      setfile(null);
    } finally {
      setloading(false);
    }
  }

  // handlePrintWithDialog function
  const handlePrintWithDialog = useCallback(async () => {
    if (!jsprintManagerReady) {
      seterror('JSPrintManager not ready. Please ensure the JSPrintManager app is running.');
      return;
    }

    if (!window.JSPM || !window.JSPM.JSPrintManager || !window.JSPM.ClientPrintJob) {
      seterror('JSPrintManager components not loaded properly');
      return;
    }

    setloading(true);
    seterror('');

    try {
      console.log('🖨️ Opening Windows print dialog...');

      // CRITICAL: Verify JSPrintManager connection status
      if (window.JSPM.JSPrintManager.websocket_status !== window.JSPM.WSStatus.Open) {
        throw new Error('JSPrintManager WebSocket connection is not open. Please check if JSPrintManager app is running.');
      }

      // UPDATED: Fetch file fresh from server
      console.log('📥 Fetching file from server...');
      const res = await fetch('/api/verify/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch file from server');
      }

      // Get fresh blob from server response
      const blob = await res.blob();
      
      // Extract filename from response headers or use default
      const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 
                      file?.filename || 
                      file?.fileName || 
                      'document.pdf';
      
      // Get content type from response or file object
      const contentType = res.headers.get('Content-Type') || 
                         file?.contentType || 
                         'application/pdf';

      console.log('✅ File fetched successfully');
      console.log('📄 Filename:', filename);
      console.log('📊 File size:', blob.size, 'bytes');
      console.log('🏷️ Content type:', contentType);

      // Convert blob to base64 with better error handling
      const base64String = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          try {
            const result = event.target.result;
            if (!result || typeof result !== 'string') {
              reject(new Error('Invalid FileReader result'));
              return;
            }
            
            const base64Data = result.split(',')[1];
            if (!base64Data || base64Data.length === 0) {
              reject(new Error('Failed to extract base64 data from file'));
              return;
            }
            
            console.log('✅ File converted to base64, length:', base64Data.length);
            resolve(base64Data);
          } catch (err) {
            reject(new Error(`Failed to process file: ${err.message}`));
          }
        };
        
        reader.onerror = (error) => {
          console.error('FileReader error:', error);
          reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(blob);
      });

      // Validate base64 string
      if (!base64String || base64String.length < 100) {
        throw new Error('File appears to be empty or corrupted');
      }

      // Wait for JSPrintManager to be fully ready (additional check)
      console.log('⏳ Verifying JSPrintManager connection...');
      let connectionRetries = 0;
      const maxRetries = 10;
      
      while (window.JSPM.JSPrintManager.websocket_status !== window.JSPM.WSStatus.Open && connectionRetries < maxRetries) {
        console.log(`🔄 Waiting for connection... (${connectionRetries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        connectionRetries++;
      }
      
      if (window.JSPM.JSPrintManager.websocket_status !== window.JSPM.WSStatus.Open) {
        throw new Error('JSPrintManager connection timeout. Please restart the JSPrintManager app and try again.');
      }

      console.log('✅ JSPrintManager connection verified');

      // Create print job with PROPER UserSelectedPrinter implementation
      const clientPrintJob = new window.JSPM.ClientPrintJob();
      
      // CRITICAL: Use UserSelectedPrinter for Windows dialog
      clientPrintJob.clientPrinter = new window.JSPM.UserSelectedPrinter();
      
      // Set print job properties for better compatibility
      clientPrintJob.printerCommands = '';
      
      // Create print file with correct parameters
      let printFile;
      
      // Handle different file types properly
      if (contentType && contentType.includes('pdf')) {
        // For PDF files, use PrintFilePDF if available
        if (window.JSPM.PrintFilePDF) {
          printFile = new window.JSPM.PrintFilePDF(
            base64String,
            window.JSPM.FileSourceType.Base64,
            filename,
            1 // copies
          );
        } else {
          // Fallback to regular PrintFile
          printFile = new window.JSPM.PrintFile(
            base64String,
            window.JSPM.FileSourceType.Base64,
            filename,
            1
          );
        }
      } else {
        // For other file types
        printFile = new window.JSPM.PrintFile(
          base64String,
          window.JSPM.FileSourceType.Base64,
          filename,
          1
        );
      }

      // Add file to print job
      clientPrintJob.files.push(printFile);

      console.log('📤 Sending print job to Windows print dialog...');
      console.log('🖨️ Using UserSelectedPrinter (Windows dialog)');
      console.log('📄 File:', filename);
      console.log('📊 File size:', blob.size, 'bytes');
      console.log('🏷️ Content type:', contentType);

      // Send to client - this should open Windows print dialog
      await new Promise((resolve, reject) => {
        // Set up success/error handlers before sending
        const originalOnError = window.JSPM.JSPrintManager.WS.onError;
        const originalOnMessage = window.JSPM.JSPrintManager.WS.onMessage;
        
        // Timeout for the print dialog
        const printTimeout = setTimeout(() => {
          reject(new Error('Print dialog timeout - no response from Windows print system'));
        }, 60000); // 60 seconds timeout
        
        // Override error handler temporarily
        window.JSPM.JSPrintManager.WS.onError = function(error) {
          clearTimeout(printTimeout);
          console.error('JSPrintManager error during print:', error);
          // Restore original handler
          window.JSPM.JSPrintManager.WS.onError = originalOnError;
          window.JSPM.JSPrintManager.WS.onMessage = originalOnMessage;
          reject(new Error(`Print system error: ${error.data || error.message || 'Unknown error'}`));
        };
        
        // Monitor for successful print job submission
        let jobSent = false;
        window.JSPM.JSPrintManager.WS.onMessage = function(message) {
          console.log('JSPrintManager message:', message);
          if (message && message.data) {
            // Look for success indicators in the message
            const data = typeof message.data === 'string' ? message.data : JSON.stringify(message.data);
            if (data.includes('success') || data.includes('sent') || data.includes('dialog')) {
              if (!jobSent) {
                jobSent = true;
                clearTimeout(printTimeout);
                // Restore original handlers
                window.JSPM.JSPrintManager.WS.onError = originalOnError;
                window.JSPM.JSPrintManager.WS.onMessage = originalOnMessage;
                resolve();
              }
            }
          }
          // Call original handler if it exists
          if (originalOnMessage) {
            originalOnMessage(message);
          }
        };
        
        // Send the print job
        clientPrintJob.sendToClient()
          .then(() => {
            console.log('✅ Print job sent to client successfully');
            // Give some time for the dialog to appear
            setTimeout(() => {
              if (!jobSent) {
                jobSent = true;
                clearTimeout(printTimeout);
                // Restore original handlers
                window.JSPM.JSPrintManager.WS.onError = originalOnError;
                window.JSPM.JSPrintManager.WS.onMessage = originalOnMessage;
                resolve();
              }
            }, 2000);
          })
          .catch((error) => {
            clearTimeout(printTimeout);
            console.error('Print job send failed:', error);
            // Restore original handlers
            window.JSPM.JSPrintManager.WS.onError = originalOnError;
            window.JSPM.JSPrintManager.WS.onMessage = originalOnMessage;
            reject(error);
          });
      });

      console.log('✅ Windows print dialog should now be open');  
      setShowPrinterPopup(false);

    } catch (err) {
      console.error('❌ Print dialog failed:', err);
      
      let errorMessage = 'Failed to open Windows print dialog';
      
      if (err.message.includes('WebSocket')) {
        errorMessage = '🔌 JSPrintManager connection issue. Please ensure the JSPrintManager app is running and try again.';
      } else if (err.message.includes('timeout')) {
        errorMessage = '⏰ Print dialog timeout. The Windows print system may be busy. Please try again.';
      } else if (err.message.includes('base64') || err.message.includes('file')) {
        errorMessage = '📄 File processing error. The document may be corrupted. Please try uploading again.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      seterror(`❌ ${errorMessage}`);
    } finally {
      setloading(false);
    }
  }, [jsprintManagerReady, otp, file]);
        
  const handlePrinterSelect = useCallback((printerName) => {
    setSelectedPrinter(printerName);
    const printer = printers.find(p => p.name === printerName);
  }, [printers]);

  const handleDownload = async (e) => {
     try {
        const res = await fetch("/api/verify/download",{
            method:"POST",
            headers:{"content-Type":"application/json"},
            body:JSON.stringify({otp,fileId})
        })

        
        if(res.ok){

             const blob= await res.blob();
        const url=window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href=url;
        a.download=file.fileName || "download.jpg";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
           
        }else{
             seterror("file not found");
            console.log("res not okay")
        }

     
        
     } catch (error) {
        seterror("download error");
        console.error("download error",error)
     }

    }

  // UPDATED handleView function with PDF.js integration for secure viewing
const handleView = async (e) => {
    try {
      setloading(true);
      seterror('');

      console.log('📄 Fetching file for viewing...');
      const res = await fetch("/api/verify/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, fileId })
      });

      if (!res.ok) {
        seterror("File not found or access denied");
        return;
      }

      const blob = await res.blob();
      const contentType = res.headers.get('Content-Type') || file?.contentType || 'application/pdf';
      
      console.log('📊 File details:', {
        size: blob.size,
        type: contentType
      });

      // Check if it's a PDF file
      if (contentType.includes('pdf') && pdfJsLoaded) {
        console.log('📋 Opening PDF in secure viewer...');
        setShowPDFViewer(true);
        // Load PDF using PDF.js directly instead of blob URL
        await loadPDFDocument(blob);
        
      } else {
        // For non-PDF files, you might want to implement similar secure viewing
        console.log('📄 Non-PDF files not supported in secure mode');
        seterror('Only PDF files can be viewed securely. Other file types are not supported.');
      }

    } catch (error) {
      console.error("View error:", error);
      seterror("Failed to open file for viewing");
    } finally {
      setloading(false);
    }
  };

// Navigation functions
 const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      renderPDFPage(nextPage);
    }
  }, [currentPage, totalPages, renderPDFPage]);

 const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      renderPDFPage(prevPage);
    }
  }, [currentPage, renderPDFPage]);

 const zoomIn = useCallback(() => {
    const newScale = Math.min(scale + 0.25, 3.0);
    setScale(newScale);
    // Re-render current page with new scale
    setTimeout(() => renderPDFPage(currentPage), 100);
  }, [scale, currentPage, renderPDFPage]);

const zoomOut = useCallback(() => {
    const newScale = Math.max(scale - 0.25, 0.5);
    setScale(newScale);
    // Re-render current page with new scale
    setTimeout(() => renderPDFPage(currentPage), 100);
  }, [scale, currentPage, renderPDFPage]);

// Updated closePDFViewer function
const closePDFViewer = () => {
  setShowPDFViewer(false);
  setPdfDocument(null);
  setCurrentPage(1);
  setTotalPages(0);
  setScale(1.0);
  setIsLoading(false);

  // Clear canvas
  if (canvasRef.current) {
    const context = canvasRef.current.getContext('2d');
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }
};


  return (
    <div>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-blue-100 p-6 font-sans">
        <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl w-full max-w-xl border border-gray-200">
          
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-800 mb-2">Verify File</h1>
            <p className="text-base sm:text-lg text-blue-500 px-2">
              Document Sharing & Direct Printing
            </p>
            {jsprintManagerReady && (
              <p className="text-sm text-green-600 mt-2">✅ Print system ready</p>
            )}
          </div>

          <div className="space-y-5 sm:space-y-6">
            {/* Step 1: OTP Entry */}
            <div className="border-2 border-blue-500 rounded-2xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-black-400 mb-4 text-center">
                STEP 1: ENTER OTP
              </h2>
              <form onSubmit={handleVerify}>
                <input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setotp(e.target.value)}
                  className="w-full px-4 sm:px-6 py-4 sm:py-5 text-xl sm:text-2xl border-2 border-blue-200 bg-blue-50 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-center font-mono tracking-widest text-blue-700 font-bold placeholder-slate-400 shadow-sm mb-4"
                  maxLength={6}
                  required
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className={`w-full py-4 sm:py-5 px-6 sm:px-8 font-bold text-lg sm:text-xl rounded-xl transition-all duration-200 shadow-md ${
                    loading || otp.length !== 6
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-lg transform hover:scale-105'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Verifying...
                    </span>
                  ) : (
                    '🔓 VERIFY & FETCH DOCUMENT'
                  )}
                </button>
              </form>
            </div>

            {/* Step 2: Printer Selection */}
            {file && mode === 'print' && showPrinterPopup && (
              <div className="border-2 border-blue-500 rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-black-400 mb-4 text-center">
                  STEP 2: SELECT PRINTER & PRINT
                </h2>

                {searchingPrinters ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                    <p className="text-blue-400 font-medium">🔍 Scanning for printers...</p>
                  </div>
                ) : (
                  <>
                    {/* Windows Print Dialog Option */}
                    <div className="mb-4">
                      <button
                        onClick={handlePrintWithDialog}
                        disabled={loading}
                        className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all duration-200"
                      >
                        🪟 Use Windows Print Dialog (Recommended)
                      </button>
                      <p className="text-xs text-gray-400 mt-1 text-center">
                        This will show the standard Windows print dialog
                      </p>
                    </div>

                    <div className="text-center text-gray-400 mb-4">- OR -</div>

                    <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                      {printers.map((printer, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                            selectedPrinter === printer.name
                              ? 'border-green-500 bg-green-900/30 shadow-lg'
                              : 'border-gray-600 hover:border-blue-400'
                          }`}
                          onClick={() => handlePrinterSelect(printer.name)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl">
                                {printer.type === 'virtual' ? '📄' : '🖨️'}
                              </div>
                              <div>
                                <p className="font-bold text-blue">{printer.name}</p>
                                <p
                                  className={`text-sm ${
                                    printer.type === 'virtual' ? 'text-yellow-300' : 'text-darkgreen-300'
                                  }`}
                                >
                                  {printer.reason}
                                </p>
                              </div>
                            </div>
                            {selectedPrinter === printer.name && (
                              <div className="text-green-400 text-xl">✅</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={resetForNewDocument}
                      className="px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl transition-all duration-200"
                    >
                      Cancel Print
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 sm:p-6">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl sm:text-3xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-amber-700 text-lg mb-2">Security Alert</h3>
                    <pre className="text-amber-600 text-sm sm:text-base whitespace-pre-wrap font-mono leading-relaxed">
                      {error}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* File Sharing Options */}
            {file && mode == 'share' && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleView}
                  className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all shadow-md"
                >
                  View
                </button>
                {access == 'download' && (
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-md"
                  >
                    Download
                  </button>
                )}
              </div>
            )}
            {/* PDF.js Secure Viewer Modal */}
{/* PDF.js Secure Viewer Modal */}
{showPDFViewer && (
  <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
    {/* Improved Secure Viewer Header */}
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-600 shadow-lg flex-shrink-0">
      <div className="flex items-center space-x-6">
        {/* Lock Icon with Glow */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400 rounded-full blur-sm opacity-50"></div>
            <div className="relative bg-amber-500 p-2 rounded-full">
              <svg className="w-5 h-5 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              Secure Document Viewer
            </h3>
            <p className="text-xs text-slate-400 -mt-1">Protected Mode Active</p>
          </div>
        </div>
        
        {/* Document Info */}
        <div className="hidden md:flex items-center space-x-3 pl-6 border-l border-slate-600">
          <div className="bg-slate-700 p-2 rounded-lg">
            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200 truncate max-w-48">
              {file?.fileName || 'Document.pdf'}
            </p>
            <p className="text-xs text-slate-400">View Only Mode • No Download</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {/* Page Navigation */}
        <div className="flex items-center space-x-2 bg-slate-800 bg-opacity-50 backdrop-blur-sm rounded-lg p-2 border border-slate-600">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-md transition-all duration-200 hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="bg-slate-700 px-3 py-2 rounded-md border border-slate-600">
            <span className="text-sm font-medium text-slate-200">
              {currentPage}
            </span>
            <span className="text-xs text-slate-400 mx-1">/</span>
            <span className="text-sm text-slate-300">
              {totalPages}
            </span>
          </div>
          
          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-md transition-all duration-200 hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center space-x-2 bg-slate-800 bg-opacity-50 backdrop-blur-sm rounded-lg p-2 border border-slate-600">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-md transition-all duration-200 hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          <div className="bg-slate-700 px-3 py-2 rounded-md border border-slate-600 min-w-16 text-center">
            <span className="text-sm font-medium text-slate-200">
              {Math.round(scale * 100)}%
            </span>
          </div>
          
          <button
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className="bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-md transition-all duration-200 hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        {/* Close Button */}
        <button
          onClick={closePDFViewer}
          className="bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-red-500/25 flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="hidden sm:inline">Close</span>
        </button>
      </div>
    </div>
    
    {/* PDF Content Area - Fixed */}
    <div className="flex-1 bg-gray-200 overflow-auto">
      <div className="min-h-full flex items-start justify-center p-4">
        <div className="relative bg-white shadow-2xl" style={{ 
          userSelect: 'none', 
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}>
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-blue-600 font-medium">Loading PDF...</p>
              </div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="block"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
              contextMenu: 'none',
              WebkitTouchCallout: 'none',
              WebkitUserDrag: 'none',
              KhtmlUserSelect: 'none'
            }}
          />
        </div>
      </div>
    </div>
    
    {/* Security Notice Footer */}
    <div className="bg-red-900 text-red-100 p-2 text-center text-sm flex-shrink-0">
      🔒 This document is in protected view mode. Printing, downloading, and copying are disabled for security.
    </div>
  </div>
)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component wrapped with Suspense
export default function Page() {
  return (
    <Suspense fallback={<div>Loading verification page...</div>}>
      <VerifyPageContent />
    </Suspense>
  );
}