/**
 * External Website API Routes
 * Base: /api/external
 *
 * Authentication: X-API-Key header  (set EXTERNAL_API_KEY in .env)
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  POST /api/external/upload        — upload result data (no image)  │
 * │  POST /api/external/upload-image  — attach image to existing draw  │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { Op } = require('sequelize');

const apiKeyAuth = require('../middleware/apiKey');
const { uploadExternal } = require('../middleware/upload');
const { SingaporeLottery, DearLottery, SESSION_VALUES } = require('../models/Lottery');

// ── All routes in this file are protected by API key ─────────────────────────
router.use(apiKeyAuth);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build the public image URL */
const imageUrl = (req, lotteryType, filename) => {
  if (!filename) return null;
  const folder = lotteryType === 'dear' ? 'dear' : 'singapore';
  return `${req.protocol}://${req.get('host')}/uploads/${folder}/${path.basename(filename)}`;
};

/**
 * Find the matching draw record by the three identifying fields:
 *   lotteryType + date + session   (+ optional drawNumber for extra precision)
 */
const findDraw = async (lotteryType, drawDate, session, drawNumber) => {
  const where = { drawDate, session };
  if (drawNumber) where.drawNumber = drawNumber;

  if (lotteryType === 'dear') return DearLottery.findOne({ where });
  return SingaporeLottery.findOne({ where });
};

