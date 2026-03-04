const express = require('express');
const { Op } = require('sequelize');
const { CommunitySurvey, User } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/surveys
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, province, island, surveyType, startDate, endDate, search } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (province) where.province = province;
    if (island) where.island = island;
    if (surveyType) where.surveyType = surveyType;
    if (startDate || endDate) {
      where.surveyDate = {};
      if (startDate) where.surveyDate[Op.gte] = startDate;
      if (endDate) where.surveyDate[Op.lte] = endDate;
    }
    if (search) {
      where[Op.or] = [
        { community: { [Op.iLike]: `%${search}%` } },
        { lmmaName: { [Op.iLike]: `%${search}%` } },
        { surveyorName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await CommunitySurvey.findAndCountAll({
      where,
      include: [{ model: User, as: 'submitter', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['surveyDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ surveys: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/surveys/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const [total, byProvince, byType] = await Promise.all([
      CommunitySurvey.count(),
      CommunitySurvey.findAll({
        attributes: ['province', [CommunitySurvey.sequelize.fn('COUNT', '*'), 'count']],
        group: ['province'],
        raw: true,
      }),
      CommunitySurvey.findAll({
        attributes: ['surveyType', [CommunitySurvey.sequelize.fn('COUNT', '*'), 'count']],
        group: ['surveyType'],
        raw: true,
      }),
    ]);

    const totals = await CommunitySurvey.findOne({
      attributes: [
        [CommunitySurvey.sequelize.fn('SUM', CommunitySurvey.sequelize.col('totalFishers')), 'totalFishers'],
        [CommunitySurvey.sequelize.fn('SUM', CommunitySurvey.sequelize.col('totalHouseholds')), 'totalHouseholds'],
        [CommunitySurvey.sequelize.fn('COUNT', CommunitySurvey.sequelize.col('hasCBFMCommittee')), 'withCommittee'],
      ],
      raw: true,
    });

    res.json({ total, byProvince, byType, totals });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/surveys/map  - geolocation data for map rendering
router.get('/map', protect, async (req, res) => {
  try {
    const surveys = await CommunitySurvey.findAll({
      attributes: ['id', 'community', 'province', 'island', 'latitude', 'longitude', 'surveyDate', 'surveyType', 'totalFishers', 'hasCBFMCommittee'],
      where: {
        latitude: { [Op.not]: null },
        longitude: { [Op.not]: null },
      },
      raw: true,
    });
    res.json({ features: surveys });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/surveys/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const survey = await CommunitySurvey.findByPk(req.params.id, {
      include: [{ model: User, as: 'submitter', attributes: ['id', 'firstName', 'lastName', 'organization'] }],
    });
    if (!survey) return res.status(404).json({ message: 'Survey not found.' });
    res.json({ survey });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/surveys
router.post('/', protect, async (req, res) => {
  try {
    const survey = await CommunitySurvey.create({ ...req.body, submittedBy: req.user.id });
    res.status(201).json({ message: 'Survey submitted.', survey });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/surveys/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const survey = await CommunitySurvey.findByPk(req.params.id);
    if (!survey) return res.status(404).json({ message: 'Survey not found.' });

    if (survey.submittedBy !== req.user.id && !['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    await survey.update(req.body);
    res.json({ survey });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/surveys/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const survey = await CommunitySurvey.findByPk(req.params.id);
    if (!survey) return res.status(404).json({ message: 'Survey not found.' });
    await survey.destroy();
    res.json({ message: 'Survey deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
