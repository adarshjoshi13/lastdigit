const express = require('express');
const router = express.Router();
const path = require('path');
const { SingaporeLottery, SESSIONS } = require('../models');
const { protect, optionalAuth, adminOnly } = require('../middleware/auth');
const { uploadSingapore } = require('../middleware/upload');
const { formatDate, buildResultSets } = require('../utils/formatResults');
const { uploadToFirebase, deleteFromFirebase } = require('../config/firebase');

// ── Helper: build image URL from stored filename or Firebase URL ─────────────
const imageUrl = (req, filename) => {
  if (!filename) return null;
  // If already a full URL (e.g. Firebase Storage https://firebasestorage.googleapis.com/...), return as is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  return `${req.protocol}://${req.get('host')}/uploads/singapore/${path.basename(filename)}`;
};

// ── GET /api/singapore ─────────────────────────────────────────────────────────
// Returns results formatted for the frontend ResultSets ({ single, double, triple })
// along with the raw list of session draws and image URLs.
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { date, session, page = 1, limit = 30 } = req.query;
    const where = {};
    // If not authenticated admin, only return published draws
    if (!req.user || req.user.role !== 'admin') {
      where.isPublished = true;
    }
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
      isPublished: r.isPublished,
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
      where: { id: req.params.id },
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

// ── POST /api/singapore — admin: upsert (create if not exists, update if exists)
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

    // Upload to Firebase Storage (falls back to local file if Firebase is not yet configured)
    let uploadedImage = null;
    if (req.file) {
      uploadedImage = await uploadToFirebase(req.file, 'singapore');
    }

    const cleanSingle = (singleDigit !== undefined && singleDigit !== null && singleDigit !== '') ? String(singleDigit).trim() : null;
    const cleanDouble = (doubleDigit !== undefined && doubleDigit !== null && doubleDigit !== '') ? String(doubleDigit).trim() : null;
    const cleanTriple = (tripleDigit !== undefined && tripleDigit !== null && tripleDigit !== '') ? String(tripleDigit).trim() : null;
    const cleanDrawNum = (drawNumber !== undefined && drawNumber !== null && drawNumber !== '') ? String(drawNumber).trim() : null;

    // Find or create: if record for (drawDate, session) doesn't exist, create it
    const [record, created] = await SingaporeLottery.findOrCreate({
      where: { drawDate, session },
      defaults: {
        singleDigit: cleanSingle,
        doubleDigit: cleanDouble,
        tripleDigit: cleanTriple,
        drawNumber: cleanDrawNum,
        resultImage: uploadedImage,
        isPublished: isPublished !== undefined ? (isPublished === 'true' || isPublished === true) : true,
      },
    });

    // If record already existed, update only provided fields without wiping existing data
    if (!created) {
      // If a new image was uploaded and there was an old image, delete previous from Firebase/local
      if (uploadedImage && record.resultImage && record.resultImage !== uploadedImage) {
        await deleteFromFirebase(record.resultImage, 'singapore');
      }

      const updates = {};
      if (cleanSingle !== null) updates.singleDigit = cleanSingle;
      if (cleanDouble !== null) updates.doubleDigit = cleanDouble;
      if (cleanTriple !== null) updates.tripleDigit = cleanTriple;
      if (cleanDrawNum !== null) updates.drawNumber = cleanDrawNum;
      if (uploadedImage) updates.resultImage = uploadedImage;
      if (isPublished !== undefined) {
        updates.isPublished = isPublished === 'true' || isPublished === true;
      }

      await record.update(updates);
    }

    return res.status(created ? 201 : 200).json({
      success: true,
      action: created ? 'created' : 'updated',
      message: created ? 'Singapore draw created successfully.' : 'Singapore draw updated successfully.',
      result: {
        ...record.toJSON(),
        dateFormatted: formatDate(record.drawDate),
        resultImage: imageUrl(req, record.resultImage),
      },
    });
  } catch (err) {
    console.error('Singapore create/update error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/singapore/:id — admin: update draw ───────────────────────────────
router.put('/:id', protect, adminOnly, uploadSingapore.single('resultImage'), async (req, res) => {
  try {
    const draw = await SingaporeLottery.findByPk(req.params.id);
    if (!draw) return res.status(404).json({ success: false, message: 'Result not found.' });

    const { drawDate, session, singleDigit, doubleDigit, tripleDigit, drawNumber, isPublished } = req.body;

    let uploadedImage = draw.resultImage;
    if (req.file) {
      // Delete old image if present
      if (draw.resultImage) {
        await deleteFromFirebase(draw.resultImage, 'singapore');
      }
      uploadedImage = await uploadToFirebase(req.file, 'singapore');
    }

    const updates = {
      drawDate: drawDate || draw.drawDate,
      session: session || draw.session,
      resultImage: uploadedImage,
    };
    if (singleDigit !== undefined && singleDigit !== '') updates.singleDigit = String(singleDigit).trim();
    if (doubleDigit !== undefined && doubleDigit !== '') updates.doubleDigit = String(doubleDigit).trim();
    if (tripleDigit !== undefined && tripleDigit !== '') updates.tripleDigit = String(tripleDigit).trim();
    if (drawNumber !== undefined && drawNumber !== '') updates.drawNumber = String(drawNumber).trim();
    if (isPublished !== undefined) updates.isPublished = isPublished === 'true' || isPublished === true;

    await draw.update(updates);

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

    if (draw.resultImage) {
      await deleteFromFirebase(draw.resultImage, 'singapore');
    }

    await draw.destroy();
    return res.status(200).json({ success: true, message: 'Singapore result deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
