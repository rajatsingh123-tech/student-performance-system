const express = require('express');
const router = express.Router();
const Achievement = require('../models/Achievement');
const { protect, authorize } = require('../middleware/auth');

// Get all achievements (Everyone)
router.get('/', protect, async (req, res) => {
    try {
        const achievements = await Achievement.find().sort({ date: -1 });
        res.json({ success: true, achievements });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add achievement (Admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const achievement = new Achievement({ ...req.body, createdBy: req.user.id });
        await achievement.save();
        res.json({ success: true, achievement });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update achievement (Admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const achievement = await Achievement.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, achievement });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete achievement (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        await Achievement.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;