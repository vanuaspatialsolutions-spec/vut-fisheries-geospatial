const express = require('express');
const { Op } = require('sequelize');
const { MarineArea, User } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/marine
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50, province, areaType, managementStatus, search } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (province) where.province = province;
    if (areaType) where.areaType = areaType;
    if (managementStatus) where.managementStatus = managementStatus;
    if (search) {
      where[Op.or] = [
        { areaName: { [Op.iLike]: `%${search}%` } },
        { community: { [Op.iLike]: `%${search}%` } },
        { island: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await MarineArea.findAndCountAll({
      where,
      include: [{ model: User, as: 'submitter', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ areas: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/marine/geojson  - all areas as GeoJSON FeatureCollection for map
router.get('/geojson', protect, async (req, res) => {
  try {
    const { province, areaType, managementStatus } = req.query;
    const where = {};
    if (province) where.province = province;
    if (areaType) where.areaType = areaType;
    if (managementStatus) where.managementStatus = managementStatus;

    const areas = await MarineArea.findAll({
      where,
      attributes: ['id', 'areaName', 'areaType', 'province', 'island', 'community',
        'areaSizeHa', 'managementStatus', 'protectionLevel', 'isCurrentlyOpen',
        'establishedYear', 'geometry'],
    });

    const featureCollection = {
      type: 'FeatureCollection',
      features: areas.map(area => ({
        type: 'Feature',
        id: area.id,
        geometry: area.geometry,
        properties: {
          id: area.id,
          areaName: area.areaName,
          areaType: area.areaType,
          province: area.province,
          island: area.island,
          community: area.community,
          areaSizeHa: area.areaSizeHa,
          managementStatus: area.managementStatus,
          protectionLevel: area.protectionLevel,
          isCurrentlyOpen: area.isCurrentlyOpen,
          establishedYear: area.establishedYear,
        },
      })),
    };

    res.json(featureCollection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/marine/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const [total, byType, totalAreaHa] = await Promise.all([
      MarineArea.count(),
      MarineArea.findAll({
        attributes: ['areaType', [MarineArea.sequelize.fn('COUNT', '*'), 'count']],
        group: ['areaType'],
        raw: true,
      }),
      MarineArea.findOne({
        attributes: [[MarineArea.sequelize.fn('SUM', MarineArea.sequelize.col('areaSizeHa')), 'totalHa']],
        raw: true,
      }),
    ]);

    res.json({ total, byType, totalAreaHa: totalAreaHa?.totalHa || 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/marine/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const area = await MarineArea.findByPk(req.params.id, {
      include: [{ model: User, as: 'submitter', attributes: ['id', 'firstName', 'lastName', 'organization'] }],
    });
    if (!area) return res.status(404).json({ message: 'Marine area not found.' });
    res.json({ area });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/marine
router.post('/', protect, async (req, res) => {
  try {
    const area = await MarineArea.create({ ...req.body, submittedBy: req.user.id });
    res.status(201).json({ message: 'Marine area recorded.', area });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/marine/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const area = await MarineArea.findByPk(req.params.id);
    if (!area) return res.status(404).json({ message: 'Marine area not found.' });

    if (area.submittedBy !== req.user.id && !['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    await area.update(req.body);
    res.json({ area });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/marine/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const area = await MarineArea.findByPk(req.params.id);
    if (!area) return res.status(404).json({ message: 'Marine area not found.' });
    await area.destroy();
    res.json({ message: 'Marine area deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
