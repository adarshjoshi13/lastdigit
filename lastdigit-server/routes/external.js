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

/** Build public image URL */
const imageUrl = (req, lotteryName, filename) => {
  if (!filename) return null;
  const folder = lotteryName === 'dear' ? 'dear' : 'singapore';
  return `${req.protocol}://${req.get('host')}/uploads/${folder}/${path.basename(filename)}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. POST /api/external/upload
// Upload results for a game (morning, day, or evening).
// Accepts single (1 digit), double (2 digits), or triple (3 digits), or all three.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Request Body (JSON):
 * {
 *   "lotteryType"   : "singapore" | "dear",          // required
 *   "date"          : "2026-05-24",                  // required (YYYY-MM-DD)
 *   "time"          : "morning" | "day" | "evening", // required (or "session")
 *
 *   // OPTION A: Specify individual digits directly
 *   "singleDigit"   : "7",                           // optional (1 digit)
 *   "doubleDigit"   : "27",                          // optional (2 digits)
 *   "tripleDigit"   : "827",                         // optional (3 digits)
 *
 *   // OPTION B: Specify by digitType + winningNumber
 *   "digitType"     : "single" | "double" | "triple" | 1 | 2 | 3,
 *   "winningNumber" : "7",
 *
 *   "drawNumber"    : "SG-101",                      // optional
 *   "isPublished"   : true                           // optional (default: true)
 * }
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
      number,
      drawNumber,
      isPublished,
    } = req.body;

    // Validate lotteryType
    const modelInfo = getModel(lotteryType);
    if (!modelInfo) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing lotteryType. Allowed values: "singapore" or "dear".',
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

    // Validate time / session
    const targetSession = normalizeSession(time || session);
    if (!targetSession) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing time/session. Allowed values: ${SESSIONS.join(', ')}.`,
      });
    }

    // Resolve single, double, triple digits
    let singleDigit = req.body.singleDigit ?? req.body.single;
    let doubleDigit = req.body.doubleDigit ?? req.body.double;
    let tripleDigit = req.body.tripleDigit ?? req.body.triple;

    // If submitted via digitType + winningNumber/number:
    const numVal = winningNumber !== undefined ? String(winningNumber).trim() : (number !== undefined ? String(number).trim() : null);

    if (numVal !== null) {
      const dt = digitType !== undefined ? String(digitType).toLowerCase().trim() : null;

      if (dt === '1' || dt === 'single') {
        singleDigit = numVal.slice(-1);
      } else if (dt === '2' || dt === 'double') {
        doubleDigit = numVal.length >= 2 ? numVal.slice(-2) : numVal.padStart(2, '0');
      } else if (dt === '3' || dt === 'triple') {
        tripleDigit = numVal.length >= 3 ? numVal.slice(-3) : numVal.padStart(3, '0');
      } else {
        // If digitType wasn't specified but winningNumber was provided:
        if (numVal.length === 1 && singleDigit === undefined) {
          singleDigit = numVal;
        } else if (numVal.length === 2 && doubleDigit === undefined) {
          doubleDigit = numVal;
          if (singleDigit === undefined) singleDigit = numVal.slice(-1);
        } else if (numVal.length >= 3) {
          if (tripleDigit === undefined) tripleDigit = numVal.slice(-3);
          if (doubleDigit === undefined) doubleDigit = numVal.slice(-2);
          if (singleDigit === undefined) singleDigit = numVal.slice(-1);
        }
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

    // Find or create the draw record for this date & session
    const [draw, created] = await modelInfo.model.findOrCreate({
      where: {
        drawDate: targetDate,
        session: targetSession,
      },
      defaults: {
        resultImage: req.file.filename,
        isPublished: isPublished !== undefined ? (isPublished === true || isPublished === 'true') : true,
      },
    });

    if (!created) {
      const updates = { resultImage: req.file.filename };
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
        resultImage: imageUrl(req, modelInfo.name, req.file.filename),
        isPublished: draw.isPublished,
      },
    });
  } catch (err) {
    console.error('External upload-image error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET /api/external/results
// Read back results with images (helpful for external systems to verify)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/results', async (req, res) => {
  try {
    const { lotteryType = 'singapore', date } = req.query;
    const modelInfo = getModel(lotteryType);
    if (!modelInfo) {
      return res.status(400).json({
        success: false,
        message: 'lotteryType must be "singapore" or "dear".',
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
      limit: 30,
    });

    const results = buildResultSets(rows);
    const draws = rows.map((r) => ({
      id: r.id,
      date: r.drawDate,
      dateFormatted: formatDate(r.drawDate),
      session: r.session,
      singleDigit: r.singleDigit,
      doubleDigit: r.doubleDigit,
      tripleDigit: r.tripleDigit,
      resultImage: imageUrl(req, modelInfo.name, r.resultImage),
      isPublished: r.isPublished,
    }));

    return res.status(200).json({
      success: true,
      lotteryType: modelInfo.name,
      results,
      draws,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
});

module.exports = router;
