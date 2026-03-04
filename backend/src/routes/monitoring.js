const express = require('express');
const { Op } = require('sequelize');
const { BiologicalMonitoring, User } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/monitoring
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, province, monitoringType, startDate, endDate, search } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (province) where.province = province;
    if (monitoringType) where.monitoringType = monitoringType;
    if (startDate || endDate) {
      where.surveyDate = {};
      if (startDate) where.surveyDate[Op.gte] = startDate;
      if (endDate) where.surveyDate[Op.lte] = endDate;
    }
    if (search) {
      where[Op.or] = [
        { siteName: { [Op.iLike]: `%${search}%` } },
        { community: { [Op.iLike]: `%${search}%` } },
        { surveyName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await BiologicalMonitoring.findAndCountAll({
      where,
      include: [{ model: User, as: 'submitter', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['surveyDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ records: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/monitoring/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const [total, byType, avgCoralCover, avgFishBiomass] = await Promise.all([
      BiologicalMonitoring.count(),
      BiologicalMonitoring.findAll({
        attributes: ['monitoringType', [BiologicalMonitoring.sequelize.fn('COUNT', '*'), 'count']],
        group: ['monitoringType'],
        raw: true,
      }),
      BiologicalMonitoring.findOne({
        attributes: [[BiologicalMonitoring.sequelize.fn('AVG', BiologicalMonitoring.sequelize.col('liveCoralCoverPct')), 'avgCoral']],
        raw: true,
      }),
      BiologicalMonitoring.findOne({
        attributes: [[BiologicalMonitoring.sequelize.fn('AVG', BiologicalMonitoring.sequelize.col('totalFishBiomassKg')), 'avgBiomass']],
        raw: true,
      }),
    ]);

    res.json({ total, byType, avgCoralCover: avgCoralCover?.avgCoral, avgFishBiomass: avgFishBiomass?.avgBiomass });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/monitoring/map
router.get('/map', protect, async (req, res) => {
  try {
    const records = await BiologicalMonitoring.findAll({
      attributes: ['id', 'siteName', 'monitoringType', 'province', 'island', 'community',
        'latitude', 'longitude', 'surveyDate', 'liveCoralCoverPct', 'totalFishBiomassKg', 'reefHealthScore'],
      where: {
        latitude: { [Op.not]: null },
        longitude: { [Op.not]: null },
      },
      raw: true,
    });
    res.json({ features: records });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/monitoring/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const record = await BiologicalMonitoring.findByPk(req.params.id, {
      include: [{ model: User, as: 'submitter', attributes: ['id', 'firstName', 'lastName', 'organization'] }],
    });
    if (!record) return res.status(404).json({ message: 'Monitoring record not found.' });
    res.json({ record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/monitoring
router.post('/', protect, async (req, res) => {
  try {
    const record = await BiologicalMonitoring.create({ ...req.body, submittedBy: req.user.id });
    res.status(201).json({ message: 'Monitoring record submitted.', record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/monitoring/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const record = await BiologicalMonitoring.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found.' });

    if (record.submittedBy !== req.user.id && !['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    await record.update(req.body);
    res.json({ record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/monitoring/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const record = await BiologicalMonitoring.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found.' });
    await record.destroy();
    res.json({ message: 'Record deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
