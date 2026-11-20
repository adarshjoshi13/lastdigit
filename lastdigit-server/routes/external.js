/**
 * External Website API Routes
 * Base: /api/external
 *
 * Authentication: X-API-Key header (set EXTERNAL_API_KEY in .env)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  POST /api/external/upload        — upload results (1, 2, or 3 digits)      │
 * │  POST /api/external/upload-image  — upload result image for the same draw   │
 * │  GET  /api/external/results       — inspect results by date & lotteryType   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const apiKeyAuth = require('../middleware/apiKey');
const { uploadExternal } = require('../middleware/upload');
const { SingaporeLottery, DearLottery, SESSIONS } = require('../models/Lottery');
const { formatDate, buildResultSets } = require('../utils/formatResults');
const { uploadToFirebase } = require('../config/firebase');

// ── All routes require API key authentication ─────────────────────────────────
router.use(apiKeyAuth);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Normalize session/time string to: 'morning', 'day', or 'evening' */
const normalizeSession = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (['mor', 'morning', 'morn'].includes(s)) return 'morning';
  if (['day', 'afternoon', 'noon'].includes(s)) return 'day';
  if (['evn', 'evening', 'eve', 'night'].includes(s)) return 'evening';
  return SESSIONS.includes(s) ? s : null;
};

/** Normalize lottery model */
const getModel = (lotteryType) => {
  const type = String(lotteryType).trim().toLowerCase();
  if (type === 'singapore') return { model: SingaporeLottery, name: 'singapore' };
  if (type === 'dear') return { model: DearLottery, name: 'dear' };
  return null;
};

