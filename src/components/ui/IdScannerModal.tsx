'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, Upload, CheckCircle2, AlertCircle, Loader2, ScanLine, RefreshCw, Zap } from 'lucide-react';
import { parseBarcodeValue, prnToEmail } from '@/lib/barcodeParser';

interface IdScannerModalProps {
  onScanSuccess: (prn: string, email: string) => void;
  onClose: () => void;
}

type ScanTab = 'webcam' | 'upload';
type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export default function IdScannerModal({ onScanSuccess, onClose }: IdScannerModalProps) {
  const [activeTab, setActiveTab] = useState<ScanTab>('webcam');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanResult, setScanResult] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [manualPRN, setManualPRN] = useState('');
  const [isLibLoaded, setIsLibLoaded] = useState(false);

  const scannerRef = useRef<any>(null);
  const scannerDivId = 'id-card-qr-reader';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamically load html5-qrcode (client-only)
  useEffect(() => {
    import('html5-qrcode').then(() => setIsLibLoaded(true));
    return () => { void stopScanner(); };
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) {}
      scannerRef.current = null;
    }
  }, []);

  const handleScanSuccess = useCallback((decodedText: string) => {
    stopScanner();
    const { prn } = parseBarcodeValue(decodedText);
    if (prn) {
      setScanResult(prn);
      setScanState('success');
    } else {
      setErrorMsg(`Could not extract PRN from scanned code: "${decodedText}". Please confirm manually.`);
      setScanState('error');
    }
  }, [stopScanner]);

  // Start webcam scanner supporting 1D barcodes and 2D QR codes
  const startWebcamScanner = useCallback(async () => {
    if (!isLibLoaded) return;
    await stopScanner();
    setScanState('scanning');
    setErrorMsg('');

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.PDF_417,
      ];

      const scanner = new Html5Qrcode(scannerDivId, { formatsToSupport, verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => ({
            width: Math.floor(viewfinderWidth * 0.85),
            height: Math.floor(viewfinderHeight * 0.65),
          }),
        },
        (decoded) => handleScanSuccess(decoded),
        () => {} // frame error handler
      );
    } catch (err: any) {
      setScanState('error');
      setErrorMsg(
        err?.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access in your browser.'
          : 'Could not initialize camera. Try uploading an ID card image or enter PRN manually.'
      );
    }
  }, [isLibLoaded, stopScanner, handleScanSuccess]);

  useEffect(() => {
    if (activeTab !== 'webcam') stopScanner();
  }, [activeTab, stopScanner]);

  // Handle ID Card image upload scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isLibLoaded) return;

    setScanState('scanning');
    setErrorMsg('');

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.PDF_417,
      ];

      const scanner = new Html5Qrcode('img-upload-reader', { formatsToSupport, verbose: false });
      const result = await scanner.scanFile(file, true);
      scanner.clear();
      handleScanSuccess(result);
    } catch (err) {
      // Fallback: search image filename for PRN or prompt manual entry
      const filenameMatch = file.name.match(/([A-Z0-9]{6,15})/i);
      if (filenameMatch) {
        handleScanSuccess(filenameMatch[1]);
      } else {
        setScanState('error');
        setErrorMsg('Barcode not detected in image. Make sure the barcode is well-lit and clearly visible.');
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDemoScan = () => {
    const demoPRNs = ['RBT25CS173', 'COMP2021089', 'IT2021045'];
    const randomPRN = demoPRNs[Math.floor(Math.random() * demoPRNs.length)];
    handleScanSuccess(randomPRN);
  };

  const handleConfirm = () => {
    const prn = scanResult || manualPRN.trim().toUpperCase();
    if (!prn) return;
    onScanSuccess(prn, prnToEmail(prn));
    onClose();
  };

  const handleReset = () => {
    setScanState('idle');
    setScanResult('');
    setErrorMsg('');
    setManualPRN('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25">
              <ScanLine className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Scan College ID Card</h2>
              <p className="text-[10px] text-slate-400">Extracts PRN / Roll Number automatically</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 border-b border-slate-800 bg-slate-900/30">
          {(['webcam', 'upload'] as ScanTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                handleReset();
              }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-all border-b-2 ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'webcam' ? <Camera className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
              {tab === 'webcam' ? 'Live Webcam' : 'Upload Image'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Hidden div for html5-qrcode image scanner */}
          <div id="img-upload-reader" className="hidden" />

          {/* ── WEBCAM TAB ── */}
          {activeTab === 'webcam' && (
            <div className="space-y-3">
              {scanState !== 'success' && (
                <div
                  id={scannerDivId}
                  className="w-full min-h-[200px] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-600 text-xs relative"
                >
                  {scanState !== 'scanning' && (
                    <div className="flex flex-col items-center gap-2 text-slate-500 p-4 text-center">
                      <Camera className="h-8 w-8 text-blue-400/80" />
                      <span>Point your ID Card barcode toward the camera</span>
                    </div>
                  )}
                </div>
              )}

              {scanState === 'idle' && (
                <button
                  onClick={startWebcamScanner}
                  disabled={!isLibLoaded}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20"
                >
                  {!isLibLoaded ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading scanner library…
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" /> Start Camera
                    </>
                  )}
                </button>
              )}

              {scanState === 'scanning' && (
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-medium">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning barcode…
                  </div>
                  <button
                    onClick={handleDemoScan}
                    className="text-[10px] text-slate-400 hover:text-blue-300 flex items-center gap-1 font-semibold underline"
                  >
                    <Zap className="h-3 w-3 text-amber-400" /> Test Demo ID
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── UPLOAD TAB ── */}
          {activeTab === 'upload' && scanState !== 'success' && (
            <div className="space-y-3">
              <label
                htmlFor="id-card-upload"
                className="flex flex-col items-center justify-center gap-3 w-full min-h-[170px] rounded-xl border-2 border-dashed border-slate-700 hover:border-blue-500/60 bg-slate-900 hover:bg-slate-900/80 cursor-pointer transition-all group"
              >
                <div className="p-3 rounded-full bg-slate-800 group-hover:bg-blue-500/10 transition-colors">
                  <Upload className="h-6 w-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-medium text-slate-300">Click to upload ID card photo</p>
                  <p className="text-xs text-slate-500 mt-1">JPG, PNG, WEBP · Supports 1D Barcode & QR Code</p>
                </div>
                {scanState === 'scanning' && (
                  <div className="flex items-center gap-2 text-blue-400 text-xs">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing ID card barcode…
                  </div>
                )}
              </label>
              <input
                id="id-card-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* ── SUCCESS STATE ── */}
          {scanState === 'success' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs text-emerald-300 font-semibold">PRN Successfully Detected!</p>
                  <p className="text-lg font-black text-white tracking-widest mt-0.5">{scanResult}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">Mapped Email: {prnToEmail(scanResult)}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── ERROR STATE ── */}
          {scanState === 'error' && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ── MANUAL FALLBACK INPUT ── */}
          {(scanState === 'error' || scanState === 'idle') && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-400">Enter PRN / Roll Number Manually</label>
                <button
                  type="button"
                  onClick={handleDemoScan}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                >
                  <Zap className="h-3 w-3" /> Auto-Fill Demo PRN
                </button>
              </div>
              <input
                type="text"
                value={manualPRN}
                onChange={(e) => setManualPRN(e.target.value.toUpperCase())}
                placeholder="e.g. RBT25CS173 or COMP2021089"
                maxLength={15}
                className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg p-2.5 text-sm text-slate-200 font-mono tracking-widest focus:outline-none transition-colors placeholder:font-sans placeholder:tracking-normal"
              />
            </div>
          )}

          {/* ── ACTION BUTTONS ── */}
          <div className="flex gap-2 pt-1">
            {(scanState === 'success' || manualPRN.length >= 5) && (
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                Use {scanResult || manualPRN.toUpperCase()}
              </button>
            )}
            {(scanState === 'success' || scanState === 'error') && (
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 text-sm transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
