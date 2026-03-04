# File Storage Migration to MongoDB (Vercel-Ready)

## Overview
This app has been migrated from local file system storage to MongoDB-based base64 storage, making it fully compatible with Vercel's serverless environment.

---

## What Changed

### ✅ Backend Changes

1. **Removed Multer Dependency**
   - No longer using `multer` for file uploads
   - Removed from `package.json`
   - All file handling now uses base64 encoding

2. **Updated Models**
   - **Employee Model**: `avatar` field now stores base64 data URLs (e.g., `data:image/png;base64,iVBORw0KG...`)
   - **Vendor Model**: `documents` array now stores base64 data instead of file paths
     ```javascript
     documents: [
       {
         name: String,        // Original filename
         data: String,        // Base64 data URL
         size: Number,        // File size in bytes
         type: String,        // MIME type
         uploadedAt: Date
       }
     ]
     ```

3. **Updated API Endpoints**

   **Employee Avatar Upload** (`PUT /api/hr/employees/:id`)
   - Before: Accepted `multipart/form-data` with file
   - After: Accepts JSON with base64 `avatar` field
   ```json
   {
     "avatar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
   }
   ```

   **Vendor Document Upload** (`POST /api/vendors`, `PUT /api/vendors/:id`)
   - Before: Accepted `multipart/form-data` with files array
   - After: Accepts JSON with base64 `documents` array
   ```json
   {
     "companyName": "Acme Corp",
     "documents": [
       {
         "name": "contract.pdf",
         "data": "data:application/pdf;base64,JVBERi0xLjQKJ..."
       }
     ]
   }
   ```

4. **New Endpoints**
   - `GET /api/vendors/:id/documents/:docIndex` - Retrieve specific document
   - `DELETE /api/vendors/:id/documents/:docIndex` - Delete specific document

5. **File Validation**
   - New `validateBase64File()` helper function
   - Validates MIME types, file sizes, and data integrity
   - **Avatar limits**: 2MB, images only (jpeg, png, gif, webp)
   - **Document limits**: 5MB, documents/images (pdf, doc, docx, jpeg, png)

---

## Frontend Migration Guide

### Converting Files to Base64

```javascript
// Helper function to convert File to base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// Example: Avatar upload
const handleAvatarUpload = async (event) => {
  const file = event.target.files[0];
  
  if (file) {
    try {
      const base64 = await fileToBase64(file);
      
      // Send to API
      const response = await axios.put(`/api/hr/employees/${employeeId}`, {
        avatar: base64
      });
      
      console.log('Avatar uploaded:', response.data);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }
};

// Example: Multiple document upload
const handleDocumentUpload = async (files) => {
  try {
    const documentsPromises = Array.from(files).map(async (file) => ({
      name: file.name,
      data: await fileToBase64(file)
    }));
    
    const documents = await Promise.all(documentsPromises);
    
    // Send to API
    const response = await axios.post('/api/vendors', {
      companyName: 'Acme Corp',
      documents: documents
    });
    
    console.log('Vendor created:', response.data);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Displaying Base64 Images/Documents

```javascript
// Display avatar directly
<img src={employee.avatar} alt="Avatar" />

// Download document
const downloadDocument = (document) => {
  const link = document.createElement('a');
  link.href = document.data;
  link.download = document.name;
  link.click();
};

// Display PDF in iframe
<iframe src={document.data} width="100%" height="500px" />
```

---

## Deployment to Vercel

### Prerequisites
1. MongoDB Atlas account (or any cloud MongoDB)
2. Vercel account
3. Environment variables configured

### Environment Variables (Set in Vercel Dashboard)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
FRONTEND_URL=https://your-frontend.vercel.app
PORT=4000
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
JWT_SECRET=your-secret-key-here
```

### Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Migrate to MongoDB file storage for Vercel compatibility"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Configure environment variables
   - Deploy!

3. **Verify Deployment**
   - Check deployment logs
   - Test file uploads through your frontend
   - Monitor function execution times

### Vercel Configuration (`vercel.json`)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.js",
      "use": "@vercel/node",
      "config": {
        "maxLambdaSize": "50mb"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server/index.js"
    }
  ],
  "functions": {
    "server/index.js": {
      "memory": 3008,
      "maxDuration": 60
    }
  }
}
```

---

## Important Limitations

### ⚠️ Features That Don't Work on Vercel

1. **WebSocket/Socket.IO** - Removed or use alternative (Pusher, Ably)
2. **Scheduled Tasks** - Use Vercel Cron Jobs instead
3. **Local File System** - Now using MongoDB (✅ Fixed!)
4. **Long-Running Processes** - 60s max execution time

### 💡 Recommendations

1. **File Size Limits**
   - Keep files under 5MB for optimal performance
   - Consider using cloud storage (S3, Cloudinary) for very large files
   - MongoDB documents have 16MB BSON limit

2. **Base64 Overhead**
   - Base64 encoding increases size by ~33%
   - 5MB file → ~6.7MB base64 string
   - Impact on bandwidth and storage

3. **Performance**
   - First request may be slow (cold start)
   - Subsequent requests are faster (warm instances)
   - Consider pagination for large document lists

---

## Testing Locally

```bash
# Install dependencies (multer removed)
cd server
npm install

# Run server
npm start

# Test endpoints
curl -X PUT http://localhost:4000/api/hr/employees/123 \\
  -H "Content-Type: application/json" \\
  -d '{"avatar": "data:image/png;base64,iVBORw0KGg..."}'
```

---

## Rollback Plan

If you need to rollback to file system storage:

```bash
git revert HEAD
npm install  # Reinstalls multer
```

---

## MongoDB Storage Considerations

### Pros ✅
- Works on Vercel serverless
- No file system dependencies
- Automatic backups with MongoDB Atlas
- Simple deployment

### Cons ⚠️
- 16MB document size limit (BSON)
- Larger database size (~33% overhead)
- Higher bandwidth usage
- May need optimization for many/large files

### Alternative: GridFS (for files >16MB)
If you need to store files larger than 16MB, consider using MongoDB GridFS:
- Splits files into chunks
- No 16MB limit
- More complex implementation
- Better for large media files

---

## Support

For issues or questions:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test MongoDB connection
4. Review file size limits

**Happy deploying! 🚀**
