const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { CommunitySurvey, MarineArea, BiologicalMonitoring, Dataset } = require('../models');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats — aggregated dashboard stats
router.get('/stats', protect, async (req, res) => {
  try {
    const [
      marineTotal,
      marineByType,
      marineTotalHa,
      surveyTotal,
      surveyByProvince,
      surveyTotals,
      monitoringTotal,
      monitoringAvgCoral,
      monitoringAvgHealth,
      datasetTotal,
      datasetPublished,
      recentSurveys,
      recentMonitoring,
    ] = await Promise.all([
      MarineArea.count(),
      MarineArea.findAll({
        attributes: ['areaType', [fn('COUNT', col('id')), 'count']],
        group: ['areaType'],
        raw: true,
      }),
      MarineArea.findOne({
        attributes: [[fn('SUM', col('areaSizeHa')), 'total']],
        raw: true,
      }),
      CommunitySurvey.count(),
      CommunitySurvey.findAll({
        attributes: ['province', [fn('COUNT', col('id')), 'count']],
        group: ['province'],
        raw: true,
      }),
      CommunitySurvey.findOne({
        attributes: [
          [fn('SUM', col('totalFishers')), 'totalFishers'],
          [fn('SUM', col('totalHouseholds')), 'totalHouseholds'],
        ],
        raw: true,
      }),
      BiologicalMonitoring.count(),
      BiologicalMonitoring.findOne({
        attributes: [[fn('AVG', col('liveCoralCoverPct')), 'avg']],
        raw: true,
      }),
      BiologicalMonitoring.findOne({
        attributes: [[fn('AVG', col('reefHealthScore')), 'avg']],
        raw: true,
      }),
      Dataset.count(),
      Dataset.count({ where: { status: 'published' } }),
      CommunitySurvey.findAll({
        attributes: ['id', 'community', 'province', 'surveyDate', 'surveyType', 'submittedBy'],
        order: [['createdAt', 'DESC']],
        limit: 5,
        raw: true,
      }),
      BiologicalMonitoring.findAll({
        attributes: ['id', 'siteName', 'province', 'surveyDate', 'monitoringType'],
        order: [['createdAt', 'DESC']],
        limit: 3,
        raw: true,
      }),
    ]);

    // Province metrics combining surveys + placeholder coral cover
    const provinceMetrics = surveyByProvince.map(p => ({
      province: p.province,
      surveys: parseInt(p.count),
      avgCoralCover: null,
    }));

    // KPI stats
    const lmmaCount = marineByType.find(t => t.areaType === 'lmma')?.count || 0;

    res.json({
      marine: {
        total: marineTotal,
        totalAreaHa: parseFloat(marineTotalHa?.total) || 0,
        activeLmmas: parseInt(lmmaCount),
        byType: marineByType,
      },
      surveys: {
        total: surveyTotal,
        totalFishers: parseInt(surveyTotals?.totalFishers) || 0,
        byProvince: surveyByProvince,
      },
      monitoring: {
        total: monitoringTotal,
        avgCoralCover: monitoringAvgCoral?.avg ? parseFloat(monitoringAvgCoral.avg).toFixed(1) : null,
        avgReefHealth: monitoringAvgHealth?.avg ? parseFloat(monitoringAvgHealth.avg).toFixed(1) : null,
      },
      datasets: {
        total: datasetTotal,
        published: datasetPublished,
      },
      provinceMetrics,
      recentActivity: [
        ...recentSurveys.map(s => ({
          type: 'survey',
          title: `${s.surveyType?.replace(/_/g, ' ')} — ${s.community}`,
          province: s.province,
          date: s.surveyDate,
          by: 'Field Officer',
        })),
        ...recentMonitoring.map(m => ({
          type: 'monitoring',
          title: `${m.monitoringType?.replace(/_/g, ' ')} — ${m.siteName}`,
          province: m.province,
          date: m.surveyDate,
          by: 'Field Officer',
        })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
