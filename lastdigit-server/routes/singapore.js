const express = require('express');
const router = express.Router();
const path = require('path');
const { SingaporeLottery, SESSIONS } = require('../models');
const { protect, optionalAuth, adminOnly } = require('../middleware/auth');
const { uploadSingapore } = require('../middleware/upload');
const { formatDate, buildResultSets } = require('../utils/formatResults');

// ── Helper: build image URL from stored filename ──────────────────────────────
const imageUrl = (req, filename) => {
  if (!filename) return null;
  return `${req.protocol}://${req.get('host')}/uploads/singapore/${path.basename(filename)}`;
};

// ── GET /api/singapore ─────────────────────────────────────────────────────────
// Returns results formatted for the frontend ResultSets ({ single, double, triple })
// along with the raw list of session draws and image URLs.
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { date, session, page = 1, limit = 30 } = req.query;
    const where = { isPublished: true };
    if (date) where.drawDate = date;
    if (session) where.session = session;

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await SingaporeLottery.findAndCountAll({
      where,
      order: [
        ['drawDate', 'DESC'],
        ['session', 'ASC'],
      ],
      limit: Number(limit),
      offset,
    });

    const draws = rows.map((r) => ({
      id: r.id,
      drawDate: r.drawDate,
      dateFormatted: formatDate(r.drawDate),
      session: r.session,
      singleDigit: r.singleDigit,
      doubleDigit: r.doubleDigit,
      tripleDigit: r.tripleDigit,
      resultImage: imageUrl(req, r.resultImage),
      drawNumber: r.drawNumber,
      createdAt: r.createdAt,
    }));

    // Formatted specifically for frontend table: single[], double[], triple[]
    const results = buildResultSets(rows);

    return res.status(200).json({
      success: true,
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
      results,
      draws,
    });
  } catch (err) {
    console.error('Singapore list error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/singapore/latest ─────────────────────────────────────────────────
router.get('/latest', optionalAuth, async (req, res) => {
  try {
    // Find the latest drawDate
    const latestDraw = await SingaporeLottery.findOne({
      where: { isPublished: true },
      order: [['drawDate', 'DESC']],
    });

    if (!latestDraw) {
      return res.status(404).json({ success: false, message: 'No Singapore results found.' });
    }

    // Get all 3 sessions for that latest date (morning, day, evening)
    const dayDraws = await SingaporeLottery.findAll({
      where: {
        drawDate: latestDraw.drawDate,
        isPublished: true,
      },
      order: [['session', 'ASC']],
    });

    const formattedDraws = dayDraws.map((d) => ({
      id: d.id,
      drawDate: d.drawDate,
      dateFormatted: formatDate(d.drawDate),
      session: d.session,
      singleDigit: d.singleDigit,
      doubleDigit: d.doubleDigit,
      tripleDigit: d.tripleDigit,
      resultImage: imageUrl(req, d.resultImage),
      drawNumber: d.drawNumber,
    }));

    const results = buildResultSets(dayDraws);

    return res.status(200).json({
      success: true,
      drawDate: latestDraw.drawDate,
      dateFormatted: formatDate(latestDraw.drawDate),
      results,
      sessions: formattedDraws,
    });
  } catch (err) {
    console.error('Singapore latest error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/singapore/:id ────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const draw = await SingaporeLottery.findOne({
      where: { id: req.params.id, isPublished: true },
    });
    if (!draw) return res.status(404).json({ success: false, message: 'Result not found.' });

    return res.status(200).json({
      success: true,
      result: {
        ...draw.toJSON(),
        dateFormatted: formatDate(draw.drawDate),
        resultImage: imageUrl(req, draw.resultImage),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ══ ADMIN ROUTES ══════════════════════════════════════════════════════════════

// ── POST /api/singapore — admin: create/upsert a session draw with optional image
router.post('/', protect, adminOnly, uploadSingapore.single('resultImage'), async (req, res) => {
  try {
    const { drawDate, session, singleDigit, doubleDigit, tripleDigit, drawNumber, isPublished } = req.body;

    if (!drawDate || !session) {
      return res.status(400).json({ success: false, message: 'drawDate and session (morning, day, evening) are required.' });
    }
    if (!SESSIONS.includes(session)) {
      return res.status(400).json({
        success: false,
        message: `Invalid session. Must be one of: ${SESSIONS.join(', ')}`,
      });
    }

    const [record, created] = await SingaporeLottery.findOrCreate({
      where: { drawDate, session },
      defaults: {
        singleDigit,
        doubleDigit,
        tripleDigit,
        drawNumber,
        resultImage: req.file ? req.file.filename : null,
        isPublished: isPublished !== undefined ? (isPublished === 'true' || isPublished === true) : true,
      },
    });

    if (!created) {
      await record.update({
        singleDigit: singleDigit ?? record.singleDigit,
        doubleDigit: doubleDigit ?? record.doubleDigit,
        tripleDigit: tripleDigit ?? record.tripleDigit,
        drawNumber: drawNumber ?? record.drawNumber,
        resultImage: req.file ? req.file.filename : record.resultImage,
        isPublished: isPublished !== undefined ? (isPublished === 'true' || isPublished === true) : record.isPublished,
      });
    }

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Singapore draw created.' : 'Singapore draw updated.',
      result: {
        ...record.toJSON(),
        dateFormatted: formatDate(record.drawDate),
        resultImage: imageUrl(req, record.resultImage),
      },
    });
  } catch (err) {
    console.error('Singapore create error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/singapore/:id — admin: update draw ───────────────────────────────
router.put('/:id', protect, adminOnly, uploadSingapore.single('resultImage'), async (req, res) => {
  try {
    const draw = await SingaporeLottery.findByPk(req.params.id);
    if (!draw) return res.status(404).json({ success: false, message: 'Result not found.' });

    const { drawDate, session, singleDigit, doubleDigit, tripleDigit, drawNumber, isPublished } = req.body;

    await draw.update({
      drawDate: drawDate || draw.drawDate,
      session: session || draw.session,
      singleDigit: singleDigit ?? draw.singleDigit,
      doubleDigit: doubleDigit ?? draw.doubleDigit,
      tripleDigit: tripleDigit ?? draw.tripleDigit,
      drawNumber: drawNumber ?? draw.drawNumber,
      resultImage: req.file ? req.file.filename : draw.resultImage,
      isPublished: isPublished !== undefined ? (isPublished === 'true' || isPublished === true) : draw.isPublished,
    });

    return res.status(200).json({
      success: true,
      message: 'Singapore draw updated.',
      result: {
        ...draw.toJSON(),
        dateFormatted: formatDate(draw.drawDate),
        resultImage: imageUrl(req, draw.resultImage),
      },
    });
  } catch (err) {
    console.error('Singapore update error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/singapore/:id — admin: delete ─────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const draw = await SingaporeLottery.findByPk(req.params.id);
    if (!draw) return res.status(404).json({ success: false, message: 'Result not found.' });
    await draw.destroy();
    return res.status(200).json({ success: true, message: 'Singapore result deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
