const express = require('express');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { Dataset, User } = require('../models');
const { protect, adminOnly, staffOrAdmin } = require('../middleware/auth');
const { upload, getPresignedUrl, deleteFromS3 } = require('../config/storage');

const router = express.Router();

// GET /api/datasets  - list datasets (published for all, all for admin/staff)
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, dataType, province, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    // Non-admins only see published datasets
    if (!['admin', 'staff'].includes(req.user.role)) {
      where.status = 'published';
    } else if (status) {
      where.status = status;
    }

    if (dataType) where.dataType = dataType;
    if (province) where.province = province;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { community: { [Op.iLike]: `%${search}%` } },
        { lmmaName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Dataset.findAndCountAll({
      where,
      include: [{ model: User, as: 'uploader', attributes: ['id', 'firstName', 'lastName', 'organization'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      datasets: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/datasets/map  - list published GeoJSON datasets for map display
router.get('/map', protect, async (req, res) => {
  try {
    const datasets = await Dataset.findAll({
      where: { status: 'published', fileFormat: 'geojson' },
      attributes: ['id', 'title', 'dataType', 'province', 'community', 'fileSize'],
      order: [['publishedAt', 'DESC']],
    });
    res.json({ datasets });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/datasets/stats  - summary stats
router.get('/stats', protect, async (req, res) => {
  try {
    const [total, published, draft, byType] = await Promise.all([
      Dataset.count(),
      Dataset.count({ where: { status: 'published' } }),
      Dataset.count({ where: { status: 'draft' } }),
      Dataset.findAll({
        attributes: ['dataType', [Dataset.sequelize.fn('COUNT', '*'), 'count']],
        group: ['dataType'],
        raw: true,
      }),
    ]);

    res.json({ total, published, draft, byType });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/datasets/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const dataset = await Dataset.findByPk(req.params.id, {
      include: [{ model: User, as: 'uploader', attributes: ['id', 'firstName', 'lastName', 'organization'] }],
    });
    if (!dataset) return res.status(404).json({ message: 'Dataset not found.' });

    if (!['admin', 'staff'].includes(req.user.role) && dataset.status !== 'published') {
      return res.status(403).json({ message: 'Dataset not yet published.' });
    }

    res.json({ dataset });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/datasets/upload  - upload a dataset file
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    const {
      title, description, dataType, collectionDate, collectionEndDate,
      province, island, community, lmmaName, coordinatorName, coordinatorContact,
      methodology, tags, notes,
    } = req.body;

    const filePath = req.file.key || req.file.path; // S3 key or local path
    const fileExt = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const formatMap = { zip: 'zip', shp: 'shapefile', dbf: 'shapefile', csv: 'csv', kml: 'kml', geojson: 'geojson', json: 'geojson' };

    const dataset = await Dataset.create({
      title: title || req.file.originalname,
      description,
      dataType: dataType || 'other',
      fileFormat: formatMap[fileExt] || 'other',
      fileName: req.file.originalname,
      fileSize: req.file.size,
      filePath,
      collectionDate,
      collectionEndDate,
      province,
      island,
      community,
      lmmaName,
      coordinatorName,
      coordinatorContact,
      methodology,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      notes,
      uploadedBy: req.user.id,
      status: 'draft',
    });

    res.status(201).json({ message: 'Dataset uploaded successfully.', dataset });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/datasets/:id  - update metadata
router.put('/:id', protect, async (req, res) => {
  try {
    const dataset = await Dataset.findByPk(req.params.id);
    if (!dataset) return res.status(404).json({ message: 'Dataset not found.' });

    // Owner or admin can update
    if (dataset.uploadedBy !== req.user.id && !['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    const {
      title, description, dataType, collectionDate, collectionEndDate,
      province, island, community, lmmaName, coordinatorName, coordinatorContact,
      methodology, tags, notes, bboxMinLng, bboxMinLat, bboxMaxLng, bboxMaxLat,
    } = req.body;

    await dataset.update({
      title, description, dataType, collectionDate, collectionEndDate,
      province, island, community, lmmaName, coordinatorName, coordinatorContact,
      methodology, tags, notes, bboxMinLng, bboxMinLat, bboxMaxLng, bboxMaxLat,
    });

    res.json({ dataset });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/datasets/:id/publish  - admin publishes a dataset
router.put('/:id/publish', protect, staffOrAdmin, async (req, res) => {
  try {
    const dataset = await Dataset.findByPk(req.params.id);
    if (!dataset) return res.status(404).json({ message: 'Dataset not found.' });

    await dataset.update({ status: 'published', publishedAt: new Date(), publishedBy: req.user.id });
    res.json({ message: 'Dataset published.', dataset });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/datasets/:id/unpublish  - admin unpublishes
router.put('/:id/unpublish', protect, staffOrAdmin, async (req, res) => {
  try {
    const dataset = await Dataset.findByPk(req.params.id);
    if (!dataset) return res.status(404).json({ message: 'Dataset not found.' });

    await dataset.update({ status: 'draft', publishedAt: null, publishedBy: null });
    res.json({ message: 'Dataset unpublished.', dataset });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/datasets/:id/review  - submit for review
router.put('/:id/review', protect, async (req, res) => {
  try {
    const dataset = await Dataset.findByPk(req.params.id);
    if (!dataset) return res.status(404).json({ message: 'Dataset not found.' });

    if (dataset.uploadedBy !== req.user.id && !['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    await dataset.update({ status: 'under_review' });
    res.json({ message: 'Dataset submitted for review.', dataset });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/datasets/:id/download  - download a dataset
router.get('/:id/download', protect, async (req, res) => {
  try {
    const dataset = await Dataset.findByPk(req.params.id);
    if (!dataset) return res.status(404).json({ message: 'Dataset not found.' });

    if (!['admin', 'staff'].includes(req.user.role) && dataset.status !== 'published') {
      return res.status(403).json({ message: 'Dataset not available for download.' });
    }

    await dataset.increment('downloadCount');

    if (process.env.NODE_ENV === 'production') {
      // Return presigned S3 URL
      const url = await getPresignedUrl(dataset.filePath, 300);
      res.json({ downloadUrl: url, fileName: dataset.fileName });
    } else {
      // Serve local file
      const filePath = dataset.filePath;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found on server.' });
      }
      res.download(filePath, dataset.fileName);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/datasets/:id/geojson  - serve GeoJSON content for map display
router.get('/:id/geojson', protect, async (req, res) => {
  try {
    const dataset = await Dataset.findByPk(req.params.id);
    if (!dataset) return res.status(404).json({ message: 'Dataset not found.' });
    if (dataset.fileFormat !== 'geojson') return res.status(400).json({ message: 'Not a GeoJSON dataset.' });

    if (!['admin', 'staff'].includes(req.user.role) && dataset.status !== 'published') {
      return res.status(403).json({ message: 'Dataset not yet published.' });
    }

    if (process.env.AWS_S3_BUCKET) {
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      const { s3Client: s3 } = require('../config/storage');
      const command = new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: dataset.filePath });
      const { Body } = await s3.send(command);
      const chunks = [];
      for await (const chunk of Body) chunks.push(chunk);
      res.json(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    } else {
      if (!fs.existsSync(dataset.filePath)) return res.status(404).json({ message: 'File not found.' });
      res.json(JSON.parse(fs.readFileSync(dataset.filePath, 'utf8')));
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/datasets/:id  - admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const dataset = await Dataset.findByPk(req.params.id);
    if (!dataset) return res.status(404).json({ message: 'Dataset not found.' });

    if (process.env.NODE_ENV === 'production') {
      await deleteFromS3(dataset.filePath);
    } else {
      if (fs.existsSync(dataset.filePath)) fs.unlinkSync(dataset.filePath);
    }

    await dataset.destroy();
    res.json({ message: 'Dataset deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
