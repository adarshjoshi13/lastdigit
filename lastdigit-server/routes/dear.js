const express = require('express');
const router = express.Router();
const path = require('path');
const { DearLottery, SESSIONS } = require('../models');
const { protect, optionalAuth, adminOnly } = require('../middleware/auth');
const { uploadDear } = require('../middleware/upload');
const { formatDate, buildResultSets } = require('../utils/formatResults');
const { uploadToFirebase, deleteFromFirebase } = require('../config/firebase');

// ── Helper: build image URL from stored filename or Firebase URL ─────────────
const imageUrl = (req, filename) => {
  if (!filename) return null;
  // If already a full URL (e.g. Firebase Storage https://firebasestorage.googleapis.com/...), return as is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  return `${req.protocol}://${req.get('host')}/uploads/dear/${path.basename(filename)}`;
};

// ── GET /api/dear ─────────────────────────────────────────────────────────────
// Returns results formatted for the frontend ResultSets ({ single, double, triple })
// along with the raw list of session draws and image URLs.
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { date, session, page = 1, limit = 30 } = req.query;
    const where = { isPublished: true };
    if (date) where.drawDate = date;
    if (session) where.session = session;

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await DearLottery.findAndCountAll({
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
    console.error('Dear list error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/dear/latest ──────────────────────────────────────────────────────
router.get('/latest', optionalAuth, async (req, res) => {
  try {
    const latestDraw = await DearLottery.findOne({
      where: { isPublished: true },
      order: [['drawDate', 'DESC']],
    });

    if (!latestDraw) {
      return res.status(404).json({ success: false, message: 'No Dear results found.' });
    }

    const dayDraws = await DearLottery.findAll({
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
    console.error('Dear latest error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/dear/:id ─────────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const draw = await DearLottery.findOne({
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

// ── POST /api/dear — admin: create/upsert a session draw with optional image ──
router.post('/', protect, adminOnly, uploadDear.single('resultImage'), async (req, res) => {
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

    // Upload to Firebase Storage (falls back to local file if Firebase is not yet configured)
    let uploadedImage = null;
    if (req.file) {
      uploadedImage = await uploadToFirebase(req.file, 'dear');
    }

    const [record, created] = await DearLottery.findOrCreate({
      where: { drawDate, session },
      defaults: {
        singleDigit,
        doubleDigit,
        tripleDigit,
        drawNumber,
        resultImage: uploadedImage,
        isPublished: isPublished !== undefined ? (isPublished === 'true' || isPublished === true) : true,
      },
    });

    if (!created) {
      // If replacing image, delete previous image from Firebase/local if a new one was uploaded
      if (uploadedImage && record.resultImage && record.resultImage !== uploadedImage) {
        await deleteFromFirebase(record.resultImage, 'dear');
      }

      await record.update({
        singleDigit: singleDigit ?? record.singleDigit,
        doubleDigit: doubleDigit ?? record.doubleDigit,
        tripleDigit: tripleDigit ?? record.tripleDigit,
        drawNumber: drawNumber ?? record.drawNumber,
        resultImage: uploadedImage ?? record.resultImage,
        isPublished: isPublished !== undefined ? (isPublished === 'true' || isPublished === true) : record.isPublished,
      });
    }

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Dear draw created.' : 'Dear draw updated.',
      result: {
        ...record.toJSON(),
        dateFormatted: formatDate(record.drawDate),
        resultImage: imageUrl(req, record.resultImage),
      },
    });
  } catch (err) {
    console.error('Dear create error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/dear/:id — admin: update draw ────────────────────────────────────
router.put('/:id', protect, adminOnly, uploadDear.single('resultImage'), async (req, res) => {
  try {
    const draw = await DearLottery.findByPk(req.params.id);
    if (!draw) return res.status(404).json({ success: false, message: 'Result not found.' });

    const { drawDate, session, singleDigit, doubleDigit, tripleDigit, drawNumber, isPublished } = req.body;

    let uploadedImage = draw.resultImage;
    if (req.file) {
      // Delete old image if present
      if (draw.resultImage) {
        await deleteFromFirebase(draw.resultImage, 'dear');
      }
      uploadedImage = await uploadToFirebase(req.file, 'dear');
    }

    await draw.update({
      drawDate: drawDate || draw.drawDate,
      session: session || draw.session,
      singleDigit: singleDigit ?? draw.singleDigit,
      doubleDigit: doubleDigit ?? draw.doubleDigit,
      tripleDigit: tripleDigit ?? draw.tripleDigit,
      drawNumber: drawNumber ?? draw.drawNumber,
      resultImage: uploadedImage,
      isPublished: isPublished !== undefined ? (isPublished === 'true' || isPublished === true) : draw.isPublished,
    });

    return res.status(200).json({
      success: true,
      message: 'Dear draw updated.',
      result: {
        ...draw.toJSON(),
        dateFormatted: formatDate(draw.drawDate),
        resultImage: imageUrl(req, draw.resultImage),
      },
    });
  } catch (err) {
    console.error('Dear update error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/dear/:id — admin: delete ──────────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const draw = await DearLottery.findByPk(req.params.id);
    if (!draw) return res.status(404).json({ success: false, message: 'Result not found.' });

    if (draw.resultImage) {
      await deleteFromFirebase(draw.resultImage, 'dear');
    }

    await draw.destroy();
    return res.status(200).json({ success: true, message: 'Dear result deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
