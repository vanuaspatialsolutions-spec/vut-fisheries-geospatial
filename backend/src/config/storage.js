const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const ALLOWED_EXTENSIONS = ['.zip', '.csv', '.shp', '.dbf', '.shx', '.prj', '.kml', '.geojson', '.json'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Supported: ZIP, CSV, Shapefile, KML, GeoJSON`), false);
  }
};

// Local disk storage (used when S3 is not configured)
const localStorageDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(localStorageDir)) fs.mkdirSync(localStorageDir, { recursive: true });

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = path.join(localStorageDir, req.body.dataType || 'general');
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

let s3Storage = null;
let s3Client = null;
let getPresignedUrl = null;
let deleteFromS3 = null;

if (process.env.AWS_S3_BUCKET) {
  const { S3Client, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  const multerS3 = require('multer-s3');

  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-southeast-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  s3Storage = multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname, uploadedBy: req.user?.id || 'anonymous' });
    },
    key: (req, file, cb) => {
      const folder = req.body.dataType || 'general';
      cb(null, `datasets/${folder}/${uuidv4()}${path.extname(file.originalname)}`);
    },
  });

  getPresignedUrl = async (key, expiresIn = 3600) => {
    const command = new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key });
    return getSignedUrl(s3Client, command, { expiresIn });
  };

  deleteFromS3 = async (key) => {
    const { DeleteObjectCommand: Del } = require('@aws-sdk/client-s3');
    return s3Client.send(new Del({ Bucket: process.env.AWS_S3_BUCKET, Key: key }));
  };
}

const upload = multer({
  storage: s3Storage || localStorage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

module.exports = { upload, getPresignedUrl, deleteFromS3, s3Client };