/** Derive last-digit fields from a prize string automatically */
const deriveDigits = (prizeStr) => {
  if (!prizeStr) return { lastOneDigit: null, lastTwoDigits: null, lastThreeDigits: null };
  const digits = prizeStr.replace(/\D/g, ''); // keep only digits
  return {
    lastOneDigit: digits.length >= 1 ? digits.slice(-1) : null,
    lastTwoDigits: digits.length >= 2 ? digits.slice(-2) : null,
    lastThreeDigits: digits.length >= 3 ? digits.slice(-3) : null,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/external/upload
// Upload lottery result data (creates or updates a draw record)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Body (application/json):
 * {
 *   "lotteryType"    : "singapore" | "dear",         ← required
 *   "date"           : "2024-11-01",                  ← required  (YYYY-MM-DD)
 *   "session"        : "morning" | "day" | "evening" | "night",  ← required
 *   "drawNumber"     : "SG-1234",                     ← optional (draw ID)
 *   "lotteryName"    : "Dear Morning",                ← required for Dear only
 *   "firstPrize"     : "1234567",
 *   "secondPrize"    : "765432",
 *   "thirdPrize"     : "987654",
 *   "lastOneDigit"   : "7",    ← optional; auto-derived from firstPrize if omitted
 *   "lastTwoDigits"  : "67",   ← optional; auto-derived from firstPrize if omitted
 *   "lastThreeDigits": "567",  ← optional; auto-derived from firstPrize if omitted
 *   "winningNumbers" : "12,34,56,07,23,45",  ← Singapore only (optional)
 *   "consolationPrizes": [...],               ← Dear only (optional JSON array)
 *   "isPublished"    : true
 * }
 */
router.post('/upload', async (req, res) => {
  try {
    const {
      lotteryType,
      date,
      session,
      drawNumber,
      lotteryName,
      firstPrize,
      secondPrize,
      thirdPrize,
      winningNumbers,
      consolationPrizes,
      isPublished,
    } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!lotteryType || !['singapore', 'dear'].includes(lotteryType)) {
      return res.status(400).json({
        success: false,
        message: 'lotteryType is required and must be "singapore" or "dear".',
      });
    }
    if (!date) {
      return res.status(400).json({ success: false, message: 'date is required (YYYY-MM-DD).' });
    }
    if (!session || !SESSION_VALUES.includes(session)) {
      return res.status(400).json({
        success: false,
        message: `session is required. Allowed values: ${SESSION_VALUES.join(', ')}.`,
      });
    }
    if (lotteryType === 'dear' && !lotteryName) {
      return res.status(400).json({
        success: false,
        message: 'lotteryName is required for Dear lottery (e.g. "Dear Morning").',
      });
    }

    // ── Auto-derive digit fields if not explicitly provided ───────────────────
    let {
      lastOneDigit,
      lastTwoDigits,
      lastThreeDigits,
    } = req.body;

    if (!lastOneDigit && !lastTwoDigits && !lastThreeDigits && firstPrize) {
      const derived = deriveDigits(firstPrize);
      lastOneDigit = derived.lastOneDigit;
      lastTwoDigits = derived.lastTwoDigits;
      lastThreeDigits = derived.lastThreeDigits;
    }

    const publish = isPublished === true || isPublished === 'true';

    // ── Upsert: update if same draw exists, else create ───────────────────────
    const existing = await findDraw(lotteryType, date, session, drawNumber);

    if (lotteryType === 'singapore') {
      if (existing) {
        await existing.update({
          drawNumber: drawNumber ?? existing.drawNumber,
          winningNumbers: winningNumbers ?? existing.winningNumbers,
          firstPrize: firstPrize ?? existing.firstPrize,
          secondPrize: secondPrize ?? existing.secondPrize,
          thirdPrize: thirdPrize ?? existing.thirdPrize,
          lastOneDigit: lastOneDigit ?? existing.lastOneDigit,
          lastTwoDigits: lastTwoDigits ?? existing.lastTwoDigits,
          lastThreeDigits: lastThreeDigits ?? existing.lastThreeDigits,
          isPublished: isPublished !== undefined ? publish : existing.isPublished,
        });
        return res.status(200).json({
          success: true,
          message: 'Singapore result updated.',
          result: existing,
        });
      }

      const record = await SingaporeLottery.create({
        drawDate: date,
        session,
        drawNumber,
        winningNumbers,
        firstPrize,
        secondPrize,
        thirdPrize,
        lastOneDigit,
        lastTwoDigits,
        lastThreeDigits,
        isPublished: publish,
      });
      return res.status(201).json({ success: true, message: 'Singapore result created.', result: record });
    }

    // ── Dear lottery ──────────────────────────────────────────────────────────
    if (existing) {
      await existing.update({
        lotteryName: lotteryName ?? existing.lotteryName,
        drawNumber: drawNumber ?? existing.drawNumber,
        firstPrize: firstPrize ?? existing.firstPrize,
        secondPrize: secondPrize ?? existing.secondPrize,
        thirdPrize: thirdPrize ?? existing.thirdPrize,
        lastOneDigit: lastOneDigit ?? existing.lastOneDigit,
        lastTwoDigits: lastTwoDigits ?? existing.lastTwoDigits,
        lastThreeDigits: lastThreeDigits ?? existing.lastThreeDigits,
        consolationPrizes: consolationPrizes
          ? (typeof consolationPrizes === 'string' ? JSON.parse(consolationPrizes) : consolationPrizes)
          : existing.consolationPrizes,
        isPublished: isPublished !== undefined ? publish : existing.isPublished,
      });
      return res.status(200).json({ success: true, message: 'Dear result updated.', result: existing });
    }

    const record = await DearLottery.create({
      drawDate: date,
      session,
      lotteryName,
      drawNumber,
      firstPrize,
      secondPrize,
      thirdPrize,
      lastOneDigit,
      lastTwoDigits,
      lastThreeDigits,
      consolationPrizes: consolationPrizes
        ? (typeof consolationPrizes === 'string' ? JSON.parse(consolationPrizes) : consolationPrizes)
        : null,
      isPublished: publish,
    });
    return res.status(201).json({ success: true, message: 'Dear result created.', result: record });
  } catch (err) {
    console.error('External upload error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/external/upload-image
// Attach / replace the result image for an existing draw
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Body (multipart/form-data)  — text fields MUST come before the file field:
 * {
 *   "lotteryType"  : "singapore" | "dear",   ← required
 *   "date"         : "2024-11-01",            ← required
 *   "session"      : "morning" | ...,         ← required
 *   "drawNumber"   : "SG-1234",               ← optional (narrows the lookup)
 *   "isPublished"  : "true",                  ← optional (default: no change)
 *   "resultImage"  : <image file>             ← required
 * }
 */
router.post('/upload-image', uploadExternal.single('resultImage'), async (req, res) => {
  try {
    const { lotteryType, date, session, drawNumber, isPublished } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!lotteryType || !['singapore', 'dear'].includes(lotteryType)) {
      return res.status(400).json({
        success: false,
        message: 'lotteryType is required: "singapore" or "dear".',
      });
    }
    if (!date) {
      return res.status(400).json({ success: false, message: 'date is required (YYYY-MM-DD).' });
    }
    if (!session || !SESSION_VALUES.includes(session)) {
      return res.status(400).json({
        success: false,
        message: `session is required. Allowed values: ${SESSION_VALUES.join(', ')}.`,
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'resultImage file is required.',
      });
    }

    // ── Find the draw ─────────────────────────────────────────────────────────
    const existing = await findDraw(lotteryType, date, session, drawNumber);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `No ${lotteryType} draw found for date=${date}, session=${session}${drawNumber ? ', drawNumber=' + drawNumber : ''}. Upload the result data first via POST /api/external/upload.`,
      });
    }

    // ── Attach image ──────────────────────────────────────────────────────────
    const updatePayload = { resultImage: req.file.filename };
    if (isPublished !== undefined) {
      updatePayload.isPublished = isPublished === 'true' || isPublished === true;
    }
    await existing.update(updatePayload);

    return res.status(200).json({
      success: true,
      message: `Image attached to ${lotteryType} draw (${date} / ${session}).`,
      result: {
        id: existing.id,
        lotteryType,
        date: existing.drawDate,
        session: existing.session,
        drawNumber: existing.drawNumber,
        isPublished: existing.isPublished,
        resultImage: imageUrl(req, lotteryType, req.file.filename),
      },
    });
  } catch (err) {
    console.error('External upload-image error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
});

module.exports = router;

