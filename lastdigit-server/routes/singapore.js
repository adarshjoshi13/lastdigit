const express = require('express');
const router = express.Router();
const path = require('path');
const { Op } = require('sequelize');
const { SingaporeLottery } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadSingapore } = require('../middleware/upload');

// ── Helper: build image URL from stored path ──────────────────────────────────
const imageUrl = (req, filePath) => {
  if (!filePath) return null;
  return `${req.protocol}://${req.get('host')}/uploads/singapore/${path.basename(filePath)}`;
};

// ── GET /api/singapore  — public: list published results ─────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { date, page = 1, limit = 10 } = req.query;
    const where = { isPublished: true };
    if (date) where.drawDate = date;

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await SingaporeLottery.findAndCountAll({
      where,
      order: [['drawDate', 'DESC']],
      limit: Number(limit),
      offset,
    });

    const results = rows.map((r) => ({
      id: r.id,
      drawDate: r.drawDate,
      drawNumber: r.drawNumber,
      winningNumbers: r.winningNumbers,
      firstPrize: r.firstPrize,
      secondPrize: r.secondPrize,
      thirdPrize: r.thirdPrize,
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
    console.error('Singapore list error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/singapore/latest — most recent published result ──────────────────
router.get('/latest', protect, async (req, res) => {
  try {
    const result = await SingaporeLottery.findOne({
      where: { isPublished: true },
      order: [['drawDate', 'DESC']],
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'No results found.' });
    }

    return res.status(200).json({
      success: true,
      result: {
        ...result.toJSON(),
        resultImage: imageUrl(req, result.resultImage),
      },
    });
  } catch (err) {
    console.error('Singapore latest error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/singapore/:id ────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const result = await SingaporeLottery.findOne({
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

// ── POST /api/singapore — admin: create result with optional image ─────────────
router.post('/', protect, adminOnly, uploadSingapore.single('resultImage'), async (req, res) => {
  try {
    const { drawDate, drawNumber, winningNumbers, firstPrize, secondPrize, thirdPrize, isPublished } = req.body;

    if (!drawDate || !winningNumbers) {
      return res.status(400).json({ success: false, message: 'drawDate and winningNumbers are required.' });
    }

    const result = await SingaporeLottery.create({
      drawDate,
      drawNumber,
      winningNumbers,
      firstPrize,
      secondPrize,
      thirdPrize,
      resultImage: req.file ? req.file.filename : null,
      isPublished: isPublished === 'true' || isPublished === true,
    });

    return res.status(201).json({
      success: true,
      message: 'Singapore result created.',
      result: { ...result.toJSON(), resultImage: imageUrl(req, result.resultImage) },
    });
  } catch (err) {
    console.error('Singapore create error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── PUT /api/singapore/:id — admin: update ────────────────────────────────────
router.put('/:id', protect, adminOnly, uploadSingapore.single('resultImage'), async (req, res) => {
  try {
    const result = await SingaporeLottery.findByPk(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Result not found.' });

    const { drawDate, drawNumber, winningNumbers, firstPrize, secondPrize, thirdPrize, isPublished } = req.body;

    await result.update({
      drawDate: drawDate || result.drawDate,
      drawNumber: drawNumber ?? result.drawNumber,
      winningNumbers: winningNumbers || result.winningNumbers,
      firstPrize: firstPrize ?? result.firstPrize,
      secondPrize: secondPrize ?? result.secondPrize,
      thirdPrize: thirdPrize ?? result.thirdPrize,
      resultImage: req.file ? req.file.filename : result.resultImage,
      isPublished: isPublished !== undefined ? isPublished === 'true' || isPublished === true : result.isPublished,
    });

    return res.status(200).json({
      success: true,
      message: 'Singapore result updated.',
      result: { ...result.toJSON(), resultImage: imageUrl(req, result.resultImage) },
    });
  } catch (err) {
    console.error('Singapore update error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/singapore/:id — admin: delete ─────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const result = await SingaporeLottery.findByPk(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Result not found.' });
    await result.destroy();
    return res.status(200).json({ success: true, message: 'Singapore result deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;

