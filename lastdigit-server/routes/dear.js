const express = require('express');
const router = express.Router();
const path = require('path');
const { DearLottery } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadDear } = require('../middleware/upload');

// ── Helper: build image URL ───────────────────────────────────────────────────
const imageUrl = (req, filePath) => {
  if (!filePath) return null;
  return `${req.protocol}://${req.get('host')}/uploads/dear/${path.basename(filePath)}`;
};

// ── GET /api/dear — public (logged-in): list published results ────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { date, lotteryName, page = 1, limit = 10 } = req.query;
    const where = { isPublished: true };
    if (date) where.drawDate = date;
    if (lotteryName) where.lotteryName = lotteryName;

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await DearLottery.findAndCountAll({
      where,
      order: [['drawDate', 'DESC'], ['lotteryName', 'ASC']],
      limit: Number(limit),
      offset,
    });

    const results = rows.map((r) => ({
      id: r.id,
      drawDate: r.drawDate,
      lotteryName: r.lotteryName,
      drawNumber: r.drawNumber,
      firstPrize: r.firstPrize,
      secondPrize: r.secondPrize,
      thirdPrize: r.thirdPrize,
      consolationPrizes: r.consolationPrizes,
      resultImage: imageUrl(req, r.resultImage),
      createdAt: r.createdAt,
    }));

    return res.status(200).json({
      success: true,
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
      results,
    });
  } catch (err) {
    console.error('Dear list error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/dear/latest — latest published result ────────────────────────────
router.get('/latest', protect, async (req, res) => {
  try {
    const result = await DearLottery.findOne({
      where: { isPublished: true },
      order: [['drawDate', 'DESC']],
    });

    if (!result) return res.status(404).json({ success: false, message: 'No results found.' });

    return res.status(200).json({
      success: true,
      result: { ...result.toJSON(), resultImage: imageUrl(req, result.resultImage) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/dear/:id ─────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const result = await DearLottery.findOne({
      where: { id: req.params.id, isPublished: true },
    });
    if (!result) return res.status(404).json({ success: false, message: 'Result not found.' });

    return res.status(200).json({
      success: true,
      result: { ...result.toJSON(), resultImage: imageUrl(req, result.resultImage) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ══ ADMIN ROUTES ══════════════════════════════════════════════════════════════

// ── POST /api/dear — admin: create ───────────────────────────────────────────
router.post('/', protect, adminOnly, uploadDear.single('resultImage'), async (req, res) => {
  try {
    const { drawDate, lotteryName, drawNumber, firstPrize, secondPrize, thirdPrize, consolationPrizes, isPublished } =
      req.body;

    if (!drawDate || !lotteryName) {
      return res.status(400).json({ success: false, message: 'drawDate and lotteryName are required.' });
    }

    const result = await DearLottery.create({
      drawDate,
      lotteryName,
      drawNumber,
      firstPrize,
      secondPrize,
      thirdPrize,
      consolationPrizes: consolationPrizes ? JSON.parse(consolationPrizes) : null,
      resultImage: req.file ? req.file.filename : null,
      isPublished: isPublished === 'true' || isPublished === true,
    });

    return res.status(201).json({
      success: true,
      message: 'Dear result created.',
      result: { ...result.toJSON(), resultImage: imageUrl(req, result.resultImage) },
    });
  } catch (err) {
    console.error('Dear create error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/dear/:id — admin: update ────────────────────────────────────────
router.put('/:id', protect, adminOnly, uploadDear.single('resultImage'), async (req, res) => {
  try {
    const result = await DearLottery.findByPk(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Result not found.' });

    const { drawDate, lotteryName, drawNumber, firstPrize, secondPrize, thirdPrize, consolationPrizes, isPublished } =
      req.body;

    await result.update({
      drawDate: drawDate || result.drawDate,
      lotteryName: lotteryName || result.lotteryName,
      drawNumber: drawNumber ?? result.drawNumber,
      firstPrize: firstPrize ?? result.firstPrize,
      secondPrize: secondPrize ?? result.secondPrize,
      thirdPrize: thirdPrize ?? result.thirdPrize,
      consolationPrizes: consolationPrizes ? JSON.parse(consolationPrizes) : result.consolationPrizes,
      resultImage: req.file ? req.file.filename : result.resultImage,
      isPublished: isPublished !== undefined ? isPublished === 'true' || isPublished === true : result.isPublished,
    });

    return res.status(200).json({
      success: true,
      message: 'Dear result updated.',
      result: { ...result.toJSON(), resultImage: imageUrl(req, result.resultImage) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/dear/:id — admin: delete ──────────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const result = await DearLottery.findByPk(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Result not found.' });
    await result.destroy();
    return res.status(200).json({ success: true, message: 'Dear result deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;

