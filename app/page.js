"use client";
import { useState,useRef } from "react";

export default function Home() {

  const fileInputRef=useRef(null);

  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("");
  const [access, setAccess] = useState("");
  const [publicId, setPublicId] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("")


  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      alert("Please select a file.");
      return;
    }

    const token = localStorage.getItem("safeshare_token");
    console.log("token upload",token)

    // Supported file types
    const supportedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // Add .docx
    ];

    if (!supportedTypes.includes(file.type)) {
      alert(
        "Unsupported file type! Please upload PDF, JPG, PNG, TXT, DOC, or DOCX."
      );
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
 if (mode === "share") {
  formData.append("access", access);
}

    setLoading(true);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
  console.log("data",data)
      if (res.ok) {
        setOtp(data.otp);
        setPublicId(data.publicId);

     
        if (data.token) {
          localStorage.setItem("safeshare_token", data.token);
          console.log("Token saved to localStorage");
        } else {
          console.warn(" Token not received from server");
        }
      } else {
        alert(data.error || "An error occurred during upload.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("An error occurred during upload. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const handleChooseFileClick=(e)=>{
     fileInputRef.current.click();
  }
  return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-sans">
      <form
        onSubmit={handleUpload}
        className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl w-full max-w-xl border border-gray-200"
      >
        <h2 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">
          Secure File Share
        </h2>

        

        {/* File Upload Section */}
        <div className="mb-8">
          <label className="block text-2xl font-semibold text-gray-800 mb-4">
            Upload Your File
          </label>
          <div
            className="w-full p-8 border-2 border-dashed border-gray-300 rounded-2xl text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition duration-300 ease-in-out flex flex-col items-center justify-center"
            onClick={handleChooseFileClick}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden" // Hide the actual file input
              accept=".pdf, image/jpeg, image/png, text/plain, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document" // Specify accepted file types
            />

            {file ? (
              <div className="flex flex-col items-center">
                <p className="text-xl font-medium text-gray-800 mb-2">
                  File Selected:
                </p>
                <p className="text-lg text-gray-600 truncate max-w-full">
                  {file.name}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent re-triggering file input
                    setFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = null; // Clear the input value
                    }
                  }}
                  className="mt-4 px-6 py-2 bg-red-500 text-white text-lg rounded-full shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition"
                >
                  Clear
                </button>
              </div>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-auto h-20 w-20 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-2xl font-semibold text-gray-800">
                  Tap to Choose File
                </p>
                <p className="mt-2 text-md text-gray-500">
                  PDF, Photos, Documents (up to 10MB)
                </p>
              </>
            )}
          </div>
        </div>

     
        <div className="mb-6">
          <label
            htmlFor="mode-select"
            className="block text-xl font-medium text-gray-800 mb-2"
          >
            Select Share Mode
          </label>
          <select
            id="mode-select"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            required
            className="w-full p-4 border border-gray-300 rounded-lg text-lg focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white pr-8"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 1rem center",
              backgroundSize: "1.5em",
            }}
          >
            <option value="">Choose an option</option>
            <option value="print">Print Only</option>
            <option value="share">Share (Link & OTP)</option>
          </select>
        </div>

       
        {mode === "share" && (
          <div className="mb-6">
            <label
              htmlFor="access-select"
              className="block text-xl font-medium text-gray-800 mb-2"
            >
              Access Level
            </label>
            <select
              id="access-select"
              value={access}
              onChange={(e) => setAccess(e.target.value)}
              required
              className="w-full p-4 border border-gray-300 rounded-lg text-lg focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white pr-8"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1rem center",
                backgroundSize: "1.5em",
              }}
            >
              <option value="">Select access level</option>
              <option value="view">View Only</option>
              <option value="download">View & Download</option>
            </select>
          </div>
        )}

        
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl text-xl transition duration-300 ease-in-out shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          disabled={loading || !file || !mode || (mode === 'share' && !access)}
        >
          {loading ? "Uploading..." : "Upload File"}
        </button>

     
        {otp && (
          <div className="mt-8 bg-green-50 p-6 rounded-xl text-center border border-green-200">
            <p className="text-xl font-semibold text-green-700 mb-2">
              🎉 File Uploaded Successfully!
            </p>
            <p className="text-2xl text-green-800">
              Your Secure OTP:{" "}
              <strong className="font-extrabold text-green-900">{otp}</strong>
            </p>
          </div>
        )}

        {/* Shareable Link and WhatsApp Share */}
        {otp && publicId && mode === "share" && (
          <div className="mt-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
            {/* File preview (assuming file.fileUrl is available after upload) */}
            {/* <div className="border rounded-lg p-4 mb-4">
              <img
                src={file.fileUrl} // This URL needs to come from the backend response
                alt="File preview"
                className="w-full max-h-64 object-contain rounded"
              />
            </div> */}

            <p className="mb-3 text-xl font-medium text-gray-800">
              🔗 Shareable Link:
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-6">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/verify?otp=${otp}&fileId=${publicId}`}
                id="share-link"
                className="border border-gray-300 px-4 py-3 rounded-lg w-full text-lg bg-gray-100 text-gray-700 truncate"
              />
              <button
                type="button"
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition"
                onClick={() => {
                  const link = document.getElementById("share-link").value;
                  navigator.clipboard.writeText(link);
                  alert("🔗 Link copied to clipboard!");
                }}
              >
                Copy Link
              </button>
            </div>

           
            <a
              className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl text-xl transition duration-300 ease-in-out shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
              href={`https://wa.me/?text=${encodeURIComponent(
                `Hi! I've shared a secure file with you. Click the link to access it:\n${window.location.origin}/verify?fileId=${publicId}\nYour OTP is: ${otp}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M.057 23.593l1.89-6.315C.794 15.022 0 13.57 0 12 0 5.373 5.373 0 12 0s12 5.373 12 12-5.373 12-12 12c-1.57 0-3.022-.794-3.593-1.89L.057 23.593zm7.904-4.887l-.508-.302c-.88-.528-1.545-1.168-1.996-1.868-.451-.7-.52-1.425-.2-2.112.32-.688.948-1.41 1.768-2.164.82-.756 1.777-1.412 2.768-1.921 1.096-.566 2.115-.83 3.125-.83 1.01 0 1.905.28 2.684.84.779.56 1.348 1.258 1.707 2.096.36.839.467 1.637.319 2.394-.148.757-.59 1.488-1.325 2.193-.734.706-1.688 1.253-2.862 1.642-1.174.389-2.585.584-4.23.584-1.253 0-2.457-.146-3.612-.44a9.923 9.923 0 01-3.11-.976l-.607-.286c-.52-.246-.867-.534-1.042-.862-.175-.328-.198-.67-.068-1.025.13-.355.45-.632.96-.83l.528-.216c.51-.204.99-.34 1.44-.41z" />
              </svg>
              Share via WhatsApp
            </a>
          </div>
        )}
      </form>
    </div>
  );
}
