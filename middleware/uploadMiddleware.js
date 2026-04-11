const multer = require('multer');
const path = require('path');
const fs = require('fs');

// BUG FIX: Use __dirname-based path so uploads/ is always created relative to
// this file, not process.cwd() which differs between environments.
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// BUG FIX: The regex-on-mimetype approach silently rejected Word documents
// because 'application/msword' doesn't match the regex /doc|docx/.
// Use an explicit MIME type allowlist instead.
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
    'application/msword',                                                   // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
]);

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return cb(null, true);
    }
    cb(new Error(`Unsupported file type: ${file.mimetype}. Only images, PDFs and Word documents are allowed.`));
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

module.exports = upload;