/** Build public image URL (supports both Firebase URLs and legacy local uploads) */
const imageUrl = (req, lotteryName, filename) => {
  if (!filename) return null;
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  const folder = lotteryName === 'dear' ? 'dear' : 'singapore';
  return `${req.protocol}://${req.get('host')}/uploads/${folder}/${path.basename(filename)}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. POST /api/external/upload
// Upload results for a game (morning, day, or evening).
// Accepts single (1 digit), double (2 digits), or triple (3 digits), or all three.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Request Body (JSON or x-www-form-urlencoded):
 *
 *   lotteryType  : "singapore" | "dear"          (required)
 *   date         : "2026-05-24"                  (required, YYYY-MM-DD; also accepts "drawDate")
 *   time         : "morning" | "day" | "evening" (required; also accepts "session")
 *
 *   Format A — all at once:
 *     singleDigit  : "4"                         (optional)
 *     doubleDigit  : "94"                        (optional)
 *     tripleDigit  : "194"                       (optional)
 *
 *   Format B — one digit type at a time:
 *     digitType    : "single" | "double" | "triple" | "1" | "2" | "3"
 *     winningNumber: "4" | "94" | "194"
 *
 *   Optional:
 *     drawNumber   : "BATCH-001"                 (draw / batch reference)
 *     isPublished  : true | false                (default: true)
 */
router.post('/upload', async (req, res) => {
  try {
    const {
      lotteryType,
      date,
      drawDate,
      time,
      session,
      digitType,
      winningNumber,
      drawNumber,
      isPublished,
    } = req.body;

    // Validate lotteryType
    const modelInfo = getModel(lotteryType);
    if (!modelInfo) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing lotteryType. Allowed values: "singapore", "dear".',
      });
    }

    // Validate date
    const targetDate = date || drawDate;
    if (!targetDate) {
      return res.status(400).json({
        success: false,
        message: 'date is required (format: YYYY-MM-DD).',
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({
        success: false,
        message: `Invalid date format: "${targetDate}". Expected YYYY-MM-DD.`,
      });
    }

    // Validate time / session
    const targetSession = normalizeSession(time || session);
    if (!targetSession) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing time/session. Allowed values: ${SESSIONS.join(', ')}.`,
      });
    }

    // Resolve digit values (Format A or Format B)
    let { singleDigit, doubleDigit, tripleDigit } = req.body;

    if (digitType && winningNumber !== undefined) {
      const dt = String(digitType).trim().toLowerCase();
      const num = String(winningNumber).trim();

      if (['single', '1', 'singledigit'].includes(dt)) {
        singleDigit = num;
      } else if (['double', '2', 'doubledigit'].includes(dt)) {
        doubleDigit = num;
      } else if (['triple', '3', 'tripledigit'].includes(dt)) {
        tripleDigit = num;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid digitType. Allowed values: "single" (1), "double" (2), "triple" (3).',
        });
      }
    }

    // Validate digit lengths if provided
    if (singleDigit !== undefined && singleDigit !== null) {
      singleDigit = String(singleDigit).trim();
      if (!/^\d{1,2}$/.test(singleDigit)) {
        return res.status(400).json({
          success: false,
          message: `Invalid singleDigit: "${singleDigit}". Must be 1 digit (e.g. "4").`,
        });
      }
    }

    if (doubleDigit !== undefined && doubleDigit !== null) {
      doubleDigit = String(doubleDigit).trim();
      if (!/^\d{1,3}$/.test(doubleDigit)) {
        return res.status(400).json({
          success: false,
          message: `Invalid doubleDigit: "${doubleDigit}". Must be 2 digits (e.g. "94").`,
        });
      }
    }

    if (tripleDigit !== undefined && tripleDigit !== null) {
      tripleDigit = String(tripleDigit).trim();
      if (!/^\d{1,4}$/.test(tripleDigit)) {
        return res.status(400).json({
          success: false,
          message: `Invalid tripleDigit: "${tripleDigit}". Must be 3 digits (e.g. "194").`,
        });
      }
    }

    if (singleDigit === undefined && doubleDigit === undefined && tripleDigit === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one digit result (singleDigit, doubleDigit, tripleDigit, or digitType + winningNumber).',
      });
    }

    // Find or create draw record for (drawDate, session)
    const [draw, created] = await modelInfo.model.findOrCreate({
      where: {
        drawDate: targetDate,
        session: targetSession,
      },
      defaults: {
        singleDigit: singleDigit !== undefined ? String(singleDigit) : null,
        doubleDigit: doubleDigit !== undefined ? String(doubleDigit) : null,
        tripleDigit: tripleDigit !== undefined ? String(tripleDigit) : null,
        drawNumber: drawNumber ?? null,
        isPublished: isPublished !== undefined ? (isPublished === true || isPublished === 'true') : true,
      },
    });

    if (!created) {
      const updates = {};
      if (singleDigit !== undefined) updates.singleDigit = String(singleDigit);
      if (doubleDigit !== undefined) updates.doubleDigit = String(doubleDigit);
      if (tripleDigit !== undefined) updates.tripleDigit = String(tripleDigit);
      if (drawNumber !== undefined) updates.drawNumber = drawNumber;
      if (isPublished !== undefined) updates.isPublished = isPublished === true || isPublished === 'true';

      await draw.update(updates);
    }

    return res.status(created ? 201 : 200).json({
      success: true,
      message: `${modelInfo.name.toUpperCase()} result ${created ? 'created' : 'updated'} successfully.`,
      result: {
        id: draw.id,
        lotteryType: modelInfo.name,
        date: draw.drawDate,
        dateFormatted: formatDate(draw.drawDate),
        session: draw.session,
        singleDigit: draw.singleDigit,
        doubleDigit: draw.doubleDigit,
        tripleDigit: draw.tripleDigit,
        drawNumber: draw.drawNumber,
        resultImage: imageUrl(req, modelInfo.name, draw.resultImage),
        isPublished: draw.isPublished,
      },
    });
  } catch (err) {
    console.error('External result upload error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /api/external/upload-image
// Upload the result sheet image for the exact same draw
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Request Body (multipart/form-data):
 *   lotteryType  : "singapore" | "dear"          (required)
 *   date         : "2026-05-24"                  (required)
 *   time         : "morning" | "day" | "evening" (required, or "session")
 *   resultImage  : <image file: jpg/png/webp>    (required)
 *   isPublished  : "true"                        (optional)
 */
router.post('/upload-image', uploadExternal.single('resultImage'), async (req, res) => {
  try {
    const { lotteryType, date, drawDate, time, session, isPublished } = req.body;

    // Validate lotteryType
    const modelInfo = getModel(lotteryType);
    if (!modelInfo) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing lotteryType: "singapore" or "dear".',
      });
    }

    // Validate date
    const targetDate = date || drawDate;
    if (!targetDate) {
      return res.status(400).json({
        success: false,
        message: 'date is required (YYYY-MM-DD).',
      });
    }

    // Validate time / session
    const targetSession = normalizeSession(time || session);
    if (!targetSession) {
      return res.status(400).json({
        success: false,
        message: `time or session is required. Allowed values: ${SESSIONS.join(', ')}.`,
      });
    }

    // Validate uploaded file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'resultImage file is required (jpeg, jpg, png, webp, gif).',
      });
    }

    // Upload to Firebase Storage (falls back to local filename if Firebase not configured)
    const uploadedImage = await uploadToFirebase(req.file, modelInfo.name);

    // Find or create the draw record for this date & session
    const [draw, created] = await modelInfo.model.findOrCreate({
      where: {
        drawDate: targetDate,
        session: targetSession,
      },
      defaults: {
        resultImage: uploadedImage,
        isPublished: isPublished !== undefined ? (isPublished === true || isPublished === 'true') : true,
      },
    });

    if (!created) {
      const updates = { resultImage: uploadedImage };
      if (isPublished !== undefined) {
        updates.isPublished = isPublished === true || isPublished === 'true';
      }
      await draw.update(updates);
    }

    return res.status(200).json({
      success: true,
      message: `Image attached to ${modelInfo.name.toUpperCase()} draw (${targetDate} · ${targetSession}).`,
      result: {
        id: draw.id,
        lotteryType: modelInfo.name,
        date: draw.drawDate,
        dateFormatted: formatDate(draw.drawDate),
        session: draw.session,
        singleDigit: draw.singleDigit,
        doubleDigit: draw.doubleDigit,
        tripleDigit: draw.tripleDigit,
        resultImage: imageUrl(req, modelInfo.name, uploadedImage),
        isPublished: draw.isPublished,
      },
    });
  } catch (err) {
    console.error('External image upload error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET /api/external/results
// Inspect stored results for a given date and lotteryType.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Query Params:
 *   lotteryType : "singapore" | "dear" (required)
 *   date        : "YYYY-MM-DD"         (optional; omit to fetch latest)
 */
router.get('/results', async (req, res) => {
  try {
    const { lotteryType, date } = req.query;

    const modelInfo = getModel(lotteryType);
    if (!modelInfo) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing lotteryType query parameter: "singapore" or "dear".',
      });
    }

    const where = {};
    if (date) where.drawDate = date;

    const rows = await modelInfo.model.findAll({
      where,
      order: [
        ['drawDate', 'DESC'],
        ['session', 'ASC'],
      ],
      limit: date ? 3 : 30,
    });

    const results = buildResultSets(rows);
    const draws = rows.map((r) => ({
      id: r.id,
      lotteryType: modelInfo.name,
      drawDate: r.drawDate,
      dateFormatted: formatDate(r.drawDate),
      session: r.session,
      singleDigit: r.singleDigit,
      doubleDigit: r.doubleDigit,
      tripleDigit: r.tripleDigit,
      resultImage: imageUrl(req, modelInfo.name, r.resultImage),
      drawNumber: r.drawNumber,
      isPublished: r.isPublished,
      updatedAt: r.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      lotteryType: modelInfo.name,
      count: draws.length,
      results,
      draws,
    });
  } catch (err) {
    console.error('External results query error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
});

module.exports = router;
