// File Upload Helper for MongoDB Base64 Storage
// Use this in your React components

import { useState } from 'react';

/**
 * Convert a File object to base64 data URL
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 data URL
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Validate file size
 * @param {File} file - The file to validate
 * @param {number} maxSizeMB - Maximum size in megabytes
 * @returns {boolean}
 */
export const validateFileSize = (file, maxSizeMB) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Validate file type
 * @param {File} file - The file to validate
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {boolean}
 */
export const validateFileType = (file, allowedTypes) => {
  return allowedTypes.includes(file.type);
};

// ==================== EXAMPLE USAGE ====================

// Example 1: Avatar Upload for Employee
export const uploadEmployeeAvatar = async (employeeId, avatarFile) => {
  // Validate
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!validateFileType(avatarFile, allowedTypes)) {
    throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.');
  }
  
  if (!validateFileSize(avatarFile, 2)) {
    throw new Error('File size exceeds 2MB limit.');
  }
  
  // Convert to base64
  const base64Avatar = await fileToBase64(avatarFile);
  
  // Send to API
  const response = await fetch(`/api/hr/employees/${employeeId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      // Add auth token if needed
      // 'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      avatar: base64Avatar
    })
  });
  
  if (!response.ok) {
    throw new Error('Avatar upload failed');
  }
  
  return response.json();
};

// Example 2: Multiple Document Upload for Vendor
export const uploadVendorDocuments = async (vendorId, documentFiles) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ];
  
  // Validate all files
  for (const file of documentFiles) {
    if (!validateFileType(file, allowedTypes)) {
      throw new Error(`Invalid file type: ${file.name}`);
    }
    
    if (!validateFileSize(file, 5)) {
      throw new Error(`File too large: ${file.name} (max 5MB)`);
    }
  }
  
  // Convert all files to base64
  const documents = await Promise.all(
    Array.from(documentFiles).map(async (file) => ({
      name: file.name,
      data: await fileToBase64(file)
    }))
  );
  
  // Send to API (for update endpoint)
  const response = await fetch(`/api/vendors/${vendorId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documents: documents
    })
  });
  
  if (!response.ok) {
    throw new Error('Document upload failed');
  }
  
  return response.json();
};

// Example 3: Create Vendor with Documents
export const createVendorWithDocuments = async (vendorData, documentFiles) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ];
  
  let documents = [];
  
  if (documentFiles && documentFiles.length > 0) {
    // Validate all files
    for (const file of documentFiles) {
      if (!validateFileType(file, allowedTypes)) {
        throw new Error(`Invalid file type: ${file.name}`);
      }
      
      if (!validateFileSize(file, 5)) {
        throw new Error(`File too large: ${file.name} (max 5MB)`);
      }
    }
    
    // Convert all files to base64
    documents = await Promise.all(
      Array.from(documentFiles).map(async (file) => ({
        name: file.name,
        data: await fileToBase64(file)
      }))
    );
  }
  
  // Send to API
  const response = await fetch('/api/vendors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...vendorData,
      documents: documents
    })
  });
  
  if (!response.ok) {
    throw new Error('Vendor creation failed');
  }
  
  return response.json();
};

// Example 4: Download Vendor Document
export const downloadVendorDocument = async (vendorId, documentIndex, fileName) => {
  const response = await fetch(`/api/vendors/${vendorId}/documents/${documentIndex}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch document');
  }
  
  const { data } = await response.json();
  const document = data.data;
  
  // Create download link
  const link = document.createElement('a');
  link.href = document.data;
  link.download = fileName || document.name || 'document';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Example 5: Display Avatar
export const AvatarDisplay = ({ employee }) => {
  return (
    <div className="avatar-container">
      {employee.avatar ? (
        <img 
          src={employee.avatar} 
          alt={employee.name} 
          className="w-24 h-24 rounded-full object-cover"
        />
      ) : (
        <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
          <span className="text-2xl text-gray-600">
            {employee.name.charAt(0)}
          </span>
        </div>
      )}
    </div>
  );
};

// Example 6: File Input Component
export const FileUploadInput = ({ onFileSelect, accept, maxSizeMB, multiple = false }) => {
  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    
    // Validate files
    for (const file of files) {
      if (!validateFileSize(file, maxSizeMB)) {
        alert(`File ${file.name} exceeds ${maxSizeMB}MB limit`);
        return;
      }
    }
    
    // Convert to base64
    if (multiple) {
      const base64Files = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          data: await fileToBase64(file),
          size: file.size,
          type: file.type
        }))
      );
      onFileSelect(base64Files);
    } else {
      const base64 = await fileToBase64(files[0]);
      onFileSelect(base64);
    }
  };
  
  return (
    <input
      type="file"
      accept={accept}
      multiple={multiple}
      onChange={handleFileChange}
      className="file-input"
    />
  );
};

// Example 7: React Hook for File Upload
export const useFileUpload = (maxSizeMB = 5) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  
  const uploadFile = async (file, allowedTypes) => {
    setUploading(true);
    setError(null);
    
    try {
      // Validate
      if (allowedTypes && !validateFileType(file, allowedTypes)) {
        throw new Error('Invalid file type');
      }
      
      if (!validateFileSize(file, maxSizeMB)) {
        throw new Error(`File exceeds ${maxSizeMB}MB limit`);
      }
      
      // Convert to base64
      const base64 = await fileToBase64(file);
      
      setUploading(false);
      return base64;
    } catch (err) {
      setError(err.message);
      setUploading(false);
      throw err;
    }
  };
  
  return { uploadFile, uploading, error };
};

// ==================== USAGE IN COMPONENT ====================

/*
import { uploadEmployeeAvatar, useFileUpload, FileUploadInput } from './fileUploadHelper';

const EmployeeProfile = ({ employee }) => {
  const { uploadFile, uploading } = useFileUpload(2); // 2MB limit
  
  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    
    if (file) {
      try {
        const base64 = await uploadFile(file, [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp'
        ]);
        
        await uploadEmployeeAvatar(employee._id, file);
        
        toast.success('Avatar uploaded successfully!');
      } catch (error) {
        toast.error(error.message);
      }
    }
  };
  
  return (
    <div>
      <img src={employee.avatar} alt={employee.name} />
      
      <input
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        disabled={uploading}
      />
      
      {uploading && <p>Uploading...</p>}
    </div>
  );
};
*/
