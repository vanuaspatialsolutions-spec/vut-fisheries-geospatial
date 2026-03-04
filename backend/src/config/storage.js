const { S3Client, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const ALLOWED_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'text/csv',
  'application/vnd.ms-excel',
  'application/octet-stream', // shapefiles
  'application/vnd.google-earth.kml+xml',
  'application/json',
  'text/plain',
];

const ALLOWED_EXTENSIONS = ['.zip', '.csv', '.shp', '.dbf', '.shx', '.prj', '.kml', '.geojson', '.json'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Supported: ZIP, CSV, Shapefile, KML, GeoJSON`), false);
  }
};

// S3 storage for production
const s3Storage = multerS3({
  s3: s3Client,
  bucket: process.env.AWS_S3_BUCKET,
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname, uploadedBy: req.user?.id || 'anonymous' });
  },
  key: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    const folder = req.body.dataType || 'general';
    cb(null, `datasets/${folder}/${uniqueName}`);
  },
});

// Local storage for development
const localStorageDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(localStorageDir)) fs.mkdirSync(localStorageDir, { recursive: true });

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = path.join(localStorageDir, req.body.dataType || 'general');
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: process.env.NODE_ENV === 'production' ? s3Storage : localStorage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

const getPresignedUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
};

const deleteFromS3 = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });
  return s3Client.send(command);
};

module.exports = { upload, getPresignedUrl, deleteFromS3, s3Client };
